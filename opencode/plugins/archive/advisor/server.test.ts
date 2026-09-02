import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import AdvisorPlugin, {
  ACTIVE_POLICY,
  ADVISOR_DESCRIPTION,
  ADVISOR_COMMANDS,
  AUTO_ADMISSION_POLICY,
  AUTO_FOLLOWUP_POLICY,
  MANUAL_BLOCKED_MESSAGE,
  MANUAL_POLICY,
  advisorExecutorPolicy,
  advisorAvailabilityPrompt,
  buildClaudeArgs,
  claudeAdvisorDirectory,
  createFileContinuationStore,
  createAdvisorTool,
  executorContextEnabled,
  extractAvailableSkills,
  extractUsage,
  formatExecutorContext,
  resolveNativeAdvisorMode,
  resolveAdvisorPrompt,
  resolveAdvisorTargets,
  selectAdvisorMessages,
  type AdvisorToolDependencies,
  type ClaudeRunner,
  type ContinuationStore,
} from "./server.js";
import {
  createFileAdvisorContinuationStore,
  createFileAdvisorModeStore,
  createFileAdvisorSettingsStore,
  type AdvisorContinuationTransaction,
} from "./state.js";

afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(join(tmpdir(), "advisor-plugin-settings.json"), { force: true });
  await rm(join(tmpdir(), "advisor-plugin-state"), { recursive: true, force: true });
});
beforeEach(() => {
  vi.stubEnv("OPENCODE_ADVISOR_MODELS", "");
  vi.stubEnv("OPENCODE_ADVISOR_NATIVE_MODE", "fresh");
  vi.stubEnv("OPENCODE_ADVISOR_SETTINGS_PATH", join(tmpdir(), "advisor-plugin-settings.json"));
  vi.stubEnv("OPENCODE_ADVISOR_STATE_ROOT", join(tmpdir(), "advisor-plugin-state"));
});

function createEnabledAdvisorTool(
  client: AdvisorToolDependencies["client"],
  claudeRunner?: ClaudeRunner,
  continuations = new Map(),
  continuationLocks = new Map(),
  continuedNativeAdvisors = new Map(),
  nativeLocks = new Map(),
  store?: ContinuationStore,
  skillsBySession = new Map<string, { name: string; description: string }[]>(),
  requestsBySession = new Map<string, { providerID?: string; modelID?: string }>(),
  capabilities: AdvisorToolDependencies["capabilities"] = {},
  modeStore: AdvisorToolDependencies["modeStore"] = {
    loadOverride: async () => undefined,
    load: async () => "on",
    save: async () => undefined,
    prune: async () => undefined,
  },
  settingsStore: AdvisorToolDependencies["settingsStore"] = { load: async () => "on", save: async () => undefined },
  manualAdvisorRequests: AdvisorToolDependencies["manualAdvisorRequests"] = new Map(),
): ReturnType<typeof createAdvisorTool> {
  return createAdvisorTool({
    client,
    continuation: {
      store,
      native: { continuations: continuedNativeAdvisors, locks: nativeLocks },
      claude: { continuations, locks: continuationLocks, runner: claudeRunner ?? (async () => "") },
    },
    skillsBySession,
    requestsBySession,
    capabilities,
    modeStore,
    settingsStore,
    manualAdvisorRequests,
  });
}

async function allowManualAdvisorCall(hooks: unknown, sessionID: string): Promise<void> {
  const typed = hooks as {
    "command.execute.before"?: (
      input: { command: string; sessionID: string; arguments: string },
      output: { parts: unknown[] },
    ) => Promise<void>;
    "chat.message"?: (input: { sessionID: string; messageID?: string }, output: { message: { id: string; role: "user" }; parts: [] }) => Promise<void>;
  };
  const hook = typed["command.execute.before"];
  if (!hook) throw new Error("advisor command hook is not registered");
  await hook({ command: "consult-advisor", sessionID, arguments: "" }, { parts: [] });
  await typed["chat.message"]?.(
    { sessionID, messageID: "command-user" },
    { message: { id: "command-user", role: "user" }, parts: [] },
  );
}

