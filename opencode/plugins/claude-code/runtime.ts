// One long-lived Claude Code process per OpenCode session. Each OpenCode turn pushes the user's new message into
// the running process instead of starting a new process that resumes the session, so Claude keeps its process state
// between turns and an interrupt stops the turn without ending the process.
import { query, type Options, type Query, type SDKMessage, type SDKResultMessage, type SDKUserMessage } from "@anthropic-ai/claude-agent-sdk";
import { UsageMeter, type Totals, type TurnUsage } from "./turn-usage.js";

export type Content = Exclude<SDKUserMessage["message"]["content"], string>;

type Listener = (message: SDKMessage) => void;

// A process with no turn running is closed after this long; the next turn resumes its session in a new process.
const IDLE_MS = 15 * 60_000;

// Feeds user messages to the SDK as they arrive.
class Inbox implements AsyncIterable<SDKUserMessage> {
  private readonly queue: SDKUserMessage[] = [];

  private wake: (() => void) | undefined;

  private ended = false;

  push(message: SDKUserMessage) {
    this.queue.push(message);
    this.wake?.();
  }

  end() {
    this.ended = true;
    this.wake?.();
  }

  async *[Symbol.asyncIterator]() {
    while (true) {
      const next = this.queue.shift();

      if (next) {
        yield next;
        continue;
      }

      if (this.ended) return;

      await new Promise<void>((resolve) => {
        this.wake = resolve;
      });
      this.wake = undefined;
    }
  }
}

// Messages that mean Claude is producing a turn, as opposed to status the process reports while idle.
function isTurnOutput(message: SDKMessage) {
  return message.type === "assistant" || message.type === "stream_event";
}

type Turn = { ended: Promise<void>; resolve: () => void; reject: (error: Error) => void };

export class SessionRuntime {
  private readonly inbox = new Inbox();

  private readonly run: Query;

  // The turn in progress, whether an OpenCode step started it or Claude Code started it on its own.
  private current: Turn | undefined;

  private listener: Listener | undefined;

  private idleTimer: ReturnType<typeof setTimeout> | undefined;

  private closed = false;

  // Output no OpenCode step is following: a turn Claude Code started on its own, such as after a background task
  // finished, or the rest of a turn whose step ended early to ask the user a question. The next step replays it.
  private unclaimed: SDKMessage[] = [];

  private backgroundTasks = 0;

  // Messages pushed into a running turn. OpenCode later delivers the same text as a step's input, which must not
  // reach Claude a second time.
  private steered: string[] = [];

  private readonly meter: UsageMeter;

  private readonly turnUsage = new WeakMap<SDKMessage, TurnUsage>();

  // Claude Code's session ID, known once the process reports it.
  sessionId: string | undefined;

  constructor(
    // Model and effort the process was started with; a different selection needs a new process.
    readonly identity: string,
    options: Options,
    // The session's token totals by model when this process starts, as last reported.
    totals: Totals,
    private readonly hooks: {
      // Claude Code started a turn on its own while no OpenCode step was running.
      onWake: (runtime: SessionRuntime) => void;
      onClosed: (runtime: SessionRuntime) => void;
      // A turn ended with the session's token totals at `totals`.
      onUsage: (sessionId: string, totals: Totals) => void;
    },
  ) {
    this.meter = new UsageMeter(totals);
    this.sessionId = options.resume;
    this.run = query({ prompt: this.inbox, options });
    void this.pump();
  }

  get alive() {
    return !this.closed;
  }

  // A turn is in progress and an OpenCode step is following it.
  get busy() {
    return this.current !== undefined && this.listener !== undefined;
  }

  // There is output, or a turn in progress, that no step is following.
  get hasUnclaimed() {
    return this.unclaimed.length > 0 || (this.current !== undefined && this.listener === undefined);
  }

  get steering() {
    return this.steered.length > 0;
  }

  // Sends one user message and passes every message Claude Code produces to `listener` until the turn's result.
  turn(content: Content, listener: Listener) {
    if (this.closed) return Promise.reject(new Error("The Claude Code process has ended"));

    if (this.current) return Promise.reject(new Error("A Claude Code turn is already running in this session"));

    const turn = this.startTurn();

    this.listener = listener;
    this.inbox.push({ type: "user", message: { role: "user", content }, parent_tool_use_id: null });

    return turn.ended;
  }

