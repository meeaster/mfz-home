import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { homedir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import type { PluginModule, ToolDefinition } from "@opencode-ai/plugin";

/**
 * Advisor plugin — a client-side port of Anthropic's server-side `advisor` tool.
 *
 * The executor (the agent running the session) calls `advisor()` with no
 * arguments. We forward the full transcript of the current session to a
 * stronger advisor model and return its guidance. Timing is the executor's
 * signal; context is supplied by us. This mirrors the empty-input design of the
 * native tool: the model decides WHEN, the harness supplies WHAT.
 *
 * Configure one or more advisor targets with
 * OPENCODE_ADVISOR_MODELS="opencode:provider/model@variant,claude-code:alias@effort".
 * OPENCODE_ADVISOR_MODEL remains the single native OpenCode fallback.
 */

// Verbatim invocation guidance, reproduced from Claude Code's own `advisor`
// tool description. Kept identical on purpose: this is the always-loaded text
// that drives the executor to call the tool at the right moments.
const ADVISOR_DESCRIPTION = `Consult a stronger reviewer who sees your full conversation transcript.

No parameters. When you call advisor(), your entire history -- task, every tool call and result, your reasoning -- is automatically forwarded. The advisor sees exactly what you've done.

Call advisor BEFORE substantive work -- before writing, before committing to an interpretation, before building on an assumption. If the task requires orientation first (finding files, fetching a source, seeing what's there), do that, then call advisor. Orientation is not substantive work. Writing, editing, and declaring an answer are.

Also call advisor:
- When you believe the task is complete. BEFORE this call, make your deliverable durable: write the file, save the result, commit the change. The advisor call takes time; if the session ends during it, a durable result persists and an unwritten one doesn't.
- When stuck -- errors recurring, approach not converging, results that don't fit.
- When considering a change of approach.

On tasks longer than a few steps, call advisor at least once before committing to an approach and once before declaring done. On short reactive tasks where the next action is dictated by tool output you just read, you don't need to keep calling -- the advisor adds most of its value on the first call, before the approach crystallizes.

Give the advice serious weight. If you follow a step and it fails empirically, or you have primary-source evidence that contradicts a specific claim (the file says X, the paper states Y), adapt. A passing self-test is not evidence the advice is wrong -- it's evidence your test doesn't check what the advice is checking.

If you've already retrieved data pointing one way and the advisor points another: don't silently switch. Surface the conflict in one more advisor call -- "I found X, you suggest Y, which constraint breaks the tie?" The advisor saw your evidence but may have underweighted it; a reconcile call is cheaper than committing to the wrong branch.

Before calling advisor(), write one sentence stating what the task asks and your initial read. The advisor reads your transcript; a one-line framing gives it something to respond to.`;

// The advisor's own review instructions. Anthropic's server-side advisor prompt
// is not exposed, so this is ours. It encodes the reviewer role we observed:
// prioritize the one load-bearing issue, confirm-and-proceed when sound, never
// rewrite, stay concrete.
const ADVISOR_SYSTEM_BASELINE = `You are the advisor: a stronger reviewer model consulted mid-task by a capable but faster executor model. You have just been handed the executor's full transcript -- its task, every tool call and result, and its reasoning so far.

Give strategic guidance, not a rewrite. Your job is to catch what the executor is about to get wrong before it commits, or to confirm it is on track and should proceed.

- Lead with the single most important thing: the load-bearing decision, the flawed assumption, the bug the executor hasn't noticed, or the gap between what the task asked and what the executor is doing.
- If the work is sound, say so plainly and say "proceed". Do not invent problems or request cosmetic changes -- a false alarm costs the executor a turn.
- Be concrete and testable. Name the specific step, file, or claim. Prefer "the lock is held across submit(), so shutdown() can starve" over "watch out for concurrency".
- Distinguish blocking issues from nits: say which must be fixed before proceeding and which are optional.
- You have no tools and cannot act. Reason only from the transcript you were given; do not ask the executor to run things for you.
- Be concise. A few tight paragraphs beat a long list.`;

const ADVISOR_SYSTEM_GPT56 = `You are the advisor: a stronger reviewer model consulted mid-task by a capable but faster executor model. You have just been handed the executor's full transcript -- its task, every tool call and result, and its reasoning so far.

Give strategic guidance, not a rewrite. Your job is to catch what the executor is about to get wrong before it commits, or to confirm it is on track and should proceed.

- Lead with the single most important thing: the load-bearing decision, the flawed assumption, the bug the executor hasn't noticed, or the gap between what the task asked and what the executor is doing.
- If the work is sound, say so plainly and say "proceed". Do not invent problems or request cosmetic changes -- a false alarm costs the executor a turn.
- Be concrete and testable. Name the specific step, file, or claim. Prefer "the lock is held across submit(), so shutdown() can starve" over "watch out for concurrency".
- Distinguish blocking issues from nits: say which must be fixed before proceeding and which are optional.
- You have no tools and cannot act. Reason only from the transcript. If the evidence is insufficient, name the smallest specific evidence the executor must gather before deciding; do not guess or request broad exploration.
- Lead with the conclusion. Include the evidence needed to support it, any material caveat, and the next action. Omit repetition and secondary detail.`;

// Disabled in the advisor's review session: it must not mutate anything, and it
// must never call `advisor` again (infinite recursion).
const CHILD_TOOL_OVERRIDES: Record<string, boolean> = {
  advisor: false,
  write: false,
  edit: false,
  patch: false,
  bash: false,
  task: false,
  delegate_general: false,
};

type OpenCodeAdvisorTarget = {
  harness: "opencode";
  providerID: string;
  modelID: string;
  variant?: string;
};

type ClaudeCodeAdvisorTarget = {
  harness: "claude-code";
  modelID: string;
  effort: string;
};

export type AdvisorTarget = OpenCodeAdvisorTarget | ClaudeCodeAdvisorTarget;

function resolveOpenCodeAdvisorModel(raw: string): OpenCodeAdvisorTarget {
  const at = raw.indexOf("@");
  const variant = at >= 0 ? raw.slice(at + 1) || undefined : undefined;
  const modelPart = at >= 0 ? raw.slice(0, at) : raw;
  const slash = modelPart.indexOf("/");
  const base =
    slash <= 0
      ? { providerID: "anthropic", modelID: modelPart }
      : { providerID: modelPart.slice(0, slash), modelID: modelPart.slice(slash + 1) };
  return variant ? { harness: "opencode", ...base, variant } : { harness: "opencode", ...base };
}

function parseAdvisorTarget(raw: string): AdvisorTarget {
  const separator = raw.indexOf(":");
  const harness = raw.slice(0, separator);
  const model = raw.slice(separator + 1);
  if (separator <= 0 || model.length === 0) {
    throw new Error(`Invalid advisor target "${raw}". Use opencode:provider/model@variant or claude-code:model@effort.`);
  }
  if (harness === "opencode") return resolveOpenCodeAdvisorModel(model);
  if (harness === "claude-code") {
    const at = model.indexOf("@");
    const modelID = at >= 0 ? model.slice(0, at) : model;
    const effort = at >= 0 ? model.slice(at + 1) : "";
    if (modelID.length === 0 || effort.length === 0) {
      throw new Error(`Invalid Claude Code advisor target "${raw}". Include both model and effort.`);
    }
    return { harness, modelID, effort };
  }
  throw new Error(`Unsupported advisor harness "${harness}". Use opencode or claude-code.`);
}

export function resolveAdvisorTargets(): AdvisorTarget[] {
  const configured = process.env.OPENCODE_ADVISOR_MODELS?.trim();
  if (configured) return configured.split(",").map((target) => parseAdvisorTarget(target.trim()));
  return [resolveOpenCodeAdvisorModel(process.env.OPENCODE_ADVISOR_MODEL ?? "anthropic/claude-opus-4-8")];
}

function modelLabel(model: { modelID: string; variant?: string }): string {
  return model.variant ? `${model.modelID}@${model.variant}` : model.modelID;
}

function targetLabel(target: AdvisorTarget): string {
  return target.harness === "opencode"
    ? `opencode:${target.providerID}/${modelLabel(target)}`
    : `claude-code:${target.modelID}@${target.effort}`;
}

type AdvisorPromptVariant = "baseline" | "gpt56";

export function resolveAdvisorPrompt(
  modelID: string,
  mode = process.env.OPENCODE_ADVISOR_PROMPT ?? "auto",
): { variant: AdvisorPromptVariant; system: string } {
  if (mode === "baseline") return { variant: "baseline", system: ADVISOR_SYSTEM_BASELINE };
  if (mode === "gpt56") return { variant: "gpt56", system: ADVISOR_SYSTEM_GPT56 };
  if (mode === "auto") {
    return modelID.startsWith("gpt-5.6")
      ? { variant: "gpt56", system: ADVISOR_SYSTEM_GPT56 }
      : { variant: "baseline", system: ADVISOR_SYSTEM_BASELINE };
  }
  throw new Error(`Invalid OPENCODE_ADVISOR_PROMPT value "${mode}". Use auto, baseline, or gpt56.`);
}

type Role = "user" | "assistant" | string;

type MessageEntry = {
  info?: {
    id?: string;
    parentID?: string;
    role?: Role;
    providerID?: string;
    modelID?: string;
    variant?: string;
    summary?: boolean;
    finish?: string;
    error?: unknown;
    cost?: number;
    tokens?: {
      total?: number;
      input?: number;
      output?: number;
      reasoning?: number;
      cache?: { read?: number; write?: number };
    };
  };
  parts?: Array<Record<string, unknown>>;
};

type Gpt56Tier = "luna" | "terra" | "sol";

const GPT56_TIERS: Record<Gpt56Tier, number> = { luna: 0, terra: 1, sol: 2 };

function gpt56Tier(modelID: string | undefined): Gpt56Tier | undefined {
  const match = modelID?.match(/^gpt-5\.6-(luna|terra|sol)(?:-(?:fast|pro))?$/);
  return match?.[1] as Gpt56Tier | undefined;
}

function advisorUnavailable(executorModelID: string | undefined, advisorModelID: string): boolean {
  const executorTier = gpt56Tier(executorModelID);
  const advisorTier = gpt56Tier(advisorModelID);
  return Boolean(executorTier && advisorTier && GPT56_TIERS[executorTier] >= GPT56_TIERS[advisorTier]);
}

export function advisorAvailabilityPrompt(executorModelID: string | undefined): string | undefined {
  let targets: AdvisorTarget[];
  try {
    targets = resolveAdvisorTargets();
  } catch {
    return undefined;
  }
  const eligible = targets.some(
    (target) => target.harness === "claude-code" || !advisorUnavailable(executorModelID, target.modelID),
  );
  if (eligible) return undefined;
  const advisor = targets.find((target): target is OpenCodeAdvisorTarget => target.harness === "opencode");
  if (!advisor) return undefined;
  return `Do not call the advisor tool: your ${executorModelID} model is equal to or stronger than the configured advisor model ${advisor.modelID}, so it cannot provide a stronger review.`;
}

type PromptResult = {
  parts?: Array<Record<string, unknown>>;
};

type SessionClient = {
  get(input: { path: { id: string }; query?: { directory?: string } }): Promise<{
    data?: { parentID?: string };
    error?: unknown;
  }>;
  messages(input: {
    path: { id: string };
    query?: { directory?: string; limit?: number };
  }): Promise<{ data?: MessageEntry[]; error?: unknown }>;
  create(input: {
    body: { parentID: string; title: string };
    query: { directory: string };
  }): Promise<{ data?: { id: string }; error?: unknown }>;
  prompt(input: {
    path: { id: string };
    query?: { directory?: string };
    body: {
      model: { providerID: string; modelID: string };
      variant?: string;
      system?: string;
      tools?: Record<string, boolean>;
      parts: Array<{ type: "text"; text: string }>;
    };
  }): Promise<{ data?: PromptResult; error?: unknown }>;
  delete(input: { path: { id: string }; query?: { directory?: string } }): Promise<unknown>;
};

function str(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/** Render one transcript part into a plain-text line, or "" to skip it. */
function renderPart(part: Record<string, unknown>): string {
  const type = str(part.type);
  if (type === "text") {
    if (part.synthetic === true || part.ignored === true) return "";
    return str(part.text)?.trim() ?? "";
  }
  if (type === "reasoning") {
    // Match OpenCode's cross-model replay: forward visible reasoning, never provider metadata or signatures.
    const text = str(part.text)?.trim();
    return text ? `[reasoning]\n${text}` : "";
  }
  if (type === "tool") {
    const name = str(part.tool) ?? "tool";
    const state = (part.state ?? {}) as Record<string, unknown>;
    const status = str(state.status);
    const input = state.input !== undefined ? JSON.stringify(state.input) : "";
    if (status === "completed") {
      const time = state.time as { compacted?: unknown } | undefined;
      const output = time?.compacted !== undefined ? "[Old tool result content cleared]" : (str(state.output)?.trim() ?? "");
      return `[tool ${name}] input=${input}\n-> ${output}`;
    }
    if (status === "error") {
      return `[tool ${name}] input=${input}\n-> ERROR: ${str(state.error)?.trim() ?? ""}`;
    }
    return `[tool ${name}] (${status ?? "pending"})`;
  }
  return "";
}

function serializeTranscript(messages: MessageEntry[]): string {
  const blocks: string[] = [];
  for (const message of messages) {
    const role = message.info?.role ?? "unknown";
    const rendered = (message.parts ?? [])
      .map(renderPart)
      .filter((line) => line.length > 0)
      .join("\n");
    if (rendered.length > 0) blocks.push(`## ${role}\n${rendered}`);
  }
  return blocks.join("\n\n");
}

type CompletedCompaction = {
  markerIndex: number;
  summaryIndex: number;
  markerID: string;
  tailStartID: string | undefined;
};

function latestCompletedCompaction(messages: MessageEntry[]): CompletedCompaction | undefined {
  const markers = new Map<string, number>();
  let latest: CompletedCompaction | undefined;

  for (const [index, message] of messages.entries()) {
    if (message.info?.role === "user" && message.info.id && message.parts?.some((part) => part.type === "compaction")) {
      markers.set(message.info.id, index);
      continue;
    }
    if (
      message.info?.role === "assistant" &&
      message.info.summary &&
      message.info.finish &&
      !message.info.error &&
      message.info.parentID &&
      markers.has(message.info.parentID)
    ) {
      const markerIndex = markers.get(message.info.parentID)!;
      const marker = messages[markerIndex]!;
      const tailStartID = str(marker.parts?.find((part) => part.type === "compaction")?.tail_start_id);
      latest = { markerIndex, summaryIndex: index, markerID: message.info.parentID, tailStartID };
    }
  }

  return latest;
}

export function selectAdvisorContext(messages: MessageEntry[]): { messages: MessageEntry[]; epoch: string } {
  const latest = latestCompletedCompaction(messages);

  if (!latest) return { messages, epoch: "uncompacted" };
  const tailIndex = latest.tailStartID ? messages.findIndex((message) => message.info?.id === latest.tailStartID) : -1;
  if (tailIndex >= 0 && tailIndex < latest.markerIndex) {
    return {
      messages: [
        ...messages.slice(latest.markerIndex, latest.summaryIndex + 1),
        ...messages.slice(tailIndex, latest.markerIndex),
        ...messages.slice(latest.summaryIndex + 1),
      ],
      epoch: `compaction:${latest.markerID}`,
    };
  }
  return { messages: messages.slice(latest.summaryIndex), epoch: `compaction:${latest.markerID}` };
}

export function selectAdvisorMessages(messages: MessageEntry[]): MessageEntry[] {
  return selectAdvisorContext(messages).messages;
}

function extractText(result: PromptResult | undefined): string {
  const parts = result?.parts ?? [];
  const text = parts
    .filter((part) => str(part.type) === "text" && part.synthetic !== true)
    .map((part) => str(part.text)?.trim() ?? "")
    .filter((line) => line.length > 0)
    .join("\n\n");
  return text;
}

type AdvisorUsage = {
  input: number;
  output: number;
  reasoning: number;
  cacheRead: number;
  cacheWrite: number;
  total: number;
  cost: number;
};

function number(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function extractUsage(messages: MessageEntry[]): AdvisorUsage | undefined {
  let found = false;
  const usage: AdvisorUsage = {
    input: 0,
    output: 0,
    reasoning: 0,
    cacheRead: 0,
    cacheWrite: 0,
    total: 0,
    cost: 0,
  };

  for (const message of messages) {
    if (message.info?.role !== "assistant") continue;
    const tokens = message.info.tokens;
    if (!tokens && message.info.cost === undefined) continue;
    found = true;
    usage.input += number(tokens?.input);
    usage.output += number(tokens?.output);
    usage.reasoning += number(tokens?.reasoning);
    usage.cacheRead += number(tokens?.cache?.read);
    usage.cacheWrite += number(tokens?.cache?.write);
    usage.total +=
      number(tokens?.total) ||
      number(tokens?.input) +
        number(tokens?.output) +
        number(tokens?.reasoning) +
        number(tokens?.cache?.read) +
        number(tokens?.cache?.write);
    usage.cost += number(message.info.cost);
  }

  return found ? usage : undefined;
}

function formatUsage(usage: AdvisorUsage | undefined): string {
  if (!usage) return "Usage: unavailable";
  return `Usage: ${usage.total.toLocaleString()} tokens (input ${usage.input.toLocaleString()}, output ${usage.output.toLocaleString()}, reasoning ${usage.reasoning.toLocaleString()}, cache read ${usage.cacheRead.toLocaleString()}, cache write ${usage.cacheWrite.toLocaleString()}); reported cost $${usage.cost.toFixed(6)}`;
}

type AdvisorResult = {
  target: AdvisorTarget;
  label: string;
  title: string;
  output: string;
  metadata: Record<string, unknown>;
};

type AdvisorContinuation = {
  epoch: string;
  sessionID: string;
  cursor: string | undefined;
};

type NativeContinuation = AdvisorContinuation & {
  childCursor: string | undefined;
};

type PersistedContinuation = {
  version: 1;
  parentSessionID: string;
  target: string;
  updatedAt: number;
  continuation: AdvisorContinuation | NativeContinuation;
};

export interface ContinuationStore {
  load(input: { directory: string; parentSessionID: string; target: AdvisorTarget }): Promise<AdvisorContinuation | NativeContinuation | undefined>;
  save(input: {
    directory: string;
    parentSessionID: string;
    target: AdvisorTarget;
    continuation: AdvisorContinuation | NativeContinuation;
  }): Promise<void>;
  remove(input: { directory: string; parentSessionID: string; target: AdvisorTarget }): Promise<void>;
  prune(directory: string | undefined): Promise<void>;
}

const CONTINUATION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function continuationStatePath(root: string, directory: string, parentSessionID: string, target: AdvisorTarget): string {
  const key = createHash("sha256").update(continuationKey(directory, parentSessionID, target)).digest("hex");
  return join(root, `${key}.json`);
}

function validContinuation(value: unknown): value is AdvisorContinuation | NativeContinuation {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.epoch === "string" &&
    typeof record.sessionID === "string" &&
    (record.cursor === undefined || typeof record.cursor === "string") &&
    (record.childCursor === undefined || typeof record.childCursor === "string")
  );
}

function parsePersistedContinuation(
  value: unknown,
  parentSessionID: string,
  target: AdvisorTarget,
): AdvisorContinuation | NativeContinuation | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  if (
    record.version !== 1 ||
    record.parentSessionID !== parentSessionID ||
    record.target !== targetLabel(target) ||
    typeof record.updatedAt !== "number" ||
    Date.now() - record.updatedAt > CONTINUATION_TTL_MS ||
    !validContinuation(record.continuation)
  ) {
    return undefined;
  }
  return record.continuation;
}

export function createFileContinuationStore(root = join(homedir(), ".opencode", "advisor", "state")): ContinuationStore {
  return {
    async load(input) {
      const path = continuationStatePath(root, input.directory, input.parentSessionID, input.target);
      try {
        const parsed = JSON.parse(await readFile(path, "utf8"));
        const continuation = parsePersistedContinuation(parsed, input.parentSessionID, input.target);
        if (continuation) return continuation;
      } catch {
        // A missing or malformed record means this continuation starts fresh.
      }
      await rm(path, { force: true }).catch(() => undefined);
      return undefined;
    },
    async save(input) {
      const path = continuationStatePath(root, input.directory, input.parentSessionID, input.target);
      const record: PersistedContinuation = {
        version: 1,
        parentSessionID: input.parentSessionID,
        target: targetLabel(input.target),
        updatedAt: Date.now(),
        continuation: input.continuation,
      };
      try {
        await mkdir(join(path, ".."), { recursive: true });
        const temporary = `${path}.${randomUUID()}.tmp`;
        await writeFile(temporary, `${JSON.stringify(record)}\n`, "utf8");
        await rename(temporary, path);
      } catch {
        // Persistence must not hide valid advisor guidance.
      }
    },
    async remove(input) {
      await rm(continuationStatePath(root, input.directory, input.parentSessionID, input.target), { force: true }).catch(() => undefined);
    },
    async prune(directory) {
      if (!directory) return;
      try {
        for (const file of await readdir(root, { withFileTypes: true })) {
          if (!file.isFile() || !file.name.endsWith(".json")) continue;
          const path = join(root, file.name);
          try {
            const parsed = JSON.parse(await readFile(path, "utf8")) as Partial<PersistedContinuation>;
            if (typeof parsed.updatedAt !== "number" || Date.now() - parsed.updatedAt > CONTINUATION_TTL_MS) {
              await rm(path, { force: true });
            }
          } catch {
            await rm(path, { force: true });
          }
        }
      } catch {
        // State cleanup is best-effort.
      }
    },
  };
}

export type ClaudeRunnerInput = {
  cwd: string;
  prompt: string;
  model: string;
  effort: string;
  system: string;
  resume?: string;
};

export type ClaudeRunner = (input: ClaudeRunnerInput) => Promise<string>;

type ClaudeUsage = {
  input?: number;
  output?: number;
  cacheRead?: number;
  cacheWrite?: number;
  cost?: number;
};

type ClaudeOutput = {
  advice: string;
  sessionID: string;
  actualModel: string;
  usage: ClaudeUsage;
};

const claudeContinuations = new Map<string, AdvisorContinuation>();
const claudeContinuationLocks = new Map<string, Promise<void>>();
const nativeContinuations = new Map<string, NativeContinuation>();
const nativeContinuationLocks = new Map<string, Promise<void>>();
const CLAUDE_ADVISOR_DIRECTORY = join(homedir(), ".mindframe-z", "claude-advisor");

export function claudeAdvisorDirectory(): string {
  return CLAUDE_ADVISOR_DIRECTORY;
}

export function buildClaudeArgs(input: Omit<ClaudeRunnerInput, "prompt">): string[] {
  return [
    "-p",
    "--input-format",
    "text",
    "--output-format",
    "json",
    "--model",
    input.model,
    "--effort",
    input.effort,
    "--tools",
    "",
    "--system-prompt",
    input.system,
    ...(input.resume ? ["--resume", input.resume] : []),
  ];
}

async function runClaude(input: ClaudeRunnerInput): Promise<string> {
  return new Promise((resolve, reject) => {
    mkdirSync(input.cwd, { recursive: true });
    const child = spawn("claude", buildClaudeArgs(input), { cwd: input.cwd, stdio: ["pipe", "pipe", "pipe"] });
    const limit = 10 * 1024 * 1024;
    let stdout = "";
    let stderr = "";
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      if (error) reject(error);
      else resolve(stdout);
    };
    const append = (target: "stdout" | "stderr", chunk: Buffer) => {
      if (settled) return;
      if (target === "stdout") stdout += chunk.toString();
      else stderr += chunk.toString();
      if (Buffer.byteLength(stdout) + Buffer.byteLength(stderr) > limit) {
        child.kill();
        finish(new Error("Claude Code output exceeded 10 MiB."));
      }
    };

    child.once("error", (error) => finish(error));
    child.stdout.on("data", (chunk: Buffer) => append("stdout", chunk));
    child.stderr.on("data", (chunk: Buffer) => append("stderr", chunk));
    child.once("close", (code, signal) => {
      if (code === 0) return finish();
      finish(new Error(`Claude Code exited with ${signal ? `signal ${signal}` : `code ${code}`}: ${stderr.trim()}`));
    });
    child.stdin.once("error", (error) => finish(error));
    child.stdin.end(input.prompt);
  });
}

function availableNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function matchesClaudeModel(configuredModel: string, actualModel: string): boolean {
  const alias = {
    fable: "claude-fable-",
    opus: "claude-opus-",
    sonnet: "claude-sonnet-",
  }[configuredModel];
  return alias ? actualModel.startsWith(alias) : actualModel === configuredModel;
}

function parseClaudeOutput(stdout: string, configuredModel: string): ClaudeOutput {
  let parsed: {
    result?: unknown;
    session_id?: unknown;
    is_error?: unknown;
    total_cost_usd?: unknown;
    modelUsage?: unknown;
  };
  try {
    parsed = JSON.parse(stdout) as typeof parsed;
  } catch {
    throw new Error("Claude Code returned invalid JSON.");
  }
  if (parsed.is_error === true) throw new Error("Claude Code reported an unsuccessful result.");

  const advice = str(parsed.result)?.trim();
  const sessionID = str(parsed.session_id);
  if (!advice || !sessionID) throw new Error("Claude Code JSON must include non-empty result text and session_id.");
  if (!parsed.modelUsage || typeof parsed.modelUsage !== "object" || Array.isArray(parsed.modelUsage)) {
    throw new Error("Claude Code JSON must include modelUsage with the actual model.");
  }

  const modelUsage = parsed.modelUsage as Record<string, unknown>;
  const entry = Object.entries(modelUsage).find(
    ([model, usage]) =>
      matchesClaudeModel(configuredModel, model) &&
      typeof usage === "object" &&
      usage !== null &&
      !Array.isArray(usage),
  );
  if (!entry) {
    throw new Error(
      `Claude Code did not report configured model "${configuredModel}" in modelUsage (available: ${Object.keys(modelUsage).join(", ") || "none"}).`,
    );
  }

  const [actualModel, rawUsage] = entry;
  const usage = rawUsage as {
    inputTokens?: unknown;
    outputTokens?: unknown;
    cacheReadInputTokens?: unknown;
    cacheCreationInputTokens?: unknown;
    costUSD?: unknown;
  };
  return {
    advice,
    sessionID,
    actualModel,
    usage: {
      input: availableNumber(usage.inputTokens),
      output: availableNumber(usage.outputTokens),
      cacheRead: availableNumber(usage.cacheReadInputTokens),
      cacheWrite: availableNumber(usage.cacheCreationInputTokens),
      cost: availableNumber(usage.costUSD) ?? availableNumber(parsed.total_cost_usd),
    },
  };
}

