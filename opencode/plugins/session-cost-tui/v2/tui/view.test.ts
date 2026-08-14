import type { Context } from "@opencode-ai/plugin/tui/plugin";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { CostEstimate } from "./pricing.js";
import { createCostLifecycle } from "./lifecycle.js";
import { catalogRenderState } from "./render-state.js";

type Handler = (event: { data: Record<string, unknown> }) => void;

function harness(estimate: (context: Context, sessionID: string) => Promise<CostEstimate>) {
  const handlers = new Map<string, Handler>();
  const cleanups: string[] = [];
  const state: { estimate?: CostEstimate; error?: string } = {};
  let sessionID = "one";
  let family = ["one", "child"];
  const context = {
    data: {
      on(type: string, handler: Handler) {
        handlers.set(type, handler);
        return () => cleanups.push(type);
      },
      session: {
        family: (id: string) => id === "one" ? family : ["two"],
        message: { list: () => [] }
      }
    }
  } as unknown as Context;
  const lifecycle = createCostLifecycle({
    context,
    sessionID: () => sessionID,
    estimate,
    delay: 10,
    setEstimate: (value) => { state.estimate = value; },
    setError: (value) => { state.error = value; }
  });
  return {
    handlers,
    cleanups,
    state,
    lifecycle,
    setFamily: (value: string[]) => { family = value; },
    setSessionID: (value: string) => { sessionID = value; }
  };
}

const result = (amount: number): CostEstimate => ({ costs: [{ model: "test", amount }], unpriced: 0 });
const deferred = <Value>() => {
  let resolve!: (value: Value) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<Value>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

describe("session cost lifecycle", () => {
  afterEach(() => vi.useRealTimers());

  it("clears old state and refreshes a reactive session change", async () => {
    vi.useFakeTimers();
    const calls: string[] = [];
    const test = harness(async (_context, id) => { calls.push(id); return result(id === "one" ? 1 : 2); });
    test.lifecycle.refresh("one");
    await vi.advanceTimersByTimeAsync(10);
    expect(test.state.estimate).toEqual(result(1));
    test.setSessionID("two");
    test.lifecycle.refresh("two");
    expect(test.state).toEqual({ estimate: undefined, error: undefined });
    await vi.advanceTimersByTimeAsync(10);
    expect(calls).toEqual(["one", "two"]);
    expect(test.state).toMatchObject({ estimate: result(2) });
  });

  it("suppresses stale async completion", async () => {
    vi.useFakeTimers();
    const first = deferred<CostEstimate>();
    const test = harness((_context, id) => id === "one" ? first.promise : Promise.resolve(result(2)));
    test.lifecycle.refresh("one");
    await vi.advanceTimersByTimeAsync(10);
    test.setSessionID("two");
    test.lifecycle.refresh("two");
    await vi.advanceTimersByTimeAsync(10);
    first.resolve(result(1));
    await Promise.resolve();
    expect(test.state.estimate).toEqual(result(2));
  });

  it("keeps the last estimate visible during same-session refreshes", async () => {
    vi.useFakeTimers();
    const next = deferred<CostEstimate>();
    let calls = 0;
    const test = harness(async () => ++calls === 1 ? result(1) : next.promise);
    test.lifecycle.refresh();
    await vi.advanceTimersByTimeAsync(10);
    expect(test.state.estimate).toEqual(result(1));
    test.handlers.get("session.usage.updated")?.({ data: { sessionID: "one" } });
    expect(test.state.estimate).toEqual(result(1));
    await vi.advanceTimersByTimeAsync(10);
    expect(test.state.estimate).toEqual(result(1));
    next.resolve(result(2));
    await vi.runAllTimersAsync();
    expect(test.state.estimate).toEqual(result(2));
  });

  it("invalidates on public transcript and family events", async () => {
    vi.useFakeTimers();
    const estimate = vi.fn(async () => result(1));
    const test = harness(estimate);
    for (const type of ["session.usage.updated", "session.execution.succeeded", "session.revert.committed"]) {
      test.handlers.get(type)?.({ data: { sessionID: "child" } });
      await vi.advanceTimersByTimeAsync(10);
    }
    test.handlers.get("session.created")?.({ data: { sessionID: "new", parentID: "one" } });
    await vi.advanceTimersByTimeAsync(10);
    test.handlers.get("session.forked")?.({ data: { sessionID: "fork", parentID: "one" } });
    await vi.advanceTimersByTimeAsync(10);
    test.handlers.get("session.deleted")?.({ data: { sessionID: "child" } });
    await vi.advanceTimersByTimeAsync(10);
    expect(estimate).toHaveBeenCalledTimes(6);
  });

  it("invalidates when a child is removed before the deletion listener runs", async () => {
    vi.useFakeTimers();
    const estimate = vi.fn(async () => result(1));
    const test = harness(estimate);
    test.lifecycle.refresh();
    await vi.advanceTimersByTimeAsync(10);
    test.setFamily(["one"]);
    test.handlers.get("session.deleted")?.({ data: { sessionID: "child" } });
    await vi.advanceTimersByTimeAsync(10);
    expect(estimate).toHaveBeenCalledTimes(2);
  });

  it("recomputes the current transcript estimate after a revert", async () => {
    vi.useFakeTimers();
    const estimate = vi.fn(async () => result(1));
    const test = harness(estimate);
    test.lifecycle.refresh();
    await vi.advanceTimersByTimeAsync(10);
    test.handlers.get("session.revert.committed")?.({ data: { sessionID: "one" } });
    await vi.advanceTimersByTimeAsync(10);
    expect(estimate).toHaveBeenCalledTimes(2);
  });

  it("cleans up listeners and pending work", async () => {
    vi.useFakeTimers();
    const estimate = vi.fn(async () => result(1));
    const test = harness(estimate);
    test.lifecycle.refresh();
    test.lifecycle.cleanup();
    await vi.runAllTimersAsync();
    expect(estimate).not.toHaveBeenCalled();
    expect(test.cleanups).toHaveLength(6);
  });

  it("never leaves a prior estimate current after failure", async () => {
    vi.useFakeTimers();
    let fail = false;
    const test = harness(async () => {
      if (fail) throw new Error("offline");
      return result(1);
    });
    test.lifecycle.refresh();
    await vi.advanceTimersByTimeAsync(10);
    expect(test.state.estimate).toEqual(result(1));
    fail = true;
    test.lifecycle.refresh();
    expect(test.state.estimate).toEqual(result(1));
    await vi.advanceTimersByTimeAsync(10);
    expect(test.state).toMatchObject({ estimate: undefined, error: "offline" });
  });

  it("renders an error state instead of a simultaneous loading state", () => {
    expect(catalogRenderState(undefined, "offline")).toEqual({ type: "error", message: "offline" });
    expect(catalogRenderState(undefined, undefined)).toEqual({ type: "loading" });
  });
});
