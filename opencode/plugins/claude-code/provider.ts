// AI SDK v3 language model backed by Claude Code. Claude Code is the harness: it uses its own tools,
// skills, MCP servers, hooks and subagents, and OpenCode shows what it did. Claude can hand work to OpenCode
// subagents (for example GPT-backed agents) through a bridged tool, and Claude Code's own subagents are mirrored
// into OpenCode child sessions.
// OpenCode loads this module through `aisdk:file://…` and calls its single `create*` export.
import type { Options, SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import type {
  LanguageModelV3,
  LanguageModelV3CallOptions,
  LanguageModelV3Content,
  LanguageModelV3Prompt,
  LanguageModelV3StreamPart,
  LanguageModelV3ToolResultPart,
  LanguageModelV3Usage,
  SharedV3ProviderMetadata,
  SharedV3Warning,
} from "@ai-sdk/provider";
import { z } from "zod";
import { attachmentBlock } from "./attachments.js";
import { isCheckpoint, unseenPrompts } from "./checkpoint.js";
import { Settings, claudeOptions } from "./claude-options.js";
import { compactedKey } from "./compaction.js";
import { ASK_TOOL, QuestionBridge } from "./questions.js";
import { SERVER_NAME, TOOL_NAME as SUBAGENT_TOOL_NAME, openCodeSubagentServer } from "./opencode-subagent.js";
import { METADATA_KEY, MIRROR_MODEL_ID, MirrorChannel, PROVIDER_ID, WAKE_TEXT, registry } from "./registry.js";
import { type Content, SessionRuntime } from "./runtime.js";
import { Totals, type TurnUsage } from "./turn-usage.js";

const SUBAGENT_TOOLS = new Set(["Agent", "Task"]);

// OpenCode sends its own mid-conversation system messages, such as its tool catalog, as user text in this wrapper.
// They describe OpenCode's harness, not Claude Code's, so they are not forwarded.
const SYSTEM_UPDATE_TAG = "<system-update>";

const MIRROR_RETENTION_MS = 30 * 60_000;

type StreamEvent = Extract<SDKMessage, { type: "stream_event" }>["event"];

type ResultMessage = Extract<SDKMessage, { type: "result" }>;

// Token counts of one API call, as streamed per message or summed in the result message.
type CallUsage = {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens: number | null;
  cache_creation_input_tokens: number | null;
};

type AssistantContent = Extract<SDKMessage, { type: "assistant" }>["message"]["content"];

type UserContent = Extract<SDKMessage, { type: "user" }>["message"]["content"];

type ToolUse = { id: string; name: string; input: unknown };

type ToolResultContent = Extract<Exclude<UserContent, string>[number], { type: "tool_result" }>["content"];

const SessionMetadata = z.object({ sessionId: z.string() });

type Emit = (part: LanguageModelV3StreamPart) => void;

// Each Claude Code process answers its permission requests through its own bridge.
const bridges = new WeakMap<SessionRuntime, QuestionBridge>();

// Child sessions showing a process's own subagents. They belong to the process rather than to one OpenCode step,
// since a background subagent keeps working after the step that started it has ended.
class MirrorSet {
  readonly byToolUse = new Map<string, { channel: MirrorChannel; translator: MessageTranslator }>();

  // Subagents running in the background; their tool result only reports the launch.
  readonly background = new Set<string>();

  end(toolUseId: string) {
    this.byToolUse.get(toolUseId)?.channel.end();
    this.byToolUse.delete(toolUseId);
    this.background.delete(toolUseId);
  }

  endAll() {
    for (const toolUseId of [...this.byToolUse.keys()]) this.end(toolUseId);
  }
}

const mirrorSets = new WeakMap<SessionRuntime, MirrorSet>();

// OpenCode passes this provider's settings mixed with its own request options; parsing keeps only the former.
export function createClaudeCodeAgent(options: Settings) {
  const settings = Settings.parse(options);

  return {
    languageModel: (modelId: string) => (modelId === MIRROR_MODEL_ID ? new SubagentMirrorModel() : new ClaudeCodeAgentModel(modelId, settings)),
  };
}

abstract class StreamingModel implements LanguageModelV3 {
  readonly specificationVersion = "v3";

  readonly provider = PROVIDER_ID;

  readonly supportedUrls = {};

  abstract readonly modelId: string;

  abstract doStream(options: LanguageModelV3CallOptions): Promise<{ stream: ReadableStream<LanguageModelV3StreamPart>; request?: { body?: unknown } }>;

  async doGenerate(options: LanguageModelV3CallOptions) {
    const { stream, request } = await this.doStream(options);
    const content: LanguageModelV3Content[] = [];
    const text = new Map<string, string>();
    const warnings: SharedV3Warning[] = [];
    let finish: Extract<LanguageModelV3StreamPart, { type: "finish" }> | undefined;

    for await (const part of stream) {
      if (part.type === "stream-start") warnings.push(...part.warnings);

      if (part.type === "text-delta") text.set(part.id, (text.get(part.id) ?? "") + part.delta);

      if (part.type === "text-end") content.push({ type: "text", text: text.get(part.id) ?? "" });

      if (part.type === "tool-call" || part.type === "tool-result") content.push(part);

      if (part.type === "finish") finish = part;

      if (part.type === "error") throw part.error;
    }

    if (!finish) throw new Error("Claude Code ended without a result");

    return { content, finishReason: finish.finishReason, usage: finish.usage, providerMetadata: finish.providerMetadata, request, warnings };
  }
}

class ClaudeCodeAgentModel extends StreamingModel {
  constructor(
    readonly modelId: string,
    private readonly settings: Settings,
  ) {
    super();
  }

  async doStream(options: LanguageModelV3CallOptions) {
    const openCodeSession = header(options.headers, "x-opencode-session-id");
    const compacted = hasCheckpoint(options.prompt) ? await compactedSession(openCodeSession) : undefined;
    const { content: prompted, resume, wake } = buildPrompt(options.prompt, compacted);
    const runtime = await this.runtime(openCodeSession, resume);
    const content = runtime.withoutSteered(prompted);
    const bridge = bridges.get(runtime) ?? new QuestionBridge();
    const mirrors = mirrorSets.get(runtime) ?? new MirrorSet();
    const modelId = this.modelId;

    // A step that follows a question starts with OpenCode's answer to it.
    for (const result of trailingToolResults(options.prompt)) bridge.answer(result.toolCallId, result.output);

    bridge.dismissUnanswered();
    const warnings: SharedV3Warning[] = [];

    if (options.tools?.length) warnings.push({ type: "other", message: "Claude Code runs its own tools; OpenCode tools were not offered" });

    // Interrupting stops the turn; the process stays up for the session's next turn.
    const interrupt = () => void runtime.interrupt().catch(() => undefined);
    let cancelled = false;

    const stream = new ReadableStream<LanguageModelV3StreamPart>({
      async start(controller) {
        // OpenCode cancels the stream when it aborts the step; Claude's closing messages for that turn are dropped.
        const emit: Emit = (part) => {
          if (!cancelled) controller.enqueue(part);
        };

        const translator = new MainTranslator(emit, openCodeSession, modelId, mirrors, (result) => runtime.usageOf(result));
        const handle = (message: SDKMessage) => translator.handle(message);
        let markParked = () => {};

        // A question ends the step early; Claude's turn keeps running and the next step follows it.
        const parked = new Promise<"parked">((resolve) => {
          markParked = () => resolve("parked");
        });

        bridge.open({
          emit,
          park: () => {
            translator.park();
            runtime.detach();
            markParked();
          },
        });
        controller.enqueue({ type: "stream-start", warnings });
        options.abortSignal?.addEventListener("abort", interrupt, { once: true });

        try {
          const replays = runtime.hasUnclaimed;

          // Output no step has shown yet comes first: a turn Claude started on its own, or the rest of a turn that
          // asked a question. When a new message follows, that output's result does not end this step.
          if (replays) {
            const replay = runtime.attach((message) => {
              if (content.length === 0 || message.type !== "result") handle(message);
            });

            if ((await Promise.race([replay, parked])) === "parked") return;
          }

          // A step whose message Claude already received mid-turn, or a wake whose output is already shown, has
          // nothing left to send.
          const sentEarlier = prompted.length > 0 || wake;
          let turn: Promise<void> | undefined;

          if (content.length > 0) turn = runtime.turn(content, handle);
          else if (!replays && !sentEarlier) turn = runtime.turn([{ type: "text", text: "Continue." }], handle);
          else if (!replays) translator.finishWithoutTurn();

          if (turn && (await Promise.race([turn, parked])) === "parked") return;

          translator.close();
        } catch (error) {
          controller.enqueue({ type: "error", error });
        } finally {
          bridge.close();
          options.abortSignal?.removeEventListener("abort", interrupt);

          if (!cancelled) controller.close();

          // Without an OpenCode session there is no later turn to keep the process for.
          if (openCodeSession === undefined) runtime.close();
        }
      },
      cancel() {
        cancelled = true;
        interrupt();
      },
    });

    return { stream, request: { body: { content, resume } } };
  }

  // The session's running process, when it still serves this model and conversation; otherwise a new process that
  // resumes the conversation's Claude session.
  private async runtime(openCodeSession: string | undefined, resume: string | undefined) {
    const identity = `${this.modelId}#${this.settings.effort ?? ""}`;
    const runtimes = registry().runtimes;
    const existing = openCodeSession === undefined ? undefined : runtimes.get(openCodeSession);

    if (existing?.alive && !existing.busy && existing.identity === identity && existing.sessionId === resume) return existing;

    existing?.close();

    const bridge = new QuestionBridge();
    const mirrors = new MirrorSet();

    const options = await this.sdkOptions(openCodeSession, resume, bridge);
    const totals = resume === undefined ? {} : await usageTotals(resume);

    const runtime = new SessionRuntime(identity, options, totals, {
      // A steered message that started a new turn is followed by OpenCode's own step for it, so it needs no wake.
      onWake: (woken) => {
        if (!woken.steering) wakeSession(openCodeSession);
      },
      onClosed: (closed) => {
        mirrors.endAll();

        if (openCodeSession !== undefined && runtimes.get(openCodeSession) === closed) runtimes.delete(openCodeSession);
      },
      onUsage: (sessionId, sessionTotals) => {
        void registry().context?.storage.set(usageKey(sessionId), sessionTotals).catch(() => undefined);
      },
    });

    bridges.set(runtime, bridge);
    mirrorSets.set(runtime, mirrors);

    if (openCodeSession !== undefined) runtimes.set(openCodeSession, runtime);

    return runtime;
  }

  private async sdkOptions(openCodeSession: string | undefined, resume: string | undefined, bridge: QuestionBridge): Promise<Options> {
    const options: Options = {
      ...claudeOptions(this.settings, this.modelId, openCodeSession),
      includePartialMessages: true,
      forwardSubagentText: true,
      canUseTool: bridge.canUseTool,
    };

    const context = registry().context;

    if (openCodeSession !== undefined && context) {
      options.mcpServers = { [SERVER_NAME]: await openCodeSubagentServer(context, openCodeSession) };
      options.allowedTools = [SUBAGENT_TOOL_NAME];
    }

    if (resume !== undefined) options.resume = resume;

    return options;
  }
}

// Model of the OpenCode child sessions that show Claude Code's own subagents. It never calls Claude: it replays
// the transcript the parent run forwards for that subagent.
class SubagentMirrorModel extends StreamingModel {
  readonly modelId = MIRROR_MODEL_ID;

  async doStream(options: LanguageModelV3CallOptions) {
    const session = header(options.headers, "x-opencode-session-id");
    const channel = session === undefined ? undefined : registry().mirrors.get(session);

    const stream = new ReadableStream<LanguageModelV3StreamPart>({
      async start(controller) {
        controller.enqueue({ type: "stream-start", warnings: [] });

        if (channel) {
          for await (const part of channel.read(options.abortSignal)) controller.enqueue(part);
        } else {
          const id = "mirror-notice";

          controller.enqueue({ type: "text-start", id });
          controller.enqueue({
            type: "text-delta",
            id,
            delta: "This session shows a Claude Code subagent's transcript. It can't take new messages; continue in the parent session.",
          });
          controller.enqueue({ type: "text-end", id });
        }

        controller.enqueue({ type: "finish", finishReason: { unified: "stop", raw: "mirror" }, usage: usage(undefined) });
        controller.close();
      },
    });

    return { stream };
  }
}

// Starts an OpenCode step so the output Claude Code produced on its own, for example after a background task
// finished, reaches the session.
function wakeSession(openCodeSession: string | undefined) {
  const context = registry().context;

  if (!context || openCodeSession === undefined) return;

  context.session
    .synthetic({ sessionID: openCodeSession, text: WAKE_TEXT, description: "Claude Code background work finished" })
    .catch((error) => console.error(`[claude-code] could not wake session ${openCodeSession}: ${String(error)}`));
}

// Tool results OpenCode appended after the newest assistant step.
function trailingToolResults(prompt: LanguageModelV3Prompt) {
  const results: LanguageModelV3ToolResultPart[] = [];

  for (let index = prompt.length - 1; index >= 0; index--) {
    const message = prompt[index];

    if (message.role !== "tool") break;

    for (const part of message.content) if (part.type === "tool-result") results.push(part);
  }

  return results;
}

function header(headers: Record<string, string | undefined> | undefined, name: string) {
  for (const [key, value] of Object.entries(headers ?? {})) if (key.toLowerCase() === name && value) return value;

  return undefined;
}

function sessionIdOf(part: { providerOptions?: SharedV3ProviderMetadata }) {
  return SessionMetadata.safeParse(part.providerOptions?.[METADATA_KEY]).data?.sessionId;
}

function hasCheckpoint(prompt: LanguageModelV3Prompt) {
  return prompt.some((message) => message.role === "user" && isCheckpoint(textOf(message.content)));
}

// The Claude session the compaction hook compacted for this OpenCode session.
async function compactedSession(openCodeSession: string | undefined) {
  const context = registry().context;

  if (!context || openCodeSession === undefined) return undefined;

  return z.string().safeParse(await context.storage.get(compactedKey(openCodeSession))).data;
}

const usageKey = (claudeSession: string) => `usage:${claudeSession}`;

// The Claude session's token totals as its last turn reported them, which a process that resumes the session
// continues from.
async function usageTotals(claudeSession: string) {
  const stored = await registry().context?.storage.get(usageKey(claudeSession));

  return Totals.safeParse(stored).data ?? {};
}

// OpenCode replays each part's providerMetadata as providerOptions, so the newest assistant message that carries
// a Claude session ID marks where Claude's own transcript ends. After a compaction there is no such message; the
// provider then resumes the Claude session Claude Code compacted, which already holds everything before the prompts
// it has not seen.
function buildPrompt(prompt: LanguageModelV3Prompt, compacted: string | undefined) {
  let resume: string | undefined;
  let start = 0;

  for (let index = prompt.length - 1; index >= 0 && resume === undefined; index--) {
    const message = prompt[index];

    if (message.role !== "assistant") continue;

    for (const part of message.content) {
      resume = sessionIdOf(part);

      if (resume === undefined) continue;

      start = index + 1;
      break;
    }
  }

  const content: Content = [];
  const resumesCompacted = resume === undefined && compacted !== undefined;
  let wake = false;

  if (resumesCompacted) resume = compacted;

  for (const message of prompt.slice(start)) {
    const text = message.role === "user" ? textOf(message.content) : "";

    if (resumesCompacted && isCheckpoint(text)) {
      content.push(...unseenPrompts(text).map((prompt) => ({ type: "text" as const, text: prompt })));
      continue;
    }

    if (message.role === "user") {
      for (const part of message.content) {
        if (part.type === "text" && part.text === WAKE_TEXT) wake = true;
        else if (part.type === "text" && part.text && !part.text.startsWith(SYSTEM_UPDATE_TAG)) content.push({ type: "text", text: part.text });

        if (part.type === "file") content.push(attachmentBlock(part));
      }
    }

    // Without a session to resume, carry earlier assistant turns as plain transcript.
    if (message.role === "assistant" && resume === undefined) {
      const reply = textOf(message.content);

      if (reply) content.push({ type: "text", text: `[Earlier assistant reply]\n${reply}` });
    }
  }

  return { content, resume, wake };
}

function textOf(content: ReadonlyArray<{ type: string; text?: string }>) {
  return content.flatMap((part) => (part.type === "text" && part.text ? [part.text] : [])).join("\n");
}

// Turns complete SDK messages into stream parts. Subagent transcripts arrive this way.
class MessageTranslator {
  protected readonly toolNames = new Map<string, string>();

  private messageCount = 0;

  constructor(protected readonly emit: Emit) {}

  protected metadata(): SharedV3ProviderMetadata | undefined {
    return undefined;
  }

  assistantBlocks(content: AssistantContent, includeText: boolean) {
    this.messageCount++;

    content.forEach((block, index) => {
      const id = `m${this.messageCount}-b${index}`;

      if (includeText && block.type === "text" && block.text) {
        this.emit({ type: "text-start", id });
        this.emit({ type: "text-delta", id, delta: block.text });
        this.emit({ type: "text-end", id });
      }

      if (includeText && block.type === "thinking" && block.thinking) {
        this.emit({ type: "reasoning-start", id });
        this.emit({ type: "reasoning-delta", id, delta: block.thinking });
        this.emit({ type: "reasoning-end", id });
      }

      if (block.type === "tool_use") this.toolCall(block);
    });
  }

  protected toolCall(block: ToolUse) {
    this.toolNames.set(block.id, block.name);
    this.emit({
      type: "tool-call",
      toolCallId: block.id,
      toolName: block.name,
      input: JSON.stringify(block.input ?? {}),
      providerExecuted: true,
      dynamic: true,
      providerMetadata: this.metadata(),
    });
  }

  toolResults(content: UserContent) {
    if (!Array.isArray(content)) return;

    for (const block of content) {
      if (block.type !== "tool_result") continue;

      const toolName = this.toolNames.get(block.tool_use_id);

      if (toolName === undefined) continue;

      this.emit({
        type: "tool-result",
        toolCallId: block.tool_use_id,
        toolName,
        result: toolResultText(block.content),
        isError: block.is_error === true,
        dynamic: true,
      });
      this.toolResultSeen(block.tool_use_id);
    }
  }

  protected toolResultSeen(_toolUseId: string) {}
}

class MainTranslator extends MessageTranslator {
  private sessionId: string | undefined;

  // The API model ID the main thread ran on, such as `claude-opus-5-5` for the `opus` alias.
  private apiModel: string | undefined;

  private readonly blocks = new Map<number, { id: string; kind: "text" | "reasoning" }>();

  private streamCount = 0;

  private finished = false;

  // Usage of the newest main-thread API call. The result message sums every call in the turn, so each tool step's
  // cached context is counted again; OpenCode reads a step's input tokens as the current context size.
  private lastCall: CallUsage | undefined;

  constructor(
    emit: Emit,
    private readonly openCodeSession: string | undefined,
    private readonly modelId: string,
    private readonly mirrors: MirrorSet,
    private readonly usageOf: (result: ResultMessage) => TurnUsage | undefined,
  ) {
    super(emit);
  }

  // The compaction hook reads the session and model from the newest reply's metadata; usage tools read the API
  // model.
  protected override metadata() {
    if (this.sessionId === undefined) return undefined;

    const entry = this.apiModel === undefined ? { sessionId: this.sessionId, model: this.modelId } : { sessionId: this.sessionId, model: this.modelId, apiModel: this.apiModel };

    return { [METADATA_KEY]: entry };
  }

  handle(message: SDKMessage) {
    if ("session_id" in message) this.sessionId = message.session_id;

    const parent = "parent_tool_use_id" in message ? message.parent_tool_use_id : null;

    if (parent) return this.forwardToMirror(parent, message);

    if (message.type === "assistant") this.apiModel = message.message.model;

    if (message.type === "system" && message.subtype === "task_started" && message.is_backgrounded && message.tool_use_id) {
      this.mirrors.background.add(message.tool_use_id);
    }

    // A background subagent's mirror ends when Claude Code reports the task finished.
    if (message.type === "system" && message.subtype === "task_notification" && message.tool_use_id) this.mirrors.end(message.tool_use_id);

    if (message.type === "stream_event") return this.streamEvent(message.event);

    // Text and thinking already streamed through partial events; only tool calls remain.
    if (message.type === "assistant") return this.assistantBlocks(message.message.content, false);

    if (message.type === "user") return this.toolResults(message.message.content);

    if (message.type === "result") return this.result(message);
  }

  protected override toolCall(block: ToolUse) {
    // A question is shown through OpenCode's own question tool instead.
    if (block.name === ASK_TOOL) return;

    super.toolCall(block);

    if (SUBAGENT_TOOLS.has(block.name)) this.startMirror(block);
  }

  protected override toolResultSeen(toolUseId: string) {
    if (!this.mirrors.background.has(toolUseId)) this.mirrors.end(toolUseId);
  }

  private startMirror(block: ToolUse) {
    const context = registry().context;

    if (!context || this.openCodeSession === undefined) return;

    const input = SubagentInput.safeParse(block.input);
    const description = input.data?.description ?? "Claude Code subagent";
    const type = input.data?.subagent_type ?? "general-purpose";
    const prompt = input.data?.prompt ?? description;
    const channel = new MirrorChannel();
    const parentID = this.openCodeSession;

    this.mirrors.byToolUse.set(block.id, { channel, translator: new MessageTranslator((part) => channel.push(part)) });

    const mirror = async () => {
      const child = await context.session.create({
        parentID,
        title: `${description} (Claude ${type})`,
        model: { providerID: PROVIDER_ID, id: MIRROR_MODEL_ID },
      });

      registry().mirrors.set(child.id, channel);
      setTimeout(() => registry().mirrors.delete(child.id), MIRROR_RETENTION_MS).unref();
      await context.session.prompt({ sessionID: child.id, text: prompt });
    };

    mirror().catch((error) => {
      channel.end();
      console.error(`[claude-code] could not mirror subagent ${block.id}: ${String(error)}`);
    });
  }

  private forwardToMirror(parent: string, message: SDKMessage) {
    const mirror = this.mirrors.byToolUse.get(parent);

    if (!mirror) return;

    if (message.type === "assistant") mirror.translator.assistantBlocks(message.message.content, true);

    if (message.type === "user") mirror.translator.toolResults(message.message.content);
  }

  private streamEvent(event: StreamEvent) {
    if (event.type === "message_start") {
      this.lastCall = event.message.usage;
      this.streamCount++;
      this.blocks.clear();

      return;
    }

    if (event.type === "message_delta" && this.lastCall) {
      this.lastCall = { ...this.lastCall, output_tokens: event.usage.output_tokens };

      return;
    }

    if (event.type === "content_block_start") {
      const type = event.content_block.type;

      if (type !== "text" && type !== "thinking") return;

      const kind = type === "text" ? "text" : "reasoning";
      const id = `s${this.streamCount}-b${event.index}`;

      this.blocks.set(event.index, { id, kind });
      this.emit({ type: kind === "text" ? "text-start" : "reasoning-start", id, providerMetadata: this.metadata() });

      return;
    }

    if (event.type === "content_block_delta") {
      const block = this.blocks.get(event.index);

      if (block && event.delta.type === "text_delta") this.emit({ type: "text-delta", id: block.id, delta: event.delta.text });

      if (block && event.delta.type === "thinking_delta") this.emit({ type: "reasoning-delta", id: block.id, delta: event.delta.thinking });

      return;
    }

    if (event.type === "content_block_stop") {
      const block = this.blocks.get(event.index);

      if (!block) return;

      this.blocks.delete(event.index);
      this.emit({ type: block.kind === "text" ? "text-end" : "reasoning-end", id: block.id, providerMetadata: this.metadata() });
    }
  }

  private result(message: ResultMessage) {
    if (this.finished) return;

    this.finished = true;

    if (message.subtype !== "success" || message.is_error) {
      const detail = message.subtype === "success" ? message.result : message.errors.join("; ");

      this.emit({ type: "error", error: new Error(`Claude Code run failed (${message.subtype}): ${detail}`) });
    }

    const metadata: SharedV3ProviderMetadata = {
      [METADATA_KEY]: {
        ...this.metadata()?.[METADATA_KEY],
        // Every model call of the turn, subagents included, by model; the step's own usage is only the last call.
        usage: this.usageOf(message),
        numTurns: message.num_turns,
        durationMs: message.duration_ms,
      },
    };

    this.emit({
      type: "finish",
      finishReason: { unified: message.is_error ? "error" : "stop", raw: message.subtype },
      usage: usage(this.lastCall ?? message.usage),
      providerMetadata: metadata,
    });
  }

  // Ends the step on a question for the user while Claude's turn waits for the answer.
  park() {
    this.finished = true;
    this.emit({ type: "finish", finishReason: { unified: "tool-calls", raw: "ask_user_question" }, usage: usage(this.lastCall), providerMetadata: this.metadata() });
  }

  // Ends a step that had nothing to show, such as a wake whose output an earlier step already replayed.
  finishWithoutTurn() {
    this.finished = true;
    this.emit({ type: "finish", finishReason: { unified: "stop", raw: "no-output" }, usage: usage(undefined), providerMetadata: this.metadata() });
  }

  close() {
    if (!this.finished) this.emit({ type: "error", error: new Error("Claude Code ended without a result") });
  }
}

const SubagentInput = z.object({
  description: z.string().optional(),
  subagent_type: z.string().optional(),
  prompt: z.string().optional(),
});

function toolResultText(content: ToolResultContent): string {
  if (content === undefined) return "";

  if (!Array.isArray(content)) return content;

  return content.map((item) => (item.type === "text" ? item.text : `[${item.type}]`)).join("\n");
}

function usage(input: CallUsage | undefined): LanguageModelV3Usage {
  const noCache = input?.input_tokens ?? 0;
  const cacheRead = input?.cache_read_input_tokens ?? 0;
  const cacheWrite = input?.cache_creation_input_tokens ?? 0;

  return {
    inputTokens: { total: noCache + cacheRead + cacheWrite, noCache, cacheRead, cacheWrite },
    outputTokens: { total: input?.output_tokens ?? 0, text: undefined, reasoning: undefined },
  };
}
