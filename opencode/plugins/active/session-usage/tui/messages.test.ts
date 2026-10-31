import { describe, expect, it } from "vitest";

import { loadSessionMessages, pricingUsage } from "./messages.js";

describe("pricingUsage", () => {
  it("adapts a completed current V2 assistant message", () => {
    expect(
      pricingUsage({
        type: "assistant",
        model: { providerID: "openai", id: "gpt-test", variant: "high" },
        time: { completed: 123 },
        tokens: { input: 10, output: 4, reasoning: 2, cache: { read: 3, write: 1 } },
      }),
    ).toEqual({
      providerID: "openai",
      modelID: "gpt-test",
      variant: "high",
      tokens: { input: 10, output: 4, reasoning: 2, cacheRead: 3, cacheWrite: 1 },
    });
  });

  it("rejects legacy and incomplete shapes", () => {
    expect(pricingUsage({ type: "user" })).toBeUndefined();
    expect(
      pricingUsage({ type: "assistant", time: { completed: 1 }, tokens: {}, model: {} }),
    ).toBeUndefined();
    // SAFETY: This deliberately exercises the legacy shape at the untyped message boundary.
    expect(
      pricingUsage({ role: "assistant", providerID: "openai", modelID: "gpt-test" } as never),
    ).toBeUndefined();
  });

  it("loads every message page using the official opaque cursor", async () => {
    const calls: unknown[] = [];

    const client = {
      message: {
        async list(input: { sessionID: string; limit: number; order?: "asc"; cursor?: string }) {
          calls.push(input);

          return calls.length === 1
            ? { data: [{ type: "user" }, { type: "assistant" }], cursor: { next: "page-2" } }
            : { data: [{ type: "assistant" }], cursor: {} };
        },
      },
    };

    // SAFETY: The mock implements the subset of the generated client used by this test.
    const messages = await loadSessionMessages(client as never, "family-child");
    expect(messages).toHaveLength(3);
    expect(calls).toEqual([
      { sessionID: "family-child", limit: 200, order: "asc" },
      { sessionID: "family-child", limit: 200, cursor: "page-2" },
    ]);
  });

  it("fails rather than silently returning an incomplete repeated page", async () => {
    const client = {
      message: { list: async () => ({ data: [], cursor: { next: "same" } }) },
    };

    // SAFETY: The mock implements the subset of the generated client used by this test.
    await expect(loadSessionMessages(client as never, "one")).rejects.toThrow("repeated cursor");
  });
});
