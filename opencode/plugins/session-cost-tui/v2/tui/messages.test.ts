import { describe, expect, it } from "vitest";

import { loadFamilyMessages, loadSessionMessages, pricingUsage } from "./messages.js";

describe("pricingUsage", () => {
  it("adapts a completed current V2 assistant message", () => {
    expect(pricingUsage({
      type: "assistant",
      model: { providerID: "openai", id: "gpt-test", variant: "high" },
      time: { completed: 123 },
      tokens: { input: 10, output: 4, reasoning: 2, cache: { read: 3, write: 1 } }
    })).toEqual({
      providerID: "openai",
      modelID: "gpt-test",
      variant: "high",
      tokens: { input: 10, output: 4, reasoning: 2, cacheRead: 3, cacheWrite: 1 }
    });
  });

  it("rejects legacy and incomplete shapes", () => {
    expect(pricingUsage({ type: "user" })).toBeUndefined();
    expect(pricingUsage({ type: "assistant", time: { completed: 1 }, tokens: {}, model: {} })).toBeUndefined();
    expect(pricingUsage({ role: "assistant", providerID: "openai", modelID: "gpt-test" } as never)).toBeUndefined();
  });

  it("loads every message page using the official opaque cursor", async () => {
    const calls: unknown[] = [];
    const client = {
      message: {
        async list(input: unknown) {
          calls.push(input);
          return calls.length === 1
            ? { data: [{ type: "user" }, { type: "assistant" }], cursor: { next: "page-2" } }
            : { data: [{ type: "assistant" }], cursor: {} };
        }
      }
    };
    const messages = await loadSessionMessages(client as never, "family-child");
    expect(messages).toHaveLength(3);
    expect(calls).toEqual([
      { sessionID: "family-child", limit: 200, order: "asc" },
      { sessionID: "family-child", limit: 200, cursor: "page-2" }
    ]);
  });

  it("fails rather than silently returning an incomplete repeated page", async () => {
    const client = {
      message: { list: async () => ({ data: [], cursor: { next: "same" } }) }
    };
    await expect(loadSessionMessages(client as never, "one")).rejects.toThrow("repeated cursor");
  });

  it("loads complete pages for every currently known family session", async () => {
    const calls: string[] = [];
    const client = {
      message: {
        async list(input: { sessionID: string; cursor?: string }) {
          calls.push(`${input.sessionID}:${input.cursor ?? "first"}`);
          return input.cursor
            ? { data: [{ type: "assistant" }], cursor: {} }
            : { data: [{ type: "user" }], cursor: { next: `${input.sessionID}-next` } };
        }
      }
    };
    expect(await loadFamilyMessages(client as never, ["root", "child"])).toHaveLength(4);
    expect(calls).toEqual(["root:first", "child:first", "root:root-next", "child:child-next"]);
  });
});
