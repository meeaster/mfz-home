import { describe, expect, it } from "vitest";

import { billedUsages, pricingUsage, type PricingUsage, type SessionMessage } from "./messages.js";
import { aggregateCost, materializeModels, ratesFor, resumeCost, type Catalog, type Model } from "./pricing.js";
import type { ModelAliases } from "./models.js";

const usage = (modelID: string, input: number, variant?: string): PricingUsage => {
  const result: PricingUsage = {
  providerID: "openai",
  modelID,
  tokens: { input, output: 1_000_000, reasoning: 1_000_000, cacheRead: 1_000_000, cacheWrite: 1_000_000 }
  };

  if (variant) result.variant = variant;

  return result;
};

describe("session cost pricing", () => {
  it("prices a Claude Code turn's tokens by model from Anthropic's catalog entries", () => {
    const catalog: Catalog = {
      anthropic: {
        models: {
          "claude-opus-5-5": { name: "Claude Opus 5.5", cost: { input: 4, output: 20, cache_read: 0.2 } },
          "claude-haiku-5-5": {
            name: "Claude Haiku 5.5",
            cost: { input: 1, tiers: [{ tier: { type: "context", size: 100_000 }, input: 5 }] }
          }
        }
      }
    };

    // The step's own tokens are its last call; the turn's calls are in `native.usage`.
    const step: SessionMessage = {
      type: "assistant",
      model: { providerID: "claude-code", id: "opus" },
      time: { created: 1, completed: 2 },
      tokens: { input: 1, output: 1, reasoning: 0, cache: { read: 1, write: 0 } },
      native: {
        apiModel: "claude-opus-5-5",
        usage: {
          "claude-opus-5-5": { input: 1_000_000, output: 100_000, cacheRead: 1_000_000, cacheWrite: 0, context: 300_000 },
          // Many calls under 100k each add up past the tier; the largest call decides the rate.
          "claude-haiku-5-5": { input: 1_000_000, output: 0, cacheRead: 0, cacheWrite: 0, context: 40_000 }
        }
      }
    };

    expect(aggregateCost(billedUsages(step), catalog)).toEqual({
      costs: [
        { key: "claude-code/claude-opus-5-5", model: "Claude Opus 5.5", amount: 6.2 },
        { key: "claude-code/claude-haiku-5-5", model: "Claude Haiku 5.5", amount: 1 }
      ],
      unpriced: 0
    });
  });

  it("prices a Claude Code alias's last call by its API model", () => {
    const catalog: Catalog = { anthropic: { models: { "claude-opus-5-5": { cost: { input: 4 } } } } };

    const step: SessionMessage = {
      type: "assistant",
      model: { providerID: "claude-code", id: "opus" },
      time: { created: 1, completed: 2 },
      tokens: { input: 1_000_000, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
      native: { apiModel: "claude-opus-5-5" }
    };

    const usage = pricingUsage(step);

    expect(usage && resumeCost(usage, catalog)).toBe(4);
  });

  it("selects the largest qualifying context tier regardless of order", () => {
    const model: Model = {
      cost: {
        input: 1,
        tiers: [
          { tier: { type: "context", size: 2_500_000 }, input: 2 },
          { tier: { type: "context", size: 4_000_000 }, input: 3 }
        ]
      }
    };

    expect(ratesFor(model, usage("tier", 3_000_001))?.input).toBe(3);
    expect(ratesFor(model, usage("tier", 1))?.input).toBe(1);
  });

  it("materializes mode models and inherits partial costs", () => {
    const models = materializeModels({
      base: {
        name: "Base",
        cost: { input: 1, output: 2, cache_read: 3, tiers: [{ tier: { type: "context", size: 10 }, input: 4, output: 5 }] },
        experimental: { modes: { fast: { cost: { input: 6, tiers: [{ tier: { type: "context", size: 10 }, output: 7 }] } } } }
      }
    });

    expect(models["base-fast"]).toMatchObject({
      name: "Base Fast",
      cost: { input: 6, output: 0, cache_read: 0, tiers: [{ input: 0, output: 7 }] }
    });
  });

  it("does not use request variants as mode pricing", () => {
    const catalog: Catalog = {
      openai: { models: { base: { name: "Base", cost: { input: 1 }, experimental: { modes: { high: { cost: { input: 9 } } } } } } }
    };

    expect(aggregateCost([usage("base", 1_000_000, "high")], catalog).costs).toEqual([{ key: "openai/base", model: "Base", amount: 1 }]);
    expect(aggregateCost([usage("base-high", 1_000_000)], catalog).costs).toEqual([{ key: "openai/base-high", model: "Base High", amount: 9 }]);
  });

  it("aggregates priced messages by model and reports missing pricing", () => {
    const catalog: Catalog = {
      openai: { models: { priced: { name: "Priced", cost: { input: 1, output: 2, cache_read: 3, cache_write: 4 } } } }
    };

    expect(aggregateCost([usage("priced", 1_000_000), usage("priced", 1_000_000), usage("missing", 1)], catalog)).toEqual({
      costs: [{ key: "openai/priced", model: "Priced", amount: 24 }],
      unpriced: 1
    });
  });

  it("prices a Tyler alias from mapped catalog rates and labels it by its route ID", () => {
    const gatewayUsage = { ...usage("sol", 1_000_000), providerID: "tyler" };

    const catalog: Catalog = {
      azure: { models: { "gpt-6.1-sol": { name: "GPT-6.1 Sol", cost: { input: 2 } } } }
    };

    const aliases: ModelAliases = {
      "tyler/sol": {
        providerID: "azure",
        modelID: "gpt-6.1-sol"
      }
    };

    expect(aggregateCost([gatewayUsage], catalog, undefined, aliases)).toEqual({
      costs: [{ key: "tyler/sol", model: "tyler/sol", amount: 2 }],
      unpriced: 0
    });
  });

  it("returns no costs when catalog pricing is unavailable", () => {
    expect(aggregateCost([usage("missing", 1)], {})).toEqual({ costs: [], unpriced: 1 });
  });
});

describe("resume cost", () => {
  const step = (providerID: string, modelID: string): PricingUsage => ({
    providerID,
    modelID,
    tokens: { input: 10_000, output: 5_000, reasoning: 5_000, cacheRead: 180_000, cacheWrite: 0 }
  });

  const catalog: Catalog = {
    openai: { models: { luna: { cost: { input: 2, cache_read: 0.2 } } } },
    anthropic: { models: { opus: { cost: { input: 5, cache_read: 0.5, cache_write: 6.25 } } } }
  };

  it("prices the whole context and output at the input rate when the model doesn't price cache writes", () => {
    expect(resumeCost(step("openai", "luna"), catalog)).toBeCloseTo(0.4);
  });

  it("prices the whole context at the cache-write rate when the model writes it back to the cache", () => {
    expect(resumeCost(step("anthropic", "opus"), catalog)).toBeCloseTo(1.25);
  });

  it("follows model aliases and is unknown for an unpriced model", () => {
    expect(resumeCost(step("proxy", "sol"), catalog, { "proxy/sol": { providerID: "openai", modelID: "luna" } })).toBeCloseTo(0.4);
    expect(resumeCost(step("proxy", "sol"), catalog)).toBeUndefined();
  });

  it("uses the context tier the resumed prompt falls in", () => {
    const tiered: Catalog = { openai: { models: { luna: { cost: { input: 2, context_over_200k: { input: 4 } } } } } };
    const large = { ...step("openai", "luna"), tokens: { input: 0, output: 0, reasoning: 0, cacheRead: 250_000, cacheWrite: 0 } };

    expect(resumeCost(large, tiered)).toBeCloseTo(1);
  });
});