function formatClaudeUsage(usage: ClaudeUsage): string {
  const details = [
    usage.cacheRead !== undefined ? `cache read ${usage.cacheRead.toLocaleString()} tokens` : undefined,
    usage.cacheWrite !== undefined ? `cache write ${usage.cacheWrite.toLocaleString()} tokens` : undefined,
    usage.cost !== undefined ? `reported cost $${usage.cost.toFixed(6)}` : undefined,
  ].filter((detail): detail is string => detail !== undefined);
  return details.length > 0 ? `Usage: ${details.join(", ")}` : "Usage: unavailable";
}

function continuationKey(directory: string, sessionID: string, target: AdvisorTarget): string {
  return JSON.stringify([directory, sessionID, targetLabel(target)]);
}

async function withContinuationLock<T>(
  locks: Map<string, Promise<void>>,
  key: string,
  operation: () => Promise<T>,
): Promise<T> {
  const previous = locks.get(key) ?? Promise.resolve();
  let release!: () => void;
  const completed = new Promise<void>((resolve) => {
    release = resolve;
  });
  const current = previous.then(() => completed);
  locks.set(key, current);
  await previous;
  try {
    return await operation();
  } finally {
    release();
    if (locks.get(key) === current) locks.delete(key);
  }
}

function latestMessageID(messages: MessageEntry[]): string | undefined {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const id = messages[index]?.info?.id;
    if (id) return id;
  }
  return undefined;
}

