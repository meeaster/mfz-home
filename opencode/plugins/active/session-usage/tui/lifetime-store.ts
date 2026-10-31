import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

import { Option, Schema } from "effect";

import type { Bucket, Lifetime, ModelLifetime, Observation, Tail } from "./cache-lifetime.js";

/**
 * Increment when the saved format, or what an observation or checkpoint means, changes. A file with another version is
 * ignored and rebuilt from history.
 */
export const STATE_VERSION = 1;

/** How far a session has been read: its update time when it was listed, and its latest completed step then. */
export type Checkpoint = { updated: number; tail?: Tail };

export type LifetimeState = {
  observations: Observation[];
  checkpoints: Record<string, Checkpoint>;
  /** Every session updated up to this time has been read. */
  watermark?: number;
  estimates?: { computedAt: number; models: Record<string, ModelLifetime> };
};

export type LifetimeStore = {
  read(): Promise<LifetimeState | undefined>;
  /** Merges `state` with the saved file, saves the result and returns it. */
  write(state: LifetimeState): Promise<LifetimeState>;
};

/** `$XDG_STATE_HOME/opencode-session-usage/cache-lifetimes.json`, under `~/.local/state` when it is unset. */
export function lifetimeStatePath(stateHome = process.env.XDG_STATE_HOME) {
  return join(stateHome || join(homedir(), ".local", "state"), "opencode-session-usage", "cache-lifetimes.json");
}

/**
 * Both states' work: every observation, each session's newer checkpoint, the later watermark and estimates. Several
 * OpenCode instances share the file, so each keeps what the others learned.
 */
export function mergeStates(left: LifetimeState, right: LifetimeState): LifetimeState {
  const observations = new Map(left.observations.map((observation) => [observation.id, observation]));

  for (const observation of right.observations) observations.set(observation.id, observation);

  const checkpoints = { ...left.checkpoints };

  for (const [sessionID, checkpoint] of Object.entries(right.checkpoints)) {
    const current = checkpoints[sessionID];

    if (!current || newerCheckpoint(checkpoint, current)) checkpoints[sessionID] = checkpoint;
  }

  const merged: LifetimeState = { observations: [...observations.values()].sort((a, b) => a.at - b.at), checkpoints };
  const watermark = Math.max(left.watermark ?? -Infinity, right.watermark ?? -Infinity);

  if (Number.isFinite(watermark)) merged.watermark = watermark;

  const estimates = (left.estimates?.computedAt ?? -Infinity) >= (right.estimates?.computedAt ?? -Infinity) ? left.estimates : right.estimates;

  if (estimates) merged.estimates = estimates;

  return merged;
}

/** Whether `candidate` read further than `current`: a later listed update time, then a later step. */
export function newerCheckpoint(candidate: Checkpoint, current: Checkpoint) {
  if (candidate.updated !== current.updated) return candidate.updated > current.updated;

  return (candidate.tail?.completed ?? -Infinity) > (current.tail?.completed ?? -Infinity);
}

/** Leaves out observations and checkpoints older than `maxAge` milliseconds before `now`. */
export function pruneState(state: LifetimeState, now: number, maxAge: number): LifetimeState {
  const pruned: LifetimeState = {
    ...state,
    observations: state.observations.filter((observation) => now - observation.at <= maxAge),
    checkpoints: Object.fromEntries(Object.entries(state.checkpoints).filter(([, checkpoint]) => now - checkpoint.updated <= maxAge))
  };

  return pruned;
}

export function createLifetimeStore(path = lifetimeStatePath()): LifetimeStore {
  const read = async () => {
    let text: string;

    try {
      text = await readFile(path, "utf8");
    } catch {
      return undefined;
    }

    return parseState(text);
  };

  return {
    read,
    // Written under a name of its own and renamed into place, so another OpenCode reading at the same time sees a
    // whole file, old or new.
    async write(state) {
      const saved = await read();
      const merged = saved ? mergeStates(saved, state) : state;

      await mkdir(dirname(path), { recursive: true });
      const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`;

      try {
        await writeFile(temporary, JSON.stringify({ version: STATE_VERSION, ...merged }));
        await rename(temporary, path);
      } finally {
        await rm(temporary, { force: true });
      }

      return merged;
    }
  };
}

const SavedObservation = Schema.Struct({
  id: Schema.String,
  sessionID: Schema.String,
  model: Schema.String,
  at: Schema.Number,
  gap: Schema.Number,
  share: Schema.Number
});

const SavedTail = Schema.Struct({
  id: Schema.String,
  model: Schema.String,
  variant: Schema.optionalKey(Schema.String),
  completed: Schema.Number,
  prompt: Schema.Number
});

const SavedLifetime = Schema.Union([
  Schema.Struct({ type: Schema.Literal("unknown") }),
  Schema.Struct({ type: Schema.Literals(["point", "atLeast"]), seconds: Schema.Number })
]);

const SavedBucket = Schema.Struct({
  from: Schema.Number,
  to: Schema.optionalKey(Schema.Number),
  hits: Schema.Number,
  misses: Schema.Number
});

const decodeState = Schema.decodeOption(Schema.fromJsonString(Schema.Struct({
  version: Schema.Literal(STATE_VERSION),
  observations: Schema.Array(SavedObservation),
  checkpoints: Schema.Record(Schema.String, Schema.Struct({ updated: Schema.Number, tail: Schema.optionalKey(SavedTail) })),
  watermark: Schema.optionalKey(Schema.Number),
  estimates: Schema.optionalKey(Schema.Struct({
    computedAt: Schema.Number,
    models: Schema.Record(Schema.String, Schema.Struct({ lifetime: SavedLifetime, buckets: Schema.Array(SavedBucket) }))
  }))
})));

/** The saved state in `text`, or undefined when it is malformed or from another version. */
function parseState(text: string): LifetimeState | undefined {
  const saved = Option.getOrUndefined(decodeState(text));

  if (!saved) return undefined;

  const state: LifetimeState = {
    observations: [...saved.observations],
    checkpoints: Object.fromEntries(Object.entries(saved.checkpoints).map(([sessionID, checkpoint]) => [sessionID, copyCheckpoint(checkpoint)]))
  };

  if (saved.watermark !== undefined) state.watermark = saved.watermark;

  if (saved.estimates) {
    state.estimates = {
      computedAt: saved.estimates.computedAt,
      models: Object.fromEntries(Object.entries(saved.estimates.models).map(([model, estimate]) => [model, {
        lifetime: copyLifetime(estimate.lifetime),
        buckets: estimate.buckets.map(copyBucket)
      }]))
    };
  }

  return state;
}

function copyCheckpoint(checkpoint: { readonly updated: number; readonly tail?: Tail }): Checkpoint {
  return checkpoint.tail ? { updated: checkpoint.updated, tail: { ...checkpoint.tail } } : { updated: checkpoint.updated };
}

function copyLifetime(lifetime: { readonly type: "unknown" } | { readonly type: "point" | "atLeast"; readonly seconds: number }): Lifetime {
  return lifetime.type === "unknown" ? { type: "unknown" } : { type: lifetime.type, seconds: lifetime.seconds };
}

function copyBucket(bucket: { readonly from: number; readonly to?: number; readonly hits: number; readonly misses: number }): Bucket {
  return { ...bucket };
}
