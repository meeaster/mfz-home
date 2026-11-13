import { createHash } from "node:crypto";

import { Plugin } from "@opencode/plugin";
import type { SessionContext } from "@opencode/plugin/promise/session";
import { z } from "zod";

import {
  ADVISOR_INSTRUCTIONS,
  ADVISOR_MANUAL_TOOL_DESCRIPTION,
  ADVISOR_SYSTEM_SECTION,
  ADVISOR_TOOL_DESCRIPTION,
} from "./prompts.js";
import {
  ADVISOR_TOOL,
  advisorCallsThisTurn,
  continuePrompt,
  currentStep,
  renderHeader,
  renderMessage,
  renderStep,
  startPrompt,
  userAskedForAdvisor,
  type ExecutorRequest,
} from "./transcript.js";

// Each tracked session holds a reference to its latest request; this bounds how many a long-lived server keeps.
const MAX_TRACKED_SESSIONS = 64;

// The claude-agent provider runs Claude Code, which keeps its own preset prompt and takes OpenCode's agent role and
// instructions through these provider options.
const CLAUDE_AGENT = "claude-agent";

const CLAUDE_AGENT_ROLE = "claudeCodeAgent";

const CLAUDE_INSTRUCTIONS = "claudeCodeInstructions";

// "auto": the executor decides when to consult, as in Claude Code. "manual": only in turns where the user's message
// mentions the advisor. The tool stays registered either way so the tool list, and its prompt cache, never changes
// between turns.
const Trigger = z.enum(["auto", "manual"]);