function messagesAfterCursor(messages: MessageEntry[], cursor: string | undefined): MessageEntry[] {
  if (!cursor) return messages;
  const cursorIndex = messages.findIndex((message) => message.info?.id === cursor);
  return cursorIndex >= 0 ? messages.slice(cursorIndex + 1) : messages;
}

function withoutAdvisorToolResults(messages: MessageEntry[]): MessageEntry[] {
  return messages.map((message) => {
    const parts = message.parts?.filter((part) => {
      if (part.type !== "tool" || part.tool !== "advisor") return true;
      const state = part.state as Record<string, unknown> | undefined;
      return state?.status !== "completed" && state?.status !== "error";
    });
    return parts?.length === message.parts?.length ? message : { ...message, parts };
  });
}

export type NativeAdvisorMode = "fresh" | "continuation";

export function resolveNativeAdvisorMode(mode = process.env.OPENCODE_ADVISOR_NATIVE_MODE ?? "continuation"): NativeAdvisorMode {
  if (mode === "fresh" || mode === "continuation") return mode;
  throw new Error(`Invalid OPENCODE_ADVISOR_NATIVE_MODE value "${mode}". Use fresh or continuation.`);
}

async function deleteAdvisorSession(client: SessionClient, sessionID: string, directory: string): Promise<void> {
  try {
    await client.delete({ path: { id: sessionID }, query: { directory } });
  } catch {
    // Cleanup is best-effort and must not hide valid advice.
  }
}

