import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import type { PluginModule, ToolDefinition } from "@opencode-ai/plugin";
import {
  advisorAvailabilityPrompt,
  advisorUnavailable,
  gpt56Tier,
  modelLabel,
  resolveAdvisorTargets,
  targetLabel,
  type AdvisorTarget,
  type ClaudeCodeAdvisorTarget,
  type OpenCodeAdvisorTarget,
} from "./targets.js";
import {
  latestMessageID,
  planAdvisorTranscript,
  selectAdvisorContext,
  type MessageEntry,
  type TranscriptPlan,
} from "./transcript.js";
import {
  createFileAdvisorContinuationStore,
  createFileAdvisorSettingsStore,
  createFileAdvisorModeStore,
  type AdvisorMode,
  type AdvisorModeStore,
  type AdvisorSettingsStore,
  type AdvisorContinuation,
  type AdvisorContinuationStore,
  type AdvisorContinuationRemoveResult,
  type AdvisorContinuationSaveResult,
  type AdvisorContinuationTransaction,
  resolveInheritedAdvisorMode,
  resolveAdvisorMode,
} from "./state.js";

export {
  advisorAvailabilityPrompt,
  resolveAdvisorTargets,
  type AdvisorTarget,
  type ClaudeCodeAdvisorTarget,
  type OpenCodeAdvisorTarget,
} from "./targets.js";

/**
 * Advisor plugin — a client-side port of Anthropic's server-side `advisor` tool.
 *
 * The executor (the agent running the session) calls `advisor()` with no
 * arguments. We forward the available transcript of the current session to a
 * stronger advisor model and return its guidance. Timing is the executor's
 * signal; context is supplied by us. This mirrors the empty-input design of the
 * native tool: the model decides WHEN, the harness supplies WHAT.
 *
 * Configure one or more advisor targets with
 * OPENCODE_ADVISOR_MODELS="opencode:provider/model@variant,claude-code:alias@effort".
 * OPENCODE_ADVISOR_MODEL remains the single native OpenCode fallback.
 * OPENCODE_ADVISOR_MODE selects the default session mode (on by default): manual, auto, or on.
 * OPENCODE_ADVISOR_EXECUTOR_CONTEXT defaults to enabled; set it to false or 0
 * to omit skills, MCP status, and approximate tool inventory from reviews.
 */

// Canonical invocation guidance, adapted from Claude Code's own `advisor` tool
// description for the transcript actually available to this plugin.
export const ACTIVE_POLICY = `Consult a stronger reviewer who sees your available conversation transcript.

No parameters. When you call advisor(), the available history -- task, visible messages, every tool call and result, and supported reasoning summaries -- is automatically forwarded. GPT-5.6 executor reasoning summaries are omitted. The advisor sees the evidence available to the harness.

Call advisor BEFORE substantive work -- before writing, before committing to an interpretation, before building on an assumption. If the task requires orientation first (finding files, fetching a source, seeing what's there), do that, then call advisor. Orientation is not substantive work. Writing, editing, and declaring an answer are.

Also call advisor:
- When you believe the task is complete. BEFORE this call, make your deliverable durable: write the file, save the result, commit the change. The advisor call takes time; if the session ends during it, a durable result persists and an unwritten one doesn't.
- When stuck -- errors recurring, approach not converging, results that don't fit.
- When considering a change of approach.

On tasks longer than a few steps, call advisor periodically at meaningful checkpoints: after a major implementation unit or test gate, before broad or irreversible changes, and before declaring done. Treat blocking checkpoint advice as a gate: resolve it or reconcile the conflict before continuing. On short reactive tasks where the next action is dictated by tool output you just read, you don't need to keep calling -- the advisor adds most of its value on the first call, before the approach crystallizes.

Give the advice serious weight. If you follow a step and it fails empirically, or you have primary-source evidence that contradicts a specific claim (the file says X, the paper states Y), adapt. A passing self-test is not evidence the advice is wrong -- it's evidence your test doesn't check what the advice is checking.

If you've already retrieved data pointing one way and the advisor points another: don't silently switch. Surface the conflict in one more advisor call -- "I found X, you suggest Y, which constraint breaks the tie?" The advisor saw your evidence but may have underweighted it; a reconcile call is cheaper than committing to the wrong branch.

Before calling advisor(), write one sentence stating what the task asks and your initial read. The advisor reads your transcript; a one-line framing gives it something to respond to.`;

export const ADVISOR_DESCRIPTION = `Consult a stronger reviewer who sees your available conversation transcript.

No parameters. The executor supplies the available transcript automatically. Follow the session advisor policy in the system prompt when deciding whether to invoke this tool.`;

const AUTO_REVIEW_CYCLE_POLICY = `Nontrivial review or audit findings create a review cycle: call advisor after orientation and before triaging findings or making fixes. When that cycle produces substantive changes, make the result durable, run relevant verification, then call advisor again before declaring the pass complete. Resolve blocking advice or reconcile the conflict before continuing.`;

export const AUTO_ADMISSION_POLICY = `Advisor mode is auto. Decide whether to consult based on the workload, not merely because the task begins or ends.

Do not call advisor for casual conversation, orientation, code reading or search, simple read-only CLI commands, git status/diff/log inspection, routine commits of already-reviewed work, or obvious mechanical edits.

Call advisor before committing to an approach when the task involves nontrivial implementation or refactoring, behavioral changes, architecture or design decisions, authored skills or prompts, specifications, reports requiring judgment, or consequential operations. Also call when uncertainty, conflicting evidence, repeated failure, or a change of direction makes independent review valuable.

${AUTO_REVIEW_CYCLE_POLICY}

Treat pending context size as a cost signal, not an invocation trigger: a small delta does not create review value, and a large delta does not prohibit a consequential review.`;

