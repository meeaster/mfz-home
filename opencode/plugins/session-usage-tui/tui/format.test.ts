import { describe, expect, it } from "vitest";

import { cacheLine, costLine, lastStepLine, subagentLine, tokens, totalLine, WIDTH } from "./format.js";

describe("sidebar formatting", () => {
  it("shortens token counts without rounding up into the next unit's width", () => {
    expect([812, 41_249, 99_960, 112_400, 999_600, 12_340_000].map(tokens)).toEqual(["812", "41.2k", "100k", "112k", "1.0M", "12.3M"]);
  });

  it("shows the cache hit rate, counting cache writes as uncached", () => {
    expect(cacheLine({ uncached: 84_200, cached: 887_000 })).toBe("Uncached 84.2k · Cached 887k (91%)");
    expect(lastStepLine({ uncached: 12_000, cached: 0 })).toBe("Last step 0% cached");
    expect(lastStepLine({ uncached: 0, cached: 0 })).toBeUndefined();
  });

  it("shows one amount per model until a compaction, then the amount since it and the full total", () => {
    expect(costLine({ model: "GPT-6 Luna", amount: 1.234 })).toBe("GPT-6 Luna $1.23");
    expect(costLine({ model: "GPT-6 Luna", amount: 1.234, sinceCompaction: 0.456 })).toBe("GPT-6 Luna $0.46 ($1.23)");
    expect(totalLine([{ model: "GPT-6 Luna", amount: 1.234 }, { model: "GPT-6.1 Sol", amount: 0.5 }])).toBe("Total $1.73");
    expect(totalLine([{ model: "GPT-6 Luna", amount: 1.234, sinceCompaction: 0.456 }, { model: "GPT-6.1 Sol", amount: 0.5, sinceCompaction: 0 }]))
      .toBe("Total $0.46 ($1.73)");
  });

  it("fits long model names in the sidebar by cutting the name, never the numbers", () => {
    const cost = costLine({ model: "openai/gpt-6.1-sol-extended-preview", amount: 12.345, sinceCompaction: 1.234 });

    expect(cost).toBe("gpt-6.1-sol-extended-… $1.23 ($12.35)");

    const line = subagentLine({ tokens: 212_000, providerID: "openai", modelID: "gpt-6.1-sol-extended", variant: "medium" }, 400_000, 0.31);
    const text = `${line.model}${line.size}${line.rest}`;

    expect(text).toBe("gpt-6.1-sol-extende… 212k (53%) $0.31");

    for (const value of [cost, text, cacheLine({ uncached: 1_234_000, cached: 12_340_000 })]) expect(value.length).toBeLessThanOrEqual(WIDTH);
  });
});
