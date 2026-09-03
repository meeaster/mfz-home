import type { Plugin } from "@opencode-ai/plugin";
import { describe, expect, it, vi } from "vitest";

import { appendUsageContent, setupSubagentUsage, summarizeUsage, usageTag } from "./server.js";
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

function createSetupFixture(source: EventSource = createEventStream()) {
  const hooks = new Map<HookName, Hook>();
  const disposed: HookName[] = [];
  let signal: AbortSignal | undefined;
  const model = { providerID: "openai", id: "model" } satisfies ModelRef;
  const contextFixture = {
    event: {
      subscribe(options?: EventSubscribeOptions) {
        signal = options?.signal;
        return source.subscribe(options);
      },
    },
    session: {
      get: async () => ({ tokens: zeroTokens() }),
    },
    tool: {
      hook: async (name: HookName, callback: Hook) => {
        hooks.set(name, callback);
        return { dispose: async () => disposed.push(name) };
      },
    },
  };
  // SAFETY: The fixture implements the event, session, and tool methods used by setupSubagentUsage.
  const context = Object.assign(Object.create(null), contextFixture) as Plugin.Context;
  return { context, events: source, hooks, disposed, model, get signal() { return signal; } };
}

const catalog: Catalog = {
  openai: {
    models: {
      model: { cost: { input: 1, output: 2, cache_read: 3, cache_write: 4 } },
    },
  },
};

describe("subagent usage V2", () => {
  it("registers hooks, augments completed results, and awaits cleanup", async () => {
    const fixture = createSetupFixture();
    const cleanup = await setupSubagentUsage(fixture.context, async () => catalog);

    expect(fixture.signal).toBeInstanceOf(AbortSignal);
    expect([...fixture.hooks.keys()]).toEqual(["execute.before", "execute.after"]);

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
      'child output\n<subagent-usage invocation-cost-usd="0.00232" session-cost-usd="0.00232" current-context-tokens="1300" />',
    );
    await cleanup();
    expect(fixture.signal?.aborted).toBe(true);
    expect(fixture.events.returnCalls).toBe(1);
    expect(fixture.disposed).toEqual(["execute.before", "execute.after"]);
  });

  it("closes the old iterator so a reload leaves one event consumer", async () => {
    const source = createEventHub();
    const first = createSetupFixture(source);
    const firstCleanup = await setupSubagentUsage(first.context, async () => catalog);
    const firstStream = source.streams.at(0);
    if (!firstStream) throw new Error("first event stream was not created");

    await firstCleanup();
    expect(firstStream.returnCalls).toBe(1);

    const second = createSetupFixture(source);
    const secondCleanup = await setupSubagentUsage(second.context, async () => catalog);
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
    expect(afterEvent.result.content).toContain('<subagent-usage invocation-cost-usd="0.00232"');
    await secondCleanup();
  });

  it("surfaces an unexpected event consumer failure during cleanup", async () => {
    const fixture = createSetupFixture();
    const cleanup = await setupSubagentUsage(fixture.context, async () => catalog);
    const failure = new Error("event stream failed");
    const diagnostic = vi.spyOn(console, "error").mockImplementation(() => {});
    fixture.events.fail(failure);

    try {
      await new Promise((resolve) => setImmediate(resolve));
      expect(diagnostic).toHaveBeenCalledWith("[subagent-usage] event stream failed", failure);
      await expect(cleanup()).rejects.toBe(failure);
      expect(fixture.disposed).toEqual(["execute.before", "execute.after"]);
    } finally {
      diagnostic.mockRestore();
    }
  });

  it("reports invocation and session cost without repeating the child session ID", () => {
    expect(usageTag(0.0123, 0.0847, 12_640)).toBe(
      '<subagent-usage invocation-cost-usd="0.0123" session-cost-usd="0.0847" current-context-tokens="12640" />',
    );
  });

  it("appends usage to the text-part content returned by the built-in subagent", () => {
    expect(appendUsageContent([{ type: "text", text: "child output" }], "<subagent-usage />")).toEqual([
      { type: "text", text: "child output" },
      { type: "text", text: "<subagent-usage />" },
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
      currentContext: 52_500,
    });
  });
});