async function restoreContinuation<T extends AdvisorContinuation | NativeContinuation>(
  client: SessionClient,
  store: ContinuationStore | undefined,
  directory: string,
  parentSessionID: string,
  target: AdvisorTarget,
): Promise<T | undefined> {
  if (!store) return undefined;
  const continuation = (await store.load({ directory, parentSessionID, target })) as T | undefined;
  if (!continuation) return undefined;
  if (target.harness === "claude-code") return continuation;
  const child = await client.get({ path: { id: continuation.sessionID }, query: { directory } });
  if (!child.error && child.data?.parentID === parentSessionID) return continuation;
  await store.remove({ directory, parentSessionID, target });
  return undefined;
}

async function usageSince(
  client: SessionClient,
  sessionID: string,
  directory: string,
  cursor: string | undefined,
): Promise<{ usage: AdvisorUsage | undefined; cursor: string | undefined; readable: boolean }> {
  try {
    const childMessages = await client.messages({ path: { id: sessionID }, query: { directory } });
    if (childMessages.error || !childMessages.data) return { usage: undefined, cursor, readable: false };
    const cursorIndex = cursor ? childMessages.data.findIndex((message) => message.info?.id === cursor) : -1;
    if (cursor && cursorIndex < 0) return { usage: undefined, cursor, readable: false };
    return {
      usage: extractUsage(cursor ? childMessages.data.slice(cursorIndex + 1) : childMessages.data),
      cursor: latestMessageID(childMessages.data),
      readable: true,
    };
  } catch {
    return { usage: undefined, cursor, readable: false };
  }
}

