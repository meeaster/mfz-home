import { pricingUsage, type SessionMessage } from "./messages.js";

/**
 * One idle gap between two steps of a session on the same model, and how much of the earlier step's prompt the later
 * step read from the provider's prompt cache.
 */
export type Observation = {
  /** The later step's message ID. */
  id: string;
  sessionID: string;
  /** The recorded `providerID/modelID`, without the variant. */
  model: string;
  /** When the later step started, in epoch milliseconds. */
  at: number;
  /** Seconds from the earlier step's completion to the later step's start. */
  gap: number;
  /** The later step's cache reads over the earlier step's whole prompt. */
  share: number;
};

/** The latest completed step a later step would be paired with, so a session can be read on from it. */
export type Tail = { id: string; model: string; variant?: string; completed: number; prompt: number };

export type Extraction = { observations: Observation[]; tail?: Tail };

/** What the provider kept the prompt cache for, as learned from a model's observations. */
export type Lifetime =
  | { type: "unknown" }
  | { type: "point"; seconds: number }
  | { type: "atLeast"; seconds: number };

/** Hit and miss weight for gaps from `from` seconds up to `to`, or without end. */
export type Bucket = { from: number; to?: number; hits: number; misses: number };

export type ModelLifetime = { lifetime: Lifetime; buckets: Bucket[] };

const MINUTE = 60;

const DAY = 86_400_000;

/** Every constant that decides what is observed and what a model's observations add up to. */
export const LIFETIME_RULES = {
  /** An earlier prompt smaller than this is mostly the shared system prompt, which other sessions keep warm. */
  minPrompt: 20_000,
  /** Shorter gaps say nothing about lifetimes measured in minutes. */
  minGap: 60,
  /** A later step that read at least this share of the earlier prompt from cache hit it. */
  hitShare: 0.5,
  /** Gap bucket edges, in minutes. The last bucket has no end. */
  edges: [1, 2, 3, 5, 8, 10, 15, 20, 30, 45, 60, 90, 120, 180, 240, 360, 480, 720, 1440],
  /** A bucket whose miss share reaches this is where the cache has expired. */
  missMajority: 0.5,
  /** The weight a bucket needs before its misses count, so a single stray miss doesn't set the lifetime. */
  minBucketWeight: 2,
  /** The weight a model needs before anything is said about it. */
  minModelWeight: 2,
  /** Lifetimes change; an observation counts half as much this many days later. */
  halfLifeDays: 14,
  /** Observations older than this are dropped. */
  maxAgeDays: 90,
  /** When the longest hit is this many times shorter than the first expired bucket, nothing is known in between. */
  dataGapRatio: 2
};

export type LifetimeRules = typeof LIFETIME_RULES;

// Messages that change the system prompt or the model, so the next step can't reuse the cached prefix.
const RESETS = new Set(["compaction", "agent-switched", "model-switched", "location-switched"]);

/**
 * The observations a session's messages hold, oldest first, continuing from `tail` when the messages follow it.
 * Pairs end at a compaction, an agent, model or location switch, and an unfinished step. A pair is kept only between
 * completed steps on the same model and variant whose earlier prompt was at least `minPrompt` tokens, `minGap` or
 * more apart, and before `boundary`, the first message a revert removed. When `boundary` is set but not among the
 * messages, it precedes them, so none count.
 *
 * The returned `tail` is the latest completed step even when a reset follows it: reading on from it reads that reset
 * again.
 */
export function extractObservations(
  sessionID: string,
  messages: readonly SessionMessage[],
  options: { boundary?: string | undefined; tail?: Tail | undefined; rules?: LifetimeRules } = {}
): Extraction {
  const rules = options.rules ?? LIFETIME_RULES;
  const boundaryIndex = options.boundary === undefined ? messages.length : messages.findIndex((message) => message.id === options.boundary);
  const observations: Observation[] = [];
  let tail = options.tail;
  // The step a later one pairs with, until a reset.
  let previous = tail;

  if (boundaryIndex === -1) return tail ? { observations, tail } : { observations };

  for (const message of messages.slice(0, boundaryIndex)) {
    if (message.type && RESETS.has(message.type)) {
      previous = undefined;
      continue;
    }

    if (message.type !== "assistant") continue;

    const usage = pricingUsage(message);
    const created = message.time?.created;
    const completed = message.time?.completed;

    if (!usage || message.id === undefined || created === undefined || completed === undefined) {
      previous = undefined;
      continue;
    }

    const model = `${usage.providerID}/${usage.modelID}`;
    const gap = previous ? (created - previous.completed) / 1_000 : 0;

    if (previous && previous.model === model && previous.variant === usage.variant && previous.prompt >= rules.minPrompt && gap >= rules.minGap) {
      observations.push({ id: message.id, sessionID, model, at: created, gap, share: usage.tokens.cacheRead / previous.prompt });
    }

    tail = { id: message.id, model, completed, prompt: usage.tokens.input + usage.tokens.cacheRead + usage.tokens.cacheWrite };

    if (usage.variant !== undefined) tail.variant = usage.variant;

    previous = tail;
  }

  return tail ? { observations, tail } : { observations };
}

