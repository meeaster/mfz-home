import { describe, expect, it } from "vitest";

import type { SessionMessage } from "./messages.js";
import { sessionUsage } from "./usage.js";

const step = (id: string, input: number, read: number, write = 0): SessionMessage => ({
  id,
  type: "assistant",
  model: { providerID: "openai", id: "gpt-6-luna", variant: "high" },
  time: { created: 0, completed: 1 },
  tokens: { input, output: 100, reasoning: 0, cache: { read, write } }
});

const compaction: SessionMessage = { id: "compaction", type: "compaction", status: "completed" };

describe("session usage", () => {
  it("totals the session's input and reports its latest step and context", () => {
    expect(sessionUsage([step("a", 10_000, 0, 2_000), step("b", 1_000, 11_000)])).toEqual({
      input: { uncached: 13_000, cached: 11_000 },
      lastStep: { uncached: 1_000, cached: 11_000 },
      context: { tokens: 12_100, providerID: "openai", modelID: "gpt-6-luna", variant: "high" }
    });
  });

  it("counts context only from steps after the latest compaction, and input from the whole session", () => {
    const usage = sessionUsage([step("a", 10_000, 50_000), compaction]);

    expect(usage.context).toBeUndefined();
    expect(usage.input).toEqual({ uncached: 10_000, cached: 50_000 });
  });

  it("counts a step in progress toward context but not toward input until it completes", () => {
    const usage = sessionUsage([step("a", 1_000, 0), { ...step("b", 500, 1_000), time: { created: 0 } }]);

    expect(usage.context?.tokens).toBe(1_600);
    expect(usage.input).toEqual({ uncached: 1_000, cached: 0 });
  });

  it("leaves out messages a revert removed", () => {
    const usage = sessionUsage([step("a", 1_000, 0), step("b", 9_000, 90_000)], "b");

    expect(usage.input).toEqual({ uncached: 1_000, cached: 0 });
    expect(usage.context?.tokens).toBe(1_100);
  });
});