async function runFreshOpenCodeAdvisor(
  client: SessionClient,
  sessionID: string,
  directory: string,
  target: OpenCodeAdvisorTarget,
  transcript: string,
): Promise<AdvisorResult> {
  const prompt = resolveAdvisorPrompt(target.modelID);
  const label = modelLabel(target);
  const child = await client.create({
    body: { parentID: sessionID, title: `advisor (${label})` },
    query: { directory },
  });
  if (child.error || !child.data?.id) {
    throw new Error(`could not open an advisor session (${String(child.error ?? "no id")}).`);
  }
  const childID = child.data.id;

  try {
    const prompted = await client.prompt({
      path: { id: childID },
      query: { directory },
      body: {
        model: { providerID: target.providerID, modelID: target.modelID },
        ...(target.variant !== undefined ? { variant: target.variant } : {}),
        system: prompt.system,
        tools: CHILD_TOOL_OVERRIDES,
        parts: [{ type: "text", text: `Here is the executor's full transcript. Advise.\n\n${transcript}` }],
      },
    });
    if (prompted.error) {
      throw new Error(`the advisor model (${target.providerID}/${label}) failed: ${String(prompted.error)}`);
    }

    const advice = extractText(prompted.data);
    if (advice.length === 0) throw new Error(`the advisor returned no text (model ${target.providerID}/${label}).`);

    const { usage } = await usageSince(client, childID, directory, undefined);
    const metadata = {
      providerID: target.providerID,
      modelID: target.modelID,
      variant: target.variant,
      promptVariant: prompt.variant,
      usage,
    };
    return {
      target,
      label: targetLabel(target),
      title: `Advisor (${label})`,
      output: `${advice}\n\n${formatUsage(usage)}`,
      metadata,
    };
  } finally {
    // Throwaway review session: best-effort cleanup, never fatal.
    await deleteAdvisorSession(client, childID, directory);
  }
}

