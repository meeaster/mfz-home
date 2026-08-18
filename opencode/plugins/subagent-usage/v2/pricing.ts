export type Tokens = {
  input: number;
  output: number;
  reasoning: number;
  cache: { read: number; write: number };
};

export type ModelRef = { id: string; providerID: string; variant?: string };

type Rates = {
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

type Model = {
  cost?: Rates;
  experimental?: { modes?: Record<string, { cost?: Rates }> };
};

export type Catalog = Record<string, { models?: Record<string, Model> }>;

let catalog: Promise<Catalog> | undefined;

export function loadCatalog(): Promise<Catalog> {
  if (!catalog) {
    catalog = fetch("https://models.dev/api.json", { signal: AbortSignal.timeout(10_000) }).then(async (response) => {
      if (!response.ok) throw new Error(`models.dev returned ${response.status}`);
      // SAFETY: models.dev owns this endpoint contract; callers fail closed when loading or pricing fails.
      return (await response.json()) as Catalog;
    });
  }
  return catalog.catch((error) => {
    catalog = undefined;
    throw error;
  });
}

export function priceTokens(tokens: Tokens, ref: ModelRef, priceCatalog: Catalog): number | undefined {
  const models = priceCatalog[ref.providerID]?.models ?? {};
  const model = models[ref.id] ?? modeModel(models, ref.id);
  const rates = model && ratesFor(model, tokens);
  if (!rates) return undefined;
  return (
    (tokens.input * finite(rates.input) +
      (tokens.output + tokens.reasoning) * finite(rates.output) +
      tokens.cache.read * finite(rates.cache_read) +
      tokens.cache.write * finite(rates.cache_write)) /
    1_000_000
  );
}

function modeModel(models: Record<string, Model>, id: string): Model | undefined {
  for (const [baseID, model] of Object.entries(models)) {
    for (const [mode, options] of Object.entries(model.experimental?.modes ?? {})) {
      if (`${baseID}-${mode}` === id) return { ...model, cost: mergeRates(model.cost, options.cost) };
    }
  }
  return undefined;
}

function ratesFor(model: Model, tokens: Tokens): Rates | undefined {
  const prompt = tokens.input + tokens.cache.read + tokens.cache.write;
  const cost = normalizeRates(model.cost);
  const tier = cost?.tiers
    ?.filter((entry) => entry.tier?.type === "context" && prompt > finite(entry.tier.size))
    .sort((left, right) => finite(right.tier?.size) - finite(left.tier?.size))[0];
  return tier ?? cost;
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
        cache_write: tier.cache_write ?? 0,
      })) ?? []),
      ...(input.context_over_200k
        ? [{
            tier: { type: "context", size: 200_000 },
            input: input.context_over_200k.input ?? 0,
            output: input.context_over_200k.output ?? 0,
            cache_read: input.context_over_200k.cache_read ?? 0,
            cache_write: input.context_over_200k.cache_write ?? 0,
          }]
        : []),
    ],
  };
}

function tierKey(rate: NonNullable<Rates["tiers"]>[number]) {
  return `${rate.tier?.type ?? "base"}:${rate.tier?.size ?? 0}`;
}

function finite(value: number | undefined) {
  return value !== undefined && Number.isFinite(value) && value >= 0 ? value : 0;
}
