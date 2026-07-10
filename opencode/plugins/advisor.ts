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
 * Configure the advisor model with OPENCODE_ADVISOR_MODEL="provider/model" or
 * "provider/model@variant" to pin a variant such as a reasoning-effort level
 * (default: anthropic/claude-opus-4-8). Example: openai/gpt-5.5@high.
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
  agent_task: false,
};

function resolveAdvisorModel(): { providerID: string; modelID: string; variant?: string } {
  const raw = process.env.OPENCODE_ADVISOR_MODEL ?? "anthropic/claude-opus-4-8";
  const at = raw.indexOf("@");
  const variant = at >= 0 ? raw.slice(at + 1) || undefined : undefined;
  const modelPart = at >= 0 ? raw.slice(0, at) : raw;
  const slash = modelPart.indexOf("/");
  const base =
    slash <= 0
      ? { providerID: "anthropic", modelID: modelPart }
      : { providerID: modelPart.slice(0, slash), modelID: modelPart.slice(slash + 1) };
  return variant ? { ...base, variant } : base;
}

function modelLabel(model: { modelID: string; variant?: string }): string {
  return model.variant ? `${model.modelID}@${model.variant}` : model.modelID;
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
  const advisor = resolveAdvisorModel();
  if (!advisorUnavailable(executorModelID, advisor.modelID)) return undefined;
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
  if (type === "tool") {
    const name = str(part.tool) ?? "tool";
    const state = (part.state ?? {}) as Record<string, unknown>;
    const status = str(state.status);
    const input = state.input !== undefined ? JSON.stringify(state.input) : "";
    if (status === "completed") {
      return `[tool ${name}] input=${input}\n-> ${str(state.output)?.trim() ?? ""}`;
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

export function selectAdvisorMessages(messages: MessageEntry[]): MessageEntry[] {
  const markers = new Map<string, number>();
  let latest:
    | { markerIndex: number; summaryIndex: number; tailStartID: string | undefined }
    | undefined;

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
      latest = { markerIndex, summaryIndex: index, tailStartID };
    }
  }

  if (!latest) return messages;
  const tailIndex = latest.tailStartID ? messages.findIndex((message) => message.info?.id === latest.tailStartID) : -1;
  if (tailIndex >= 0 && tailIndex < latest.markerIndex) {
    return [
      ...messages.slice(latest.markerIndex, latest.summaryIndex + 1),
      ...messages.slice(tailIndex, latest.markerIndex),
      ...messages.slice(latest.summaryIndex + 1),
    ];
  }
  return messages.slice(latest.summaryIndex);
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

function createAdvisorTool(client: SessionClient): ToolDefinition {
  return {
    description: ADVISOR_DESCRIPTION,
    args: {},
    async execute(_args, ctx) {
      const model = resolveAdvisorModel();
      let prompt: { variant: AdvisorPromptVariant; system: string };
      try {
        prompt = resolveAdvisorPrompt(model.modelID);
      } catch (error) {
        return `Error: ${error instanceof Error ? error.message : String(error)}`;
      }

      const session = await client.get({
        path: { id: ctx.sessionID },
        query: { directory: ctx.directory },
      });
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

      const executorModelID = history.data.find((message) => message.info?.id === ctx.messageID)?.info?.modelID;
      const executorTier = gpt56Tier(executorModelID);
      const advisorTier = gpt56Tier(model.modelID);
      if (advisorUnavailable(executorModelID, model.modelID)) {
        return `Skipped: the executor's GPT-5.6 ${executorTier} tier is equal to or stronger than the advisor's ${advisorTier} tier.`;
      }

      const transcript = serializeTranscript(selectAdvisorMessages(history.data));
      if (transcript.length === 0) {
        return "Error: the transcript is empty; there is nothing to advise on yet.";
      }

      const label = modelLabel(model);
      const child = await client.create({
        body: { parentID: ctx.sessionID, title: `advisor (${label})` },
        query: { directory: ctx.directory },
      });
      if (child.error || !child.data?.id) {
        return `Error: could not open an advisor session (${String(child.error ?? "no id")}).`;
      }
      const childId = child.data.id;

      try {
        const prompted = await client.prompt({
          path: { id: childId },
          query: { directory: ctx.directory },
          body: {
            model: { providerID: model.providerID, modelID: model.modelID },
            ...(model.variant !== undefined ? { variant: model.variant } : {}),
            system: prompt.system,
            tools: CHILD_TOOL_OVERRIDES,
            parts: [
              {
                type: "text",
                text: `Here is the executor's full transcript. Advise.\n\n${transcript}`,
              },
            ],
          },
        });
        if (prompted.error) {
          return `Error: the advisor model (${model.providerID}/${label}) failed: ${String(prompted.error)}`;
        }

        const advice = extractText(prompted.data);
        if (advice.length === 0) {
          return `Error: the advisor returned no text (model ${model.providerID}/${label}).`;
        }

        let usage: AdvisorUsage | undefined;
        try {
          const childMessages = await client.messages({
            path: { id: childId },
            query: { directory: ctx.directory },
          });
          usage = childMessages.error || !childMessages.data ? undefined : extractUsage(childMessages.data);
        } catch {
          // Usage must not hide valid advice if the completed child disappears first.
        }
        const meta = {
          providerID: model.providerID,
          modelID: model.modelID,
          variant: model.variant,
          promptVariant: prompt.variant,
          usage,
        };
        ctx.metadata({ title: `advisor: ${label}`, metadata: meta });

        return {
          title: `Advisor (${label})`,
          output: `${advice}\n\n${formatUsage(usage)}`,
          metadata: meta,
        };
      } finally {
        // Throwaway review session: best-effort cleanup, never fatal.
        try {
          await client.delete({ path: { id: childId }, query: { directory: ctx.directory } });
        } catch {
          // ignore
        }
      }
    },
  };
}

const AdvisorPlugin: PluginModule = {
  id: "advisor",
  server: async ({ client }) => ({
    tool: {
      advisor: createAdvisorTool((client as unknown as { session: SessionClient }).session),
    },
    "experimental.chat.system.transform": async (input, output) => {
      const prompt = advisorAvailabilityPrompt(input.model.id);
      if (prompt) output.system.push(prompt);
    },
  }),
};

export default AdvisorPlugin;