async function runContinuedOpenCodeAdvisor(
  client: SessionClient,
  directory: string,
  parentSessionID: string,
  target: OpenCodeAdvisorTarget,
  continuations: Map<string, NativeContinuation>,
  locks: Map<string, Promise<void>>,
  store?: ContinuationStore,
): Promise<AdvisorResult> {
  const prompt = resolveAdvisorPrompt(target.modelID);
  const label = modelLabel(target);
  const key = continuationKey(directory, parentSessionID, target);
  return withContinuationLock(locks, key, async () => {
    const refreshed = await client.messages({ path: { id: parentSessionID }, query: { directory } });
    if (refreshed.error || !refreshed.data) {
      throw new Error(`could not refresh the parent transcript (${String(refreshed.error ?? "no data")}).`);
    }
    const history = refreshed.data;
    const context = selectAdvisorContext(history);
    const previous =
      continuations.get(key) ?? (await restoreContinuation<NativeContinuation>(client, store, directory, parentSessionID, target));
    if (previous) continuations.set(key, previous);
    const rotate = !previous || previous.epoch !== context.epoch;

    let childID = previous?.sessionID;
    let created = false;
    if (rotate) {
      const child = await client.create({
        body: { parentID: parentSessionID, title: `advisor (${label})` },
        query: { directory },
      });
      if (child.error || !child.data?.id) {
        throw new Error(`could not open an advisor session (${String(child.error ?? "no id")}).`);
      }
      childID = child.data.id;
      created = true;
    }

    const messages = rotate ? context.messages : messagesAfterCursor(history, previous!.cursor);
    const transcript = serializeTranscript(rotate ? messages : withoutAdvisorToolResults(messages));
    let submitted = false;
    try {
      if (transcript.length === 0) throw new Error("the transcript delta is empty; there is nothing to advise on yet.");
      submitted = true;
      const prompted = await client.prompt({
        path: { id: childID! },
        query: { directory },
        body: {
          model: { providerID: target.providerID, modelID: target.modelID },
          ...(target.variant !== undefined ? { variant: target.variant } : {}),
          system: prompt.system,
          tools: CHILD_TOOL_OVERRIDES,
          parts: [
            {
              type: "text",
              text: rotate
                ? `Here is the executor's compacted parent transcript. Advise.\n\n${transcript}`
                : `Here are the parent transcript messages added since your previous review. Advise.\n\n${transcript}`,
            },
          ],
        },
      });
      if (prompted.error) {
        throw new Error(`the advisor model (${target.providerID}/${label}) failed: ${String(prompted.error)}`);
      }
      const advice = extractText(prompted.data);
      if (advice.length === 0) throw new Error(`the advisor returned no text (model ${target.providerID}/${label}).`);

      const usage = await usageSince(client, childID!, directory, rotate ? undefined : previous!.childCursor);
      if (usage.readable) {
        const continuation = {
          epoch: context.epoch,
          sessionID: childID!,
          cursor: latestMessageID(history),
          childCursor: usage.cursor,
        };
        continuations.set(key, continuation);
        await store?.save({ directory, parentSessionID, target, continuation });
        if (rotate && previous) await deleteAdvisorSession(client, previous.sessionID, directory);
      } else {
        continuations.delete(key);
        await store?.remove({ directory, parentSessionID, target });
        await deleteAdvisorSession(client, childID!, directory);
        if (rotate && previous) await deleteAdvisorSession(client, previous.sessionID, directory);
      }
      const metadata = {
        providerID: target.providerID,
        modelID: target.modelID,
        variant: target.variant,
        promptVariant: prompt.variant,
        usage: usage.usage,
      };
      return {
        target,
        label: targetLabel(target),
        title: `Advisor (${label})`,
        output: `${advice}\n\n${formatUsage(usage.usage)}`,
        metadata,
      };
    } catch (error) {
      if (created || submitted) {
        continuations.delete(key);
        await store?.remove({ directory, parentSessionID, target });
        await deleteAdvisorSession(client, childID!, directory);
        if (rotate && previous) await deleteAdvisorSession(client, previous.sessionID, directory);
      }
      throw error;
    }
  });
}

async function runClaudeCodeAdvisor(
  client: SessionClient,
  directory: string,
  parentSessionID: string,
  target: ClaudeCodeAdvisorTarget,
  runner: ClaudeRunner,
  continuations: Map<string, AdvisorContinuation>,
  locks: Map<string, Promise<void>>,
  store?: ContinuationStore,
): Promise<AdvisorResult> {
  const prompt = resolveAdvisorPrompt(target.modelID);
  const key = continuationKey(directory, parentSessionID, target);
  return withContinuationLock(locks, key, async () => {
    const refreshed = await client.messages({ path: { id: parentSessionID }, query: { directory } });
    if (refreshed.error || !refreshed.data) {
      throw new Error(`could not refresh the parent transcript (${String(refreshed.error ?? "no data")}).`);
    }
    const history = refreshed.data;
    const context = selectAdvisorContext(history);
    const previous =
      continuations.get(key) ?? (await restoreContinuation<AdvisorContinuation>(client, store, directory, parentSessionID, target));
    if (previous) continuations.set(key, previous);
    const rotate = !previous || previous.epoch !== context.epoch;
    const messages = rotate ? context.messages : messagesAfterCursor(history, previous.cursor);
    const transcript = serializeTranscript(rotate ? messages : withoutAdvisorToolResults(messages));
    const output = parseClaudeOutput(
      await runner({
        cwd: claudeAdvisorDirectory(),
        prompt: rotate
          ? `Here is the executor's compacted parent transcript. Advise.\n\n${transcript}`
          : `Here are the parent transcript messages added since your previous review. Advise.\n\n${transcript}`,
        model: target.modelID,
        effort: target.effort,
        system: prompt.system,
        ...(rotate ? {} : { resume: previous.sessionID }),
      }),
      target.modelID,
    );
    // A failed command or malformed result leaves the prior cursor untouched.
    const continuation = { epoch: context.epoch, sessionID: output.sessionID, cursor: latestMessageID(history) };
    continuations.set(key, continuation);
    await store?.save({ directory, parentSessionID, target, continuation });

    const label = `${targetLabel(target)} (${output.actualModel})`;
    return {
      target,
      label,
      title: `Advisor (${label})`,
      output: `${output.advice}\n\n${formatClaudeUsage(output.usage)}`,
      metadata: {
        harness: target.harness,
        providerID: "anthropic",
        modelID: target.modelID,
        effort: target.effort,
        actualModel: output.actualModel,
        sessionID: output.sessionID,
        reportedCost: output.usage.cost,
        usage: output.usage,
        promptVariant: prompt.variant,
      },
    };
  });
}