/** Each model's lifetime as of `now`, from observations of every session. */
export function estimateLifetimes(observations: readonly Observation[], now: number, rules: LifetimeRules = LIFETIME_RULES) {
  const byModel = new Map<string, Array<{ observation: Observation; weight: number }>>();
  const bursts = new Map<string, number>();
  const recent = observations.filter((observation) => now - observation.at <= rules.maxAgeDays * DAY);

  // Steps of one model that start in the same minute resumed together, as a scheduled job does: one event.
  const burstKey = (observation: Observation) => `${observation.model}@${Math.floor(observation.at / 60_000)}`;

  for (const observation of recent) bursts.set(burstKey(observation), (bursts.get(burstKey(observation)) ?? 0) + 1);

  for (const observation of recent) {
    const age = Math.max(0, now - observation.at) / DAY;
    const weight = 0.5 ** (age / rules.halfLifeDays) / (bursts.get(burstKey(observation)) ?? 1);
    const weighted = byModel.get(observation.model) ?? [];

    weighted.push({ observation, weight });
    byModel.set(observation.model, weighted);
  }

  const lifetimes: Record<string, ModelLifetime> = {};

  for (const [model, weighted] of byModel) lifetimes[model] = modelLifetime(weighted, rules);

  return lifetimes;
}

function modelLifetime(weighted: ReadonlyArray<{ observation: Observation; weight: number }>, rules: LifetimeRules): ModelLifetime {
  const edges = rules.edges.map((minutes) => minutes * MINUTE);

  const buckets: Bucket[] = edges.map((from, index) => {
    const to = edges[index + 1];

    return to === undefined ? { from, hits: 0, misses: 0 } : { from, to, hits: 0, misses: 0 };
  });

  // The longest hit in each bucket.
  const longest: number[] = buckets.map(() => 0);
  let total = 0;

  for (const { observation, weight } of weighted) {
    const index = bucketIndex(edges, observation.gap);
    const bucket = buckets[index];

    if (!bucket) continue;

    total += weight;

    if (observation.share >= rules.hitShare) {
      bucket.hits += weight;
      longest[index] = Math.max(longest[index] ?? 0, observation.gap);
    } else {
      bucket.misses += weight;
    }
  }

  if (total < rules.minModelWeight) return { lifetime: { type: "unknown" }, buckets };

  const expired = buckets.findIndex((bucket) => {
    const weight = bucket.hits + bucket.misses;

    return weight >= rules.minBucketWeight && bucket.misses / weight >= rules.missMajority;
  });

  const end = expired === -1 ? buckets.length : expired;
  let hit = 0;

  // Hits count where they are the majority: a lone hit among misses says little about the lifetime.
  for (let index = 0; index < end; index++) {
    const bucket = buckets[index];

    if (bucket && bucket.hits >= bucket.misses) hit = Math.max(hit, longest[index] ?? 0);
  }

  const from = buckets[expired]?.from;

  if (from === undefined) return { lifetime: hit > 0 ? { type: "atLeast", seconds: hit } : { type: "unknown" }, buckets };

  if (hit > 0 && hit * rules.dataGapRatio < from) return { lifetime: { type: "atLeast", seconds: hit }, buckets };

  return { lifetime: { type: "point", seconds: from }, buckets };
}

function bucketIndex(edges: readonly number[], gap: number) {
  return edges.findLastIndex((edge) => gap >= edge);
}

/** A lifetime in at most five characters: "25M", "1.5H", "≥50M", or "?" when unknown. */
export function lifetimeLabel(lifetime: Lifetime) {
  if (lifetime.type === "unknown") return "?";

  // A lower bound rounds down, so it never claims more than was seen.
  if (lifetime.type === "atLeast") return `≥${duration(lifetime.seconds, Math.floor)}`;

  return duration(lifetime.seconds, Math.round);
}

/** Minutes below two hours, then hours: to the half hour below ten, whole above. */
function duration(seconds: number, round: (value: number) => number) {
  const minutes = Math.max(1, round(seconds / MINUTE));

  if (minutes < 120) return `${minutes}M`;

  const hours = seconds / 3_600;

  return hours < 10 ? `${round(hours * 2) / 2}H` : `${round(hours)}H`;
}
