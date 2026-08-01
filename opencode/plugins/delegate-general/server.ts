import { access, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { tool, type PluginModule, type ToolDefinition } from "@opencode-ai/plugin";

const z = tool.schema;

export type AgentInfo = {
  name: string;
  mode?: string;
  permission?: PermissionRule[] | Record<string, unknown>;
  tools?: Record<string, boolean>;
};

export type PermissionRule = {
  permission: string;
  pattern: string;
  action: "allow" | "ask" | "deny";
};

export type AllowedModel = {
  id: string;
  variants: string[];
  description?: string;
};

export type DelegateGeneralConfig = {
  models: AllowedModel[];
};

export type DelegateGeneralConfigLoadResult = {
  config: DelegateGeneralConfig;
  path: string;
};

export const DELEGATE_GENERAL_CONFIG_RELATIVE_PATH = ".opencode/delegate-general.json";
export const DELEGATE_GENERAL_GLOBAL_CONFIG_RELATIVE_PATH = "delegate-general.json";
export const MAX_DELEGATED_SESSION_RESUME_CONTEXT_TOKENS = 250_000;

const DEFAULT_OUTPUT_TOKEN_MAX = 32_000;
const COMPACTION_BUFFER_TOKENS = 20_000;

export type DelegatedPromptBody = {
  agent: string;
  model: { providerID: string; modelID: string };
  variant: string;
  parts: Array<{ type: "text"; text: string }>;
};

export type DelegatedPromptResult = {
  info?: {
    tokens?: SessionTokenUsage;
  };
  parts: Array<{ type: string; text: string }> | undefined;
};

export type SessionTokenUsage = {
  input: number;
  output: number;
  reasoning?: number;
  cache: { read: number; write: number };
  total?: number;
};

export type DelegatedSessionMessage = {
  info: {
    role?: string;
    tokens?: SessionTokenUsage;
  };
};

export type ProviderModelInfo = {
  id: string;
  limit: {
    context: number;
    input?: number;
    output: number;
  };
  cost?: {
    tiers?: Array<{ tier: { type: "context"; size: number } }>;
    experimentalOver200K?: unknown;
  };
};

export type SessionContextStatus = {
  contextTokens: number;
  contextWindow: number;
  contextWindowPercent?: number;
  autoCompactionThreshold?: number;
  tokensUntilAutoCompaction?: number;
  currentPricingTier?: number;
  nextPricingTier?: number;
};

type OpenCodeConfig = {
  experimental?: { primary_tools?: unknown };
  compaction?: { auto?: boolean; reserved?: number };
};

type SessionClient = {
  get(input: { path: { id: string }; query?: { directory?: string } }): Promise<{
    data?: { id?: string };
  }>;
  create(input: {
    body: { parentID: string; title: string; permission?: PermissionRule[] };
    query: { directory: string };
  }): Promise<{ data?: { id: string }; error?: unknown }>;
  prompt(input: {
    path: { id: string };
    query?: { directory?: string };
    body: {
      agent: string;
      model: { providerID: string; modelID: string };
      variant: string;
      tools?: Record<string, boolean>;
      parts: Array<{ type: "text"; text: string }>;
    };
  }): Promise<{ data?: DelegatedPromptResult; error?: unknown }>;
  messages(input: {
    path: { id: string };
    query?: { directory?: string; limit?: number };
  }): Promise<{ data?: DelegatedSessionMessage[]; error?: unknown }>;
};

type ProviderClient = {
  list(input?: { query?: { directory?: string } }): Promise<{
    data?: {
      all?: Array<{
        id: string;
        models: Record<string, ProviderModelInfo>;
      }>;
    };
    error?: unknown;
  }>;
};

type OkResult<T> = { ok: true; value: T };
type ErrResult = { ok: false; error: string };
type Result<T> = OkResult<T> | ErrResult;

export function resolveCallableAgent(list: AgentInfo[], name: string): Result<AgentInfo> {
  const match = list.find((item) => item.name === name);
  if (!match) {
    return {
      ok: false,
      error: `Unknown agent "${name}". Choose a callable agent discovered by OpenCode.`
    };
  }

  if (match.mode === "primary") {
    return {
      ok: false,
      error: `Agent "${name}" is a primary agent. Only callable non-primary agents are supported.`
    };
  }

  return { ok: true, value: match };
}

export function modelCatalogDescription(models: AllowedModel[]): string {
  if (models.length === 0) return "No models are configured.";
  return models
    .map((model) => `${model.id} (${model.variants.join(", ")})${model.description ? `: ${model.description}` : ""}`)
    .join("; ");
}

export function validateModelSelection(
  models: AllowedModel[],
  model: string,
  variant: string
): { ok: true } | { ok: false; error: string } {
  if (!models.length) {
    return {
      ok: false,
      error: "Missing models configuration. Add at least one model entry before using delegate_general."
    };
  }

  const match = models.find((item) => item.id === model);
  if (!match) {
    return {
      ok: false,
      error: `Unsupported model "${model}". Allowed models: ${modelCatalogDescription(models)}`
    };
  }

  if (!match.variants.includes(variant)) {
    return {
      ok: false,
      error: `Unsupported reasoning level "${variant}" for model "${model}". Allowed levels: ${match.variants.join(", ")}`
    };
  }

  return { ok: true };
}

export function canAgentUseTask(agent: AgentInfo): boolean {
  if (Array.isArray(agent.permission)) {
    return agent.permission.some((rule) => rule.permission === "task" && rule.action !== "deny");
  }

  return agent.tools?.task ?? false;
}

// Keep child sessions aligned with the plugin's existing delegation behavior.
export function buildChildSessionPermissions(input: {
  allowTask: boolean;
  primaryTools: string[] | undefined;
}): PermissionRule[] {
  return [
    {
      permission: "todowrite",
      pattern: "*",
      action: "deny"
    },
    {
      permission: "todoread",
      pattern: "*",
      action: "deny"
    },
    ...(input.allowTask ? [] : [{ permission: "task", pattern: "*", action: "deny" as const }]),
    ...(input.primaryTools ?? []).map((toolName) => ({
      permission: toolName,
      pattern: "*",
      action: "allow" as const
    })),
    {
      permission: "delegate_general",
      pattern: "*",
      action: "deny"
    }
  ];
}

export function buildToolOverrides(input: {
  allowTask: boolean;
  primaryTools: string[] | undefined;
}): Record<string, boolean> {
  return {
    todowrite: false,
    todoread: false,
    ...(input.allowTask ? {} : { task: false }),
    ...Object.fromEntries((input.primaryTools ?? []).map((toolName) => [toolName, false])),
    delegate_general: false
  };
}

const modelEntrySchema = z.object({
  id: z.string().min(1),
  variants: z.array(z.string().min(1)).min(1),
  description: z.string().min(1).optional()
});

const delegateGeneralConfigSchema = z.object({
  models: z.array(z.unknown()).default([])
});

export function parseDelegateGeneralConfig(input: unknown): DelegateGeneralConfig {
  const parsed = delegateGeneralConfigSchema.safeParse(input);
  if (!parsed.success) return { models: [] };

  return {
    models: parsed.data.models.flatMap((item) => {
      const model = modelEntrySchema.safeParse(item);
      return model.success ? [model.data] : [];
    })
  };
}

export function resolveGlobalDelegateGeneralConfigPath(env = process.env): string {
  const root = env.XDG_CONFIG_HOME ?? path.join(os.homedir(), ".config");
  return path.join(root, "opencode", DELEGATE_GENERAL_GLOBAL_CONFIG_RELATIVE_PATH);
}

export function resolveProjectDelegateGeneralConfigPath(directory: string): string {
  return path.join(directory, DELEGATE_GENERAL_CONFIG_RELATIVE_PATH);
}

export function resolveDelegateGeneralConfigPaths(directory: string, env = process.env): string[] {
  return [resolveGlobalDelegateGeneralConfigPath(env), resolveProjectDelegateGeneralConfigPath(directory)];
}

async function canRead(file: string): Promise<boolean> {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

export async function loadDelegateGeneralConfigWithSource(
  directory: string,
  env = process.env
): Promise<DelegateGeneralConfigLoadResult> {
  const paths = resolveDelegateGeneralConfigPaths(directory, env);

  for (const file of paths) {
    if (!(await canRead(file))) continue;

    try {
      return {
        config: parseDelegateGeneralConfig(JSON.parse(await readFile(file, "utf8"))),
        path: file
      };
    } catch {
      return { config: { models: [] }, path: file };
    }
  }

  return { config: { models: [] }, path: paths[0]! };
}

export async function loadDelegateGeneralConfig(
  directory: string,
  env = process.env
): Promise<DelegateGeneralConfig> {
  return (await loadDelegateGeneralConfigWithSource(directory, env)).config;
}

export function parseModel(value: string): { providerID: string; modelID: string } | null {
  const slash = value.indexOf("/");
  if (slash <= 0 || slash === value.length - 1) return null;

  return {
    providerID: value.slice(0, slash),
    modelID: value.slice(slash + 1)
  };
}

export function normalizeRequiredStringArg(value: string, name: string): Result<string> {
  const normalized = value.trim();
  if (!normalized) {
    return { ok: false, error: `Invalid ${name}. Pass a non-empty string.` };
  }
  return { ok: true, value: normalized };
}

export function buildDelegatedPromptBody(input: {
  model: string;
  variant: string;
  prompt: string;
}): Result<DelegatedPromptBody> {
  const parsedModel = parseModel(input.model);
  if (!parsedModel) {
    return {
      ok: false,
      error: `Invalid model "${input.model}". Use provider/model format.`
    };
  }

  return {
    ok: true,
    value: {
      agent: "general",
      model: parsedModel,
      variant: input.variant,
      parts: [{ type: "text", text: input.prompt }]
    }
  };
}

export function extractDelegatedText(input: DelegatedPromptResult | undefined): string {
  if (!input?.parts) return "";

  for (let i = input.parts.length - 1; i >= 0; i -= 1) {
    const part = input.parts[i];
    if (part?.type === "text") return part.text ?? "";
  }

  return "";
}

function resolveOutputTokenMax(env = process.env): number {
  const configured = Number(env.OPENCODE_EXPERIMENTAL_OUTPUT_TOKEN_MAX);
  return Number.isInteger(configured) && configured > 0 ? configured : DEFAULT_OUTPUT_TOKEN_MAX;
}

const EMPTY_SESSION_TOKENS: SessionTokenUsage = {
  input: 0,
  output: 0,
  cache: { read: 0, write: 0 }
};

function reconstructContextTokens(tokens: SessionTokenUsage): number {
  return tokens.input + tokens.cache.read + tokens.cache.write;
}

async function getDelegatedSessionResumeTokens(input: {
  session: Pick<SessionClient, "messages">;
  sessionId: string;
  directory: string;
}): Promise<SessionTokenUsage | undefined> {
  try {
    const messages = await input.session.messages({
      path: { id: input.sessionId },
      query: { directory: input.directory, limit: 1 }
    });
    if (!messages.data) return undefined;

    const latest = messages.data.at(-1);
    if (!latest) return EMPTY_SESSION_TOKENS;
    if (latest.info.role !== "assistant" || !latest.info.tokens) return undefined;
    return latest.info.tokens;
  } catch {
    return undefined;
  }
}

function buildSessionContextStatus(input: {
  tokens: SessionTokenUsage;
  model: ProviderModelInfo;
  config: OpenCodeConfig;
  outputTokenMax: number;
}): SessionContextStatus {
  const contextTokens = reconstructContextTokens(input.tokens);
  const compactionTokenCount =
    input.tokens.total ||
    input.tokens.input + input.tokens.output + input.tokens.cache.read + input.tokens.cache.write;
  const maxOutput = Math.min(input.model.limit.output, input.outputTokenMax) || input.outputTokenMax;
  const autoCompactionThreshold =
    input.config.compaction?.auto === false || input.model.limit.context === 0
      ? undefined
      : input.model.limit.input
        ? Math.max(
            0,
            input.model.limit.input -
              (input.config.compaction?.reserved ?? Math.min(COMPACTION_BUFFER_TOKENS, maxOutput))
          )
        : Math.max(0, input.model.limit.context - maxOutput);
  const pricingTiers = [
    ...(input.model.cost?.tiers?.filter((tier) => tier.tier.type === "context").map((tier) => tier.tier.size) ?? []),
    ...(input.model.cost?.experimentalOver200K ? [200_000] : [])
  ]
    .filter((tier, index, all) => all.indexOf(tier) === index)
    .sort((left, right) => left - right);
  const currentPricingTier = pricingTiers.filter((tier) => tier < contextTokens).at(-1);

  return {
    contextTokens,
    contextWindow: input.model.limit.context,
    contextWindowPercent:
      input.model.limit.context > 0 ? (contextTokens / input.model.limit.context) * 100 : undefined,
    autoCompactionThreshold,
    tokensUntilAutoCompaction:
      autoCompactionThreshold === undefined ? undefined : Math.max(0, autoCompactionThreshold - compactionTokenCount),
    currentPricingTier,
    nextPricingTier: pricingTiers.find((tier) => tier >= contextTokens)
  };
}

async function getProviderModel(input: {
  provider?: ProviderClient;
  directory: string;
  model: { providerID: string; modelID: string };
}): Promise<ProviderModelInfo | undefined> {
  if (!input.provider) return undefined;

  try {
    const providers = await input.provider.list({ query: { directory: input.directory } });
    return providers.data?.all?.find((provider) => provider.id === input.model.providerID)?.models[input.model.modelID];
  } catch {
    return undefined;
  }
}

export async function getDelegatedSessionContextStatus(input: {
  tokens?: SessionTokenUsage;
  provider?: ProviderClient;
  directory: string;
  model: { providerID: string; modelID: string };
  config: OpenCodeConfig;
  outputTokenMax?: number;
}): Promise<SessionContextStatus | undefined> {
  if (!input.tokens) return undefined;

  const model = await getProviderModel(input);
  if (!model) return undefined;

  return buildSessionContextStatus({
    tokens: input.tokens,
    model,
    config: input.config,
    outputTokenMax: input.outputTokenMax ?? resolveOutputTokenMax()
  });
}

function formatTokenCount(tokens: number): string {
  return tokens.toLocaleString("en-US");
}

function formatContextUsage(status: SessionContextStatus): string {
  if (status.contextWindowPercent === undefined) return `${formatTokenCount(status.contextTokens)} tokens`;
  return `${formatTokenCount(status.contextTokens)} / ${formatTokenCount(status.contextWindow)} tokens (${status.contextWindowPercent.toFixed(1)}% of window)`;
}

export function formatDelegatedContextStatus(status: SessionContextStatus | undefined): string[] {
  if (!status) {
    return [
      "<context_status>",
      "unavailable: OpenCode did not return the session token or model metadata needed to assess reuse safely.",
      "</context_status>"
    ];
  }

  const autoCompaction =
    status.autoCompactionThreshold === undefined || status.tokensUntilAutoCompaction === undefined
      ? "auto-compaction disabled or unavailable"
      : `estimated at ${formatTokenCount(status.autoCompactionThreshold)} tokens; ${formatTokenCount(status.tokensUntilAutoCompaction)} tokens remaining`;
  const pricing =
    status.currentPricingTier !== undefined
      ? `higher context pricing active (started at ${formatTokenCount(status.currentPricingTier)} tokens)`
      : status.nextPricingTier !== undefined
        ? `higher context pricing starts at ${formatTokenCount(status.nextPricingTier)} tokens (${formatTokenCount(status.nextPricingTier - status.contextTokens)} tokens away)`
        : "no context-based higher pricing tier reported by OpenCode";
  const reuse =
    status.contextTokens >= MAX_DELEGATED_SESSION_RESUME_CONTEXT_TOKENS
      ? `blocked: context meets the ${formatTokenCount(MAX_DELEGATED_SESSION_RESUME_CONTEXT_TOKENS)}-token cutoff; start a new session.`
      : `eligible by token budget (below ${formatTokenCount(MAX_DELEGATED_SESSION_RESUME_CONTEXT_TOKENS)} tokens); resume only for a direct continuation with useful prior context.`;

  return [
    "<context_status>",
    `current_context: ${formatContextUsage(status)}`,
    `auto_compaction: ${autoCompaction}`,
    `pricing: ${pricing}`,
    `session_reuse: ${reuse}`,
    "</context_status>"
  ];
}

export function formatResumeContextLimitError(input: {
  sessionId: string;
  contextTokens: number;
}): string {
  return `Error: Cannot resume delegated session "${input.sessionId}": current context is ${formatTokenCount(input.contextTokens)} tokens, meeting the ${formatTokenCount(MAX_DELEGATED_SESSION_RESUME_CONTEXT_TOKENS)}-token reuse cutoff. Start a new session without task_id.`;
}

export function formatDelegatedResult(input: {
  sessionId: string;
  text: string;
  model: string;
  variant: string;
  context?: SessionContextStatus;
}): string {
  return [
    `task_id: ${input.sessionId} (for resuming to continue this task if needed)`,
    `model: ${input.model}`,
    `reasoning_level: ${input.variant}`,
    "",
    ...formatDelegatedContextStatus(input.context),
    "",
    "<task_result>",
    input.text,
    "</task_result>"
  ].join("\n");
}

async function getOpenCodeConfig(
  client: Record<string, unknown>,
  directory: string
): Promise<OpenCodeConfig> {
  const config = client.config as {
    get(input: { query?: { directory?: string } }): Promise<{ data?: unknown }>;
  };
  const result = await config.get({ query: { directory } });
  return result.data && typeof result.data === "object" ? (result.data as OpenCodeConfig) : {};
}

function getPrimaryTools(config: OpenCodeConfig): string[] {
  return Array.isArray(config.experimental?.primary_tools)
    ? config.experimental.primary_tools.filter((item): item is string => typeof item === "string")
    : [];
}

async function getCallableAgents(
  client: Record<string, unknown>,
  directory: string
): Promise<AgentInfo[]> {
  const app = client.app as {
    agents(input: { query: { directory: string } }): Promise<{
      data?: Array<{
        name?: string;
        mode?: string;
        permission?: unknown;
        tools?: Record<string, boolean>;
      }>;
    }>;
  };
  const result = await app.agents({ query: { directory } });
  return result.data?.filter((item) => typeof item.name === "string").map((item) => item as AgentInfo) ?? [];
}

export async function createDelegateGeneralTool(input: {
  client: Record<string, unknown>;
  directory: string;
}): Promise<ToolDefinition> {
  const config = await loadDelegateGeneralConfigWithSource(input.directory);
  const catalog = modelCatalogDescription(config.config.models);

  return tool({
    description:
      'Delegate general-purpose complex questions and multi-step work to the general subagent using an explicitly selected allowlisted model and reasoning level. Give the child a self-contained task prompt; when relevant, name a work unit only as supplemental background and tell the child to load it. Use this instead of the built-in task tool with subagent_type "general". Prefer a better-fitting specialized subagent when one is available. Reuse a child only for a direct continuation with useful prior context; start fresh for unrelated work or a different subsystem.',
    args: {
      description: tool.schema.string().describe("Short task description"),
      prompt: tool.schema
        .string()
        .describe(
          "Detailed, self-contained task prompt with the work, scope, constraints, and expected result. When the task advances a known work unit, also name it and tell the child to load it as supplemental background; never use the work unit as a substitute for task instructions. Prefer a better-fitting specialized subagent when available."
        ),
      model: tool.schema
        .string()
        .describe(
          `Exact allowlisted model ID. Choices: ${catalog}. Choose the smallest capable allowlisted model for the task; use a higher-capability model only when ambiguity or stakes justify it.`
        ),
      variant: tool.schema
        .string()
        .describe(
          "Required reasoning level supported by the selected model. low: bounded or straightforward work; medium: normal multi-step reasoning; high: difficult reasoning or review; xhigh: deep research or long-running work; max: quality-first work requiring extra exploration and verification."
        ),
      task_id: tool.schema
        .string()
        .optional()
        .describe(
          "Resume an existing delegated child only for a direct continuation with useful prior context. Resumes are blocked at 250,000 context tokens; start a new session for unrelated work, a different subsystem, or a session at that cutoff."
        )
    },
    async execute(args, ctx) {
      const modelArg = normalizeRequiredStringArg(args.model, "model");
      if (!modelArg.ok) return `Error: ${modelArg.error}`;

      const variantArg = normalizeRequiredStringArg(args.variant, "reasoning level");
      if (!variantArg.ok) return `Error: ${variantArg.error}`;

      const selection = validateModelSelection(config.config.models, modelArg.value, variantArg.value);
      if (!selection.ok) return `Error: ${selection.error}`;

      const body = buildDelegatedPromptBody({
        model: modelArg.value,
        variant: variantArg.value,
        prompt: args.prompt
      });
      if (!body.ok) return `Error: ${body.error}`;

      const agents = await getCallableAgents(input.client, ctx.directory);
      const resolved = resolveCallableAgent(agents, "general");
      if (!resolved.ok) return `Error: ${resolved.error}`;

      const openCodeConfig = await getOpenCodeConfig(input.client, ctx.directory);
      const allowTask = canAgentUseTask(resolved.value);
      const clientSession = input.client.session as SessionClient;

      const found =
        args.task_id !== undefined
          ? await clientSession.get({
              path: { id: args.task_id },
              query: { directory: ctx.directory }
            })
          : undefined;
      let sessionId = found?.data?.id;

      if (sessionId !== undefined) {
        const resumeTokens = await getDelegatedSessionResumeTokens({
          session: clientSession,
          sessionId,
          directory: ctx.directory
        });
        if (!resumeTokens) {
          return `Error: Cannot safely resume delegated session "${sessionId}": OpenCode did not return the assistant token usage needed to enforce the reuse limit. Start a new session without task_id.`;
        }
        const contextTokens = reconstructContextTokens(resumeTokens);
        if (contextTokens >= MAX_DELEGATED_SESSION_RESUME_CONTEXT_TOKENS) {
          return formatResumeContextLimitError({ sessionId, contextTokens });
        }
      }

      await ctx.ask({
        permission: "task",
        patterns: ["general"],
        always: ["*"],
        metadata: {
          description: args.description,
          agent: "general",
          model: modelArg.value,
          variant: variantArg.value
        }
      });

      const primaryTools = getPrimaryTools(openCodeConfig);

      if (sessionId === undefined) {
        const created = await clientSession.create({
          body: {
            parentID: ctx.sessionID,
            title: `${args.description} (@general)`,
            permission: buildChildSessionPermissions({ allowTask, primaryTools })
          },
          query: { directory: ctx.directory }
        });
        if (created.error || !created.data?.id) {
          return `Error: Failed to create delegated child session: ${String(created.error ?? "unknown error")}`;
        }
        sessionId = created.data.id;
      }

      if (sessionId === undefined) return "Error: Failed to resolve delegated child session.";

      const prompted = await clientSession.prompt({
        path: { id: sessionId },
        body: {
          agent: body.value.agent,
          model: body.value.model,
          variant: body.value.variant,
          tools: buildToolOverrides({ allowTask, primaryTools }),
          parts: body.value.parts
        },
        query: { directory: ctx.directory }
      });
      if (prompted.error) {
        return `Error: Failed to prompt delegated session: ${String(prompted.error)}`;
      }

      const context = await getDelegatedSessionContextStatus({
        tokens: prompted.data?.info?.tokens,
        provider: input.client.provider as ProviderClient | undefined,
        directory: ctx.directory,
        model: body.value.model,
        config: openCodeConfig
      });
      const output = formatDelegatedResult({
        sessionId,
        text: extractDelegatedText(prompted.data),
        model: modelArg.value,
        variant: variantArg.value,
        context
      });
      return {
        title: args.description,
        output,
        metadata: {
          sessionId,
          agent: "general",
          model: modelArg.value,
          variant: variantArg.value
        }
      };
    }
  });
}

const DelegateGeneralPlugin: PluginModule = {
  id: "delegate-general",
  server: async ({ client, directory }) => ({
    tool: {
      delegate_general: await createDelegateGeneralTool({
        client: client as unknown as Record<string, unknown>,
        directory
      })
    }
  })
};

export default DelegateGeneralPlugin;