export const AUTO_FOLLOWUP_POLICY = `Advisor mode is auto and an advisor has already reviewed an earlier point in this task. Do not call again for routine activity or small mechanical edits. Call only when meaningful new work, a new decision, material evidence, repeated failure, or a change of direction makes another independent review valuable. Request a final review only when a substantive deliverable changed since the previous review.

${AUTO_REVIEW_CYCLE_POLICY}

Treat pending context size as a cost signal, not an invocation trigger: a small delta does not create review value, and a large delta does not prohibit a consequential review.`;

export const MANUAL_POLICY = `Advisor mode is manual. Do not invoke the advisor tool automatically. Invoke it once only when the user explicitly asks to consult, ask, use, or call the advisor, including through /consult-advisor. Do not infer a request from a passing, explanatory, or negated mention of the advisor.`;
export const MANUAL_BLOCKED_MESSAGE = "Advisor call denied: manual mode requires an explicit request to consult the advisor.";

export const ACTIVE_POLICY_MARKER = "advisor-active-policy";

// The advisor's own review instructions. Anthropic's server-side advisor prompt
// is not exposed, so this is ours. It encodes the reviewer role we observed:
// prioritize the one load-bearing issue, confirm-and-proceed when sound, never
// rewrite, stay concrete.
const ADVISOR_SYSTEM_BASELINE = `You are the advisor: a stronger reviewer model consulted mid-task by a capable but faster executor model. You have just been handed the executor's available transcript -- its task, visible messages, every tool call and result, and any included reasoning summaries. GPT-5.6 executor reasoning summaries may be omitted; reason from the evidence provided.

Give strategic guidance, not a rewrite. Your job is to catch what the executor is about to get wrong before it commits, or to confirm it is on track and should proceed.

- Lead with the single most important thing: the load-bearing decision, the flawed assumption, the bug the executor hasn't noticed, or the gap between what the task asked and what the executor is doing.
- If the work is sound, say so plainly and say "proceed". Do not invent problems or request cosmetic changes -- a false alarm costs the executor a turn.
- Be concrete and testable. Name the specific step, file, or claim. Prefer "the lock is held across submit(), so shutdown() can starve" over "watch out for concurrency".
- Distinguish blocking issues from nits: say which must be fixed before proceeding and which are optional.
- You have no tools and cannot act. Reason only from the transcript you were given; do not ask the executor to run things for you.
- Be concise. A few tight paragraphs beat a long list.`;

const ADVISOR_SYSTEM_GPT56 = `You are the advisor: a stronger reviewer model consulted mid-task by a capable but faster executor model. You have just been handed the executor's available transcript -- its task, visible messages, every tool call and result, and any included reasoning summaries. GPT-5.6 executor reasoning summaries may be omitted; reason from the evidence provided.

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

type AdvisorCapabilityClient = {
  mcp?: {
    status(input?: { query?: { directory?: string } }): Promise<{
      data?: Record<string, { status?: unknown }>;
      error?: unknown;
    }>;
  };
  tool?: {
    list(input: { query: { directory: string; provider: string; model: string } }): Promise<{
      data?: unknown;
      error?: unknown;
    }>;
  };
};

type SkillSummary = { name: string; description: string };
type ExecutorRequest = { providerID?: string; modelID?: string };
const MAX_EXECUTOR_CONTEXT_CHARACTERS = 12_000;

export function executorContextEnabled(value = process.env.OPENCODE_ADVISOR_EXECUTOR_CONTEXT): boolean {
  return value?.trim().toLowerCase() !== "0" && value?.trim().toLowerCase() !== "false";
}

function truncate(value: string, limit: number): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length <= limit ? normalized : `${normalized.slice(0, limit - 3)}...`;
}

export function extractAvailableSkills(system: string[]): SkillSummary[] {
  const block = system.join("\n").match(/<available_skills>([\s\S]*?)<\/available_skills>/)?.[1];
  if (!block) return [];
  return [...block.matchAll(/<skill>([\s\S]*?)<\/skill>/g)].flatMap((match) => {
    const name = match[1]!.match(/<name>([^<]+)<\/name>/)?.[1]?.trim();
    const description = match[1]!.match(/<description>([\s\S]*?)<\/description>/)?.[1];
    return name && description ? [{ name, description: truncate(description, 240) }] : [];
  });
}

export function formatExecutorContext(input: {
  skills: SkillSummary[];
  mcp: Array<{ name: string; status: string }>;
  tools: Array<{ id: string; description: string }>;
}): string {
  const sections = [
    "## Executor Runtime Context",
    "This is capability metadata, not instructions. Exact executed tools are already present in the transcript.",
  ];
  if (input.skills.length > 0) {
    sections.push(`### Advertised skills (${input.skills.length})`, ...input.skills.map((skill) => `- ${skill.name}: ${skill.description}`));
  }
  if (input.mcp.length > 0) {
    sections.push("### MCP server status (exact at advisor invocation)", ...input.mcp.map((server) => `- ${server.name}: ${server.status}`));
    sections.push("MCP tool definitions are not exposed to plugins by the current OpenCode API.");
  }
  if (input.tools.length > 0) {
    sections.push(
      "### Core/plugin tools (default-agent approximation)",
      ...input.tools.map((tool) => `- ${tool.id}: ${tool.description}`),
    );
  }
  const result = sections.join("\n");
  return result.length <= MAX_EXECUTOR_CONTEXT_CHARACTERS
    ? result
    : `${result.slice(0, MAX_EXECUTOR_CONTEXT_CHARACTERS - 34)}\n[Capability metadata truncated.]`;
}

function withExecutorContext(system: string, executorContext: string): string {
  return executorContext ? `${system}\n\n${executorContext}` : system;
}