function unavailableMessage(executorModelID: string | undefined, target: OpenCodeAdvisorTarget): string {
  return `Skipped: the executor's GPT-5.6 ${gpt56Tier(executorModelID)} tier is equal to or stronger than the advisor's ${gpt56Tier(target.modelID)} tier.`;
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function createAdvisorTool(
  client: SessionClient,
  claudeRunner: ClaudeRunner = runClaude,
  continuations = claudeContinuations,
  continuationLocks = claudeContinuationLocks,
  continuedNativeAdvisors = nativeContinuations,
  nativeLocks = nativeContinuationLocks,
  store?: ContinuationStore,
): ToolDefinition {
  return {
    description: ADVISOR_DESCRIPTION,
    args: {},
    async execute(_args, ctx) {
      await store?.prune(ctx.directory);
      let targets: AdvisorTarget[];
      let nativeMode: NativeAdvisorMode;
      try {
        targets = resolveAdvisorTargets();
        nativeMode = resolveNativeAdvisorMode();
      } catch (error) {
        return `Error: ${errorText(error)}`;
      }

      const session = await client.get({ path: { id: ctx.sessionID }, query: { directory: ctx.directory } });
      if (session.error || !session.data) {
        return `Error: could not read the current session (${String(session.error ?? "no data")}).`;
      }
      if (session.data.parentID && ctx.agent !== "general") {
        return "Skipped: advisor is available to subagents only when running as general.";
      }

      const history = await client.messages({
        path: { id: ctx.sessionID },
        query: { directory: ctx.directory },
      });
      if (history.error || !history.data) {
        return `Error: could not read the session transcript (${String(history.error ?? "no data")}).`;
      }
      const messages = history.data;

      const executorModelID = messages.find((message) => message.info?.id === ctx.messageID)?.info?.modelID;
      const eligible = targets.filter(
        (target) => target.harness === "claude-code" || !advisorUnavailable(executorModelID, target.modelID),
      );
      if (eligible.length === 0) {
        const advisor = targets.find((target): target is OpenCodeAdvisorTarget => target.harness === "opencode");
        return advisor
          ? unavailableMessage(executorModelID, advisor)
          : "Skipped: no configured advisor target is eligible.";
      }

      const context = selectAdvisorContext(messages);
      const transcript = serializeTranscript(context.messages);
      if (transcript.length === 0) {
        return "Error: the transcript is empty; there is nothing to advise on yet.";
      }

      const settled = await Promise.allSettled(
        eligible.map((target) =>
          target.harness === "opencode"
            ? nativeMode === "fresh"
              ? runFreshOpenCodeAdvisor(client, ctx.sessionID, ctx.directory, target, transcript)
              : runContinuedOpenCodeAdvisor(
                  client,
                  ctx.directory,
                  ctx.sessionID,
                  target,
                   continuedNativeAdvisors,
                   nativeLocks,
                   store,
                 )
            : runClaudeCodeAdvisor(
                client,
                ctx.directory,
                ctx.sessionID,
                target,
                claudeRunner,
                 continuations,
                 continuationLocks,
                 store,
               ),
        ),
      );
      const successes = settled.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
      const failures = settled.flatMap((result, index) =>
        result.status === "rejected" ? [{ label: targetLabel(eligible[index]!), error: errorText(result.reason) }] : [],
      );
      if (successes.length === 0) {
        if (targets.length === 1 && failures.length === 1) {
          return `Error: ${failures[0]!.error}`;
        }
        return `Error: all advisor targets failed:\n${failures.map((failure) => `${failure.label}: ${failure.error}`).join("\n")}`;
      }

      const legacySingleNative =
        targets.length === 1 && successes.length === 1 && successes[0]!.target.harness === "opencode";
      if (legacySingleNative) {
        const result = successes[0]!;
        ctx.metadata({ title: `advisor: ${modelLabel(result.target as OpenCodeAdvisorTarget)}`, metadata: result.metadata });
        return { title: result.title, output: result.output, metadata: result.metadata };
      }

      const metadata = {
        targets: successes.map((result) => ({ label: result.label, ...result.metadata })),
        ...(failures.length > 0 ? { failures } : {}),
      };
      ctx.metadata({ title: `advisor: ${successes.map((result) => result.label).join(", ")}`, metadata });
      return {
        title: successes.length === 1 ? successes[0]!.title : "Advisor",
        output: [
          ...successes.map((result) => `## ${result.title}\n\n${result.output}`),
          ...failures.map((failure) => `## Advisor failure (${failure.label})\n\nError: ${failure.error}`),
        ].join("\n\n"),
        metadata,
      };
    },
  };
}

const AdvisorPlugin: PluginModule = {
  id: "advisor",
  server: async ({ client, directory }) => {
    const store = createFileContinuationStore();
    await store.prune(directory);
    return {
      tool: {
        advisor: createAdvisorTool(
          (client as unknown as { session: SessionClient }).session,
          runClaude,
          claudeContinuations,
          claudeContinuationLocks,
          nativeContinuations,
          nativeContinuationLocks,
          store,
        ),
      },
      "experimental.chat.system.transform": async (input, output) => {
        const prompt = advisorAvailabilityPrompt(input.model.id);
        if (prompt) output.system.push(prompt);
      },
    };
  },
};

export default AdvisorPlugin;
