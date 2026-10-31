import type { Plugin } from "@opencode/plugin";
import { describe, expect, it, vi } from "vitest";

import sessionUsagePlugin, { appendUsageContent, setupSessionUsage, summarizeUsage, totalTokens, usageTag } from "./server.js";
import type { Catalog, ModelRef, Tokens } from "./pricing.js";

type HookName = "execute.before" | "execute.after";

type HookEvent =
  | { tool: string; id: string; input: unknown }
  | {
      tool: string;
      id: string;
      input: unknown;
      status: "completed";
      result: { content?: string; metadata?: { sessionID?: string; status?: string } };
    }
  | { tool: string; id: string; input: unknown; status: "error"; error: unknown };

type Hook = (event: HookEvent) => Promise<void> | void;

type RegisteredTool = {
  name: string;
  execute: (input: { sessionID?: string }, context: { sessionID: string }) => Promise<{ content?: string }>;
};

type TestFailure = Error;

type TestEvent =
  | {
      type: "session.step.started";
      data: { sessionID: string; assistantMessageID: string; model: ModelRef };
    }
  | {
      type: "session.step.ended";
      data: { sessionID: string; assistantMessageID: string; tokens: Tokens; cost: number };
    }
  | {
      type: "session.step.failed";
      data: { sessionID: string; assistantMessageID: string; tokens?: Tokens; cost?: number };
    }
  | { type: "session.usage.updated"; data: { sessionID: string; tokens: Tokens } };

type EventSubscribeOptions = { readonly signal?: AbortSignal };

type EventSource = {
  subscribe(options?: EventSubscribeOptions): AsyncIterable<TestEvent>;
  push(value: TestEvent): void;
  fail(error: TestFailure): void;
  close(): void;
  readonly returnCalls: number;
  readonly delivered: number;
};

type SessionFixture = {
  id: string;
  parentID?: string;
  model?: ModelRef;
  tokens?: Tokens;
  cost?: number;
};

function createEventStream() {
  type Pending = {
    resolve: (result: IteratorResult<TestEvent>) => void;
    reject: (reason?: TestFailure) => void;
  };

  const queue: TestEvent[] = [];
  const pending: Pending[] = [];
  let closed = false;
  let failed = false;
  let failure: unknown;
  let returnCalls = 0;
  let delivered = 0;
  const done = (): IteratorResult<TestEvent> => ({ done: true, value: undefined });

  const close = () => {
    closed = true;
    queue.splice(0);
    pending.splice(0).forEach((request) => request.resolve(done()));
  };

  const iterator = {
    next() {
      const value = queue.shift();

      if (value) {
        delivered += 1;

        return Promise.resolve({ done: false as const, value });
      }

      if (failed) return Promise.reject(failure);

      if (closed) return Promise.resolve(done());
      const request = Promise.withResolvers<IteratorResult<TestEvent>>();
      pending.push(request);

      return request.promise;
    },
    return() {
      returnCalls += 1;
      close();

      return Promise.resolve(done());
    },
  };

  const iterable: AsyncIterable<TestEvent> = { [Symbol.asyncIterator]: () => iterator };

  return {
    iterable,
    subscribe(options?: EventSubscribeOptions) {
      options?.signal?.addEventListener("abort", close, { once: true });

      return iterable;
    },
    push(value: TestEvent) {
      const request = pending.shift();

      if (request) {
        delivered += 1;
        request.resolve({ done: false, value });

        return;
      }

      if (!closed && !failed) queue.push(value);
    },
    fail(error: TestFailure) {
      failed = true;
      failure = error;
      pending.splice(0).forEach((request) => request.reject(error));
    },
    close,
    get returnCalls() {
      return returnCalls;
    },
    get delivered() {
      return delivered;
    },
  };
}

