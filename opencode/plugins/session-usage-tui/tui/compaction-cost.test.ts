import { describe, expect, it } from "vitest";

import { familyPricingUsages, type SessionMessage, type SessionMessageGroup } from "./messages.js";
import { aggregateCost, type Catalog } from "./pricing.js";

const assistant = (modelID: string, input: number, created = 0): SessionMessage => ({
  type: "assistant",
  model: { providerID: "openai", id: modelID },
  time: { created, completed: created + 1 },
  tokens: { input, output: 0, reasoning: 0, cache: { read: 0, write: 0 } }
});

const compaction = (status: string, created = 0): SessionMessage => ({ type: "compaction", status, time: { created } });

const group = (sessionID: string, messages: SessionMessage[]): SessionMessageGroup => ({ sessionID, messages });

const catalog: Catalog = {
  openai: {
    models: {
      priced: { name: "Priced", cost: { input: 1 } },
      old: { name: "Old", cost: { input: 1 } }
    }
  }
};

describe("session cost compaction scope", () => {
  it("does not use a compaction from another family branch", () => {
    const family = [
      group("root", [assistant("priced", 1_000_000), compaction("completed"), assistant("priced", 250_000)]),
      group("child", [assistant("priced", 1_000_000), assistant("old", 500_000)])
    ];

    const usages = familyPricingUsages(family, "child");

    expect(usages.sinceCompaction).toBeUndefined();
    expect(aggregateCost(usages.all, catalog, usages.sinceCompaction).costs).toEqual([
      { model: "Priced", amount: 2.25 },
      { model: "Old", amount: 0.5 }
    ]);
  });

  it("uses a copied completed compaction to bound later selected-session usage", () => {
    const family = [
      group("root", [assistant("priced", 1_000_000), compaction("completed")]),
      group("child", [assistant("priced", 1_000_000), compaction("completed"), assistant("priced", 250_000)])
    ];

    const usages = familyPricingUsages(family, "child");

    expect(usages.sinceCompaction).toHaveLength(1);
    expect(usages.sinceCompaction?.[0]?.tokens.input).toBe(250_000);
    expect(aggregateCost(usages.all, catalog, usages.sinceCompaction)).toEqual({
      costs: [{ model: "Priced", amount: 2.25, sinceCompaction: 0.25 }],
      unpriced: 0
    });
  });

  it("does not establish a boundary for running or failed compactions", () => {
    const family = [
      group("selected", [
        assistant("priced", 1_000_000),
        compaction("running"),
        assistant("priced", 250_000),
        compaction("failed"),
        assistant("priced", 500_000)
      ])
    ];

    expect(familyPricingUsages(family, "selected").sinceCompaction).toBeUndefined();
  });

  it("counts the selected session's subagents' steps after its compaction toward it", () => {
    const family = [
      group("root", [assistant("priced", 1_000_000, 10), compaction("completed", 20), assistant("priced", 250_000, 30)]),
      group("explorer", [assistant("priced", 500_000, 15), assistant("priced", 100_000, 25)]),
      group("nested", [assistant("priced", 50_000, 35)]),
      group("other", [assistant("priced", 400_000, 40)])
    ];

    const usages = familyPricingUsages(family, "root", new Set(["explorer", "nested"]));

    const [cost] = aggregateCost(usages.all, catalog, usages.sinceCompaction).costs;

    expect(cost?.amount).toBeCloseTo(2.3);
    expect(cost?.sinceCompaction).toBeCloseTo(0.4);
  });
});
