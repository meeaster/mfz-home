import type { PricingUsage } from "./messages.js";

export type Rates = {
  input?: number;
  output?: number;
  cache_read?: number;
  cache_write?: number;
  context_over_200k?: Omit<Rates, "tiers" | "context_over_200k">;
  tiers?: Array<{
    tier?: { type?: string; size?: number };
    input?: number;
    output?: number;
    cache_read?: number;
    cache_write?: number;
  }>;
};

export type Model = {
  name?: string;
  cost?: Rates;
  experimental?: { modes?: Record<string, { cost?: Rates }> };
};

export type Catalog = Record<string, { models?: Record<string, Model> }>;
export type Cost = { model: string; amount: number };
export type CostEstimate = { costs: Cost[]; unpriced: number };

let catalog: Promise<Catalog> | undefined;

export function loadCatalog(): Promise<Catalog> {
  if (!catalog) {
    catalog = fetch("https://models.dev/api.json", { signal: AbortSignal.timeout(10_000) }).then(async (response) => {
      if (!response.ok) throw new Error(`models.dev returned ${response.status}`);
      // SAFETY: models.dev owns this endpoint's catalog contract; malformed data is caught by this promise chain and rendered as unavailable.
      return (await response.json()) as Catalog;
    });
  }
  return catalog.catch((error) => {
    catalog = undefined;
    throw error;
  });
}

export function ratesFor(model: Model, usage: PricingUsage): Rates | undefined {
  const prompt = usage.tokens.input + usage.tokens.cacheRead + usage.tokens.cacheWrite;
  const cost = normalizeRates(model.cost);
  const tier = cost?.tiers
    ?.filter((entry) => entry.tier?.type === "context" && prompt > finite(entry.tier.size))
    .sort((left, right) => finite(right.tier?.size) - finite(left.tier?.size))[0];
  return tier ?? cost;
}

export function aggregateCost(usages: readonly PricingUsage[], priceCatalog: Catalog): CostEstimate {
  const costs = new Map<string, Cost>();
  let unpriced = 0;

  for (const usage of usages) {
    const model = materializeModels(priceCatalog[usage.providerID]?.models ?? {})[usage.modelID];
    const rates = model && ratesFor(model, usage);
    if (!rates) {
      unpriced += 1;
      continue;
    }
    const key = `${usage.providerID}/${usage.modelID}`;
    const item = costs.get(key) ?? { model: model.name ?? usage.modelID, amount: 0 };
    item.amount += price(usage, rates);
    costs.set(key, item);
  }

  return { costs: [...costs.values()].sort((left, right) => right.amount - left.amount), unpriced };
}

export function materializeModels(models: Record<string, Model>): Record<string, Model> {
  return Object.fromEntries(Object.entries(models).flatMap(([id, model]) => [
    [id, { ...model, cost: normalizeRates(model.cost) }],
    ...Object.entries(model.experimental?.modes ?? {}).map(([mode, options]) => [
      `${id}-${mode}`,
      {
        ...model,
        name: `${model.name ?? id} ${mode.charAt(0).toUpperCase()}${mode.slice(1)}`,
        cost: mergeRates(model.cost, options.cost),
        experimental: undefined
      }
    ])
  ]));
}

function mergeRates(base: Rates | undefined, override: Rates | undefined): Rates | undefined {
  const normalizedBase = normalizeRates(base);
  if (!override) return normalizedBase;
  const normalizedOverride = normalizeRates(override)!;
  const tiers = new Map((normalizedBase?.tiers ?? []).map((tier) => [tierKey(tier), tier]));
  for (const tier of normalizedOverride.tiers ?? []) {
    tiers.set(tierKey(tier), { ...tiers.get(tierKey(tier)), ...tier });
  }
  return { ...normalizedBase, ...normalizedOverride, tiers: [...tiers.values()] };
}

function normalizeRates(input: Rates | undefined): Rates | undefined {
  if (!input) return undefined;
  return {
    input: input.input ?? 0,
    output: input.output ?? 0,
    cache_read: input.cache_read ?? 0,
    cache_write: input.cache_write ?? 0,
    tiers: [
      ...(input.tiers?.map((tier) => ({
        ...tier,
        input: tier.input ?? 0,
        output: tier.output ?? 0,
        cache_read: tier.cache_read ?? 0,
        cache_write: tier.cache_write ?? 0
      })) ?? []),
      ...(input.context_over_200k ? [{
        tier: { type: "context", size: 200_000 },
        input: input.context_over_200k.input ?? 0,
        output: input.context_over_200k.output ?? 0,
        cache_read: input.context_over_200k.cache_read ?? 0,
        cache_write: input.context_over_200k.cache_write ?? 0
      }] : [])
    ]
  };
}

function tierKey(rate: NonNullable<Rates["tiers"]>[number]) {
  return `${rate.tier?.type ?? "base"}:${rate.tier?.size ?? 0}`;
}

function price(usage: PricingUsage, rates: Rates) {
  return (
    (usage.tokens.input * finite(rates.input) +
      (usage.tokens.output + usage.tokens.reasoning) * finite(rates.output) +
      usage.tokens.cacheRead * finite(rates.cache_read) +
      usage.tokens.cacheWrite * finite(rates.cache_write)) /
    1_000_000
  );
}

function finite(value: number | undefined) {
  return value !== undefined && Number.isFinite(value) && value >= 0 ? value : 0;
}
