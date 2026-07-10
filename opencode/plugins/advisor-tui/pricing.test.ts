import { afterEach, describe, expect, it, vi } from "vitest";

import { advisorCost } from "./pricing.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("advisorCost", () => {
  it("prices input, output plus reasoning, and cache tokens independently", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          openai: {
            models: {
              "gpt-test": { name: "GPT Test", cost: { input: 1, output: 2, cache_read: 3, cache_write: 4 } },
              "gpt-tier": {
                name: "GPT Tier",
                cost: { input: 1, output: 2, cache_read: 3, cache_write: 4 },
                tiers: [{ tier: { type: "context", size: 1_000_000 }, input: 2, output: 4, cache_read: 6, cache_write: 8 }]
              }
            }
          }
        })
      })
    );

    await expect(
      advisorCost([
        {
          model: { providerID: "openai", modelID: "gpt-test", variant: "high" },
          usage: { input: 1_000_000, output: 1_000_000, reasoning: 1_000_000, cacheRead: 1_000_000, cacheWrite: 1_000_000 }
        },
        { model: { providerID: "unknown", modelID: "missing" }, usage: { total: 100 } },
        {
          model: { providerID: "openai", modelID: "gpt-tier" },
          usage: { input: 1_000_000, output: 1_000_000, reasoning: 1_000_000, cacheRead: 1_000_000, cacheWrite: 1_000_000 }
        }
      ])
    ).resolves.toEqual({ amount: 36, pricedCalls: 2, totalCalls: 3, latestModel: "GPT Tier" });
  });
});
