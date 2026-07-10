import type { AdvisorCall, AdvisorModel, AdvisorUsage } from "./metrics.js";

type Rates = {
  input?: number;
  output?: number;
  cache_read?: number;
  cache_write?: number;
};

type Model = {
  name?: string;
  cost?: Rates;
  tiers?: Array<{ tier?: { type?: string; size?: number }; input?: number; output?: number; cache_read?: number; cache_write?: number }>;
  experimental?: { modes?: Record<string, { cost?: Rates }> };
};

type Catalog = Record<string, { models?: Record<string, Model> }>;

export type AdvisorCost = {
  amount: number;
  pricedCalls: number;
  totalCalls: number;
  latestModel?: string;
};

let catalog: Promise<Catalog> | undefined;

function number(value: number | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

async function models(): Promise<Catalog> {
  catalog ??= fetch("https://models.dev/api.json").then(async (response) => {
    if (!response.ok) throw new Error(`models.dev returned ${response.status}`);
    return (await response.json()) as Catalog;
  });
  return catalog;
}

function findModel(catalog: Catalog, model: AdvisorModel): Model | undefined {
  if (!model.providerID || !model.modelID) return undefined;
  return catalog[model.providerID]?.models?.[model.modelID];
}

function ratesFor(model: Model, variant: string | undefined, usage: AdvisorUsage): Rates | undefined {
  const promptTokens = number(usage.input) + number(usage.cacheRead) + number(usage.cacheWrite);
  const tier = model.tiers?.find((entry) => entry.tier?.type === "context" && promptTokens > number(entry.tier.size));
  if (tier) return tier;
  return model.experimental?.modes?.[variant ?? ""]?.cost ?? model.cost;
}

function price(usage: AdvisorUsage, rates: Rates): number {
  return (
    (number(usage.input) * number(rates.input) +
      (number(usage.output) + number(usage.reasoning)) * number(rates.output) +
      number(usage.cacheRead) * number(rates.cache_read) +
      number(usage.cacheWrite) * number(rates.cache_write)) /
    1_000_000
  );
}

function label(model: AdvisorModel, catalog: Catalog): string | undefined {
  const name = findModel(catalog, model)?.name ?? model.modelID;
  return name ? `${name}${model.variant ? ` @ ${model.variant}` : ""}` : undefined;
}

export async function advisorCost(calls: readonly AdvisorCall[]): Promise<AdvisorCost> {
  const catalog = await models();
  let amount = 0;
  let pricedCalls = 0;

  for (const call of calls) {
    if (!call.usage) continue;
    const model = findModel(catalog, call.model);
    const rates = model && ratesFor(model, call.model.variant, call.usage);
    if (!rates) continue;
    amount += price(call.usage, rates);
    pricedCalls += 1;
  }

  const latest = [...calls].reverse().find((call) => call.model.modelID);
  const latestModel = latest && label(latest.model, catalog);
  return { amount, pricedCalls, totalCalls: calls.length, ...(latestModel ? { latestModel } : {}) };
}