const AdvisorRule = z
  .object({
    // Executor models this rule covers, as "provider/model" where `*` matches anything: "*", "openai/*",
    // "claude-agent/opus". The variant is not part of the match.
    executor: z.string().regex(/^[^/#]+\/[^#]+$|^\*$/).default("*"),
    // The advisor: "provider/model" with an optional "#variant", such as "claude-agent/fable#medium".
    model: z.string().regex(/^[^/#]+\/[^#]+(#[^#]+)?$/),
    // Overrides the top-level trigger for executors this rule covers.
    trigger: Trigger.optional(),
  })
  .strict();

const AdvisorOptions = z
  .object({
    // Checked in order; the first rule whose executor pattern matches the session's model picks its advisor. Models
    // no rule matches get no advisor tool at all.
    advisors: z.array(AdvisorRule).min(1),
    // Per-turn cap, like the API's max_uses. Unset means unlimited.
    maxUses: z.number().int().positive().optional(),
    // Caps each advice reply, like the API tool's max_tokens. Unset leaves the model's default.
    maxTokens: z.number().int().min(1024).optional(),
    // The default for rules that set no trigger.
    trigger: Trigger.default("auto"),
  })
  .strict();

export type AdvisorOptions = z.infer<typeof AdvisorOptions>;

// One advisor child session per executor session. It is a real conversation so each call appends to a cached prefix.
// It stays visible as an "Advisor" child: in OpenCode 2.2.7 the plugin host's session.update ignores `archived`.
type Advisor = {
  sessionID: string;
  model: string;
  header: string;
  sent: number;
  sentHash: string;
};

export function parseModelRef(value: string) {
  const [path = "", variant] = value.split("#");

  const slash = path.indexOf("/");

  const providerID = path.slice(0, slash);

  const id = path.slice(slash + 1);

  return variant === undefined ? { providerID, id } : { providerID, id, variant };
}

const ERROR_DETAIL = {
  max_uses_exceeded: "",
  unavailable: "",
  not_requested: ": the advisor is only available in turns where the user asks you to consult it",
};

function advisorError(code: keyof typeof ERROR_DETAIL, detail?: string) {
  const reason = detail === undefined ? ERROR_DETAIL[code] : `: ${detail}`;

  return {
    content: `Advisor unavailable (${code})${reason}. Continue without further advice.`,
    metadata: { advisor: "unavailable", error: code },
  };
}

const hashOf = (parts: readonly string[]) => createHash("sha256").update(parts.join("\u0000")).digest("hex");

export function executorPattern(pattern: string) {
  const source = pattern
    .split("*")
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");

  return new RegExp(`^${source}$`);
}

type Rule = { pattern: RegExp; model: string; trigger: z.infer<typeof Trigger> };

// The executor's latest request and the rule its model matched.
type Tracked = { request: ExecutorRequest; rule: Rule };

export async function setupAdvisor(context: Plugin.Context) {
  const options = AdvisorOptions.parse(context.options);

  const rules: Rule[] = options.advisors.map((rule) => ({
    pattern: executorPattern(rule.executor),
    model: rule.model,
    trigger: rule.trigger ?? options.trigger,
  }));

  const ruleFor = (model: SessionContext["model"]) => rules.find((rule) => rule.pattern.test(`${model.providerID}/${model.id}`));

  const requests = new Map<string, Tracked>();

  const advisors = new Map<string, Advisor>();

  const advisorSessions = new Set<string>();

  // Calls from one executor session run one at a time, since each extends the same advisor conversation.
  const queues = new Map<string, Promise<unknown>>();

  // The advisor's own requests: its instructions as the whole system prompt, and no tools.
  const configureAdvisorRequest = (event: SessionContext) => {
    event.system = [{ type: "text", text: ADVISOR_INSTRUCTIONS }];

    for (const name of Object.keys(event.tools)) delete event.tools[name];

    if (options.maxTokens !== undefined) event.options.maxTokens = options.maxTokens;

    if (event.model.providerID !== CLAUDE_AGENT) return;

    // Claude Code drops the first system part as OpenCode's own prompt; the second survives if its hook runs later.
    event.system.unshift({ type: "text", text: "" });
    event.options[CLAUDE_AGENT_ROLE] = ADVISOR_INSTRUCTIONS;
    event.options[CLAUDE_INSTRUCTIONS] = "";
  };

  // Executors no rule covers lose the tool; agents whose permissions remove it get no advisor guidance either. The
  // tool is registered once, so a manual rule swaps in its description per request.
  const configureExecutorRequest = (event: SessionContext) => {
    const rule = ruleFor(event.model);

    const tool = event.tools[ADVISOR_TOOL];

    if (rule === undefined) delete event.tools[ADVISOR_TOOL];
    else if (tool !== undefined && rule.trigger === "manual") tool.description = ADVISOR_MANUAL_TOOL_DESCRIPTION;
    else if (tool !== undefined) addSection(event);

    return rule;
  };

  const addSection = (event: SessionContext) => {
    event.system.push({ type: "text", text: ADVISOR_SYSTEM_SECTION });

    if (event.model.providerID !== CLAUDE_AGENT) return;

    // Claude Code's instructions were already built from event.system by the built-in hook, which runs first.
    const instructions = z.string().catch("").parse(event.options[CLAUDE_INSTRUCTIONS]);

    event.options[CLAUDE_INSTRUCTIONS] = instructions === "" ? ADVISOR_SYSTEM_SECTION : `${instructions}\n\n${ADVISOR_SYSTEM_SECTION}`;
  };

  const capture = (event: SessionContext) => {
    if (advisorSessions.has(event.sessionID)) return configureAdvisorRequest(event);

    const rule = configureExecutorRequest(event);

    requests.delete(event.sessionID);

    if (rule === undefined) return;

    requests.set(event.sessionID, { request: event, rule });

    const oldest = requests.keys().next();

    if (requests.size > MAX_TRACKED_SESSIONS && !oldest.done) {
      requests.delete(oldest.value);
      advisors.delete(oldest.value);
      queues.delete(oldest.value);
    }
  };

  const hooks = await Promise.all([
    context.session.hook("context", capture),
    // Transient generations send the same tools, so they get the same system text and keep the prompt-cache prefix.
    context.session.hook("generate", (event) =>
      advisorSessions.has(event.sessionID) ? configureAdvisorRequest(event) : void configureExecutorRequest(event),
    ),
  ]);

  const startAdvisor = async (executorID: string, model: string, header: string) => {
    const session = await context.session.create({ parentID: executorID, title: "Advisor", model: parseModelRef(model) });

    advisorSessions.add(session.id);

    return { sessionID: session.id, model, header, sent: 0, sentHash: hashOf([]) } satisfies Advisor;
  };

  // Sends the transcript, or only what is new since the last call when the executor's earlier history is unchanged.
  const consult = async (executorID: string, tracked: Tracked, step: string, signal: AbortSignal) => {
    const { request } = tracked;

    const { model } = tracked.rule;

    const header = renderHeader(request);

    const messages = request.messages.map(renderMessage);

    const previous = advisors.get(executorID);

    // A model switch can pick another advisor, which needs its own session.
    const continues =
      previous !== undefined &&
      previous.model === model &&
      previous.header === header &&
      previous.sent <= messages.length &&
      previous.sentHash === hashOf(messages.slice(0, previous.sent));

    const advisor = continues ? previous : await startAdvisor(executorID, model, header);

    advisors.set(executorID, advisor);

    const text = continues ? continuePrompt(messages.slice(advisor.sent), step) : startPrompt(header, messages, step);

    const abort = () => void context.session.interrupt({ sessionID: advisor.sessionID, resume: false });

    signal.addEventListener("abort", abort, { once: true });

    try {
      await context.session.prompt({ sessionID: advisor.sessionID, text });
      await context.session.wait({ sessionID: advisor.sessionID });
    } finally {
      signal.removeEventListener("abort", abort);
    }

    const reply = (await context.session.context({ sessionID: advisor.sessionID })).findLast((message) => message.type === "assistant");

    if (reply?.type !== "assistant") throw new Error("the advisor session produced no reply");

    if (reply.error !== undefined) throw new Error(reply.error.message);

    advisor.sent = messages.length;
    advisor.sentHash = hashOf(messages);

    return {
      advice: reply.content.flatMap((part) => (part.type === "text" ? [part.text] : [])).join("\n\n"),
      advisorSessionID: advisor.sessionID,
      continued: continues,
      tokens: reply.tokens,
      cost: reply.cost,
    };
  };

  const tools = await context.tool.transform((editor) => {
    editor.add({
      name: ADVISOR_TOOL,
      description: ADVISOR_TOOL_DESCRIPTION,
      input: { type: "object", properties: {}, additionalProperties: false },
      // A direct tool, as with Claude: the executor calls advisor() itself, not from inside Code Mode.
      options: { codemode: false },
      execute: async (_input, call) => {
        const tracked = requests.get(call.sessionID);

        if (tracked === undefined) return advisorError("unavailable", "no transcript captured for this session");

        const { messages } = tracked.request;

        if (tracked.rule.trigger === "manual" && !userAskedForAdvisor(messages)) return advisorError("not_requested");

        const step = currentStep(await context.session.context({ sessionID: call.sessionID }), call.messageID);

        if (options.maxUses !== undefined && advisorCallsThisTurn(messages, step, call.id) >= options.maxUses)
          return advisorError("max_uses_exceeded");

        await call.progress({ advisor: "advising", model: tracked.rule.model });

        const run = (queues.get(call.sessionID) ?? Promise.resolve()).then(() =>
          consult(call.sessionID, tracked, renderStep(step, call.id), call.signal),
        );

        queues.set(call.sessionID, run.catch(() => undefined));

        try {
          const result = await run;

          return {
            content: result.advice,
            metadata: {
              advisor: "reviewed",
              model: tracked.rule.model,
              advisorSessionID: result.advisorSessionID,
              continued: result.continued,
              tokens: result.tokens ?? null,
              cost: result.cost ?? null,
            },
          };
        } catch (error) {
          if (call.signal.aborted) throw error;

          return advisorError("unavailable", error instanceof Error ? error.message : String(error));
        }
      },
    });
  });

  return async () => {
    await Promise.all([tools.dispose(), ...hooks.map((hook) => hook.dispose())]);
  };
}

export default Plugin.define({
  id: "advisor",
  setup: setupAdvisor,
});
