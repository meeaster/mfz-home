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
                cost: {
                  input: 1,
                  output: 2,
                  cache_read: 3,
                  cache_write: 4,
                  tiers: [{ tier: { type: "context", size: 1_000_000 }, input: 2, output: 4, cache_read: 6, cache_write: 8 }]
                }
              }
            }
          }
        })
      })
    );

    await expect(
      advisorCost([
        {
          harness: "opencode",
          key: "opencode:openai:gpt-test:high",
          label: "gpt-test @ high",
          model: { providerID: "openai", modelID: "gpt-test", variant: "high" },
          usage: { input: 1_000_000, output: 1_000_000, reasoning: 1_000_000, cacheRead: 1_000_000, cacheWrite: 1_000_000, cost: 0 }
        },
        {
          harness: "opencode",
          key: "opencode:unknown:missing:",
          label: "missing",
          model: { providerID: "unknown", modelID: "missing" },
          reportedCost: 0.25,
          usage: { total: 100, cost: 0 },
        },
        {
          harness: "opencode",
          key: "opencode:openai:gpt-tier:",
          label: "gpt-tier",
          model: { providerID: "openai", modelID: "gpt-tier" },
          usage: { input: 1_000_000, output: 1_000_000, reasoning: 1_000_000, cacheRead: 1_000_000, cacheWrite: 1_000_000 }
        }
      ])
    ).resolves.toEqual({ amount: 36.25, pricedCalls: 3, totalCalls: 3, latestModel: "GPT Tier" });
  });

  it("uses Claude's reported cost without loading the pricing catalog", async () => {
    const fetch = vi.fn().mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", fetch);

    await expect(
      advisorCost([
        {
          harness: "claude-code",
          key: "claude-code:anthropic:claude-fable-5:high",
          label: "claude-fable-5 @ high",
          model: { providerID: "anthropic", modelID: "claude-fable-5", variant: "high" },
          reportedCost: 0.354,
          usage: { cacheRead: 8_000, cacheWrite: 1_700, cost: 0.354 },
        },
      ]),
    ).resolves.toEqual({ amount: 0.354, pricedCalls: 1, totalCalls: 1, latestModel: "claude-fable-5 @ high" });
    expect(fetch).not.toHaveBeenCalled();
  });
});
