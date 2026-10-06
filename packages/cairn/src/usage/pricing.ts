import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { dirname } from "node:path";
import { z } from "zod";

// The tokens one model call used. input excludes cached tokens; cacheWriteLong is cache written with a one-hour
// lifetime, which only Anthropic reports separately.
export type CallTokens = {
  readonly input: number;
  readonly output: number;
  readonly reasoning: number;
  readonly cacheRead: number;
  readonly cacheWrite: number;
  readonly cacheWriteLong: number;
};

const catalogUrl = "https://models.dev/api.json";

const refreshAfterMs = 24 * 60 * 60 * 1000;

const fetchTimeoutMs = 15_000;

const rates = z.object({
  input: z.number().nonnegative(),
  output: z.number().nonnegative(),
  cache_read: z.number().nonnegative().optional(),
  cache_write: z.number().nonnegative().optional(),
  reasoning: z.number().nonnegative().optional()
});

// A context tier applies to a call whose context exceeds its size. Some entries nest the size under tier.
const tier = rates.extend({
  size: z.number().nonnegative().optional(),
  tier: z.object({ type: z.string().optional(), size: z.number().nonnegative() }).optional()
});

const cost = rates.extend({ tiers: z.array(tier).optional(), context_over_200k: rates.optional() });

const model = z.object({
  id: z.string().optional(),
  cost: cost.optional(),
  experimental: z.object({ modes: z.record(z.string(), z.object({ cost: cost.optional() })).optional() }).optional()
});

// models.dev, keyed by provider, then model, with rates in dollars per million tokens. An entry this doesn't
// understand reads as null, so one odd provider or model doesn't lose the rest.
const catalogJson = z.record(
  z.string(),
  z.object({ models: z.record(z.string(), model.nullable().catch(null)) }).nullable().catch(null)
);

export type Catalog = z.infer<typeof catalogJson>;

type Rates = z.infer<typeof rates>;

type Cost = z.infer<typeof cost>;

type Pricing = {
  readonly base: Rates;
  readonly tiers: readonly { readonly size: number; readonly rates: Rates }[];
  readonly contextOver: Rates | undefined;
};

// models.dev's long-context price, for an entry that has no explicit tiers.
const contextOverThreshold = 200_000;

// Anthropic bills one-hour cache writes at twice the base input rate; models.dev lists only the five-minute rate.
const longCacheWriteMultiplier = 2;

function pricing(entry: Cost): Pricing {
  const tiers = (entry.tiers ?? []).flatMap((item) => {
    const size = item.tier?.size ?? item.size;

    return size === undefined || (item.tier?.type ?? "context") !== "context" ? [] : [{ size, rates: item }];
  });

  return { base: entry, tiers: tiers.sort((a, b) => a.size - b.size), contextOver: entry.context_over_200k };
}

// A mode's cost replaces the base rates and adds or replaces tiers.
function withMode(base: Pricing, mode: Pricing): Pricing {
  const tiers = new Map(base.tiers.map((item) => [item.size, item]));

  for (const item of mode.tiers) {
    tiers.set(item.size, item);
  }

  return { base: mode.base, tiers: [...tiers.values()].sort((a, b) => a.size - b.size), contextOver: mode.contextOver ?? base.contextOver };
}

function ratesFor(entry: Pricing, context: number): Rates {
  const crossed = entry.tiers.filter((item) => context > item.size).at(-1);

  if (crossed !== undefined) {
    return crossed.rates;
  }

  return context > contextOverThreshold && entry.contextOver !== undefined ? entry.contextOver : entry.base;
}

// The model's pricing: an exact model ID, or an ID that names a catalog model and one of its modes, such as
// <model>-<mode>. Null when models.dev has no price for it.
function modelPricing(catalog: Catalog, providerId: string, modelId: string): Pricing | null {
  const models = catalog[providerId]?.models;

  if (models === undefined) {
    return null;
  }

  const exact = models[modelId];

  if (exact !== undefined && exact !== null) {
    return exact.cost === undefined ? null : pricing(exact.cost);
  }

  for (const [key, candidate] of Object.entries(models)) {
    if (candidate === null || candidate.cost === undefined) {
      continue;
    }

    for (const [mode, options] of Object.entries(candidate.experimental?.modes ?? {})) {
      if (`${candidate.id ?? key}-${mode}` === modelId) {
        const base = pricing(candidate.cost);

        return options.cost === undefined ? base : withMode(base, pricing(options.cost));
      }
    }
  }

  return null;
}

