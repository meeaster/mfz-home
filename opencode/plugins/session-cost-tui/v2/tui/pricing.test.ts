import { describe, expect, it } from "vitest";

import type { PricingUsage } from "./messages.js";
import { aggregateCost, materializeModels, ratesFor, type Catalog, type Model } from "./pricing.js";

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
    expect(aggregateCost([usage("base", 1_000_000, "high")], catalog).costs).toEqual([{ model: "Base", amount: 1 }]);
    expect(aggregateCost([usage("base-high", 1_000_000)], catalog).costs).toEqual([{ model: "Base High", amount: 9 }]);
  });

  it("aggregates priced messages by model and reports missing pricing", () => {
    const catalog: Catalog = {
      openai: { models: { priced: { name: "Priced", cost: { input: 1, output: 2, cache_read: 3, cache_write: 4 } } } }
    };
    expect(aggregateCost([usage("priced", 1_000_000), usage("priced", 1_000_000), usage("missing", 1)], catalog)).toEqual({
      costs: [{ model: "Priced", amount: 24 }],
      unpriced: 1
    });
  });

  it("returns no costs when catalog pricing is unavailable", () => {
    expect(aggregateCost([usage("missing", 1)], {})).toEqual({ costs: [], unpriced: 1 });
  });
});