function createEventHub() {
  const streams: Array<ReturnType<typeof createEventStream>> = [];

  return {
    subscribe(options?: EventSubscribeOptions) {
      const stream = createEventStream();
      streams.push(stream);
      options?.signal?.addEventListener("abort", stream.close, { once: true });

      return stream.iterable;
    },
    push(value: TestEvent) {
      streams.forEach((stream) => stream.push(value));
    },
    fail(error: TestFailure) {
      streams.forEach((stream) => stream.fail(error));
    },
    close() {
      streams.forEach((stream) => stream.close());
    },
    get returnCalls() {
      return streams.reduce((total, stream) => total + stream.returnCalls, 0);
    },
    get delivered() {
      return streams.reduce((total, stream) => total + stream.delivered, 0);
    },
    get streams() {
      return streams;
    },
  } satisfies EventSource & { readonly streams: readonly ReturnType<typeof createEventStream>[] };
}

function zeroTokens(): Tokens {
  return { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } };
}

function createSetupFixture(
  source: EventSource = createEventStream(),
  sessionFixtures: readonly SessionFixture[] = [{ id: "child", tokens: zeroTokens() }],
  modelMetadata: { limit?: { context?: number } } | undefined = { limit: { context: 128_000 } },
) {
  const hooks = new Map<HookName, Hook>();
  const disposed: string[] = [];
  let signal: AbortSignal | undefined;
  let registeredTool: RegisteredTool | undefined;
  const model = { providerID: "openai", id: "model" } satisfies ModelRef;
  const sessions = new Map(sessionFixtures.map((session) => [session.id, session]));

  const contextFixture = {
    event: {
      subscribe(options?: EventSubscribeOptions) {
        signal = options?.signal;

        return source.subscribe(options);
      },
    },
    session: {
      get: async ({ sessionID }: { sessionID: string }) => {
        const session = sessions.get(sessionID);

        if (!session) throw new Error(`Unknown session ${sessionID}`);

        return session;
      },
    },
    model: {
      list: async () => ({ data: modelMetadata ? [{ providerID: "openai", id: "model", modelID: "model", ...modelMetadata }] : [] }),
    },
    tool: {
      transform: async (callback: (editor: { add(tool: RegisteredTool): void }) => void) => {
        callback({ add: (tool) => { registeredTool = tool; } });

        return { dispose: async () => disposed.push("session_usage") };
      },
      hook: async (name: HookName, callback: Hook) => {
        hooks.set(name, callback);

        return { dispose: async () => disposed.push(name) };
      },
    },
  };

  // SAFETY: The fixture implements the event, session, model, and tool methods used by setupSessionUsage.
  const context = Object.assign(Object.create(null), contextFixture) as Plugin.Context;

  return {
    context,
    events: source,
    hooks,
    disposed,
    model,
    sessions,
    get tool() {
      return registeredTool;
    },
    get signal() { return signal; },
  };
}

const catalog: Catalog = {
  openai: {
    models: {
      model: { cost: { input: 1, output: 2, cache_read: 3, cache_write: 4 } },
    },
  },
};

async function waitForEvents() {
  await new Promise((resolve) => setImmediate(resolve));
}