export type Pricer = (providerId: string, modelId: string, tokens: CallTokens) => number | null;

// Prices calls one at a time, because a context tier depends on each call's own context.
// A model the harness names differently from models.dev, such as a gateway's own name for a model behind it,
// mapped to the models.dev provider and model whose price applies.
export type ModelRef = {
  readonly provider: string;
  readonly model: string;
};

export type Aliases = ReadonlyMap<string, ModelRef>;

// provider/model. A provider ID has no slash; a model ID may have several.
const modelName = z.string().regex(/^[^/]+\/.+$/, "Expected <provider>/<model>");

function modelRef(name: string): ModelRef {
  const separator = name.indexOf("/");

  return { provider: name.slice(0, separator), model: name.slice(separator + 1) };
}

// A target is "<provider>/<model>", or the { providerID, modelID } form the session-cost-tui plugin's modelAliases
// option uses, so that option's mapping can be copied in unchanged.
const aliasTarget = z.union([
  modelName.transform(modelRef),
  z.object({ providerID: z.string().min(1), modelID: z.string().min(1) }).transform((target) => ({ provider: target.providerID, model: target.modelID }))
]);

const aliasesJson = z.record(modelName, aliasTarget);

// The aliases in path, keyed by provider/model as the harness records it. A missing file has none; a malformed one
// is an error, since its mappings would otherwise silently price nothing.
export function loadAliases(path: string): Aliases {
  if (!existsSync(path)) {
    return new Map();
  }

  const parsed = aliasesJson.safeParse(JSON.parse(readFileSync(path, "utf8")));

  if (!parsed.success) {
    throw new Error(`${path} must map "<provider>/<model>" to "<provider>/<model>" or { providerID, modelID }: ${parsed.error.message}`);
  }

  return new Map(Object.entries(parsed.data));
}

export function pricer(catalog: Catalog | null, aliases: Aliases = new Map()): Pricer {
  const cache = new Map<string, Pricing | null>();

  return (providerId, modelId, tokens) => {
    if (catalog === null) {
      return null;
    }

    const key = `${providerId}/${modelId}`;

    if (!cache.has(key)) {
      const target = aliases.get(key) ?? { provider: providerId, model: modelId };

      cache.set(key, modelPricing(catalog, target.provider, target.model));
    }

    const entry = cache.get(key) ?? null;

    if (entry === null) {
      return null;
    }

    const context = tokens.input + tokens.cacheRead + tokens.cacheWrite + tokens.cacheWriteLong;
    const applied = ratesFor(entry, context);

    const dollars =
      tokens.input * applied.input +
      tokens.output * applied.output +
      tokens.reasoning * (applied.reasoning ?? applied.output) +
      tokens.cacheRead * (applied.cache_read ?? 0) +
      tokens.cacheWrite * (applied.cache_write ?? 0) +
      tokens.cacheWriteLong * applied.input * longCacheWriteMultiplier;

    return dollars / 1_000_000;
  };
}

function readCatalog(path: string): Catalog | null {
  if (!existsSync(path)) {
    return null;
  }

  try {
    const parsed = catalogJson.safeParse(JSON.parse(readFileSync(path, "utf8")));

    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

// Fetches the catalog in a child process, since the CLI runs synchronously, and replaces the file only once the
// whole response has arrived as a JSON object.
const downloadScript = `
const [url, path] = process.argv.slice(1);
const response = await fetch(url);
if (!response.ok) process.exit(1);
const catalog = await response.json();
if (catalog === null || typeof catalog !== "object" || Array.isArray(catalog)) process.exit(1);
const fs = await import("node:fs");
fs.writeFileSync(path + ".partial", JSON.stringify(catalog));
fs.renameSync(path + ".partial", path);
`;

function download(path: string): void {
  mkdirSync(dirname(path), { recursive: true });
  spawnSync(process.execPath, ["--input-type=module", "-e", downloadScript, catalogUrl, path], { timeout: fetchTimeoutMs, stdio: "ignore" });
}

// The cached catalog, fetched again once it's a day old. A failed fetch keeps the cached copy, and with no copy
// usage is recorded without a price.
export function loadCatalog(path: string, now: Date): Catalog | null {
  const fresh = existsSync(path) && now.getTime() - statSync(path).mtimeMs < refreshAfterMs;

  if (!fresh) {
    download(path);
  }

  return readCatalog(path);
}