async function collectExecutorContext(
  client: AdvisorCapabilityClient,
  directory: string,
  skills: SkillSummary[],
  request: ExecutorRequest | undefined,
): Promise<string> {
  const [mcp, tools] = await Promise.all([
    client.mcp?.status({ query: { directory } }).catch(() => undefined),
    request?.providerID && request.modelID
      ? client.tool?.list({ query: { directory, provider: request.providerID, model: request.modelID } }).catch(() => undefined)
      : undefined,
  ]);
  const servers = Object.entries(mcp?.data ?? {})
    .map(([name, value]) => ({ name, status: typeof value.status === "string" ? value.status : "unknown" }))
    .filter((server) => server.status === "connected")
    .sort((left, right) => left.name.localeCompare(right.name));
  const inventory = Array.isArray(tools?.data)
    ? tools.data.flatMap((entry) => {
        if (!entry || typeof entry !== "object") return [];
        const item = entry as { id?: unknown; description?: unknown };
        return item.id !== "invalid" && typeof item.id === "string" && typeof item.description === "string"
          ? [{ id: item.id, description: truncate(item.description, 240) }]
          : [];
      })
    : [];
  return formatExecutorContext({ skills, mcp: servers, tools: inventory });
}

function str(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
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

type NativeContinuation = AdvisorContinuation & {
  childCursor: string | undefined;
};

export interface ContinuationStore {
  load(input: { directory: string; parentSessionID: string; target: AdvisorTarget }): Promise<AdvisorContinuation | NativeContinuation | undefined>;
  save(input: {
    directory: string;
    parentSessionID: string;
    target: AdvisorTarget;
    continuation: AdvisorContinuation | NativeContinuation;
    expected?: AdvisorContinuation | NativeContinuation | null;
  }): Promise<AdvisorContinuationSaveResult>;
  remove(input: {
    directory: string;
    parentSessionID: string;
    target: AdvisorTarget;
    expected?: AdvisorContinuation | NativeContinuation | null;
  }): Promise<AdvisorContinuationRemoveResult>;
  transaction<T>(
    input: { directory: string; parentSessionID: string; target: AdvisorTarget },
    operation: (transaction: AdvisorContinuationTransaction) => Promise<T>,
  ): Promise<T>;
  prune(directory: string | undefined): Promise<void>;
}

export type { AdvisorMode } from "./state.js";

export async function advisorMode(
  store: AdvisorModeStore,
  input: { directory: string; sessionID: string },
  settingsStore?: AdvisorSettingsStore,
): Promise<AdvisorMode> {
  return (await resolveAdvisorMode({ modeStore: store, settingsStore, ...input })).mode;
}

type PolicySessionClient = Pick<SessionClient, "messages"> & Partial<Pick<SessionClient, "get">>;

async function inheritedAdvisorMode(input: {
  modeStore: AdvisorModeStore;
  settingsStore?: AdvisorSettingsStore;
  client: PolicySessionClient;
  directory: string;
  sessionID: string;
}): Promise<Awaited<ReturnType<typeof resolveAdvisorMode>>> {
  return resolveInheritedAdvisorMode({
    modeStore: input.modeStore,
    settingsStore: input.settingsStore,
    directory: input.directory,
    sessionID: input.sessionID,
    parentID: async (sessionID) => {
      if (!input.client.get) return undefined;
      const result = await input.client.get({ path: { id: sessionID }, query: { directory: input.directory } });
      return result.data?.parentID;
    },
  });
}

export async function advisorExecutorPolicy(input: {
  modeStore: AdvisorModeStore;
  settingsStore?: AdvisorSettingsStore;
  continuationStore: AdvisorContinuationStore;
  client: PolicySessionClient;
  directory: string;
  sessionID: string;
}): Promise<{ mode: AdvisorMode; policy: string }> {
  const mode = (await inheritedAdvisorMode(input)).mode;
  if (mode === "manual") return { mode, policy: MANUAL_POLICY };
  if (mode === "on") return { mode, policy: ACTIVE_POLICY };

  try {
    const [history, records] = await Promise.all([
      input.client.messages({ path: { id: input.sessionID }, query: { directory: input.directory } }),
      input.continuationStore.list({ directory: input.directory, parentSessionID: input.sessionID }),
    ]);
    if (!history.error && history.data) {
      const epoch = selectAdvisorContext(history.data).epoch;
      const configuredTargets = new Set(resolveAdvisorTargets().map(targetLabel));
      if (records.some((record) => configuredTargets.has(record.target) && record.continuation.epoch === epoch)) {
        return { mode, policy: AUTO_FOLLOWUP_POLICY };
      }
    }
  } catch {
    // A missing transcript leaves auto mode at its admission policy.
  }
  return { mode, policy: AUTO_ADMISSION_POLICY };
}

export const ADVISOR_COMMANDS: Record<string, { description: string; template: string }> = {
  "consult-advisor": {
    description: "Consult the stronger advisor about the current task",
    template:
      "Consult the stronger advisor now about the current task. Before calling it, state one sentence describing the task and your initial read. Do not perform substantive work first. Use its guidance to continue.\n\nAdditional focus:\n$ARGUMENTS",
  },
};

export function createFileContinuationStore(
  root = process.env.OPENCODE_ADVISOR_STATE_ROOT ?? join(homedir(), ".opencode", "advisor", "state"),
): ContinuationStore {
  const state = createFileAdvisorContinuationStore(root);
  return {
    load: (input) => state.load({ directory: input.directory, parentSessionID: input.parentSessionID, target: targetLabel(input.target) }),
    save: (input) => state.save({
      directory: input.directory,
      parentSessionID: input.parentSessionID,
      target: targetLabel(input.target),
      continuation: input.continuation,
      ...(input.expected !== undefined ? { expected: input.expected ?? null } : {}),
    }),
    remove: (input) => state.remove({
      directory: input.directory,
      parentSessionID: input.parentSessionID,
      target: targetLabel(input.target),
      ...(input.expected !== undefined ? { expected: input.expected ?? null } : {}),
    }),
    transaction: (input, operation) =>
      state.transaction(
        { directory: input.directory, parentSessionID: input.parentSessionID, target: targetLabel(input.target) },
        operation,
      ),
    prune: state.prune,
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

function claudeErrorText(stdout: string): string | undefined {
  let parsed: { result?: unknown; is_error?: unknown; api_error_status?: unknown };
  try {
    parsed = JSON.parse(stdout) as typeof parsed;
  } catch {
    return undefined;
  }
  if (parsed.is_error !== true) return undefined;
  const detail = str(parsed.result)?.trim();
  const status = typeof parsed.api_error_status === "number" ? ` (HTTP ${parsed.api_error_status})` : "";
  return detail ? `${detail}${status}` : `Claude Code reported an unsuccessful result.${status}`;
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
        const structuredError = claudeErrorText(stdout);
        finish(
          new Error(
            structuredError ?? `Claude Code exited with ${signal ? `signal ${signal}` : `code ${code}`}: ${stderr.trim()}`,
          ),
        );
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
    api_error_status?: unknown;
    total_cost_usd?: unknown;
    modelUsage?: unknown;
  };
  try {
    parsed = JSON.parse(stdout) as typeof parsed;
  } catch {
    throw new Error("Claude Code returned invalid JSON.");
  }
  if (parsed.is_error === true) {
    throw new Error(claudeErrorText(stdout) ?? "Claude Code reported an unsuccessful result.");
  }

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

function sameContinuation(left: AdvisorContinuation | undefined, right: AdvisorContinuation | undefined): boolean {
  return (
    left?.epoch === right?.epoch &&
    left?.sessionID === right?.sessionID &&
    left?.cursor === right?.cursor &&
    left?.childCursor === right?.childCursor
  );
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
  plan: TranscriptPlan,
  executorContext: string,
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
        system: withExecutorContext(prompt.system, executorContext),
        tools: CHILD_TOOL_OVERRIDES,
         parts: [{ type: "text", text: `Here is the executor's available transcript. Advise.\n\n${plan.transcript}` }],
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
      contextEpoch: plan.epoch,
      transcriptEstimate: plan.estimatedTokens,
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

export type AdvisorContinuationCoordinatorDependencies = {
  store?: ContinuationStore;
  native: { continuations: Map<string, NativeContinuation>; locks: Map<string, Promise<void>> };
  claude: { continuations: Map<string, AdvisorContinuation>; locks: Map<string, Promise<void>>; runner: ClaudeRunner };
};

export type AdvisorContinuationCoordinator = {
  native(input: {
    directory: string;
    parentSessionID: string;
    target: OpenCodeAdvisorTarget;
    executorContext: string;
  }): Promise<AdvisorResult>;
  claude(input: {
    directory: string;
    parentSessionID: string;
    target: ClaudeCodeAdvisorTarget;
    executorContext: string;
  }): Promise<AdvisorResult>;
};

function persistenceError(error: unknown): Error {
  return new Error(`advisor continuation state unavailable: ${errorText(error)}`);
}

function targetMetadataMatches(metadata: Record<string, unknown>, target: AdvisorTarget): boolean {
  if (metadata.label === targetLabel(target)) return true;
  if (target.harness === "claude-code") {
    return metadata.harness === "claude-code" && metadata.modelID === target.modelID && metadata.effort === target.effort;
  }
  return (
    metadata.harness !== "claude-code" &&
    metadata.providerID === target.providerID &&
    metadata.modelID === target.modelID &&
    metadata.variant === target.variant
  );
}

function hasUnavailableContinuation(messages: MessageEntry[], target: AdvisorTarget): boolean {
  for (const message of [...messages].reverse()) {
    for (const part of [...(message.parts ?? [])].reverse()) {
      if (part.type !== "tool" || part.tool !== "advisor") continue;
      const stateValue = part.state;
      if (!stateValue || typeof stateValue !== "object") continue;
      const state = stateValue as { status?: unknown; metadata?: unknown };
      if (state.status !== "completed") continue;
      const metadataValue = state.metadata;
      if (!metadataValue || typeof metadataValue !== "object") continue;
      const metadata = metadataValue as Record<string, unknown>;
      const candidates = Array.isArray(metadata.targets) ? metadata.targets : [metadata];
      for (const candidate of candidates) {
        if (!candidate || typeof candidate !== "object") continue;
        const details = candidate as Record<string, unknown>;
        if (targetMetadataMatches(details, target)) return details.continuationStatus === "unavailable";
      }
    }
  }
  return false;
}

export function createAdvisorContinuationCoordinator(
  client: SessionClient,
  input: AdvisorContinuationCoordinatorDependencies,
): AdvisorContinuationCoordinator {
  const nonResumable = new Set<string>();

  const runTransaction = async <T>(
    key: string,
    state: AdvisorContinuationTransaction,
    operation: (transaction: AdvisorContinuationTransaction) => Promise<T>,
  ): Promise<T> => {
    if (!nonResumable.has(key)) return operation(state);

    // Retry failed cleanup while holding the same transaction lock, then start
    // fresh instead of replaying a delta through an untrusted cursor.
    const removed = await state.remove({ expected: state.previous ?? null });
    if (removed.status === "conflict" || removed.status === "removed") nonResumable.delete(key);
    return operation({
      ...state,
      previous: undefined,
      async save(next) {
        const saved = await state.save(next);
        if (saved.status === "committed") nonResumable.delete(key);
        return saved;
      },
    });
  };

  const discardContinuation = async (
    key: string,
    state: AdvisorContinuationTransaction,
    previous: AdvisorContinuation | undefined,
  ): Promise<AdvisorContinuationRemoveResult> => {
    const removed = await state.remove({ expected: previous ?? null });
    if (removed.status === "unavailable") nonResumable.add(key);
    else nonResumable.delete(key);
    return removed;
  };

  const transaction = async <T>(
    target: AdvisorTarget,
    map: Map<string, AdvisorContinuation>,
    locks: Map<string, Promise<void>>,
    directory: string,
    parentSessionID: string,
    operation: (transaction: AdvisorContinuationTransaction) => Promise<T>,
  ): Promise<T> => {
    const key = continuationKey(directory, parentSessionID, target);
    return withContinuationLock(locks, key, async () => {
      if (input.store) {
        return input.store.transaction({ directory, parentSessionID, target }, (state) => runTransaction(key, state, operation));
      }
      const current = map.get(key);
      return runTransaction(key, {
        previous: current,
        async reload() {
          return { status: "available", ...(map.get(key) ? { continuation: map.get(key) } : {}) };
        },
        async save(next) {
          if (next.expected !== undefined && !sameContinuation(map.get(key), next.expected ?? undefined)) {
            return { status: "conflict", ...(map.get(key) ? { current: map.get(key) } : {}) };
          }
          map.set(key, next.continuation);
          return { status: "committed", continuation: next.continuation };
        },
        async remove(next = {}) {
          if (next.expected !== undefined && !sameContinuation(map.get(key), next.expected ?? undefined)) {
            return { status: "conflict", ...(map.get(key) ? { current: map.get(key) } : {}) };
          }
          map.delete(key);
          return { status: "removed" };
        },
      }, operation);
    });
  };

  const restoreNative = async (
    transaction: AdvisorContinuationTransaction,
    directory: string,
    parentSessionID: string,
  ): Promise<NativeContinuation | undefined> => {
    const previous = transaction.previous as NativeContinuation | undefined;
    if (!previous) return undefined;
    if (!input.store) return previous;
    const child = await client.get({ path: { id: previous.sessionID }, query: { directory } });
    if (!child.error && child.data?.parentID === parentSessionID) return previous;
    const removed = await transaction.remove({ expected: previous });
    if (removed.status === "unavailable") throw persistenceError(removed.error);
    return undefined;
  };

  const cleanupFailedNative = async (input: {
    transaction: AdvisorContinuationTransaction;
    key: string;
    directory: string;
    parentSessionID: string;
    target: OpenCodeAdvisorTarget;
    previous: NativeContinuation | undefined;
    childID: string | undefined;
    created: boolean;
    submitted: boolean;
    map: Map<string, NativeContinuation>;
  }): Promise<void> => {
    if (!input.submitted) {
      if (input.created && input.childID) await deleteAdvisorSession(client, input.childID, input.directory);
      return;
    }
    const removed = await input.transaction.remove({ expected: input.previous ?? null });
    if (removed.status === "removed") {
      input.map.delete(input.key);
      if (input.created && input.childID) await deleteAdvisorSession(client, input.childID, input.directory);
      if (input.previous) {
        const current = await input.transaction.reload();
        if (current.status === "available" && current.continuation?.sessionID !== input.previous.sessionID) {
          await deleteAdvisorSession(client, input.previous.sessionID, input.directory);
        }
      }
      return;
    }
    if (removed.status === "conflict") {
      if (removed.current) input.map.set(input.key, removed.current as NativeContinuation);
      else input.map.delete(input.key);
    } else if (input.previous) {
      input.map.set(input.key, input.previous);
    } else {
      input.map.delete(input.key);
    }
    if (input.created && input.childID) await deleteAdvisorSession(client, input.childID, input.directory);
  };

  const native = async (request: {
    directory: string;
    parentSessionID: string;
    target: OpenCodeAdvisorTarget;
    executorContext: string;
  }): Promise<AdvisorResult> => {
    const { directory, parentSessionID, target, executorContext } = request;
    const prompt = resolveAdvisorPrompt(target.modelID);
    const label = modelLabel(target);
    const key = continuationKey(directory, parentSessionID, target);
    return transaction(target, input.native.continuations, input.native.locks, directory, parentSessionID, async (state) => {
      let previous = await restoreNative(state, directory, parentSessionID);
      const refreshed = await client.messages({ path: { id: parentSessionID }, query: { directory } });
      if (refreshed.error || !refreshed.data) {
        throw new Error(`could not refresh the parent transcript (${String(refreshed.error ?? "no data")}).`);
      }
      if (previous && hasUnavailableContinuation(refreshed.data, target)) {
        const stale = previous;
        const removed = await discardContinuation(key, state, stale);
        previous = removed.status === "conflict" ? (removed.current as NativeContinuation | undefined) : undefined;
        if (removed.status !== "conflict") await deleteAdvisorSession(client, stale.sessionID, directory);
      }
      const plan = planAdvisorTranscript(refreshed.data, previous);
      if (plan.transcript.length === 0) throw new Error("the transcript delta is empty; there is nothing to advise on yet.");
      const rotate = plan.rotate;
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

      let submitted = false;
      try {
        submitted = true;
        const prompted = await client.prompt({
          path: { id: childID! },
          query: { directory },
          body: {
            model: { providerID: target.providerID, modelID: target.modelID },
            ...(target.variant !== undefined ? { variant: target.variant } : {}),
            system: withExecutorContext(prompt.system, executorContext),
            tools: CHILD_TOOL_OVERRIDES,
            parts: [
              {
                type: "text",
                text: rotate
                  ? `Here is the executor's available compacted parent transcript. Advise.\n\n${plan.transcript}`
                  : `Here are the parent transcript messages added since your previous review. Advise.\n\n${plan.transcript}`,
              },
            ],
          },
        });
        if (prompted.error) throw new Error(`the advisor model (${target.providerID}/${label}) failed: ${String(prompted.error)}`);
        const advice = extractText(prompted.data);
        if (advice.length === 0) throw new Error(`the advisor returned no text (model ${target.providerID}/${label}).`);

        const usage = await usageSince(client, childID!, directory, rotate ? undefined : previous?.childCursor);
        let continuationStatus: "committed" | "conflict" | "unavailable" = "unavailable";
        if (usage.readable) {
          const continuation: NativeContinuation = {
            epoch: plan.epoch,
            sessionID: childID!,
            cursor: plan.cursor,
            childCursor: usage.cursor,
          };
          const saved = await state.save({ continuation, expected: previous ?? null });
          continuationStatus = saved.status;
          if (saved.status === "committed") {
            input.native.continuations.set(key, continuation);
            if (rotate && previous) {
              const current = await state.reload();
              if (current.status === "available" && current.continuation?.sessionID !== previous.sessionID) {
                await deleteAdvisorSession(client, previous.sessionID, directory);
              } else if (current.status === "unavailable") {
                continuationStatus = "unavailable";
              }
            }
          } else if (saved.status === "conflict") {
            if (saved.current) input.native.continuations.set(key, saved.current as NativeContinuation);
            else input.native.continuations.delete(key);
            if (created) await deleteAdvisorSession(client, childID!, directory);
          } else {
            // Guidance is still valid, but the continuation is not. Discard
            // local continuity and fence cleanup by the durable record loaded
            // for this turn.
            input.native.continuations.delete(key);
            const removed = await discardContinuation(key, state, previous);
            if (removed.status === "conflict") {
              continuationStatus = "conflict";
              if (removed.current) input.native.continuations.set(key, removed.current as NativeContinuation);
            }
            const childrenToDelete = new Set<string>();
            if (created && childID) childrenToDelete.add(childID);
            if (removed.status !== "conflict" && previous) childrenToDelete.add(previous.sessionID);
            for (const sessionID of childrenToDelete) {
              await deleteAdvisorSession(client, sessionID, directory);
            }
          }
        } else {
          await cleanupFailedNative({
            transaction: state,
            key,
            directory,
            parentSessionID,
            target,
            previous,
            childID,
            created,
            submitted,
            map: input.native.continuations,
          });
        }
        const metadata = {
          providerID: target.providerID,
          modelID: target.modelID,
          variant: target.variant,
          promptVariant: prompt.variant,
          contextEpoch: plan.epoch,
          transcriptEstimate: plan.estimatedTokens,
          usage: usage.usage,
          continuationStatus,
        };
        return {
          target,
          label: targetLabel(target),
          title: `Advisor (${label})`,
          output: `${advice}\n\n${formatUsage(usage.usage)}`,
          metadata,
        };
      } catch (error) {
        await cleanupFailedNative({
          transaction: state,
          key,
          directory,
          parentSessionID,
          target,
          previous,
          childID,
          created,
          submitted,
          map: input.native.continuations,
        });
        throw error;
      }
    });
  };

  const claude = async (request: {
    directory: string;
    parentSessionID: string;
    target: ClaudeCodeAdvisorTarget;
    executorContext: string;
  }): Promise<AdvisorResult> => {
    const { directory, parentSessionID, target, executorContext } = request;
    const prompt = resolveAdvisorPrompt(target.modelID);
    const key = continuationKey(directory, parentSessionID, target);
    return transaction(target, input.claude.continuations, input.claude.locks, directory, parentSessionID, async (state) => {
      let previous = state.previous;
      const refreshed = await client.messages({ path: { id: parentSessionID }, query: { directory } });
      if (refreshed.error || !refreshed.data) {
        throw new Error(`could not refresh the parent transcript (${String(refreshed.error ?? "no data")}).`);
      }
      if (previous && hasUnavailableContinuation(refreshed.data, target)) {
        const removed = await discardContinuation(key, state, previous);
        previous = removed.status === "conflict" ? removed.current : undefined;
      }
      const plan = planAdvisorTranscript(refreshed.data, previous);
      if (plan.transcript.length === 0) throw new Error("the transcript delta is empty; there is nothing to advise on yet.");
      const output = parseClaudeOutput(
        await input.claude.runner({
          cwd: claudeAdvisorDirectory(),
          prompt: plan.rotate
            ? `Here is the executor's available compacted parent transcript. Advise.\n\n${plan.transcript}`
            : `Here are the parent transcript messages added since your previous review. Advise.\n\n${plan.transcript}`,
          model: target.modelID,
          effort: target.effort,
          system: withExecutorContext(prompt.system, executorContext),
          ...(plan.rotate ? {} : { resume: previous!.sessionID }),
        }),
        target.modelID,
      );
      const continuation = { epoch: plan.epoch, sessionID: output.sessionID, cursor: plan.cursor };
      const saved = await state.save({ continuation, expected: previous ?? null });
      if (saved.status === "committed") {
        input.claude.continuations.set(key, continuation);
      } else {
        input.claude.continuations.delete(key);
      }
      let continuationStatus = saved.status;
      if (saved.status === "conflict" && saved.current) {
        input.claude.continuations.set(key, saved.current);
      }
      if (saved.status === "unavailable") {
        const removed = await discardContinuation(key, state, previous);
        if (removed.status === "conflict") {
          continuationStatus = "conflict";
          if (removed.current) input.claude.continuations.set(key, removed.current);
        }
      }

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
          contextEpoch: plan.epoch,
          transcriptEstimate: plan.estimatedTokens,
          continuationStatus,
        },
      };
    });
  };

  return { native, claude };
}

function unavailableMessage(executorModelID: string | undefined, target: OpenCodeAdvisorTarget): string {
  return `Skipped: the executor's GPT-5.6 ${gpt56Tier(executorModelID)} tier is equal to or stronger than the advisor's ${gpt56Tier(target.modelID)} tier.`;
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function unavailableAdvisorMessage(failures: Array<{ label: string; error: string }>): string {
  const sessionLimit = failures.find((failure) => /session limit/i.test(failure.error));
  if (failures.length === 1 && sessionLimit) return `Advisor unavailable: ${sessionLimit.error} Continue without advisor.`;
  return `Advisor unavailable; continuing without advisor.\n${failures.map((failure) => `${failure.label}: ${failure.error}`).join("\n")}`;
}

export type ManualAdvisorRequest = {
  userMessageID?: string;
};

function explicitlyRequestsAdvisor(parts: readonly unknown[]): boolean {
  const text = parts
    .flatMap((part) => {
      if (!part || typeof part !== "object") return [];
      const value = part as { type?: unknown; text?: unknown };
      return value.type === "text" && typeof value.text === "string" ? [value.text.toLowerCase()] : [];
    })
    .join("\n");
  return /^(?:hey[,.]?\s+)?(?:(?:please\s+)?(?:consult|ask|use|call)\s+(?:the\s+)?advisor\b|(?:can|could|would|will)\s+you\s+(?:please\s+)?(?:consult|ask|use|call)\s+(?:the\s+)?advisor\b|i\s+(?:want|need|would like)\s+(?:you\s+)?to\s+(?:consult|ask|use|call)\s+(?:the\s+)?advisor\b)/.test(text.trim());
}

function consumeManualAdvisorRequest(
  requests: Map<string, ManualAdvisorRequest>,
  sessionID: string,
  executor: MessageEntry | undefined,
): boolean {
  const request = requests.get(sessionID);
  if (!request?.userMessageID || executor?.info?.parentID !== request.userMessageID) return false;
  requests.delete(sessionID);
  return true;
}

export type AdvisorToolDependencies = {
  client: SessionClient;
  continuation?: AdvisorContinuationCoordinatorDependencies;
  skillsBySession?: Map<string, SkillSummary[]>;
  requestsBySession?: Map<string, ExecutorRequest>;
  capabilities?: AdvisorCapabilityClient;
  modeStore?: AdvisorModeStore;
  settingsStore?: AdvisorSettingsStore;
  manualAdvisorRequests?: Map<string, ManualAdvisorRequest>;
};

export function createAdvisorTool(input: AdvisorToolDependencies): ToolDefinition {
  const continuation = input.continuation ?? {
    native: { continuations: nativeContinuations, locks: nativeContinuationLocks },
    claude: { continuations: claudeContinuations, locks: claudeContinuationLocks, runner: runClaude },
  };
  const coordinator = createAdvisorContinuationCoordinator(input.client, continuation);
  const modeStore = input.modeStore ?? createFileAdvisorModeStore();
  const settingsStore = input.settingsStore ?? createFileAdvisorSettingsStore();
  const manualAdvisorRequests = input.manualAdvisorRequests ?? new Map<string, ManualAdvisorRequest>();
  const skillsBySession = input.skillsBySession ?? new Map<string, SkillSummary[]>();
  const requestsBySession = input.requestsBySession ?? new Map<string, ExecutorRequest>();
  const capabilities = input.capabilities ?? {};
  return {
    description: ADVISOR_DESCRIPTION,
    args: {},
    async execute(_args, ctx) {
      await input.continuation?.store?.prune(ctx.directory);
      let targets: AdvisorTarget[];
      let nativeMode: NativeAdvisorMode;
      let includeExecutorContext: boolean;
      try {
        targets = resolveAdvisorTargets();
        nativeMode = resolveNativeAdvisorMode();
        includeExecutorContext = executorContextEnabled();
      } catch (error) {
        return `Error: ${errorText(error)}`;
      }

      const session = await input.client.get({ path: { id: ctx.sessionID }, query: { directory: ctx.directory } });
      if (session.error || !session.data) {
        return `Error: could not read the current session (${String(session.error ?? "no data")}).`;
      }
      const mode = (
        await resolveInheritedAdvisorMode({
          modeStore,
          settingsStore,
          directory: ctx.directory,
          sessionID: ctx.sessionID,
          parentID: async (sessionID) => {
            if (sessionID === ctx.sessionID) return session.data?.parentID;
            const parent = await input.client.get({ path: { id: sessionID }, query: { directory: ctx.directory } });
            return parent.data?.parentID;
          },
        })
      ).mode;
      if (mode === "manual" && !manualAdvisorRequests.has(ctx.sessionID)) {
        return MANUAL_BLOCKED_MESSAGE;
      }
      if (session.data.parentID && ctx.agent !== "general") {
        return "Skipped: advisor is available to subagents only when running as general.";
      }

      const history = await input.client.messages({
        path: { id: ctx.sessionID },
        query: { directory: ctx.directory },
      });
      if (history.error || !history.data) {
        return `Error: could not read the session transcript (${String(history.error ?? "no data")}).`;
      }
      const messages = history.data;

      const executor = messages.find((message) => message.info?.id === ctx.messageID);
      if (mode === "manual" && !consumeManualAdvisorRequest(manualAdvisorRequests, ctx.sessionID, executor)) {
        return MANUAL_BLOCKED_MESSAGE;
      }
      const executorModelID = executor?.info?.modelID;
      const eligible = targets.filter(
        (target) => target.harness === "claude-code" || !advisorUnavailable(executorModelID, target.modelID),
      );
      if (eligible.length === 0) {
        const advisor = targets.find((target): target is OpenCodeAdvisorTarget => target.harness === "opencode");
        return advisor
          ? unavailableMessage(executorModelID, advisor)
          : "Skipped: no configured advisor target is eligible.";
      }

      const plan = planAdvisorTranscript(messages, undefined);
      if (plan.transcript.length === 0) {
        return "Error: the transcript is empty; there is nothing to advise on yet.";
      }
      const executorContext = includeExecutorContext
        ? await collectExecutorContext(
            capabilities,
            ctx.directory,
            skillsBySession.get(ctx.sessionID) ?? [],
            { modelID: executorModelID, providerID: executor?.info?.providerID ?? requestsBySession.get(ctx.sessionID)?.providerID },
          )
        : "";

      const settled = await Promise.allSettled(
        eligible.map((target) =>
          target.harness === "opencode"
            ? nativeMode === "fresh"
                ? runFreshOpenCodeAdvisor(input.client, ctx.sessionID, ctx.directory, target, plan, executorContext)
                : coordinator.native({
                    directory: ctx.directory,
                    parentSessionID: ctx.sessionID,
                    target,
                    executorContext,
                  })
              : coordinator.claude({
                  directory: ctx.directory,
                  parentSessionID: ctx.sessionID,
                  target,
                  executorContext,
                }),
        ),
      );
      const successes = settled.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
      for (const result of successes) result.metadata = { mode, ...result.metadata };
      const failures = settled.flatMap((result, index) =>
        result.status === "rejected" ? [{ label: targetLabel(eligible[index]!), error: errorText(result.reason) }] : [],
      );
      if (successes.length === 0) {
        return unavailableAdvisorMessage(failures);
      }

      const legacySingleNative =
        targets.length === 1 && successes.length === 1 && successes[0]!.target.harness === "opencode";
      if (legacySingleNative) {
        const result = successes[0]!;
        ctx.metadata({ title: `advisor: ${modelLabel(result.target as OpenCodeAdvisorTarget)}`, metadata: result.metadata });
        return { title: result.title, output: result.output, metadata: result.metadata };
      }

      const metadata = {
        mode,
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
    const modeStore = createFileAdvisorModeStore();
    const settingsStore = createFileAdvisorSettingsStore();
    const manualAdvisorRequests = new Map<string, ManualAdvisorRequest>();
    const skillsBySession = new Map<string, SkillSummary[]>();
    const requestsBySession = new Map<string, ExecutorRequest>();
    const api = client as unknown as { session: SessionClient; mcp?: AdvisorCapabilityClient["mcp"]; tool?: AdvisorCapabilityClient["tool"] };
    await store.prune(directory);
    return {
      tool: {
        advisor: createAdvisorTool({
          client: api.session,
          continuation: {
            store,
            native: { continuations: nativeContinuations, locks: nativeContinuationLocks },
            claude: { continuations: claudeContinuations, locks: claudeContinuationLocks, runner: runClaude },
          },
          skillsBySession,
          requestsBySession,
          capabilities: { mcp: api.mcp, tool: api.tool },
          modeStore,
          settingsStore,
          manualAdvisorRequests,
        }),
      },
      config: async (config) => {
        config.command = { ...config.command, ...ADVISOR_COMMANDS };
      },
      "chat.params": async (input) => {
        requestsBySession.set(input.sessionID, {
          modelID: input.model.id,
          providerID: (input.provider as unknown as { id?: string }).id ?? input.model.providerID,
        });
      },
      "command.execute.before": async (input) => {
        if (input.command === "consult-advisor" || input.command === "/consult-advisor") {
          const mode = (
            await inheritedAdvisorMode({ modeStore, settingsStore, client: api.session, directory, sessionID: input.sessionID })
          ).mode;
          if (mode === "manual") {
            manualAdvisorRequests.set(input.sessionID, {});
          }
        }
      },
      "chat.message": async (input, output) => {
        if (output.message.role !== "user") return;
        const messageID = input.messageID ?? output.message.id;
        if (!messageID) {
          manualAdvisorRequests.delete(input.sessionID);
          return;
        }
        const request = manualAdvisorRequests.get(input.sessionID);
        if (!request) {
          const mode = (
            await inheritedAdvisorMode({ modeStore, settingsStore, client: api.session, directory, sessionID: input.sessionID })
          ).mode;
          if (mode === "manual" && explicitlyRequestsAdvisor(output.parts)) {
            manualAdvisorRequests.set(input.sessionID, { userMessageID: messageID });
          }
          return;
        }
        if (request.userMessageID === undefined) request.userMessageID = messageID;
        else if (request.userMessageID !== messageID) manualAdvisorRequests.delete(input.sessionID);
      },
      "experimental.chat.system.transform": async (input, output) => {
        if (executorContextEnabled() && input.sessionID) {
          const skills = extractAvailableSkills(output.system);
          const previous = skillsBySession.get(input.sessionID);
          if (skills.length >= (previous?.length ?? 0)) skillsBySession.set(input.sessionID, skills);
        }
        if (input.sessionID) {
          const policy = await advisorExecutorPolicy({
            modeStore,
            settingsStore,
            continuationStore: createFileAdvisorContinuationStore(),
            client: api.session,
            directory,
            sessionID: input.sessionID,
          });
          output.system.push(policy.policy);
          const prompt = policy.mode === "manual" ? undefined : advisorAvailabilityPrompt(input.model.id);
          if (prompt) output.system.push(prompt);
        } else {
          const prompt = advisorAvailabilityPrompt(input.model.id);
          if (prompt) output.system.push(prompt);
        }
      },
    };
  },
};

export default AdvisorPlugin;