describe("file continuation store", () => {
  it("restores current state and prunes state inactive for 30 days", async () => {
    const root = await mkdtemp(join(tmpdir(), "advisor-state-"));
    try {
      vi.stubEnv("OPENCODE_ADVISOR_MODEL", "openai/gpt-5.6-sol");
      const target = resolveAdvisorTargets()[0]!;
      const store = createFileContinuationStore(root);
      const input = {
        directory: "/workspace",
        parentSessionID: "parent",
        target,
        continuation: { epoch: "root", sessionID: "advisor", cursor: "parent-message", childCursor: "advisor-message" },
      };

      await store.save(input);
      await expect(store.load(input)).resolves.toEqual(input.continuation);

      const file = join(root, (await readdir(root))[0]!);
      const record = JSON.parse(await readFile(file, "utf8")) as Record<string, unknown>;
      record.updatedAt = Date.now() - 31 * 24 * 60 * 60 * 1000;
      await writeFile(file, `${JSON.stringify(record)}\n`, "utf8");

      await store.prune(input.directory);
      await expect(store.load(input)).resolves.toBeUndefined();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

function claudeResult(
  result = "Proceed.",
  sessionID = "claude-session",
  modelUsage: Record<string, { cacheReadInputTokens: number; cacheCreationInputTokens: number }> = {
    "claude-fable-5": { cacheReadInputTokens: 120, cacheCreationInputTokens: 8 },
  },
): string {
  return JSON.stringify({
    result,
    session_id: sessionID,
    total_cost_usd: 0.0125,
    modelUsage,
  });
}

describe("resolveAdvisorTargets", () => {
  it("parses harness-qualified plural targets and retains the legacy native fallback", () => {
    vi.stubEnv("OPENCODE_ADVISOR_MODELS", "opencode:openai/gpt-5.6-sol@high,claude-code:fable@high");

    expect(resolveAdvisorTargets()).toEqual([
      { harness: "opencode", providerID: "openai", modelID: "gpt-5.6-sol", variant: "high" },
      { harness: "claude-code", modelID: "fable", effort: "high" },
    ]);

    vi.stubEnv("OPENCODE_ADVISOR_MODELS", "");
    vi.stubEnv("OPENCODE_ADVISOR_MODEL", "openai/gpt-5.6-terra@xhigh");

    expect(resolveAdvisorTargets()).toEqual([
      { harness: "opencode", providerID: "openai", modelID: "gpt-5.6-terra", variant: "xhigh" },
    ]);
  });
});

describe("resolveNativeAdvisorMode", () => {
  it("defaults to continuation and accepts an explicit fresh override", () => {
    vi.stubEnv("OPENCODE_ADVISOR_NATIVE_MODE", undefined);

    expect(resolveNativeAdvisorMode()).toBe("continuation");
    vi.stubEnv("OPENCODE_ADVISOR_NATIVE_MODE", "fresh");
    expect(resolveNativeAdvisorMode()).toBe("fresh");
  });

  it("rejects unknown modes", () => {
    expect(() => resolveNativeAdvisorMode("persistent")).toThrow(
      'Invalid OPENCODE_ADVISOR_NATIVE_MODE value "persistent". Use fresh or continuation.',
    );
  });
});

describe("buildClaudeArgs", () => {
  it("keeps the transcript off the Claude command line", () => {
    const transcript = "x".repeat(512 * 1024);
    const args = buildClaudeArgs({
      cwd: "/workspace",
      model: "fable",
      effort: "high",
      system: "Advise from stdin.",
    });

    expect(args).toEqual(expect.arrayContaining(["-p", "--input-format", "text", "--output-format", "json"]));
    expect(args).not.toContain(transcript);
  });
});

describe("resolveAdvisorPrompt", () => {
  it("selects the GPT-5.6 prompt automatically for GPT-5.6 advisors", () => {
    const prompt = resolveAdvisorPrompt("gpt-5.6-sol", "auto");

    expect(prompt.variant).toBe("gpt56");
    expect(prompt.system).toContain("smallest specific evidence");
    expect(prompt.system).toContain("Include the evidence needed");
  });

  it("uses the baseline prompt for other advisors in auto mode", () => {
    const prompt = resolveAdvisorPrompt("claude-opus-4-8", "auto");

    expect(prompt.variant).toBe("baseline");
    expect(prompt.system).toContain("do not ask the executor to run things for you");
  });

  it("allows a prompt variant to be selected explicitly", () => {
    expect(resolveAdvisorPrompt("claude-opus-4-8", "gpt56").variant).toBe("gpt56");
    expect(resolveAdvisorPrompt("gpt-5.6-sol", "baseline").variant).toBe("baseline");
  });

  it("rejects unknown prompt variants", () => {
    expect(() => resolveAdvisorPrompt("gpt-5.6-sol", "experimental")).toThrow(
      'Invalid OPENCODE_ADVISOR_PROMPT value "experimental". Use auto, baseline, or gpt56.',
    );
  });
});

describe("extractAvailableSkills", () => {
  it("keeps only advertised skill names and bounded descriptions", () => {
    const skills = extractAvailableSkills([
      "unrelated prompt text",
      "<available_skills><skill><name>review</name><description>Review code changes carefully.</description><location>/skills/review/SKILL.md</location></skill></available_skills>",
    ]);

    expect(skills).toEqual([{ name: "review", description: "Review code changes carefully." }]);
  });

  it("returns no skills when the prompt has no available-skills block", () => {
    expect(extractAvailableSkills(["ordinary system prompt"])).toEqual([]);
  });

  it("bounds the rendered capability block", () => {
    const context = formatExecutorContext({
      skills: Array.from({ length: 100 }, (_, index) => ({ name: `skill-${index}`, description: "x".repeat(240) })),
      mcp: [],
      tools: [],
    });

    expect(context.length).toBeLessThanOrEqual(12_000);
    expect(context).toContain("[Capability metadata truncated.]");
  });
});

describe("executorContextEnabled", () => {
  it("defaults to enabled and accepts explicit false values", () => {
    expect(executorContextEnabled(undefined)).toBe(true);
    expect(executorContextEnabled("false")).toBe(false);
    expect(executorContextEnabled("0")).toBe(false);
  });
});

describe("selectAdvisorMessages", () => {
  it("keeps all messages when the session has not compacted", () => {
    const messages = [{ info: { role: "user" }, parts: [{ type: "text", text: "Keep this." }] }];

    expect(selectAdvisorMessages(messages)).toBe(messages);
  });

  it("starts at the most recent completed compaction summary", () => {
    const older = { info: { role: "user" }, parts: [{ type: "text", text: "Old raw context" }] };
    const firstMarker = { info: { id: "first", role: "user" }, parts: [{ type: "compaction" }] };
    const firstSummary = {
      info: { role: "assistant", parentID: "first", summary: true, finish: "stop" },
      parts: [{ type: "text", text: "First summary" }],
    };
    const middle = { info: { role: "user" }, parts: [{ type: "text", text: "Middle raw context" }] };
    const secondMarker = { info: { id: "second", role: "user" }, parts: [{ type: "compaction" }] };
    const secondSummary = {
      info: { role: "assistant", parentID: "second", summary: true, finish: "stop" },
      parts: [{ type: "text", text: "Second summary" }],
    };
    const recent = { info: { role: "user" }, parts: [{ type: "text", text: "Recent context" }] };

    expect(selectAdvisorMessages([older, firstMarker, firstSummary, middle, secondMarker, secondSummary, recent])).toEqual([
      secondSummary,
      recent,
    ]);
  });

  it("retains the prior completed summary when a newer compaction is incomplete", () => {
    const firstMarker = { info: { id: "first", role: "user" }, parts: [{ type: "compaction" }] };
    const firstSummary = {
      info: { role: "assistant", parentID: "first", summary: true, finish: "stop" },
      parts: [{ type: "text", text: "First summary" }],
    };
    const incompleteMarker = { info: { id: "incomplete", role: "user" }, parts: [{ type: "compaction" }] };
    const failedSummary = {
      info: { role: "assistant", parentID: "incomplete", summary: true, finish: "stop", error: "failed" },
      parts: [{ type: "text", text: "Bad summary" }],
    };

    expect(selectAdvisorMessages([firstMarker, firstSummary, incompleteMarker, failedSummary])).toEqual([
      firstSummary,
      incompleteMarker,
      failedSummary,
    ]);
  });

  it("keeps the recent tail preserved by compaction", () => {
    const old = { info: { role: "user" }, parts: [{ type: "text", text: "Obsolete context" }] };
    const tail = { info: { id: "tail", role: "user" }, parts: [{ type: "text", text: "Recent verbatim context" }] };
    const marker = {
      info: { id: "compaction", role: "user" },
      parts: [{ type: "compaction", tail_start_id: "tail" }],
    };
    const summary = {
      info: { role: "assistant", parentID: "compaction", summary: true, finish: "stop" },
      parts: [{ type: "text", text: "Summary" }],
    };
    const recent = { info: { role: "user" }, parts: [{ type: "text", text: "Later context" }] };

    expect(selectAdvisorMessages([old, tail, marker, summary, recent])).toEqual([marker, summary, tail, recent]);
  });
});

describe("extractUsage", () => {
  it("aggregates assistant token usage and cost", () => {
    expect(
      extractUsage([
        {
          info: {
            role: "assistant",
            cost: 0.012345,
            tokens: { total: 120, input: 100, output: 10, reasoning: 10, cache: { read: 30, write: 5 } },
          },
        },
        {
          info: {
            role: "assistant",
            cost: 0.0001,
            tokens: { input: 20, output: 3, reasoning: 2, cache: { read: 4, write: 1 } },
          },
        },
      ]),
    ).toEqual({
      input: 120,
      output: 13,
      reasoning: 12,
      cacheRead: 34,
      cacheWrite: 6,
      total: 150,
      cost: 0.012445,
    });
  });
});

describe("advisor", () => {
  it("keeps the static tool description neutral and the active policy exact", () => {
    const tool = createAdvisorTool({} as Parameters<typeof createAdvisorTool>[0]);

    expect(tool.description).toBe(ADVISOR_DESCRIPTION);
    expect(ACTIVE_POLICY).toContain("periodically at meaningful checkpoints");
    expect(ACTIVE_POLICY).toContain("after a major implementation unit or test gate");
    expect(ACTIVE_POLICY).toContain("Treat blocking checkpoint advice as a gate");
    expect(AUTO_ADMISSION_POLICY).toContain("Do not call advisor for casual conversation");
    expect(AUTO_ADMISSION_POLICY).toContain("authored skills or prompts");
    expect(AUTO_ADMISSION_POLICY).toContain("Treat pending context size as a cost signal");
    expect(AUTO_FOLLOWUP_POLICY).toContain("meaningful new work");
    expect(AUTO_FOLLOWUP_POLICY).toContain("substantive deliverable");
    expect(AUTO_FOLLOWUP_POLICY).toContain("Treat pending context size as a cost signal");
    expect(MANUAL_POLICY).toContain("explicitly asks to consult, ask, use, or call the advisor");
    expect(MANUAL_POLICY).toContain("passing, explanatory, or negated mention");
    expect(ADVISOR_COMMANDS).toMatchObject({
      "consult-advisor": { description: "Consult the stronger advisor about the current task" },
    });
  });

  it("makes review-and-fix a two-call auto branch without collapsing auto into on", () => {
    for (const policy of [AUTO_ADMISSION_POLICY, AUTO_FOLLOWUP_POLICY]) {
      expect(policy).toContain("Nontrivial review or audit findings create a review cycle");
      expect(policy).toContain("before triaging findings or making fixes");
      expect(policy).toContain("When that cycle produces substantive changes");
      expect(policy).toContain("call advisor again before declaring the pass complete");
      expect(policy).toContain("blocking advice or reconcile the conflict before continuing");
      expect(policy).not.toContain("call advisor at two checkpoints");
    }
  });

  it("bundles the explicit advisor command through the plugin config hook", async () => {
    const plugin = AdvisorPlugin as unknown as {
      server(input: { client: object; directory: string }): Promise<{
        config(config: { command?: Record<string, { template: string; description?: string }> }): Promise<void>;
      }>;
    };
    const hooks = await plugin.server({ client: {}, directory: "/workspace" });
    const config: { command: Record<string, { template: string; description?: string }> } = {
      command: { existing: { template: "Keep me" } },
    };

    await hooks.config(config);

    expect(config.command).toMatchObject({
      existing: { template: "Keep me" },
      "consult-advisor": { description: "Consult the stronger advisor about the current task" },
    });
    expect(config.command["consult-advisor"]?.template).toContain("Do not perform substantive work first.");
  });

  it("keeps manual mode from adding automatic review guidance", async () => {
    const root = await mkdtemp(join(tmpdir(), "advisor-manual-"));
    try {
      const modeStore = createFileAdvisorModeStore(root);
      await modeStore.save({ directory: "/workspace", sessionID: "parent", mode: "manual" });
      const client = { messages: vi.fn() };
      const continuationStore = createFileAdvisorContinuationStore(root);

      await expect(
        advisorExecutorPolicy({
          modeStore,
          continuationStore,
          client,
          directory: "/workspace",
          sessionID: "parent",
        }),
      ).resolves.toEqual({ mode: "manual", policy: MANUAL_POLICY });
      expect(client.messages).not.toHaveBeenCalled();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("denies model-initiated advisor calls in manual mode", async () => {
    const root = await mkdtemp(join(tmpdir(), "advisor-manual-gate-"));
    try {
      const modeStore = createFileAdvisorModeStore(root);
      const settingsStore = createFileAdvisorSettingsStore(join(root, "settings.json"));
      await modeStore.save({ directory: "/workspace", sessionID: "parent", mode: "manual" });
      const client = {
        get: vi.fn().mockResolvedValue({ data: {} }),
        messages: vi.fn().mockResolvedValue({
          data: [{ info: { id: "tool-call", parentID: "other-user", role: "assistant" }, parts: [] }],
        }),
        create: vi.fn(),
      } as unknown as AdvisorToolDependencies["client"];
      const tool = createAdvisorTool({ client, modeStore, settingsStore });

      await expect(
        (tool.execute as Function)({}, { sessionID: "parent", messageID: "tool-call", directory: "/workspace", metadata: vi.fn() }),
      ).resolves.toBe(MANUAL_BLOCKED_MESSAGE);
      expect(client.get).toHaveBeenCalledOnce();
      expect(client.messages).not.toHaveBeenCalled();
      expect(client.create).not.toHaveBeenCalled();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("allows one advisor call after an explicit manual request", async () => {
    const root = await mkdtemp(join(tmpdir(), "advisor-manual-request-"));
    try {
      const modeStore = createFileAdvisorModeStore(root);
      const settingsStore = createFileAdvisorSettingsStore(join(root, "settings.json"));
      await modeStore.save({ directory: "/workspace", sessionID: "parent", mode: "manual" });
      const client = {
        get: vi.fn().mockResolvedValue({ data: {} }),
        messages: vi.fn().mockResolvedValue({
          data: [
            { info: { id: "user-message", role: "user" }, parts: [{ type: "text", text: "Review" }] },
            { info: { id: "tool-call", parentID: "user-message", role: "assistant" }, parts: [{ type: "text", text: "Review" }] },
          ],
        }),
        create: vi.fn().mockResolvedValue({ error: "stop" }),
      } as unknown as AdvisorToolDependencies["client"];
      const requests = new Map([["parent", { userMessageID: "user-message" }]]);
      const tool = createAdvisorTool({ client, modeStore, settingsStore, manualAdvisorRequests: requests });
      const context = { sessionID: "parent", messageID: "tool-call", directory: "/workspace", metadata: vi.fn() };

      await expect((tool.execute as Function)({}, context)).resolves.toContain("Advisor unavailable");
      await expect((tool.execute as Function)({}, context)).resolves.toBe(MANUAL_BLOCKED_MESSAGE);
      expect(client.get).toHaveBeenCalledTimes(2);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("binds manual authorization to explicit command and natural-language turns", async () => {
    vi.stubEnv("OPENCODE_ADVISOR_MODE", "manual");
    vi.stubEnv("OPENCODE_ADVISOR_MODEL", "openai/gpt-5.6-sol");
    const modeStore = createFileAdvisorModeStore();
    await modeStore.save({ directory: "/workspace", sessionID: "parent", mode: "manual" });
    const prompt = vi.fn().mockResolvedValue({ data: { parts: [{ type: "text", text: "Proceed." }] } });
    const session = {
      get: vi.fn().mockResolvedValue({ data: {} }),
      messages: vi.fn().mockResolvedValue({
        data: [
          { info: { id: "command-user", role: "user" }, parts: [{ type: "text", text: "Review this." }] },
          { info: { id: "assistant-command", parentID: "command-user", role: "assistant", modelID: "gpt-5.6-luna" } },
        ],
      }),
      create: vi.fn().mockResolvedValue({ data: { id: "advisor-child" } }),
      prompt,
      delete: vi.fn().mockResolvedValue({}),
    };
    const plugin = AdvisorPlugin as unknown as {
      server(input: { client: { session: typeof session }; directory: string }): Promise<{
        tool: Record<string, { execute: Function }>;
        "command.execute.before": Function;
        "chat.message": Function;
      }>;
    };
    const hooks = await plugin.server({ client: { session }, directory: "/workspace" });

    await hooks["command.execute.before"]({ command: "consult-advisor", sessionID: "parent", arguments: "" }, { parts: [] });
    await hooks["chat.message"](
      { sessionID: "parent", messageID: "command-user" },
      { message: { id: "command-user", role: "user" }, parts: [] },
    );
    await new Promise((resolve) => setTimeout(resolve, 100));
    await hooks.tool.advisor.execute({}, { sessionID: "parent", messageID: "assistant-command", directory: "/workspace", metadata: vi.fn() });
    expect(prompt).toHaveBeenCalledOnce();
    await expect(
      hooks.tool.advisor.execute({}, { sessionID: "parent", messageID: "assistant-command", directory: "/workspace", metadata: vi.fn() }),
    ).resolves.toBe(MANUAL_BLOCKED_MESSAGE);

    await hooks["command.execute.before"]({ command: "consult-advisor", sessionID: "parent", arguments: "" }, { parts: [] });
    await hooks["chat.message"](
      { sessionID: "parent", messageID: "command-user-2" },
      { message: { id: "command-user-2", role: "user" }, parts: [] },
    );
    await hooks["chat.message"](
      { sessionID: "parent", messageID: "unrelated-user" },
      { message: { id: "unrelated-user", role: "user" }, parts: [] },
    );
    await expect(
      hooks.tool.advisor.execute({}, { sessionID: "parent", messageID: "assistant-command-2", directory: "/workspace", metadata: vi.fn() }),
    ).resolves.toBe(MANUAL_BLOCKED_MESSAGE);
    expect(prompt).toHaveBeenCalledOnce();

    session.messages.mockResolvedValue({
      data: [
        { info: { id: "spoken-request", role: "user" }, parts: [{ type: "text", text: "Can you CONSULT the advisor about this?" }] },
        { info: { id: "assistant-spoken", parentID: "spoken-request", role: "assistant", modelID: "gpt-5.6-luna" } },
      ],
    });
    await hooks["chat.message"](
      { sessionID: "parent", messageID: "spoken-request" },
      { message: { id: "spoken-request", role: "user" }, parts: [{ type: "text", text: "Can you CONSULT the advisor about this?" }] },
    );
    await hooks.tool.advisor.execute({}, { sessionID: "parent", messageID: "assistant-spoken", directory: "/workspace", metadata: vi.fn() });
    expect(prompt).toHaveBeenCalledTimes(2);

    for (const text of [
      "Don't consult the advisor.",
      "Explain how to consult the advisor.",
      'Document the phrase "consult the advisor".',
      "Should we consult the advisor?",
    ]) {
      await hooks["chat.message"](
        { sessionID: "parent", messageID: `rejected-${text}` },
        { message: { id: `rejected-${text}`, role: "user" }, parts: [{ type: "text", text }] },
      );
      await expect(
        hooks.tool.advisor.execute({}, { sessionID: "parent", messageID: "assistant-rejected", directory: "/workspace", metadata: vi.fn() }),
      ).resolves.toBe(MANUAL_BLOCKED_MESSAGE);
    }
  });

  it("selects cold, active, and manual executor policies from durable state", async () => {
    const root = await mkdtemp(join(tmpdir(), "advisor-policy-"));
    try {
      vi.stubEnv("OPENCODE_ADVISOR_MODE", "auto");
      vi.stubEnv("OPENCODE_ADVISOR_MODEL", "test/model");
      const modeStore = createFileAdvisorModeStore(root);
      const continuationStore = createFileAdvisorContinuationStore(root);
      const client = {
        get: vi.fn().mockImplementation(({ path }: { path: { id: string } }) =>
          Promise.resolve({ data: path.id === "child" ? { parentID: "parent" } : {} }),
        ),
        messages: vi.fn().mockResolvedValue({ data: [{ info: { id: "message", role: "user" }, parts: [{ type: "text", text: "Work" }] }] }),
      };
      const input = { modeStore, continuationStore, client, directory: "/workspace", sessionID: "parent" };

      await expect(advisorExecutorPolicy(input)).resolves.toEqual({ mode: "auto", policy: AUTO_ADMISSION_POLICY });
      await continuationStore.save({ directory: "/workspace", parentSessionID: "parent", target: "opencode:test/model", continuation: { epoch: "uncompacted", sessionID: "child", cursor: "message" } });
      await expect(advisorExecutorPolicy(input)).resolves.toEqual({ mode: "auto", policy: AUTO_FOLLOWUP_POLICY });
      vi.stubEnv("OPENCODE_ADVISOR_MODEL", "other/model");
      await expect(advisorExecutorPolicy(input)).resolves.toEqual({ mode: "auto", policy: AUTO_ADMISSION_POLICY });
      await modeStore.save({ directory: "/workspace", sessionID: "parent", mode: "on" });
      await expect(advisorExecutorPolicy(input)).resolves.toEqual({ mode: "on", policy: ACTIVE_POLICY });
      await modeStore.save({ directory: "/workspace", sessionID: "parent", mode: "manual" });
      await expect(advisorExecutorPolicy(input)).resolves.toEqual({ mode: "manual", policy: MANUAL_POLICY });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("applies a changed global default to inherited sessions without overriding explicit modes", async () => {
    vi.stubEnv("OPENCODE_ADVISOR_MODE", "on");
    const root = await mkdtemp(join(tmpdir(), "advisor-policy-default-"));
    try {
      const modeStore = createFileAdvisorModeStore(root);
      const settingsStore = createFileAdvisorSettingsStore(join(root, "settings.json"));
      const continuationStore = createFileAdvisorContinuationStore(root);
      const client = { messages: vi.fn().mockResolvedValue({ data: [] }) };
      const input = {
        modeStore,
        settingsStore,
        continuationStore,
        client,
        directory: "/workspace",
        sessionID: "parent",
      };

      await expect(advisorExecutorPolicy(input)).resolves.toEqual({ mode: "on", policy: ACTIVE_POLICY });
      await settingsStore.save("manual");
      await expect(advisorExecutorPolicy(input)).resolves.toEqual({ mode: "manual", policy: MANUAL_POLICY });
      await modeStore.save({ directory: "/workspace", sessionID: "parent", mode: "auto" });
      await settingsStore.save("on");
      await expect(advisorExecutorPolicy(input)).resolves.toEqual({ mode: "auto", policy: AUTO_ADMISSION_POLICY });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("uses the parent mode for child policy and ignores a child override", async () => {
    const root = await mkdtemp(join(tmpdir(), "advisor-policy-parent-mode-"));
    try {
      const modeStore = createFileAdvisorModeStore(root);
      const settingsStore = createFileAdvisorSettingsStore(join(root, "settings.json"));
      const continuationStore = createFileAdvisorContinuationStore(root);
      await modeStore.save({ directory: "/workspace", sessionID: "parent", mode: "manual" });
      await modeStore.save({ directory: "/workspace", sessionID: "child", mode: "on" });
      const client = {
        get: vi.fn().mockImplementation(({ path }: { path: { id: string } }) =>
          Promise.resolve({ data: path.id === "child" ? { parentID: "parent" } : {} }),
        ),
        messages: vi.fn(),
      };

      await expect(
        advisorExecutorPolicy({
          modeStore,
          settingsStore,
          continuationStore,
          client,
          directory: "/workspace",
          sessionID: "child",
        }),
      ).resolves.toEqual({ mode: "manual", policy: MANUAL_POLICY });
      expect(client.messages).not.toHaveBeenCalled();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("enforces the parent manual mode at the child tool boundary", async () => {
    const root = await mkdtemp(join(tmpdir(), "advisor-tool-parent-mode-"));
    try {
      const modeStore = createFileAdvisorModeStore(root);
      const settingsStore = createFileAdvisorSettingsStore(join(root, "settings.json"));
      await modeStore.save({ directory: "/workspace", sessionID: "parent", mode: "manual" });
      await modeStore.save({ directory: "/workspace", sessionID: "child", mode: "on" });
      const client = {
        get: vi.fn().mockImplementation(({ path }: { path: { id: string } }) =>
          Promise.resolve({ data: path.id === "child" ? { parentID: "parent" } : {} }),
        ),
        messages: vi.fn(),
        create: vi.fn(),
      } as unknown as AdvisorToolDependencies["client"];
      const tool = createAdvisorTool({ client, modeStore, settingsStore });

      await expect(
        (tool.execute as Function)({}, { sessionID: "child", agent: "general", directory: "/workspace", metadata: vi.fn() }),
      ).resolves.toBe(MANUAL_BLOCKED_MESSAGE);
      expect(client.messages).not.toHaveBeenCalled();
      expect(client.create).not.toHaveBeenCalled();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("returns admission guidance after a continuation becomes stale from compaction", async () => {
    vi.stubEnv("OPENCODE_ADVISOR_MODE", "auto");
    vi.stubEnv("OPENCODE_ADVISOR_MODEL", "test/model");
    const root = await mkdtemp(join(tmpdir(), "advisor-policy-reset-"));
    try {
      const modeStore = createFileAdvisorModeStore(root);
      const continuationStore = createFileAdvisorContinuationStore(root);
      await continuationStore.save({
        directory: "/workspace",
        parentSessionID: "parent",
        target: "opencode:test/model",
        continuation: { epoch: "compaction:old", sessionID: "child", cursor: "old" },
      });
      const client = {
        messages: vi.fn().mockResolvedValue({
          data: [
            { info: { id: "marker-new", role: "user" }, parts: [{ type: "compaction" }] },
            { info: { id: "summary-new", parentID: "marker-new", role: "assistant", summary: true, finish: "stop" }, parts: [{ type: "text", text: "New summary" }] },
          ],
        }),
      };

      await expect(
        advisorExecutorPolicy({ modeStore, continuationStore, client, directory: "/workspace", sessionID: "parent" }),
      ).resolves.toEqual({ mode: "auto", policy: AUTO_ADMISSION_POLICY });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("skips capability collection when executor context is disabled", async () => {
    vi.stubEnv("OPENCODE_ADVISOR_EXECUTOR_CONTEXT", "false");
    const prompt = vi.fn().mockResolvedValue({ data: { parts: [{ type: "text", text: "Proceed." }] } });
    const capabilities = {
      mcp: { status: vi.fn() },
      tool: { list: vi.fn() },
    };
    const client = {
         get: vi.fn().mockImplementation(({ path }: { path: { id: string } }) =>
           Promise.resolve({ data: path.id === "parent" ? {} : { parentID: "parent" } }),
         ),
      messages: vi.fn().mockImplementation(({ path }: { path: { id: string } }) =>
        Promise.resolve({
          data: path.id === "parent" ? [{ info: { id: "tool-call", role: "assistant", modelID: "gpt-5.6-luna" }, parts: [{ type: "text", text: "Review." }] }] : [],
        }),
      ),
      create: vi.fn().mockResolvedValue({ data: { id: "advisor-session" } }),
      prompt,
      delete: vi.fn().mockResolvedValue({}),
    };
    const tool = createEnabledAdvisorTool(
      client,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      new Map([["parent", [{ name: "review", description: "Review changes." }]]]),
      new Map([["parent", { providerID: "openai" }]]),
      capabilities,
    );

    await (tool.execute as Function)({}, { sessionID: "parent", messageID: "tool-call", directory: "/workspace", metadata: vi.fn() });

    expect(capabilities.mcp.status).not.toHaveBeenCalled();
    expect(capabilities.tool.list).not.toHaveBeenCalled();
    expect(prompt.mock.calls[0]![0].body.system).not.toContain("Executor Runtime Context");
  });

  it("refreshes connected MCP servers on every advisor call", async () => {
    vi.stubEnv("OPENCODE_ADVISOR_MODEL", "openai/gpt-5.6-sol");
    vi.stubEnv("OPENCODE_ADVISOR_NATIVE_MODE", "continuation");
    const prompt = vi.fn().mockResolvedValue({ data: { parts: [{ type: "text", text: "Proceed." }] } });
    let parentMessages = [
      { info: { id: "tool-1", role: "assistant", modelID: "gpt-5.6-luna" }, parts: [{ type: "text", text: "First review." }] },
    ];
    const client = {
         get: vi.fn().mockImplementation(({ path }: { path: { id: string } }) =>
           Promise.resolve({ data: path.id === "parent" ? {} : { parentID: "parent" } }),
         ),
      messages: vi.fn().mockImplementation(({ path }: { path: { id: string } }) =>
        Promise.resolve({ data: path.id === "parent" ? parentMessages : [] }),
      ),
      create: vi.fn().mockResolvedValue({ data: { id: "advisor-session" } }),
      prompt,
      delete: vi.fn().mockResolvedValue({}),
    };
    const mcpStatus = vi
      .fn()
      .mockResolvedValueOnce({ data: { docs: { status: "connected" } } })
      .mockResolvedValueOnce({ data: { docs: { status: "disabled" } } });
    const tool = createEnabledAdvisorTool(
      client,
      undefined,
      new Map(),
      new Map(),
      new Map(),
      new Map(),
      undefined,
      new Map(),
      new Map([["parent", { providerID: "openai" }]]),
      { mcp: { status: mcpStatus } },
    );

    await (tool.execute as Function)({}, { sessionID: "parent", messageID: "tool-1", directory: "/workspace", metadata: vi.fn() });
    parentMessages = [
      ...parentMessages,
      { info: { id: "tool-2", role: "assistant", modelID: "gpt-5.6-luna" }, parts: [{ type: "text", text: "Second review." }] },
    ];
    await (tool.execute as Function)({}, { sessionID: "parent", messageID: "tool-2", directory: "/workspace", metadata: vi.fn() });

    expect(mcpStatus).toHaveBeenCalledTimes(2);
    expect(prompt.mock.calls[0]![0].body.system).toContain("- docs: connected");
    expect(prompt.mock.calls[1]![0].body.system).not.toContain("- docs:");
  });

  it("forwards structured executor capabilities without retaining the raw system prompt", async () => {
    const prompt = vi.fn().mockResolvedValue({ data: { parts: [{ type: "text", text: "Proceed." }] } });
    const parentMessages = [
      {
        info: { id: "tool-call", role: "assistant", modelID: "gpt-5.6-luna" },
        parts: [{ type: "text", text: "Please review the approach." }],
      },
    ];
    const client = {
      session: {
        get: vi.fn().mockResolvedValue({ data: {} }),
        messages: vi.fn().mockImplementation(({ path }: { path: { id: string } }) =>
          Promise.resolve({ data: path.id === "parent" ? parentMessages : [] }),
        ),
        create: vi.fn().mockResolvedValue({ data: { id: "advisor-session" } }),
        prompt,
        delete: vi.fn().mockResolvedValue({}),
      },
      mcp: {
        status: vi.fn().mockResolvedValue({
          data: { docs: { status: "connected" }, disabled: { status: "disabled" } },
        }),
      },
      tool: {
        list: vi.fn().mockResolvedValue({
          data: [
            { id: "invalid", description: "Do not use." },
            { id: "read", description: "Read a local file." },
          ],
        }),
      },
    };
    const plugin = AdvisorPlugin as unknown as {
      server(input: { client: typeof client; directory: string }): Promise<{
        tool: Record<string, { execute: Function }>;
        "chat.params"(input: { sessionID: string; model: { id: string; providerID: string }; provider: { id: string } }): Promise<void>;
        "experimental.chat.system.transform"(
          input: { sessionID: string; model: { id: string } },
          output: { system: string[] },
        ): Promise<void>;
      }>;
    };
    const hooks = await plugin.server({ client, directory: "/workspace" });

    await hooks["chat.params"]({
      sessionID: "parent",
      model: { id: "gpt-5.6-luna", providerID: "openai" },
      provider: { id: "openai" },
    });
    await hooks["experimental.chat.system.transform"](
      { sessionID: "parent", model: { id: "gpt-5.6-luna" } },
      {
        system: [
          "<available_skills><skill><name>review</name><description>Review changes before commit.</description></skill></available_skills>",
        ],
      },
    );
    await allowManualAdvisorCall(hooks, "parent");
    await hooks.tool.advisor.execute({}, { sessionID: "parent", messageID: "tool-call", directory: "/workspace", metadata: vi.fn() });

    expect(prompt).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          system: expect.stringContaining("- review: Review changes before commit."),
        }),
      }),
    );
    const system = prompt.mock.calls[0]![0].body.system;
    expect(system).toContain("- docs: connected");
    expect(system).toContain("- read: Read a local file.");
    expect(system).not.toContain("disabled: disabled");
    expect(system).not.toContain("invalid: Do not use.");
    expect(system).not.toContain("<available_skills>");
  });

  it("retains prototype-backed SDK session methods", async () => {
    const prompt = vi.fn().mockResolvedValue({ data: { parts: [{ type: "text", text: "Proceed." }] } });
    class PrototypeSession {
      get(_input: unknown) {
        return Promise.resolve({ data: {} });
      }
      messages(input: { path: { id: string } }) {
        return Promise.resolve({
          data:
            input.path.id === "parent"
              ? [{ info: { id: "tool-call", role: "assistant", modelID: "gpt-5.6-luna" }, parts: [{ type: "text", text: "Review." }] }]
              : [],
        });
      }
      create(_input: unknown) {
        return Promise.resolve({ data: { id: "advisor-session" } });
      }
      prompt(input: unknown) {
        return prompt(input);
      }
      delete(_input: unknown) {
        return Promise.resolve({});
      }
    }
    const client = { session: new PrototypeSession() };
    const plugin = AdvisorPlugin as unknown as {
      server(input: { client: typeof client; directory: string }): Promise<{ tool: Record<string, { execute: Function }> }>;
    };
    const hooks = await plugin.server({ client, directory: "/workspace" });

    await allowManualAdvisorCall(hooks, "parent");
    await hooks.tool.advisor.execute({}, { sessionID: "parent", messageID: "tool-call", directory: "/workspace", metadata: vi.fn() });

    expect(prompt).toHaveBeenCalledOnce();
  });

  it("tells equal-or-stronger GPT-5.6 executors not to call the advisor", () => {
    vi.stubEnv("OPENCODE_ADVISOR_MODEL", "openai/gpt-5.6-terra");

    expect(advisorAvailabilityPrompt("gpt-5.6-sol")).toContain("Do not call the advisor tool");
    expect(advisorAvailabilityPrompt("gpt-5.6-luna")).toBeUndefined();
  });

  it("keeps advisor available when a Claude Code target remains eligible", () => {
    vi.stubEnv("OPENCODE_ADVISOR_MODELS", "opencode:openai/gpt-5.6-terra,claude-code:fable@high");

    expect(advisorAvailabilityPrompt("gpt-5.6-sol")).toBeUndefined();
  });

  it("injects the availability instruction into the executor system prompt", async () => {
    vi.stubEnv("OPENCODE_ADVISOR_MODEL", "openai/gpt-5.6-terra");
    const client = { session: {} };
    const plugin = AdvisorPlugin as unknown as {
      server(input: { client: typeof client }): Promise<{
        "experimental.chat.system.transform"(input: { model: { id: string } }, output: { system: string[] }): Promise<void>;
      }>;
    };
    const hooks = await plugin.server({ client });
    const system: string[] = [];

    await hooks["experimental.chat.system.transform"]({ model: { id: "gpt-5.6-sol" } }, { system });

    expect(system).toHaveLength(1);
    expect(system[0]).toContain("Do not call the advisor tool");
  });

  it.each(["gpt-5.6-terra", "gpt-5.6-sol", "gpt-5.6-sol-fast", "gpt-5.6-sol-pro"])(
    "skips the advisor when the executor tier is %s",
    async (modelID) => {
      vi.stubEnv("OPENCODE_ADVISOR_MODEL", "openai/gpt-5.6-terra");
      const create = vi.fn();
      const prompt = vi.fn();
      const messages = vi.fn().mockResolvedValue({
        data: [
          { info: { role: "user" }, parts: [{ type: "text", text: "Review this." }] },
          { info: { id: "tool-call", role: "assistant", modelID } },
        ],
      });
      const client = { session: { get: vi.fn().mockResolvedValue({ data: {} }), messages, create, prompt, delete: vi.fn() } };
      const plugin = AdvisorPlugin as unknown as {
        server(input: { client: typeof client }): Promise<{ tool: Record<string, { execute: Function }> }>;
    };
    const tools = await plugin.server({ client });

    await allowManualAdvisorCall(tools, "parent");
    const result = await tools.tool.advisor.execute({}, { sessionID: "parent", messageID: "tool-call", directory: "/tmp" });

      expect(result).toBe(
        `Skipped: the executor's GPT-5.6 ${modelID.replace(/^gpt-5\.6-/, "").replace(/-(fast|pro)$/, "")} tier is equal to or stronger than the advisor's terra tier.`,
      );
      expect(create).not.toHaveBeenCalled();
      expect(prompt).not.toHaveBeenCalled();
    },
  );

  it.each(["gpt-5.6-luna", "gpt-5.6-codex"])("runs the advisor for root executor model %s", async (modelID) => {
    vi.stubEnv("OPENCODE_ADVISOR_MODEL", "openai/gpt-5.6-terra");
    const create = vi.fn().mockResolvedValue({ data: { id: "advisor-session" } });
    const prompt = vi.fn().mockResolvedValue({ data: { parts: [{ type: "text", text: "Proceed." }] } });
    const messages = vi
      .fn()
      .mockResolvedValueOnce({
        data: [
          { info: { role: "user" }, parts: [{ type: "text", text: "Review this." }] },
          { info: { id: "tool-call", role: "assistant", modelID } },
        ],
      })
      .mockResolvedValueOnce({ data: [] });
    const client = {
      session: { get: vi.fn().mockResolvedValue({ data: {} }), messages, create, prompt, delete: vi.fn().mockResolvedValue({}) },
    };
    const plugin = AdvisorPlugin as unknown as {
      server(input: { client: typeof client }): Promise<{ tool: Record<string, { execute: Function }> }>;
    };
    const tools = await plugin.server({ client });

    await allowManualAdvisorCall(tools, "parent");
    await tools.tool.advisor.execute({}, { sessionID: "parent", messageID: "tool-call", directory: "/tmp", metadata: vi.fn() });

    expect(create).toHaveBeenCalled();
    expect(prompt).toHaveBeenCalled();
  });

  it("runs the advisor for a general child session", async () => {
    const create = vi.fn().mockResolvedValue({ data: { id: "advisor-session" } });
    const prompt = vi.fn().mockResolvedValue({ data: { parts: [{ type: "text", text: "Proceed." }] } });
    const messages = vi
      .fn()
      .mockResolvedValueOnce({
        data: [
          { info: { role: "user" }, parts: [{ type: "text", text: "Review this." }] },
          { info: { id: "tool-call", role: "assistant", modelID: "gpt-5.6-luna" } },
        ],
      })
      .mockResolvedValueOnce({ data: [] });
    const client = {
      session: {
        get: vi.fn().mockImplementation(({ path }: { path: { id: string } }) =>
          Promise.resolve({ data: path.id === "parent" ? {} : { parentID: "parent" } }),
        ),
        messages,
        create,
        prompt,
        delete: vi.fn().mockResolvedValue({}),
      },
    };
    const plugin = AdvisorPlugin as unknown as {
      server(input: { client: typeof client }): Promise<{ tool: Record<string, { execute: Function }> }>;
    };
    const tools = await plugin.server({ client });

    await allowManualAdvisorCall(tools, "child");
    await tools.tool.advisor.execute(
      {},
      { sessionID: "child", messageID: "tool-call", agent: "general", directory: "/tmp", metadata: vi.fn() },
    );

    expect(create).toHaveBeenCalled();
    expect(prompt).toHaveBeenCalled();
  });

  it("rejects advisor calls from non-general child sessions", async () => {
    const messages = vi.fn();
    const create = vi.fn();
    const prompt = vi.fn();
    const client = {
      session: {
        get: vi.fn().mockResolvedValue({ data: { parentID: "parent" } }),
        messages,
        create,
        prompt,
        delete: vi.fn(),
      },
    };
    const plugin = AdvisorPlugin as unknown as {
      server(input: { client: typeof client }): Promise<{ tool: Record<string, { execute: Function }> }>;
    };
    const tools = await plugin.server({ client });

    await allowManualAdvisorCall(tools, "child");
    const result = await tools.tool.advisor.execute({}, { sessionID: "child", agent: "explore", directory: "/tmp" });

    expect(result).toBe("Skipped: advisor is available to subagents only when running as general.");
    expect(messages).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
    expect(prompt).not.toHaveBeenCalled();
  });

  it("returns child usage and cleans up its session", async () => {
    vi.stubEnv("OPENCODE_ADVISOR_MODEL", "openai/gpt-5.6-sol");
    vi.stubEnv("OPENCODE_ADVISOR_PROMPT", "baseline");
    const deleteSession = vi.fn().mockResolvedValue({});
    const prompt = vi.fn().mockResolvedValue({ data: { parts: [{ type: "text", text: "Proceed." }] } });
    const messages = vi
      .fn()
      .mockResolvedValueOnce({ data: [{ info: { role: "user" }, parts: [{ type: "text", text: "Review this." }] }] })
      .mockResolvedValueOnce({
        data: [
          {
            info: {
              role: "assistant",
              cost: 0.01,
              tokens: { total: 16, input: 10, output: 2, reasoning: 4, cache: { read: 1, write: 0 } },
            },
          },
        ],
      });
    const client = {
      session: {
        get: vi.fn().mockResolvedValue({ data: {} }),
        messages,
        create: vi.fn().mockResolvedValue({ data: { id: "advisor-session" } }),
        prompt,
        delete: deleteSession,
      },
    };
    const plugin = AdvisorPlugin as unknown as {
      server(input: { client: typeof client }): Promise<{ tool: Record<string, { execute: Function }> }>;
    };
    const tools = await plugin.server({ client });
    const metadata = vi.fn();

    await allowManualAdvisorCall(tools, "parent");
    const result = await tools.tool.advisor.execute({}, { sessionID: "parent", directory: "/tmp", metadata });

    expect(result.output).toContain("Usage: 16 tokens");
    expect(result.metadata.usage).toMatchObject({ total: 16, cost: 0.01 });
    expect(result.metadata.promptVariant).toBe("baseline");
    expect(prompt).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          system: expect.stringContaining("do not ask the executor to run things for you"),
        }),
      }),
    );
    expect(deleteSession).toHaveBeenCalledWith({ path: { id: "advisor-session" }, query: { directory: "/tmp" } });
  });

  it("returns advice when child usage cannot be read", async () => {
    const deleteSession = vi.fn().mockResolvedValue({});
    const client = {
      session: {
        get: vi.fn().mockResolvedValue({ data: {} }),
        messages: vi
          .fn()
          .mockResolvedValueOnce({ data: [{ info: { role: "user" }, parts: [{ type: "text", text: "Review this." }] }] })
          .mockRejectedValueOnce(new Error("child session gone")),
        create: vi.fn().mockResolvedValue({ data: { id: "advisor-session" } }),
        prompt: vi.fn().mockResolvedValue({ data: { parts: [{ type: "text", text: "Proceed." }] } }),
        delete: deleteSession,
      },
    };
    const plugin = AdvisorPlugin as unknown as {
      server(input: { client: typeof client }): Promise<{ tool: Record<string, { execute: Function }> }>;
    };
    const tools = await plugin.server({ client });

    await allowManualAdvisorCall(tools, "parent");
    const result = await tools.tool.advisor.execute({}, { sessionID: "parent", directory: "/tmp", metadata: vi.fn() });

    expect(result.output).toContain("Proceed.\n\nUsage: unavailable");
    expect(deleteSession).toHaveBeenCalled();
  });

  it("matches OpenCode's cleared placeholder for compacted tool output", async () => {
    const prompt = vi.fn().mockResolvedValue({ data: { parts: [{ type: "text", text: "Proceed." }] } });
    const client = {
      get: vi.fn().mockResolvedValue({ data: {} }),
      messages: vi
        .fn()
        .mockResolvedValueOnce({
          data: [
            {
              info: { id: "tool-call", role: "assistant", modelID: "gpt-5.6-luna" },
              parts: [
                {
                  type: "tool",
                  tool: "bash",
                  state: {
                    status: "completed",
                    input: { command: "secret-command" },
                    output: "retained old tool output",
                    time: { compacted: 1 },
                  },
                },
              ],
            },
          ],
        })
        .mockResolvedValueOnce({ data: [] }),
      create: vi.fn().mockResolvedValue({ data: { id: "advisor-session" } }),
      prompt,
      delete: vi.fn().mockResolvedValue({}),
    };
    const tool = createEnabledAdvisorTool(client, undefined, new Map(), new Map(), new Map(), new Map());

    await (tool.execute as Function)(
      {},
      { sessionID: "parent", messageID: "tool-call", directory: "/workspace", metadata: vi.fn() },
    );

    const transcript = prompt.mock.calls[0]![0].body.parts[0]!.text;
    expect(transcript).toContain("[Old tool result content cleared]");
    expect(transcript).not.toContain("retained old tool output");
    expect(transcript).toContain("secret-command");
  });

  it("omits GPT-5.6 reasoning while forwarding visible context", async () => {
    const prompt = vi.fn().mockResolvedValue({ data: { parts: [{ type: "text", text: "Proceed." }] } });
    const client = {
      get: vi.fn().mockResolvedValue({ data: {} }),
      messages: vi
        .fn()
        .mockResolvedValueOnce({
          data: [
            {
              info: { id: "tool-call", role: "assistant", modelID: "gpt-5.6-luna" },
              parts: [
                { type: "reasoning", text: "The current approach needs a focused test.", metadata: { openai: { opaque: "secret" } } },
                { type: "reasoning", text: "   ", metadata: { openai: { opaque: "also-secret" } } },
                { type: "text", text: "Visible context" },
              ],
            },
          ],
        })
        .mockResolvedValueOnce({ data: [] }),
      create: vi.fn().mockResolvedValue({ data: { id: "advisor-session" } }),
      prompt,
      delete: vi.fn().mockResolvedValue({}),
    };
    const tool = createEnabledAdvisorTool(client, undefined, new Map(), new Map(), new Map(), new Map());

    await (tool.execute as Function)(
      {},
      { sessionID: "parent", messageID: "tool-call", directory: "/workspace", metadata: vi.fn() },
    );

    const transcript = prompt.mock.calls[0]![0].body.parts[0]!.text;
    expect(transcript).toContain("Visible context");
    expect(transcript).not.toContain("The current approach needs a focused test.");
    expect(transcript).not.toContain("secret");
  });

  it("continues a native advisor with only parent deltas and per-turn usage", async () => {
    vi.stubEnv("OPENCODE_ADVISOR_MODEL", "openai/gpt-5.6-sol");
    vi.stubEnv("OPENCODE_ADVISOR_NATIVE_MODE", "continuation");
    let parentMessages: Array<{ info: { id: string; role: string; modelID?: string; tokens?: object }; parts?: Array<Record<string, unknown>> }> = [
      { info: { id: "user-1", role: "user" }, parts: [{ type: "text", text: "Initial context" }] },
      { info: { id: "tool-1", role: "assistant", modelID: "gpt-5.6-luna" } },
    ];
    let childMessages: typeof parentMessages = [];
    const create = vi.fn().mockResolvedValue({ data: { id: "advisor-session" } });
    const prompt = vi.fn().mockImplementation(() => {
      childMessages = [
        ...childMessages,
        {
          info: {
            id: `advisor-${childMessages.length + 1}`,
            role: "assistant",
            tokens: { total: 16, input: 10 + childMessages.length, output: 2, reasoning: 4, cache: { read: 1, write: 0 } },
          },
        },
      ];
      return Promise.resolve({ data: { parts: [{ type: "text", text: "Proceed." }] } });
    });
    const client = {
      get: vi.fn().mockResolvedValue({ data: {} }),
      messages: vi.fn().mockImplementation(({ path }: { path: { id: string } }) =>
        Promise.resolve({ data: path.id === "parent" ? parentMessages : childMessages }),
      ),
      create,
      prompt,
      delete: vi.fn().mockResolvedValue({}),
    };
    const tool = createEnabledAdvisorTool(client, undefined, new Map(), new Map(), new Map(), new Map());
    const context = { sessionID: "parent", messageID: "tool-1", directory: "/workspace", metadata: vi.fn() };

    const first = await (tool.execute as Function)({}, context);
    parentMessages = [
      ...parentMessages,
      { info: { id: "prior-advisor", role: "assistant" }, parts: [{ type: "tool", tool: "advisor", state: { status: "completed", output: "Prior advisor result" } }] },
      { info: { id: "user-2", role: "user" }, parts: [{ type: "text", text: "New context" }] },
      { info: { id: "tool-2", role: "assistant", modelID: "gpt-5.6-luna" } },
    ];
    const second = await (tool.execute as Function)({}, { ...context, messageID: "tool-2" });

    expect(create).toHaveBeenCalledOnce();
    expect(prompt).toHaveBeenNthCalledWith(1, expect.objectContaining({ path: { id: "advisor-session" }, body: expect.objectContaining({ parts: [expect.objectContaining({ text: expect.stringContaining("Initial context") })] }) }));
    expect(prompt).toHaveBeenNthCalledWith(2, expect.objectContaining({ path: { id: "advisor-session" }, body: expect.objectContaining({ parts: [expect.objectContaining({ text: expect.stringContaining("New context") })] }) }));
    expect(prompt.mock.calls[1]![0].body.parts[0]!.text).not.toContain("Initial context");
    expect(prompt.mock.calls[1]![0].body.parts[0]!.text).not.toContain("Prior advisor result");
    expect(first.metadata.usage).toMatchObject({ input: 10, total: 16 });
    expect(second.metadata.usage).toMatchObject({ input: 11, total: 16 });
    expect(client.delete).not.toHaveBeenCalled();
  });

  it("does not pretend an unavailable continuation save is locally resumable", async () => {
    vi.stubEnv("OPENCODE_ADVISOR_MODEL", "openai/gpt-5.6-sol");
    vi.stubEnv("OPENCODE_ADVISOR_NATIVE_MODE", "continuation");
    const target = resolveAdvisorTargets()[0]!;
    const previous = { epoch: "uncompacted", sessionID: "shared-child", cursor: "old-tool", childCursor: "old-response" };
    let durable: typeof previous | undefined = previous;
    const seenPrevious: Array<typeof previous | undefined> = [];
    const store: ContinuationStore = {
      load: async () => durable,
      save: async () => ({ status: "unavailable", error: new Error("disk full") }),
      remove: async () => ({ status: "unavailable", error: new Error("disk full") }),
      prune: async () => undefined,
      transaction: async (_input, operation) => {
        const current = durable;
        seenPrevious.push(current);
        return operation({
          previous: current,
          reload: async () => ({ status: "available", ...(durable ? { continuation: durable } : {}) }),
          save: async () => ({ status: "unavailable", error: new Error("disk full") }),
          remove: async () => {
            durable = undefined;
            return { status: "removed" };
          },
        });
      },
    };
    const parentMessages = [
      { info: { id: "old-tool", role: "assistant", modelID: "gpt-5.6-luna" }, parts: [{ type: "text", text: "Initial context" }] },
      { info: { id: "tool-1", role: "assistant", modelID: "gpt-5.6-luna" }, parts: [{ type: "text", text: "New context" }] },
    ];
    const client = {
      get: vi.fn().mockImplementation(({ path }: { path: { id: string } }) =>
        Promise.resolve({ data: path.id === "parent" ? {} : { parentID: "parent" } }),
      ),
      messages: vi.fn().mockImplementation(({ path }: { path: { id: string } }) =>
        Promise.resolve({
          data: path.id === "parent"
            ? parentMessages
            : [{ info: { id: `${path.id}-response`, role: "assistant", tokens: { total: 4, input: 2, output: 2 } } }],
        }),
      ),
      create: vi.fn().mockResolvedValue({ data: { id: "new-child" } }),
      prompt: vi.fn().mockResolvedValue({ data: { parts: [{ type: "text", text: "Proceed." }] } }),
      delete: vi.fn().mockResolvedValue({}),
    };
    const native = new Map();
    const tool = createEnabledAdvisorTool(client, undefined, new Map(), new Map(), native, new Map(), store);
    const context = { sessionID: "parent", messageID: "tool-1", directory: "/workspace", metadata: vi.fn() };

    const first = await (tool.execute as Function)({}, context);
    const second = await (tool.execute as Function)({}, context);

    expect(first.metadata.continuationStatus).toBe("unavailable");
    expect(second.metadata.continuationStatus).toBe("unavailable");
    expect(native).toHaveLength(0);
    expect(seenPrevious).toEqual([previous, undefined]);
  });

  it("restores a native advisor child after a plugin restart", async () => {
    vi.stubEnv("OPENCODE_ADVISOR_MODEL", "openai/gpt-5.6-sol");
    vi.stubEnv("OPENCODE_ADVISOR_NATIVE_MODE", "continuation");
    const root = await mkdtemp(join(tmpdir(), "advisor-restart-"));
    try {
      let parentMessages: Array<{ info: { id: string; role: string; modelID?: string; tokens?: object }; parts?: Array<Record<string, unknown>> }> = [
        { info: { id: "user-1", role: "user" }, parts: [{ type: "text", text: "Initial context" }] },
        { info: { id: "tool-1", role: "assistant", modelID: "gpt-5.6-luna" } },
      ];
      const childMessages: typeof parentMessages = [];
      const create = vi.fn().mockResolvedValue({ data: { id: "advisor-session" } });
      const prompt = vi.fn().mockImplementation(() => {
        childMessages.push({ info: { id: `advisor-${childMessages.length + 1}`, role: "assistant", tokens: { total: 4 } } });
        return Promise.resolve({ data: { parts: [{ type: "text", text: "Proceed." }] } });
      });
      const client = {
        get: vi.fn().mockImplementation(({ path }: { path: { id: string } }) =>
          Promise.resolve({ data: path.id === "advisor-session" ? { parentID: "parent" } : {} }),
        ),
        messages: vi.fn().mockImplementation(({ path }: { path: { id: string } }) =>
          Promise.resolve({ data: path.id === "parent" ? parentMessages : childMessages }),
        ),
        create,
        prompt,
        delete: vi.fn().mockResolvedValue({}),
      };
      const store = createFileContinuationStore(root);
      const context = { sessionID: "parent", messageID: "tool-1", directory: "/workspace", metadata: vi.fn() };

      await (createEnabledAdvisorTool(client, undefined, new Map(), new Map(), new Map(), new Map(), store).execute as Function)({}, context);
      parentMessages = [
        ...parentMessages,
        { info: { id: "user-2", role: "user" }, parts: [{ type: "text", text: "New context" }] },
        { info: { id: "tool-2", role: "assistant", modelID: "gpt-5.6-luna" } },
      ];
      await (createEnabledAdvisorTool(client, undefined, new Map(), new Map(), new Map(), new Map(), store).execute as Function)(
        {},
        { ...context, messageID: "tool-2" },
      );

      expect(create).toHaveBeenCalledOnce();
      expect(prompt).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ path: { id: "advisor-session" }, body: expect.objectContaining({ parts: [expect.objectContaining({ text: expect.stringContaining("New context") })] }) }),
      );
      expect(prompt.mock.calls[1]![0].body.parts[0]!.text).not.toContain("Initial context");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("starts fresh after expired native state without deleting the old child", async () => {
    vi.stubEnv("OPENCODE_ADVISOR_MODEL", "openai/gpt-5.6-sol");
    vi.stubEnv("OPENCODE_ADVISOR_NATIVE_MODE", "continuation");
    const root = await mkdtemp(join(tmpdir(), "advisor-expired-"));
    try {
      const target = resolveAdvisorTargets()[0]!;
      const store = createFileContinuationStore(root);
      const state = {
        directory: "/workspace",
        parentSessionID: "parent",
        target,
        continuation: { epoch: "root", sessionID: "old-advisor", cursor: "tool-1", childCursor: "old-response" },
      };
      await store.save(state);
      const file = join(root, (await readdir(root))[0]!);
      const record = JSON.parse(await readFile(file, "utf8")) as Record<string, unknown>;
      record.updatedAt = Date.now() - 31 * 24 * 60 * 60 * 1000;
      await writeFile(file, `${JSON.stringify(record)}\n`, "utf8");
      await store.prune(state.directory);

      const create = vi.fn().mockResolvedValue({ data: { id: "new-advisor" } });
      const client = {
        get: vi.fn().mockResolvedValue({ data: {} }),
        messages: vi.fn().mockImplementation(({ path }: { path: { id: string } }) =>
          Promise.resolve({ data: path.id === "parent" ? [{ info: { id: "tool-1", role: "assistant", modelID: "gpt-5.6-luna" }, parts: [{ type: "text", text: "Review this." }] }] : [] }),
        ),
        create,
        prompt: vi.fn().mockResolvedValue({ data: { parts: [{ type: "text", text: "Proceed." }] } }),
        delete: vi.fn(),
      };
      await (createEnabledAdvisorTool(client, undefined, new Map(), new Map(), new Map(), new Map(), store).execute as Function)(
        {},
        { sessionID: "parent", messageID: "tool-1", directory: "/workspace", metadata: vi.fn() },
      );

      expect(create).toHaveBeenCalledOnce();
      expect(client.delete).not.toHaveBeenCalled();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("serializes concurrent native calls for the same parent and target", async () => {
    vi.stubEnv("OPENCODE_ADVISOR_MODEL", "openai/gpt-5.6-sol");
    vi.stubEnv("OPENCODE_ADVISOR_NATIVE_MODE", "continuation");
    let parentMessages: Array<{ info: { id: string; role: string; modelID?: string; tokens?: object }; parts?: Array<Record<string, unknown>> }> = [
      { info: { id: "user-1", role: "user" }, parts: [{ type: "text", text: "Initial context" }] },
      { info: { id: "tool-1", role: "assistant", modelID: "gpt-5.6-luna" } },
    ];
    const childMessages: typeof parentMessages = [];
    let resolveFirst!: (value: { data: { parts: Array<{ type: "text"; text: string }> } }) => void;
    const firstResponse = new Promise<{ data: { parts: Array<{ type: "text"; text: string }> } }>((resolve) => {
      resolveFirst = resolve;
    });
    const create = vi.fn().mockResolvedValue({ data: { id: "advisor-session" } });
    const prompt = vi
      .fn()
      .mockImplementationOnce(() => firstResponse)
      .mockImplementationOnce(() => {
        childMessages.push({
          info: { id: "advisor-2", role: "assistant", tokens: { total: 16, input: 10, output: 2, reasoning: 4, cache: { read: 0, write: 0 } } },
        });
        return Promise.resolve({ data: { parts: [{ type: "text" as const, text: "Second advice." }] } });
      });
    const client = {
      get: vi.fn().mockResolvedValue({ data: {} }),
      messages: vi.fn().mockImplementation(({ path }: { path: { id: string } }) =>
        Promise.resolve({ data: path.id === "parent" ? parentMessages : childMessages }),
      ),
      create,
      prompt,
      delete: vi.fn().mockResolvedValue({}),
    };
    const tool = createEnabledAdvisorTool(client, undefined, new Map(), new Map(), new Map(), new Map());
    const first = (tool.execute as Function)(
      {},
      { sessionID: "parent", messageID: "tool-1", directory: "/workspace", metadata: vi.fn() },
    );
    await vi.waitFor(() => expect(prompt).toHaveBeenCalledTimes(1));

    const second = (tool.execute as Function)(
      {},
      { sessionID: "parent", messageID: "tool-2", directory: "/workspace", metadata: vi.fn() },
    );
    expect(create).toHaveBeenCalledOnce();
    expect(prompt).toHaveBeenCalledOnce();

    parentMessages = [
      ...parentMessages,
      { info: { id: "user-2", role: "user" }, parts: [{ type: "text", text: "Later context" }] },
      { info: { id: "tool-2", role: "assistant", modelID: "gpt-5.6-luna" } },
    ];
    childMessages.push({
      info: { id: "advisor-1", role: "assistant", tokens: { total: 16, input: 10, output: 2, reasoning: 4, cache: { read: 0, write: 0 } } },
    });
    resolveFirst({ data: { parts: [{ type: "text", text: "First advice." }] } });

    await first;
    await second;

    expect(create).toHaveBeenCalledOnce();
    expect(prompt).toHaveBeenNthCalledWith(2, expect.objectContaining({ path: { id: "advisor-session" } }));
    expect(prompt.mock.calls[1]![0].body.parts[0]!.text).toContain("Later context");
    expect(prompt.mock.calls[1]![0].body.parts[0]!.text).not.toContain("Initial context");
  });

  it("rotates a continued native advisor after parent compaction", async () => {
    vi.stubEnv("OPENCODE_ADVISOR_MODEL", "openai/gpt-5.6-sol");
    vi.stubEnv("OPENCODE_ADVISOR_NATIVE_MODE", "continuation");
    let parentMessages = [
      { info: { id: "marker-1", role: "user" }, parts: [{ type: "compaction" }] },
      { info: { id: "summary-1", parentID: "marker-1", role: "assistant", summary: true, finish: "stop" }, parts: [{ type: "text", text: "First summary" }] },
      { info: { id: "tool-1", role: "assistant", modelID: "gpt-5.6-luna" } },
    ];
    const create = vi.fn().mockResolvedValueOnce({ data: { id: "advisor-1" } }).mockResolvedValueOnce({ data: { id: "advisor-2" } });
    const client = {
      get: vi.fn().mockResolvedValue({ data: {} }),
      messages: vi.fn().mockImplementation(({ path }: { path: { id: string } }) =>
        Promise.resolve({ data: path.id === "parent" ? parentMessages : [] }),
      ),
      create,
      prompt: vi.fn().mockResolvedValue({ data: { parts: [{ type: "text", text: "Proceed." }] } }),
      delete: vi.fn().mockResolvedValue({}),
    };
    const tool = createEnabledAdvisorTool(client, undefined, new Map(), new Map(), new Map(), new Map());
    const context = { sessionID: "parent", messageID: "tool-1", directory: "/workspace", metadata: vi.fn() };

    await (tool.execute as Function)({}, context);
    parentMessages = [
      { info: { id: "marker-2", role: "user" }, parts: [{ type: "compaction" }] },
      { info: { id: "summary-2", parentID: "marker-2", role: "assistant", summary: true, finish: "stop" }, parts: [{ type: "text", text: "Second summary" }] },
      { info: { id: "tool-2", role: "assistant", modelID: "gpt-5.6-luna" } },
    ];
    await (tool.execute as Function)({}, { ...context, messageID: "tool-2" });

    expect(create).toHaveBeenCalledTimes(2);
    expect(client.delete).toHaveBeenCalledWith({ path: { id: "advisor-1" }, query: { directory: "/workspace" } });
  });

  it("does not let an older process overwrite a newer compaction continuation", async () => {
    vi.stubEnv("OPENCODE_ADVISOR_MODEL", "openai/gpt-5.6-sol");
    vi.stubEnv("OPENCODE_ADVISOR_NATIVE_MODE", "continuation");
    const root = await mkdtemp(join(tmpdir(), "advisor-cross-process-race-"));
    try {
      let releaseOld!: (value: { data: { parts: Array<{ type: "text"; text: string }> } }) => void;
      const oldPrompt = vi.fn().mockImplementation(
        () =>
          new Promise<{ data: { parts: Array<{ type: "text"; text: string }> } }>((resolve) => {
            releaseOld = resolve;
          }),
      );
      const newPrompt = vi.fn().mockResolvedValue({ data: { parts: [{ type: "text" as const, text: "New advice." }] } });
      const oldMessages = [
        { info: { id: "old-tool", role: "assistant", modelID: "gpt-5.6-luna" }, parts: [{ type: "text", text: "Old context" }] },
      ];
      const newMessages = [
        { info: { id: "marker-new", role: "user" }, parts: [{ type: "compaction" }] },
        { info: { id: "summary-new", parentID: "marker-new", role: "assistant", summary: true, finish: "stop" }, parts: [{ type: "text", text: "New summary" }] },
        { info: { id: "new-tool", role: "assistant", modelID: "gpt-5.6-luna" }, parts: [{ type: "text", text: "New context" }] },
      ];
      const makeClient = (
        parentMessages: typeof oldMessages | typeof newMessages,
        childID: string,
        prompt: (...args: unknown[]) => Promise<{ data: { parts: Array<{ type: "text"; text: string }> } }>,
      ) => ({
        get: vi.fn().mockImplementation(({ path }: { path: { id: string } }) =>
          Promise.resolve({ data: path.id === "parent" ? {} : { parentID: "parent" } }),
        ),
        messages: vi.fn().mockImplementation(({ path }: { path: { id: string } }) =>
          Promise.resolve({
            data: path.id === "parent"
              ? parentMessages
              : [{ info: { id: `${childID}-response`, role: "assistant", tokens: { total: 8, input: 4, output: 2, reasoning: 2, cache: { read: 0, write: 0 } } } }],
          }),
        ),
        create: vi.fn().mockResolvedValue({ data: { id: childID } }),
        prompt,
        delete: vi.fn().mockResolvedValue({}),
      });
      const oldClient = makeClient(oldMessages, "old-child", oldPrompt);
      const newClient = makeClient(newMessages, "new-child", newPrompt);
      const store = createFileContinuationStore(root);
    const oldTool = createEnabledAdvisorTool(oldClient, undefined, new Map(), new Map(), new Map(), new Map(), store);
    const newTool = createEnabledAdvisorTool(newClient, undefined, new Map(), new Map(), new Map(), new Map(), store);

      const oldRun = (oldTool.execute as Function)(
        {},
        { sessionID: "parent", messageID: "old-tool", directory: "/workspace", metadata: vi.fn() },
      );
      await vi.waitFor(() => expect(oldPrompt).toHaveBeenCalledOnce());
      const newRun = (newTool.execute as Function)(
        {},
        { sessionID: "parent", messageID: "new-tool", directory: "/workspace", metadata: vi.fn() },
      );
      releaseOld({ data: { parts: [{ type: "text", text: "Old advice." }] } });
      await oldRun;
      await newRun;

      const stateStore = createFileAdvisorContinuationStore(root);
      await expect(stateStore.load({ directory: "/workspace", parentSessionID: "parent", target: "opencode:openai/gpt-5.6-sol" })).resolves.toMatchObject({
        epoch: "compaction:marker-new",
        sessionID: "new-child",
      });
      expect(newClient.delete).toHaveBeenCalledWith({ path: { id: "old-child" }, query: { directory: "/workspace" } });
      expect(oldClient.delete).not.toHaveBeenCalled();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("keeps the winner child when a rotated cross-epoch loser fails", async () => {
    vi.stubEnv("OPENCODE_ADVISOR_MODEL", "openai/gpt-5.6-sol");
    vi.stubEnv("OPENCODE_ADVISOR_NATIVE_MODE", "continuation");
    const root = await mkdtemp(join(tmpdir(), "advisor-shared-child-race-"));
    try {
      const durable = createFileContinuationStore(root);
      const target = resolveAdvisorTargets()[0]!;
      const previous = { epoch: "uncompacted", sessionID: "shared-child", cursor: "old-tool", childCursor: "old-response" };
      const winner = { epoch: "compaction:new", sessionID: "winner-child", cursor: "new-tool", childCursor: "winner-response" };
      await durable.save({ directory: "/workspace", parentSessionID: "parent", target, continuation: winner });
      const store: ContinuationStore = {
        load: durable.load,
        save: durable.save,
        remove: durable.remove,
        prune: durable.prune,
        transaction: async (_input, operation) =>
          operation({
            previous,
            reload: async () => ({ status: "available", continuation: winner }),
            save: async () => ({ status: "conflict", current: winner }),
            remove: async () => ({ status: "conflict", current: winner }),
          }),
      };
      const parentMessages = [
        { info: { id: "marker-new", role: "user" }, parts: [{ type: "compaction" }] },
        { info: { id: "summary-new", parentID: "marker-new", role: "assistant", summary: true, finish: "stop" }, parts: [{ type: "text", text: "New summary" }] },
        { info: { id: "new-tool", role: "assistant", modelID: "gpt-5.6-luna" }, parts: [{ type: "text", text: "New context" }] },
      ];
      const loserClient = {
        get: vi.fn().mockImplementation(({ path }: { path: { id: string } }) =>
          Promise.resolve({ data: path.id === "parent" ? {} : { parentID: "parent" } }),
        ),
        messages: vi.fn().mockImplementation(({ path }: { path: { id: string } }) =>
          Promise.resolve({ data: path.id === "parent" ? parentMessages : [] }),
        ),
        create: vi.fn().mockResolvedValue({ data: { id: "loser-child" } }),
        prompt: vi.fn().mockResolvedValue({ error: "rotated loser failure" }),
        delete: vi.fn().mockResolvedValue({}),
      };
      const loserTool = createEnabledAdvisorTool(loserClient, undefined, new Map(), new Map(), new Map(), new Map(), store);

      await expect((loserTool.execute as Function)(
        {},
        { sessionID: "parent", messageID: "new-tool", directory: "/workspace", metadata: vi.fn() },
      )).resolves.toContain("rotated loser failure");

      await expect(durable.load({ directory: "/workspace", parentSessionID: "parent", target })).resolves.toEqual(winner);
      expect(loserClient.delete).toHaveBeenCalledWith({ path: { id: "loser-child" }, query: { directory: "/workspace" } });
      expect(loserClient.delete).not.toHaveBeenCalledWith({ path: { id: "shared-child" }, query: { directory: "/workspace" } });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("evicts a failed continued native advisor before retrying its delta", async () => {
    vi.stubEnv("OPENCODE_ADVISOR_MODEL", "openai/gpt-5.6-sol");
    vi.stubEnv("OPENCODE_ADVISOR_NATIVE_MODE", "continuation");
    const parentMessages = [
      { info: { id: "user-1", role: "user" }, parts: [{ type: "text", text: "Initial context" }] },
      { info: { id: "tool-1", role: "assistant", modelID: "gpt-5.6-luna" } },
    ];
    const create = vi.fn().mockResolvedValueOnce({ data: { id: "advisor-1" } }).mockResolvedValueOnce({ data: { id: "advisor-2" } });
    const prompt = vi
      .fn()
      .mockResolvedValueOnce({ error: "temporary failure" })
      .mockResolvedValueOnce({ data: { parts: [{ type: "text", text: "Proceed." }] } });
    const client = {
      get: vi.fn().mockResolvedValue({ data: {} }),
      messages: vi.fn().mockImplementation(({ path }: { path: { id: string } }) =>
        Promise.resolve({ data: path.id === "parent" ? parentMessages : [] }),
      ),
      create,
      prompt,
      delete: vi.fn().mockResolvedValue({}),
    };
    const tool = createEnabledAdvisorTool(client, undefined, new Map(), new Map(), new Map(), new Map());
    const context = { sessionID: "parent", messageID: "tool-1", directory: "/workspace", metadata: vi.fn() };

    await expect((tool.execute as Function)({}, context)).resolves.toContain("temporary failure");
    await (tool.execute as Function)({}, context);

    expect(create).toHaveBeenCalledTimes(2);
    expect(client.delete).toHaveBeenCalledWith({ path: { id: "advisor-1" }, query: { directory: "/workspace" } });
    expect(prompt).toHaveBeenNthCalledWith(2, expect.objectContaining({ path: { id: "advisor-2" } }));
  });

  it("cleans up both children when a compaction rotation fails", async () => {
    vi.stubEnv("OPENCODE_ADVISOR_MODEL", "openai/gpt-5.6-sol");
    vi.stubEnv("OPENCODE_ADVISOR_NATIVE_MODE", "continuation");
    let parentMessages = [
      { info: { id: "marker-1", role: "user" }, parts: [{ type: "compaction" }] },
      { info: { id: "summary-1", parentID: "marker-1", role: "assistant", summary: true, finish: "stop" }, parts: [{ type: "text", text: "First summary" }] },
      { info: { id: "tool-1", role: "assistant", modelID: "gpt-5.6-luna" } },
    ];
    const create = vi.fn().mockResolvedValueOnce({ data: { id: "advisor-1" } }).mockResolvedValueOnce({ data: { id: "advisor-2" } });
    const prompt = vi.fn().mockResolvedValueOnce({ data: { parts: [{ type: "text", text: "Proceed." }] } }).mockResolvedValueOnce({ error: "temporary failure" });
    const client = {
      get: vi.fn().mockResolvedValue({ data: {} }),
      messages: vi.fn().mockImplementation(({ path }: { path: { id: string } }) =>
        Promise.resolve({ data: path.id === "parent" ? parentMessages : [] }),
      ),
      create,
      prompt,
      delete: vi.fn().mockResolvedValue({}),
    };
    const tool = createEnabledAdvisorTool(client, undefined, new Map(), new Map(), new Map(), new Map());
    const context = { sessionID: "parent", messageID: "tool-1", directory: "/workspace", metadata: vi.fn() };

    await (tool.execute as Function)({}, context);
    parentMessages = [
      { info: { id: "marker-2", role: "user" }, parts: [{ type: "compaction" }] },
      { info: { id: "summary-2", parentID: "marker-2", role: "assistant", summary: true, finish: "stop" }, parts: [{ type: "text", text: "Second summary" }] },
      { info: { id: "tool-2", role: "assistant", modelID: "gpt-5.6-luna" } },
    ];

    await expect((tool.execute as Function)({}, { ...context, messageID: "tool-2" })).resolves.toContain("temporary failure");
    expect(client.delete).toHaveBeenCalledWith({ path: { id: "advisor-1" }, query: { directory: "/workspace" } });
    expect(client.delete).toHaveBeenCalledWith({ path: { id: "advisor-2" }, query: { directory: "/workspace" } });
  });

  it("evicts a continued native advisor when its per-turn usage cannot be read", async () => {
    vi.stubEnv("OPENCODE_ADVISOR_MODEL", "openai/gpt-5.6-sol");
    vi.stubEnv("OPENCODE_ADVISOR_NATIVE_MODE", "continuation");
    const parentMessages = [
      { info: { id: "user-1", role: "user" }, parts: [{ type: "text", text: "Initial context" }] },
      { info: { id: "tool-1", role: "assistant", modelID: "gpt-5.6-luna" } },
    ];
    const create = vi.fn().mockResolvedValueOnce({ data: { id: "advisor-1" } }).mockResolvedValueOnce({ data: { id: "advisor-2" } });
    const childMessages = [
      { info: { id: "advisor-response", role: "assistant", tokens: { total: 12, input: 8, output: 2, reasoning: 2, cache: { read: 0, write: 0 } } } },
    ];
    const client = {
      get: vi.fn().mockResolvedValue({ data: {} }),
      messages: vi.fn().mockImplementation(({ path }: { path: { id: string } }) => {
        if (path.id === "parent") return Promise.resolve({ data: parentMessages });
        if (path.id === "advisor-1") return Promise.resolve({ error: "child gone" });
        return Promise.resolve({ data: childMessages });
      }),
      create,
      prompt: vi.fn().mockResolvedValue({ data: { parts: [{ type: "text", text: "Proceed." }] } }),
      delete: vi.fn().mockResolvedValue({}),
    };
    const tool = createEnabledAdvisorTool(client, undefined, new Map(), new Map(), new Map(), new Map());
    const context = { sessionID: "parent", messageID: "tool-1", directory: "/workspace", metadata: vi.fn() };

    const first = await (tool.execute as Function)({}, context);
    const second = await (tool.execute as Function)({}, context);

    expect(first.output).toContain("Usage: unavailable");
    expect(second.metadata.usage).toMatchObject({ input: 8, total: 12 });
    expect(create).toHaveBeenCalledTimes(2);
    expect(client.delete).toHaveBeenCalledWith({ path: { id: "advisor-1" }, query: { directory: "/workspace" } });
  });

  it("evicts a continued native advisor when child compaction removes its usage cursor", async () => {
    vi.stubEnv("OPENCODE_ADVISOR_MODEL", "openai/gpt-5.6-sol");
    vi.stubEnv("OPENCODE_ADVISOR_NATIVE_MODE", "continuation");
    let parentMessages = [
      { info: { id: "user-1", role: "user" }, parts: [{ type: "text", text: "Initial context" }] },
      { info: { id: "tool-1", role: "assistant", modelID: "gpt-5.6-luna" } },
    ];
    let childRead = 0;
    const client = {
      get: vi.fn().mockResolvedValue({ data: {} }),
      messages: vi.fn().mockImplementation(({ path }: { path: { id: string } }) => {
        if (path.id === "parent") return Promise.resolve({ data: parentMessages });
        childRead += 1;
        return Promise.resolve({
          data: [
            {
              info: {
                id: childRead === 1 ? "prior-response" : "compacted-response",
                role: "assistant",
                tokens: { total: 12, input: 8, output: 2, reasoning: 2, cache: { read: 0, write: 0 } },
              },
            },
          ],
        });
      }),
      create: vi.fn().mockResolvedValue({ data: { id: "advisor-1" } }),
      prompt: vi.fn().mockResolvedValue({ data: { parts: [{ type: "text", text: "Proceed." }] } }),
      delete: vi.fn().mockResolvedValue({}),
    };
    const tool = createEnabledAdvisorTool(client, undefined, new Map(), new Map(), new Map(), new Map());
    const context = { sessionID: "parent", messageID: "tool-1", directory: "/workspace", metadata: vi.fn() };

    await (tool.execute as Function)({}, context);
    parentMessages = [
      ...parentMessages,
      { info: { id: "user-2", role: "user" }, parts: [{ type: "text", text: "New context" }] },
      { info: { id: "tool-2", role: "assistant", modelID: "gpt-5.6-luna" } },
    ];
    const second = await (tool.execute as Function)({}, { ...context, messageID: "tool-2" });

    expect(second.output).toContain("Usage: unavailable");
    expect(client.delete).toHaveBeenCalledWith({ path: { id: "advisor-1" }, query: { directory: "/workspace" } });
  });

  it("starts fresh on the next locked transaction after unavailable continuation persistence", async () => {
    vi.stubEnv("OPENCODE_ADVISOR_MODELS", "claude-code:fable@high");
    const previous = { epoch: "uncompacted", sessionID: "claude-old", cursor: "old-tool" };
    const persistenceError = new Error("state unavailable");
    let transactionCount = 0;
    const store: ContinuationStore = {
      load: vi.fn().mockResolvedValue(previous),
      save: vi.fn(),
      remove: vi.fn(),
      prune: vi.fn().mockResolvedValue(undefined),
      transaction: async (_input, operation) => {
        transactionCount += 1;
        const state: AdvisorContinuationTransaction = {
          previous,
          reload: async () => ({ status: "unavailable", error: persistenceError }),
          save: async ({ continuation }) =>
            transactionCount === 1
              ? { status: "unavailable", error: persistenceError }
              : { status: "committed", continuation },
          remove: async () => ({ status: "unavailable", error: persistenceError }),
        };
        return operation(state);
      },
    };
    const runner = vi
      .fn()
      .mockResolvedValueOnce(claudeResult("First advice", "claude-1"))
      .mockResolvedValueOnce(claudeResult("Second advice", "claude-2"));
    const messages = [
      { info: { id: "old-user", role: "user" }, parts: [{ type: "text", text: "Initial context" }] },
      { info: { id: "old-tool", role: "assistant", modelID: "gpt-5.6-luna" }, parts: [{ type: "text", text: "Old turn" }] },
      { info: { id: "new-user", role: "user" }, parts: [{ type: "text", text: "New context" }] },
      { info: { id: "new-tool", role: "assistant", modelID: "gpt-5.6-luna" }, parts: [{ type: "text", text: "Current turn" }] },
    ];
    const client = {
      get: vi.fn().mockResolvedValue({ data: {} }),
      messages: vi.fn().mockResolvedValue({ data: messages }),
      create: vi.fn(),
      prompt: vi.fn(),
      delete: vi.fn(),
    };
    const tool = createEnabledAdvisorTool(client, runner, new Map(), new Map(), new Map(), new Map(), store);
    const context = { sessionID: "parent", messageID: "new-tool", directory: "/workspace", metadata: vi.fn() };

    await expect((tool.execute as Function)({}, context)).resolves.toMatchObject({ output: expect.stringContaining("First advice") });
    await expect((tool.execute as Function)({}, context)).resolves.toMatchObject({ output: expect.stringContaining("Second advice") });

    expect(runner).toHaveBeenNthCalledWith(1, expect.objectContaining({ resume: "claude-old" }));
    expect(runner.mock.calls[1]![0]).not.toHaveProperty("resume");
    expect(transactionCount).toBe(2);
  });

  it("returns Claude advice when the concurrent native target fails", async () => {
    vi.stubEnv("OPENCODE_ADVISOR_MODELS", "opencode:openai/gpt-5.6-sol@high,claude-code:fable@high");
    const create = vi.fn().mockResolvedValue({ error: "native unavailable" });
    const runner = vi.fn().mockResolvedValue(claudeResult("Claude proceed."));
    const client = {
      get: vi.fn().mockResolvedValue({ data: {} }),
      messages: vi.fn().mockResolvedValue({
        data: [
          { info: { id: "user-1", role: "user" }, parts: [{ type: "text", text: "Review this." }] },
          { info: { id: "tool-call", role: "assistant", modelID: "gpt-5.6-luna" } },
        ],
      }),
      create,
      prompt: vi.fn(),
      delete: vi.fn(),
    };
    const tool = createEnabledAdvisorTool(client, runner, new Map());

    const result = await (tool.execute as Function)(
      {},
      { sessionID: "parent", messageID: "tool-call", directory: "/workspace", metadata: vi.fn() },
    );

    expect(create).toHaveBeenCalledOnce();
    expect(runner).toHaveBeenCalledWith(
      expect.objectContaining({ cwd: claudeAdvisorDirectory(), model: "fable", effort: "high" }),
    );
    expect(runner.mock.calls[0]![0]).not.toHaveProperty("resume");
    expect(result.output).toContain("## Advisor (claude-code:fable@high (claude-fable-5))");
    expect(result.output).toContain("Claude proceed.");
    expect(result.output).toContain("cache read 120 tokens");
    expect(result.output).toContain("reported cost $0.012500");
    expect(result.output).toContain("## Advisor failure (opencode:openai/gpt-5.6-sol@high)");
    expect(result.output).toContain("Error: could not open an advisor session (native unavailable).");
    expect(result.metadata.failures).toEqual([
      { label: "opencode:openai/gpt-5.6-sol@high", error: "could not open an advisor session (native unavailable)." },
    ]);
  });

  it("retains successful Claude activation when a native target fails", async () => {
    vi.stubEnv("OPENCODE_ADVISOR_MODELS", "opencode:openai/gpt-5.6-sol@high,claude-code:fable@high");
    vi.stubEnv("OPENCODE_ADVISOR_MODE", "auto");
    const root = await mkdtemp(join(tmpdir(), "advisor-partial-activation-"));
    try {
      const runner = vi.fn().mockResolvedValue(claudeResult("Claude proceed.", "claude-session"));
      const store = createFileContinuationStore(root);
      const stateStore = createFileAdvisorContinuationStore(root);
      const client = {
        get: vi.fn().mockResolvedValue({ data: {} }),
        messages: vi.fn().mockResolvedValue({
          data: [
            { info: { id: "user-1", role: "user" }, parts: [{ type: "text", text: "Review this." }] },
            { info: { id: "tool-call", role: "assistant", modelID: "gpt-5.6-luna" } },
          ],
        }),
        create: vi.fn().mockResolvedValue({ error: "native unavailable" }),
        prompt: vi.fn(),
        delete: vi.fn(),
      };
    const tool = createEnabledAdvisorTool(client, runner, new Map(), new Map(), new Map(), new Map(), store);

      const result = await (tool.execute as Function)(
        {},
        { sessionID: "parent", messageID: "tool-call", directory: "/workspace", metadata: vi.fn() },
      );

      expect(result.output).toContain("Claude proceed.");
      await expect(stateStore.list({ directory: "/workspace", parentSessionID: "parent" })).resolves.toMatchObject([
        {
          target: "claude-code:fable@high",
          continuation: { epoch: "uncompacted", sessionID: "claude-session", cursor: "tool-call" },
        },
      ]);
      await expect(
        advisorExecutorPolicy({
          modeStore: createFileAdvisorModeStore(root),
          continuationStore: stateStore,
          client,
          directory: "/workspace",
          sessionID: "parent",
        }),
      ).resolves.toEqual({ mode: "auto", policy: AUTO_FOLLOWUP_POLICY });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("continues without Claude when the session limit is reached", async () => {
    vi.stubEnv("OPENCODE_ADVISOR_MODELS", "claude-code:fable@high");
    const runner = vi.fn().mockResolvedValue(
      JSON.stringify({
        type: "result",
        subtype: "success",
        is_error: true,
        api_error_status: 429,
        result: "You've hit your session limit · resets 5pm (America/Chicago)",
        session_id: "claude-session",
      }),
    );
    const client = {
      get: vi.fn().mockResolvedValue({ data: {} }),
      messages: vi.fn().mockResolvedValue({
        data: [
          { info: { id: "user-1", role: "user" }, parts: [{ type: "text", text: "Review this." }] },
          { info: { id: "tool-call", role: "assistant", modelID: "gpt-5.6-luna" } },
        ],
      }),
      create: vi.fn(),
      prompt: vi.fn(),
      delete: vi.fn(),
    };
    const tool = createEnabledAdvisorTool(client, runner, new Map());

    const result = await (tool.execute as Function)(
      {},
      { sessionID: "parent", messageID: "tool-call", directory: "/workspace", metadata: vi.fn() },
    );

    expect(result).toContain("Advisor unavailable:");
    expect(result).toContain("You've hit your session limit · resets 5pm (America/Chicago) (HTTP 429)");
    expect(result).toContain("Continue without advisor.");
    expect(result).not.toMatch(/^Error:/);
  });

  it("reports every unavailable target without stopping the executor", async () => {
    vi.stubEnv("OPENCODE_ADVISOR_MODELS", "opencode:openai/gpt-5.6-sol@high,claude-code:fable@high");
    const runner = vi.fn().mockResolvedValue(
      JSON.stringify({
        type: "result",
        subtype: "success",
        is_error: true,
        api_error_status: 429,
        result: "You've hit your session limit · resets 5pm (America/Chicago)",
        session_id: "claude-session",
      }),
    );
    const client = {
      get: vi.fn().mockResolvedValue({ data: {} }),
      messages: vi.fn().mockResolvedValue({
        data: [
          { info: { id: "user-1", role: "user" }, parts: [{ type: "text", text: "Review this." }] },
          { info: { id: "tool-call", role: "assistant", modelID: "gpt-5.6-luna" } },
        ],
      }),
      create: vi.fn().mockResolvedValue({ error: "native unavailable" }),
      prompt: vi.fn(),
      delete: vi.fn(),
    };
    const tool = createEnabledAdvisorTool(client, runner, new Map());

    const result = await (tool.execute as Function)(
      {},
      { sessionID: "parent", messageID: "tool-call", directory: "/workspace", metadata: vi.fn() },
    );

    expect(result).toContain("Advisor unavailable; continuing without advisor.");
    expect(result).toContain("opencode:openai/gpt-5.6-sol@high: could not open an advisor session (native unavailable).");
    expect(result).toContain("claude-code:fable@high: You've hit your session limit · resets 5pm (America/Chicago) (HTTP 429)");
    expect(result).not.toMatch(/^Error:/);
  });

  it("uses the configured Claude family instead of an earlier preflight modelUsage entry", async () => {
    vi.stubEnv("OPENCODE_ADVISOR_MODELS", "claude-code:fable@high");
    const runner = vi.fn().mockResolvedValue(
      claudeResult("Fable advice.", "claude-fable-session", {
        "claude-haiku-4-5": { cacheReadInputTokens: 3, cacheCreationInputTokens: 1 },
        "claude-fable-5": { cacheReadInputTokens: 120, cacheCreationInputTokens: 8 },
      }),
    );
    const client = {
      get: vi.fn().mockResolvedValue({ data: {} }),
      messages: vi.fn().mockResolvedValue({
        data: [{ info: { id: "user-1", role: "user" }, parts: [{ type: "text", text: "Review this." }] }],
      }),
      create: vi.fn(),
      prompt: vi.fn(),
      delete: vi.fn(),
    };
    const tool = createEnabledAdvisorTool(client, runner, new Map());

    const result = await (tool.execute as Function)(
      {},
      { sessionID: "parent", directory: "/workspace", metadata: vi.fn() },
    );

    expect(result.output).toContain("claude-code:fable@high (claude-fable-5)");
    expect(result.output).toContain("cache read 120 tokens");
    expect(result.output).not.toContain("claude-haiku-4-5");
    expect(result.metadata.targets[0]).toMatchObject({ actualModel: "claude-fable-5", usage: { cacheRead: 120 } });
  });

  it("rejects Claude output without an actual model matching the configured target", async () => {
    vi.stubEnv("OPENCODE_ADVISOR_MODELS", "claude-code:opus@high");
    const client = {
      get: vi.fn().mockResolvedValue({ data: {} }),
      messages: vi.fn().mockResolvedValue({
        data: [{ info: { id: "user-1", role: "user" }, parts: [{ type: "text", text: "Review this." }] }],
      }),
      create: vi.fn(),
      prompt: vi.fn(),
      delete: vi.fn(),
    };
    const tool = createEnabledAdvisorTool(client, vi.fn().mockResolvedValue(claudeResult()), new Map());

    const result = await (tool.execute as Function)(
      {},
      { sessionID: "parent", directory: "/workspace", metadata: vi.fn() },
    );

    expect(result).toContain('configured model "opus" in modelUsage (available: claude-fable-5)');
  });

  it("advances a Claude cursor only after successful output and omits prior advisor results from deltas", async () => {
    vi.stubEnv("OPENCODE_ADVISOR_MODELS", "claude-code:fable@high");
    let messages: Array<{ info: { id: string; role: string; modelID?: string }; parts?: Array<Record<string, unknown>> }> = [
      { info: { id: "user-1", role: "user" }, parts: [{ type: "text", text: "Initial context" }] },
      { info: { id: "tool-call", role: "assistant", modelID: "gpt-5.6-luna" } },
    ];
    const runner = vi
      .fn()
      .mockRejectedValueOnce(new Error("temporary Claude failure"))
      .mockResolvedValue(claudeResult("Claude proceed.", "claude-1"));
    const client = {
      get: vi.fn().mockResolvedValue({ data: {} }),
      messages: vi.fn().mockImplementation(() => Promise.resolve({ data: messages })),
      create: vi.fn(),
      prompt: vi.fn(),
      delete: vi.fn(),
    };
    const tool = createEnabledAdvisorTool(client, runner, new Map());
    const context = { sessionID: "parent", messageID: "tool-call", directory: "/workspace", metadata: vi.fn() };

    await (tool.execute as Function)({}, context);
    await (tool.execute as Function)({}, context);
    messages = [
      ...messages,
      {
        info: { id: "prior-advisor", role: "assistant" },
        parts: [{ type: "tool", tool: "advisor", state: { status: "completed", output: "Prior advisor result" } }],
      },
      { info: { id: "user-2", role: "user" }, parts: [{ type: "text", text: "New context" }] },
    ];
    await (tool.execute as Function)({}, context);

    expect(runner.mock.calls[0]![0]).not.toHaveProperty("resume");
    expect(runner.mock.calls[1]![0]).not.toHaveProperty("resume");
    expect(runner).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ resume: "claude-1", prompt: expect.stringContaining("New context") }),
    );
    expect(runner.mock.calls[2]![0].prompt).not.toContain("Initial context");
    expect(runner.mock.calls[2]![0].prompt).not.toContain("Prior advisor result");
  });

  it("restores a Claude advisor session after a plugin restart", async () => {
    vi.stubEnv("OPENCODE_ADVISOR_MODELS", "claude-code:fable@high");
    const root = await mkdtemp(join(tmpdir(), "advisor-claude-restart-"));
    try {
      let messages: Array<{ info: { id: string; role: string; modelID?: string }; parts?: Array<Record<string, unknown>> }> = [
        { info: { id: "user-1", role: "user" }, parts: [{ type: "text", text: "Initial context" }] },
        { info: { id: "tool-1", role: "assistant", modelID: "gpt-5.6-luna" } },
      ];
      const runner = vi.fn().mockResolvedValueOnce(claudeResult("First advice", "claude-1")).mockResolvedValueOnce(claudeResult("Second advice", "claude-1"));
      const client = {
        get: vi.fn().mockResolvedValue({ data: {} }),
        messages: vi.fn().mockImplementation(() => Promise.resolve({ data: messages })),
        create: vi.fn(),
        prompt: vi.fn(),
        delete: vi.fn(),
      };
      const store = createFileContinuationStore(root);
      const context = { sessionID: "parent", messageID: "tool-1", directory: "/workspace", metadata: vi.fn() };

    await (createEnabledAdvisorTool(client, runner, new Map(), new Map(), new Map(), new Map(), store).execute as Function)({}, context);
      messages = [
        ...messages,
        { info: { id: "user-2", role: "user" }, parts: [{ type: "text", text: "New context" }] },
      ];
    await (createEnabledAdvisorTool(client, runner, new Map(), new Map(), new Map(), new Map(), store).execute as Function)({}, context);

      expect(runner).toHaveBeenNthCalledWith(2, expect.objectContaining({ resume: "claude-1", prompt: expect.stringContaining("New context") }));
      expect(runner.mock.calls[1]![0].prompt).not.toContain("Initial context");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("serializes concurrent Claude calls for the same parent session and target", async () => {
    vi.stubEnv("OPENCODE_ADVISOR_MODELS", "claude-code:fable@high");
    let messages: Array<{ info: { id: string; role: string; modelID?: string }; parts?: Array<Record<string, unknown>> }> = [
      { info: { id: "user-1", role: "user" }, parts: [{ type: "text", text: "Initial context" }] },
      { info: { id: "tool-1", role: "assistant", modelID: "gpt-5.6-luna" } },
    ];
    let resolveFirst!: (value: string) => void;
    const firstResponse = new Promise<string>((resolve) => {
      resolveFirst = resolve;
    });
    const runner = vi
      .fn()
      .mockImplementationOnce(() => firstResponse)
      .mockResolvedValueOnce(claudeResult("Second advice", "claude-2"));
    const client = {
      get: vi.fn().mockResolvedValue({ data: {} }),
      messages: vi.fn().mockImplementation(() => Promise.resolve({ data: messages })),
      create: vi.fn(),
      prompt: vi.fn(),
      delete: vi.fn(),
    };
    const tool = createEnabledAdvisorTool(client, runner, new Map(), new Map());
    const first = (tool.execute as Function)(
      {},
      { sessionID: "parent", messageID: "tool-1", directory: "/workspace", metadata: vi.fn() },
    );
    await vi.waitFor(() => expect(runner).toHaveBeenCalledTimes(1));

    const second = (tool.execute as Function)(
      {},
      { sessionID: "parent", messageID: "tool-2", directory: "/workspace", metadata: vi.fn() },
    );
    await vi.waitFor(() => expect(client.messages).toHaveBeenCalledTimes(3));
    expect(runner).toHaveBeenCalledTimes(1);

    messages = [
      ...messages,
      { info: { id: "user-2", role: "user" }, parts: [{ type: "text", text: "Later context" }] },
      { info: { id: "tool-2", role: "assistant", modelID: "gpt-5.6-luna" } },
    ];

    resolveFirst(claudeResult("First advice", "claude-1"));
    await first;
    await second;

    expect(runner).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ resume: "claude-1", prompt: expect.stringContaining("Later context") }),
    );
  });

  it("starts a fresh Claude session when the completed parent compaction epoch changes", async () => {
    vi.stubEnv("OPENCODE_ADVISOR_MODELS", "claude-code:fable@high");
    let messages = [
      { info: { id: "old", role: "user" }, parts: [{ type: "text", text: "Old raw context" }] },
      { info: { id: "compaction-1", role: "user" }, parts: [{ type: "compaction" }] },
      {
        info: { id: "summary-1", role: "assistant", parentID: "compaction-1", summary: true, finish: "stop" },
        parts: [{ type: "text", text: "First summary" }],
      },
      { info: { id: "recent-1", role: "user" }, parts: [{ type: "text", text: "First recent context" }] },
      { info: { id: "tool-1", role: "assistant", modelID: "gpt-5.6-luna" } },
    ];
    const runner = vi
      .fn()
      .mockResolvedValueOnce(claudeResult("First advice", "claude-1"))
      .mockResolvedValueOnce(claudeResult("Second advice", "claude-2"));
    const client = {
      get: vi.fn().mockResolvedValue({ data: {} }),
      messages: vi.fn().mockImplementation(() => Promise.resolve({ data: messages })),
      create: vi.fn(),
      prompt: vi.fn(),
      delete: vi.fn(),
    };
    const tool = createEnabledAdvisorTool(client, runner, new Map());

    await (tool.execute as Function)(
      {},
      { sessionID: "parent", messageID: "tool-1", directory: "/workspace", metadata: vi.fn() },
    );
    messages = [
      ...messages,
      { info: { id: "compaction-2", role: "user" }, parts: [{ type: "compaction" }] },
      {
        info: { id: "summary-2", role: "assistant", parentID: "compaction-2", summary: true, finish: "stop" },
        parts: [{ type: "text", text: "Second summary" }],
      },
      { info: { id: "recent-2", role: "user" }, parts: [{ type: "text", text: "Second recent context" }] },
      { info: { id: "tool-2", role: "assistant", modelID: "gpt-5.6-luna" } },
    ];
    await (tool.execute as Function)(
      {},
      { sessionID: "parent", messageID: "tool-2", directory: "/workspace", metadata: vi.fn() },
    );

    expect(runner).toHaveBeenNthCalledWith(1, expect.objectContaining({ prompt: expect.stringContaining("First summary") }));
    expect(runner).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ prompt: expect.stringContaining("Second summary") }),
    );
    expect(runner.mock.calls[1]![0]).not.toHaveProperty("resume");
    expect(runner.mock.calls[1]![0].prompt).not.toContain("First summary");
  });
});
