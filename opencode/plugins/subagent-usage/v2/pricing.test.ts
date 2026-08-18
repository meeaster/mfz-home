import { describe, expect, it } from "vitest";

import { priceTokens, type Catalog, type Tokens } from "./pricing.js";

const tokens = (input: number): Tokens => ({
  input,
  output: 1_000_000,
  reasoning: 1_000_000,
  cache: { read: 1_000_000, write: 1_000_000 },
});

describe("subagent usage V2 pricing", () => {
  it("prices all token classes from models.dev rates", () => {
    const catalog: Catalog = {
      openai: { models: { model: { cost: { input: 1, output: 2, cache_read: 3, cache_write: 4 } } } },
    };
    expect(priceTokens(tokens(1_000_000), { providerID: "openai", id: "model" }, catalog)).toBe(12);
  });

  it("uses the largest qualifying context tier", () => {
    const catalog: Catalog = {
      openai: {
        models: {
          model: {
            cost: {
              input: 1,
              tiers: [
                { tier: { type: "context", size: 2_500_000 }, input: 2 },
                { tier: { type: "context", size: 4_000_000 }, input: 3 },
              ],
            },
          },
        },
      },
    };
    expect(priceTokens(tokens(3_000_001), { providerID: "openai", id: "model" }, catalog)).toBeCloseTo(9.000003);
  });

  it("materializes explicit models.dev mode IDs", () => {
    const catalog: Catalog = {
      openai: {
        models: {
          model: { cost: { input: 1 }, experimental: { modes: { fast: { cost: { input: 6 } } } } },
        },
      },
    };
    expect(priceTokens({ ...tokens(1_000_000), output: 0, reasoning: 0, cache: { read: 0, write: 0 } }, { providerID: "openai", id: "model-fast" }, catalog)).toBe(6);
  });

  it("returns undefined when models.dev has no matching rates", () => {
    expect(priceTokens(tokens(1), { providerID: "openai", id: "missing" }, {})).toBeUndefined();
  });
});