  // Replays output no step has followed and follows the turn it belongs to until its result.
  attach(listener: Listener) {
    if (this.closed) return Promise.reject(new Error("The Claude Code process has ended"));

    const unclaimed = this.unclaimed;
    const turn = this.current ?? this.startTurn();

    this.unclaimed = [];
    this.listener = listener;

    for (const message of unclaimed) this.deliver(message);

    if (unclaimed.at(-1)?.type === "result") this.endTurn();

    return turn.ended;
  }

  // Stops following the turn in progress; its further output waits for the next `attach`.
  detach() {
    this.listener = undefined;
  }

  // Adds a message to the running turn. Claude reads it once its current tool calls finish; if the turn ends first,
  // the message starts a new turn.
  steer(text: string) {
    this.steered.push(text);
    this.inbox.push({ type: "user", message: { role: "user", content: [{ type: "text", text }] }, parent_tool_use_id: null, priority: "next" });
  }

  // Drops text blocks Claude already received through `steer`.
  withoutSteered(content: Content) {
    const steered = this.steered;

    this.steered = [];

    return content.filter((block) => {
      if (block.type !== "text") return true;

      const index = steered.indexOf(block.text);

      if (index < 0) return true;

      steered.splice(index, 1);

      return false;
    });
  }

  // The tokens, by model, of the turn this result ended.
  usageOf(result: SDKResultMessage) {
    return this.turnUsage.get(result);
  }

  async interrupt() {
    if (!this.closed) await this.run.interrupt();
  }

  close() {
    if (this.closed) return;

    this.closed = true;
    clearTimeout(this.idleTimer);
    this.inbox.end();
    this.run.close();
    this.endTurn(new Error("The Claude Code process was closed"));
    this.hooks.onClosed(this);
  }

  private startTurn() {
    clearTimeout(this.idleTimer);

    let resolve = () => {};

    let reject: (error: Error) => void = () => {};

    const ended = new Promise<void>((done, fail) => {
      resolve = done;
      reject = fail;
    });

    // A step that stopped following the turn no longer awaits it.
    ended.catch(() => undefined);
    this.current = { ended, resolve, reject };

    return this.current;
  }

  private async pump() {
    try {
      for await (const message of this.run) this.receive(message);

      this.endTurn(new Error("The Claude Code process ended during the turn"));
    } catch (error) {
      this.endTurn(error instanceof Error ? error : new Error(String(error)));
    } finally {
      this.close();
    }
  }

  private receive(message: SDKMessage) {
    if ("session_id" in message) this.sessionId = message.session_id;

    if (message.type === "system" && message.subtype === "background_tasks_changed") this.backgroundTasks = message.tasks.length;

    this.meter.observe(message);

    if (message.type === "result") this.measure(message);

    if (this.listener) {
      this.deliver(message);

      if (message.type === "result") this.endTurn();

      return;
    }

    // While idle, only a turn Claude Code starts on its own is kept; status messages are not.
    if (!this.current && this.unclaimed.length === 0 && !isTurnOutput(message)) return;

    const waking = !this.current && this.unclaimed.length === 0;

    this.unclaimed.push(message);

    if (waking) this.hooks.onWake(this);
  }

  private measure(result: SDKResultMessage) {
    const { turn, totals } = this.meter.settle(result);

    this.turnUsage.set(result, turn);
    this.hooks.onUsage(result.session_id, totals);
  }

  // A turn's consumer can fail, for example when OpenCode has already cancelled the step it streams into. The
  // process must outlive that, so the failure ends only the consumer and the turn runs to its result.
  private deliver(message: SDKMessage) {
    try {
      this.listener?.(message);
    } catch (error) {
      console.error(`[claude-code] dropped a message after its turn's consumer failed: ${String(error)}`);
      this.listener = () => undefined;
    }
  }

  private endTurn(error?: Error) {
    const turn = this.current;

    this.current = undefined;
    this.listener = undefined;

    if (error) turn?.reject(error);
    else turn?.resolve();

    this.armIdleTimer();
  }

  // An idle process is closed, but not while background tasks it started are still running.
  private armIdleTimer() {
    if (this.closed) return;

    clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => (this.backgroundTasks > 0 ? this.armIdleTimer() : this.close()), IDLE_MS);
    this.idleTimer.unref();
  }
}
