import { describe, expect, it } from "vitest";

import { cachedInputCost } from "./context-cost.js";
import type { SessionMessage } from "./messages.js";
import type { Catalog } from "./pricing.js";

const assistant = (modelID: string, tokens: Partial<NonNullable<SessionMessage["tokens"]>>): SessionMessage => ({
  type: "assistant",
  model: { providerID: "openai", id: modelID },
  time: { completed: 1 },
  tokens: {
    input: tokens.input ?? 0,
    output: tokens.output ?? 0,
    reasoning: tokens.reasoning ?? 0,
    cache: { read: tokens.cache?.read ?? 0, write: tokens.cache?.write ?? 0 }
  }
});

describe("cached input cost", () => {
  it("uses the selected model and prices only the current-context proxy", () => {
    const catalog: Catalog = {
      openai: {
        models: {
          selected: { cost: { cache_read: 2 } },
          fallback: { cost: { cache_read: 9 } }
        }
      }
    };

    const messages = [assistant("fallback", {
      input: 400_000,
      output: 900_000,
      reasoning: 800_000,
      cache: { read: 500_000, write: 100_000 }
    })];

    // Exact proxy formula: input + cache.read + cache.write = 1,000,000;
    // output and reasoning do not contribute to the cached-input estimate.
    expect(cachedInputCost(messages, { model: { providerID: "openai", id: "selected" } }, catalog)).toBe(2);
  });

  it("falls back to the latest completed assistant model without a selected model", () => {
    const catalog: Catalog = {
      openai: { models: { fallback: { cost: { cache_read: 3 } } } }
    };

    expect(cachedInputCost([assistant("fallback", { input: 1_000_000 })], undefined, catalog)).toBe(3);
  });

  it("does not fall back when a selected model has no cache-read pricing", () => {
    const catalog: Catalog = {
      openai: {
        models: {
          selected: { cost: { input: 1 } },
          fallback: { cost: { cache_read: 3 } }
        }
      }
    };

    expect(cachedInputCost(
      [assistant("fallback", { input: 1_000_000 })],
      { model: { providerID: "openai", id: "selected" } },
      catalog
    )).toBeUndefined();
  });

  it("uses the largest qualifying cache-read tier", () => {
    const catalog: Catalog = {
      openai: {
        models: {
          tiered: {
            cost: {
              cache_read: 1,
              tiers: [
                { tier: { type: "context", size: 1_000_000 }, cache_read: 2 },
                { tier: { type: "context", size: 2_000_000 }, cache_read: 3 }
              ]
            }
          }
        }
      }
    };

    expect(cachedInputCost([assistant("tiered", { input: 2_000_001 })], undefined, catalog)).toBe(6.000003);
  });

  it("supports the models.dev legacy over-200k tier", () => {
    const catalog: Catalog = {
      openai: { models: { legacy: { cost: { cache_read: 1, context_over_200k: { cache_read: 4 } } } } }
    };

    expect(cachedInputCost([assistant("legacy", { input: 200_001 })], undefined, catalog)).toBe(0.800004);
  });

  it("omits the estimate without usable active-context evidence or cache pricing", () => {
    const catalog: Catalog = {
      openai: { models: { missing: { cost: { input: 1 } } } }
    };

    const beforeCompaction = [
      assistant("missing", { input: 1_000_000 }),
      { id: "compact", type: "compaction", status: "completed" }
    ];

    expect(cachedInputCost(beforeCompaction, undefined, catalog)).toBeUndefined();
    expect(cachedInputCost([], undefined, catalog)).toBeUndefined();
  });
});