describe("session usage V2", () => {
  it("uses the plain session-usage runtime identity", () => {
    expect(sessionUsagePlugin.id).toBe("session-usage");
  });

  it("registers hooks, augments completed results, and awaits cleanup", async () => {
    const fixture = createSetupFixture();
    const cleanup = await setupSessionUsage(fixture.context, async () => catalog);

    expect(fixture.signal).toBeInstanceOf(AbortSignal);
    expect([...fixture.hooks.keys()]).toEqual(["execute.before", "execute.after"]);
    expect(fixture.tool?.name).toBe("session_usage");

    const before = fixture.hooks.get("execute.before");
    const after = fixture.hooks.get("execute.after");
    expect(before).toBeDefined();
    expect(after).toBeDefined();
    await before!({ tool: "subagent", id: "call", input: { sessionID: "child" } });
    fixture.events.push({
      type: "session.step.started",
      data: { sessionID: "child", assistantMessageID: "message", model: fixture.model },
    });
    fixture.events.push({
      type: "session.step.ended",
      data: {
        sessionID: "child",
        assistantMessageID: "message",
        tokens: { input: 1_000, output: 200, reasoning: 10, cache: { read: 300, write: 0 } },
        cost: 0,
      },
    });
    fixture.events.push({
      type: "session.usage.updated",
      data: {
        sessionID: "child",
        tokens: { input: 1_000, output: 200, reasoning: 10, cache: { read: 300, write: 0 } },
      },
    });

    const afterEvent = {
      tool: "subagent",
      id: "call",
      input: { sessionID: "child" },
      status: "completed" as const,
      result: { content: "child output", metadata: { sessionID: "child", status: "completed" } },
    };

    await after!(afterEvent);

    expect(afterEvent.result.content).toBe(
      'child output\n<session-usage invocation-tokens="1510" invocation-cost-usd="0.00232" session-tokens="1510" session-cost-usd="0.00232" last-input-tokens="1300" />',
    );
    await cleanup();
    expect(fixture.signal?.aborted).toBe(true);
    expect(fixture.events.returnCalls).toBe(1);
    expect(fixture.disposed).toEqual(["session_usage", "execute.before", "execute.after"]);
  });

  it("closes the old iterator so a reload leaves one event consumer", async () => {
    const source = createEventHub();
    const first = createSetupFixture(source);
    const firstCleanup = await setupSessionUsage(first.context, async () => catalog);
    const firstStream = source.streams.at(0);

    if (!firstStream) throw new Error("first event stream was not created");

    await firstCleanup();
    expect(firstStream.returnCalls).toBe(1);

    const second = createSetupFixture(source);
    const secondCleanup = await setupSessionUsage(second.context, async () => catalog);
    const secondStream = source.streams.at(1);

    if (!secondStream) throw new Error("second event stream was not created");
    const before = second.hooks.get("execute.before");
    const after = second.hooks.get("execute.after");
    expect(before).toBeDefined();
    expect(after).toBeDefined();
    await before!({ tool: "subagent", id: "call", input: { sessionID: "child" } });
    source.push({
      type: "session.step.started",
      data: { sessionID: "child", assistantMessageID: "message", model: second.model },
    });
    source.push({
      type: "session.step.ended",
      data: {
        sessionID: "child",
        assistantMessageID: "message",
        tokens: { input: 1_000, output: 200, reasoning: 10, cache: { read: 300, write: 0 } },
        cost: 0,
      },
    });
    source.push({
      type: "session.usage.updated",
      data: {
        sessionID: "child",
        tokens: { input: 1_000, output: 200, reasoning: 10, cache: { read: 300, write: 0 } },
      },
    });

    const afterEvent = {
      tool: "subagent",
      id: "call",
      input: { sessionID: "child" },
      status: "completed" as const,
      result: { content: "child output", metadata: { sessionID: "child", status: "completed" } },
    };

    await after!(afterEvent);

    expect(firstStream.delivered).toBe(0);
    expect(secondStream.delivered).toBe(3);
    expect(afterEvent.result.content).toContain('<session-usage invocation-tokens="1510"');
    await secondCleanup();
  });

  it("surfaces an unexpected event consumer failure during cleanup", async () => {
    const fixture = createSetupFixture();
    const cleanup = await setupSessionUsage(fixture.context, async () => catalog);
    const failure = new Error("event stream failed");
    const diagnostic = vi.spyOn(console, "error").mockImplementation(() => {});
    fixture.events.fail(failure);

    try {
      await new Promise((resolve) => setImmediate(resolve));
      expect(diagnostic).toHaveBeenCalledWith("[session-usage] event stream failed", failure);
      await expect(cleanup()).rejects.toBe(failure);
      expect(fixture.disposed).toEqual(["session_usage", "execute.before", "execute.after"]);
    } finally {
      diagnostic.mockRestore();
    }
  });

  it("reports invocation and session cost without repeating the child session ID", () => {
    expect(usageTag(12_640, 0.0123, 84_700, 0.0847, 12_640)).toBe(
      '<session-usage invocation-tokens="12640" invocation-cost-usd="0.0123" session-tokens="84700" session-cost-usd="0.0847" last-input-tokens="12640" />',
    );
  });

  it("appends usage to the text-part content returned by the built-in subagent", () => {
    expect(appendUsageContent([{ type: "text", text: "child output" }], "<session-usage />")).toEqual([
      { type: "text", text: "child output" },
      { type: "text", text: "<session-usage />" },
    ]);
  });

  it("sums invocation steps while using the latest step for current context", () => {
    expect(
      summarizeUsage([
        {
          sessionID: "ses_child",
          model: { providerID: "openai", id: "model" },
          tokens: { input: 10_000, output: 2_000, reasoning: 0, cache: { read: 20_000, write: 0 } },
          step: true,
        },
        {
          sessionID: "ses_child",
          model: { providerID: "openai", id: "model" },
          tokens: { input: 12_000, output: 1_000, reasoning: 50, cache: { read: 40_000, write: 500 } },
          step: true,
        },
      ]),
    ).toEqual({
      tokens: {
        input: 22_000,
        output: 3_000,
        reasoning: 50,
        cache: { read: 60_000, write: 500 },
      },
      lastInput: 52_500,
    });

    expect(totalTokens({ input: 22_000, output: 3_000, reasoning: 50, cache: { read: 60_000, write: 500 } })).toBe(85_550);
  });

  it("leaves failed, background, incomplete, and ambiguous results unchanged", async () => {
    const fixture = createSetupFixture(createEventStream(), [
      { id: "child", tokens: zeroTokens() },
      { id: "background", tokens: zeroTokens() },
      { id: "incomplete", tokens: zeroTokens() },
      { id: "ambiguous", tokens: zeroTokens() },
    ]);

    const cleanup = await setupSessionUsage(fixture.context, async () => catalog);
    const before = fixture.hooks.get("execute.before");
    const after = fixture.hooks.get("execute.after");

    await before!({ tool: "subagent", id: "failed-call", input: { sessionID: "child" } });
    await after!({ tool: "subagent", id: "failed-call", input: {}, status: "error", error: new Error("failed") });

    await before!({ tool: "subagent", id: "background-call", input: { sessionID: "background" } });

    const background = {
      tool: "subagent",
      id: "background-call",
      input: { sessionID: "background" },
      status: "completed" as const,
      result: { content: "running", metadata: { sessionID: "background", status: "running" } },
    };

    await after!(background);

    await before!({ tool: "subagent", id: "incomplete-call", input: { sessionID: "incomplete" } });

    const incomplete = {
      tool: "subagent",
      id: "incomplete-call",
      input: { sessionID: "incomplete" },
      status: "completed" as const,
      result: { content: "partial" },
    };

    await after!(incomplete);

    await before!({ tool: "subagent", id: "ambiguous-a", input: { sessionID: "ambiguous" } });
    await before!({ tool: "subagent", id: "ambiguous-b", input: { sessionID: "ambiguous" } });

    const ambiguousA = {
      tool: "subagent",
      id: "ambiguous-a",
      input: { sessionID: "ambiguous" },
      status: "completed" as const,
      result: { content: "first", metadata: { sessionID: "ambiguous", status: "completed" } },
    };

    const ambiguousB = {
      tool: "subagent",
      id: "ambiguous-b",
      input: { sessionID: "ambiguous" },
      status: "completed" as const,
      result: { content: "second", metadata: { sessionID: "ambiguous", status: "completed" } },
    };

    await after!(ambiguousA);
    await after!(ambiguousB);

    expect(background.result.content).toBe("running");
    expect(incomplete.result.content).toBe("partial");
    expect(ambiguousA.result.content).toBe("first");
    expect(ambiguousB.result.content).toBe("second");
    await cleanup();
  });

  it("reports a direct child through the model-visible tool with settled pricing", async () => {
    const model: ModelRef = { providerID: "openai", id: "model" };

    const fixture = createSetupFixture(
      createEventStream(),
      [
        { id: "caller", model, tokens: zeroTokens(), cost: 0.01 },
        { id: "child", parentID: "caller", model, tokens: zeroTokens(), cost: 0.09 },
      ],
      { limit: { context: 100_000 } },
    );

    const cleanup = await setupSessionUsage(fixture.context, async () => catalog);
    const before = fixture.hooks.get("execute.before");
    const after = fixture.hooks.get("execute.after");
    const tool = fixture.tool;

    expect(tool).toBeDefined();
    await before!({ tool: "subagent", id: "call", input: { sessionID: "child" } });
    fixture.events.push({
      type: "session.step.started",
      data: { sessionID: "child", assistantMessageID: "message", model },
    });
    fixture.events.push({
      type: "session.step.ended",
      data: {
        sessionID: "child",
        assistantMessageID: "message",
        tokens: { input: 1_000, output: 200, reasoning: 10, cache: { read: 300, write: 0 } },
        cost: 0,
      },
    });
    fixture.events.push({
      type: "session.usage.updated",
      data: {
        sessionID: "child",
        tokens: { input: 1_000, output: 200, reasoning: 10, cache: { read: 300, write: 0 } },
      },
    });

    const afterEvent = {
      tool: "subagent",
      id: "call",
      input: { sessionID: "child" },
      status: "completed" as const,
      result: { content: "child output", metadata: { sessionID: "child", status: "completed" } },
    };

    await after!(afterEvent);

    const child = fixture.sessions.get("child");

    if (!child) throw new Error("child session fixture was not created");
    child.tokens = { input: 1_000, output: 200, reasoning: 10, cache: { read: 300, write: 0 } };

    const result = await tool!.execute({ sessionID: "child" }, { sessionID: "caller" });

    expect(result.content).toContain("Direct child child");
    expect(result.content).toContain("Total: 1,510 tokens (input 1,000, output 200, reasoning 10, cache read 300, cache write 0)");
    expect(result.content).toContain("Cost: $0.00232 (settled plugin pricing)");
    expect(result.content).toContain("Last input: 1,300 tokens");
    expect(result.content).toContain("Model: openai/model");
    expect(result.content).toContain("Context limit: 100,000 tokens");
    expect(result.content).toContain("Approx. last input/context: 1.3%");
    await cleanup();
  });

  it("estimates caller cost from cumulative tokens before using recorded cost", async () => {
    const model: ModelRef = { providerID: "openai", id: "model" };

    const fixture = createSetupFixture(createEventStream(), [
      { id: "caller", model, tokens: { input: 1_000_000, output: 0, reasoning: 0, cache: { read: 0, write: 0 } }, cost: 0 },
    ]);

    const loadCatalogFn = vi.fn(async () => catalog);
    const cleanup = await setupSessionUsage(fixture.context, loadCatalogFn);

    const result = await fixture.tool!.execute({}, { sessionID: "caller" });

    expect(result.content).toContain("Cost: $1 (catalog estimate)");
    expect(loadCatalogFn).toHaveBeenCalledOnce();
    await cleanup();
  });

  it("uses the latest model reference for mode pricing and preserves its variant", async () => {
    const configuredModel: ModelRef = { providerID: "openai", id: "model" };
    const latestModel: ModelRef = { providerID: "openai", id: "model-fast", variant: "balanced" };

    const modeCatalog: Catalog = {
      openai: {
        models: {
          model: { cost: { input: 1 }, experimental: { modes: { fast: { cost: { input: 6 } } } } },
        },
      },
    };

    const fixture = createSetupFixture(createEventStream(), [
      {
        id: "caller",
        model: configuredModel,
        tokens: { input: 1_000_000, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
        cost: 0,
      },
    ]);

    const cleanup = await setupSessionUsage(fixture.context, async () => modeCatalog);
    fixture.events.push({
      type: "session.step.started",
      data: { sessionID: "caller", assistantMessageID: "message", model: latestModel },
    });
    await waitForEvents();

    const result = await fixture.tool!.execute({}, { sessionID: "caller" });

    expect(result.content).toContain("Cost: $6 (catalog estimate)");
    expect(result.content).toContain("Model: openai/model-fast#balanced");
    await cleanup();
  });

  it("falls back to recorded cost when catalog pricing is unavailable", async () => {
    const model: ModelRef = { providerID: "openai", id: "model" };

    const fixture = createSetupFixture(createEventStream(), [
      { id: "caller", model, tokens: { input: 1_000_000, output: 0, reasoning: 0, cache: { read: 0, write: 0 } }, cost: 0.004 },
    ]);

    const cleanup = await setupSessionUsage(fixture.context, async () => ({}));

    const result = await fixture.tool!.execute({}, { sessionID: "caller" });

    expect(result.content).toContain("Cost: $0.004 (OpenCode-recorded)");
    await cleanup();
  });

  it("falls back to recorded cost when the session has no model", async () => {
    const fixture = createSetupFixture(createEventStream(), [
      { id: "caller", tokens: { input: 1_000_000, output: 0, reasoning: 0, cache: { read: 0, write: 0 } }, cost: 0.004 },
    ]);

    const cleanup = await setupSessionUsage(fixture.context, async () => catalog);

    const result = await fixture.tool!.execute({}, { sessionID: "caller" });

    expect(result.content).toContain("Cost: $0.004 (OpenCode-recorded)");
    await cleanup();
  });

  it("defaults the tool to the caller session", async () => {
    const model: ModelRef = { providerID: "openai", id: "model" };
    const fixture = createSetupFixture(createEventStream(), [{ id: "caller", model, tokens: zeroTokens(), cost: 0.004 }]);
    const cleanup = await setupSessionUsage(fixture.context, async () => catalog);

    const result = await fixture.tool!.execute({}, { sessionID: "caller" });

    expect(result.content).toContain("Current session caller");
    expect(result.content).toContain("Cost: $0 (catalog estimate)");
    expect(result.content).toContain("Model: openai/model");
    await cleanup();
  });

  it("rejects unknown, parent, sibling, unrelated, and multi-level sessions", async () => {
    const fixture = createSetupFixture(createEventStream(), [
      { id: "caller", tokens: zeroTokens() },
      { id: "parent", tokens: zeroTokens() },
      { id: "child", parentID: "caller", tokens: zeroTokens() },
      { id: "sibling", parentID: "other", tokens: zeroTokens() },
      { id: "unrelated", parentID: "different", tokens: zeroTokens() },
      { id: "grandchild", parentID: "child", tokens: zeroTokens() },
    ]);

    const cleanup = await setupSessionUsage(fixture.context, async () => catalog);

    const targetIDs = ["unknown", "parent", "sibling", "unrelated", "grandchild"];

    const errors = await Promise.all(
      targetIDs.map(async (sessionID) => {
        try {
          await fixture.tool!.execute({ sessionID }, { sessionID: "caller" });

          return "resolved";
        } catch (error) {
          if (!(error instanceof Error)) throw error;

          return error.message;
        }
      }),
    );

    expect(errors).toEqual(targetIDs.map(() => "Unable to access session usage."));

    await cleanup();
  });

  it("omits unavailable optional metrics", async () => {
    const fixture = createSetupFixture(createEventStream(), [{ id: "caller" }], undefined);
    const cleanup = await setupSessionUsage(fixture.context, async () => catalog);

    const result = await fixture.tool!.execute({}, { sessionID: "caller" });

    expect(result.content).toBe("Current session caller");
    await cleanup();
  });
});
