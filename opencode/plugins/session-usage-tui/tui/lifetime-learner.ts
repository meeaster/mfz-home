import type { Context } from "@opencode/plugin/tui/plugin";

import { estimateLifetimes, extractObservations, LIFETIME_RULES, type ModelLifetime, type Observation } from "./cache-lifetime.js";
import {
  createLifetimeStore,
  mergeStates,
  newerCheckpoint,
  pruneState,
  type Checkpoint,
  type LifetimeState,
  type LifetimeStore
} from "./lifetime-store.js";
import { loadMessagesAfter, loadSessionMessages, type SessionMessage } from "./messages.js";

const DAY = 86_400_000;

export type LifetimeLearnerOptions = {
  client: Context["client"];
  /** Receives each model's lifetime whenever it is recomputed. */
  onEstimates: (models: Record<string, ModelLifetime>) => void;
  store?: LifetimeStore;
  now?: () => number;
  /** How long to wait before the first scan, so it doesn't compete with startup. */
  startDelay?: number;
  /** The pause after each request, so a scan is gentle on the server. */
  pause?: number;
  /** How often to look for sessions updated since the last scan. */
  rescanEvery?: number;
  /** How long after a change the state is saved. */
  saveDelay?: number;
  /** How far back the first scan reads. */
  backfillDays?: number;
};

type SessionInfo = Awaited<ReturnType<Context["client"]["session"]["get"]>>;

export type LifetimeLearner = ReturnType<typeof createLifetimeLearner>;

/**
 * Learns each model's prompt-cache lifetime from the user's history. It reads every session updated in the last
 * `backfillDays` once, one request at a time, then every `rescanEvery` those updated since, and also learns from the
 * messages the sidebar reads anyway. What it learned is saved, so a session is read again only from its checkpoint.
 */
export function createLifetimeLearner(options: LifetimeLearnerOptions) {
  const client = options.client;
  const store = options.store ?? createLifetimeStore();
  const now = options.now ?? Date.now;
  const pause = options.pause ?? 250;
  const observations = new Map<string, Observation>();
  const checkpoints = new Map<string, Checkpoint>();
  const requested = new Set<string>();
  let watermark: number | undefined;
  let estimates: LifetimeState["estimates"];
  let active = true;
  let dirty = false;
  let pending = Promise.resolve();
  let saving = Promise.resolve();
  const timers = new Map<"save" | "scan" | "request" | "estimate", ReturnType<typeof setTimeout>>();

  const later = (name: "save" | "scan" | "request" | "estimate", delay: number, run: () => void) => {
    if (!active || timers.has(name)) return;

    timers.set(name, setTimeout(() => {
      timers.delete(name);
      run();
    }, delay));
  };

  // Scans and session reads run one at a time.
  const queue = (task: () => Promise<void>) => {
    pending = pending.then(task).catch(() => undefined);

    return pending;
  };

  // Saves run one at a time too, but beside a scan, which can take minutes.
  const saveNow = () => {
    saving = saving.then(save);

    return saving;
  };

  const snapshot = (): LifetimeState => {
    const state: LifetimeState = { observations: [...observations.values()], checkpoints: Object.fromEntries(checkpoints) };

    if (watermark !== undefined) state.watermark = watermark;

    if (estimates) state.estimates = estimates;

    return state;
  };

  const adopt = (state: LifetimeState) => {
    for (const observation of state.observations) observations.set(observation.id, observation);

    for (const [sessionID, checkpoint] of Object.entries(state.checkpoints)) keepCheckpoint(sessionID, checkpoint);

    if (state.watermark !== undefined) watermark = Math.max(watermark ?? -Infinity, state.watermark);
  };

  const keepCheckpoint = (sessionID: string, checkpoint: Checkpoint) => {
    const current = checkpoints.get(sessionID);

    if (!current || newerCheckpoint(checkpoint, current)) checkpoints.set(sessionID, checkpoint);
  };

  const recompute = () => {
    const timer = timers.get("estimate");

    if (timer) clearTimeout(timer);

    timers.delete("estimate");
    const models = estimateLifetimes([...observations.values()], now());

    estimates = { computedAt: now(), models };
    options.onEstimates(models);
  };

  const save = async () => {
    if (!dirty) return;

    dirty = false;

    try {
      const saved = await store.write(pruneState(snapshot(), now(), LIFETIME_RULES.maxAgeDays * DAY));
      const before = observations.size;

      adopt(saved);

      // Another OpenCode learned something this one hadn't.
      if (observations.size > before) recompute();
    } catch {
      // The state only saves rereading history; it is written again after the next change.
      dirty = true;
    }
  };

  const changed = () => {
    dirty = true;
    // A scan changes many sessions in a row; the estimate follows within a few seconds, and when the scan ends.
    later("estimate", 2_000, recompute);
    later("save", options.saveDelay ?? 30_000, () => void saveNow());
  };

  /** Records a session's observations and checkpoint, and returns whether anything changed. */
  const record = (sessionID: string, found: readonly Observation[], checkpoint: Checkpoint) => {
    const before = checkpoints.get(sessionID);
    let added = false;

    // A retried step changes its tokens under the same ID, so an observation is replaced.
    for (const observation of found) {
      const known = observations.get(observation.id);

      if (known?.share === observation.share && known.gap === observation.gap) continue;

      observations.set(observation.id, observation);
      added = true;
    }

    keepCheckpoint(sessionID, checkpoint);

    return added || checkpoints.get(sessionID) !== before;
  };

  const sleep = (milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

  const readSession = async (session: SessionInfo) => {
    const checkpoint = checkpoints.get(session.id);

    if (checkpoint && checkpoint.updated >= session.time.updated) return false;

    const prompt = session.tokens.input + session.tokens.cache.read + session.tokens.cache.write;

    // One observation takes two steps of at least the minimum prompt.
    if (prompt < 2 * LIFETIME_RULES.minPrompt) return record(session.id, [], { updated: session.time.updated });

    // From the checkpoint's step when it still exists; otherwise, as after a revert, the whole session.
    const after = checkpoint?.tail ? await loadMessagesAfter(client, session.id, checkpoint.tail.id) : undefined;
    const messages = after ? after.messages : await loadSessionMessages(client, session.id);

    const extraction = extractObservations(session.id, messages, {
      boundary: session.revert?.messageID,
      tail: after?.found ? checkpoint?.tail : undefined
    });

    return record(session.id, extraction.observations, withTail({ updated: session.time.updated }, extraction.tail));
  };

  /** Sessions updated since `since`, subagents included, newest first. */
  const listSessions = async (since: number) => {
    const sessions: SessionInfo[] = [];
    const cursors = new Set<string>();
    let page = await client.session.list({ limit: 100, order: "desc" });

    for (;;) {
      for (const session of page.data) {
        if (session.time.updated < since) return sessions;

        sessions.push(session);
      }

      const next = page.cursor.next ?? undefined;

      if (!next || cursors.has(next) || !active) return sessions;

      cursors.add(next);
      await sleep(pause);
      page = await client.session.list({ limit: 100, cursor: next });
    }
  };

  const scan = async () => {
    const since = Math.max(watermark ?? -Infinity, now() - (options.backfillDays ?? 30) * DAY);
    const sessions = await listSessions(since);
    let complete = true;

    for (const session of sessions) {
      if (!active) return;

      try {
        if (await readSession(session)) changed();
      } catch {
        complete = false;
      }

      await sleep(pause);
    }

    // The watermark moves only past sessions that were all read, so a failed one is read again at the next scan.
    // Another OpenCode's save may have moved it further meanwhile.
    const latest = sessions.reduce((max, session) => Math.max(max, session.time.updated), Math.max(since, watermark ?? -Infinity));

    if (complete && latest !== watermark) {
      watermark = latest;
      dirty = true;
    }

    if (timers.has("estimate")) recompute();
  };

  const scanLater = (delay: number) => later("scan", delay, () => {
    void queue(scan).then(() => scanLater(options.rescanEvery ?? 600_000));
  });

  const readRequested = async () => {
    const sessionIDs = [...requested];

    requested.clear();

    for (const sessionID of sessionIDs) {
      if (!active) return;

      try {
        if (await readSession(await client.session.get({ sessionID }))) changed();
      } catch {
        // The next scan reads it.
      }

      await sleep(pause);
    }

    if (timers.has("estimate")) recompute();
  };

  const loaded = queue(async () => {
    const saved = await store.read().catch(() => undefined);

    if (saved) adopt(mergeStates(saved, snapshot()));

    recompute();
  });

  scanLater(options.startDelay ?? 5_000);

  return {
    /** Resolves once the saved state is loaded. */
    loaded,
    /**
     * Learns from a session's messages read in full elsewhere, oldest first, leaving out those from `boundary` on,
     * which a revert removed.
     */
    observe(sessionID: string, messages: readonly SessionMessage[], boundary?: string) {
      if (!active) return;

      const extraction = extractObservations(sessionID, messages, { boundary });
      // Never later than the session's update time, so a scan still reads anything this copy lacks.
      const updated = messages.reduce((max, message) => Math.max(max, message.time?.completed ?? message.time?.created ?? 0), 0);

      if (record(sessionID, extraction.observations, withTail({ updated }, extraction.tail))) changed();
    },
    /** Reads a session soon, as after it finished a step, rather than at the next scan. */
    request(sessionID: string) {
      if (!active) return;

      requested.add(sessionID);
      later("request", 10_000, () => void queue(readRequested));
    },
    /** Stops learning and saves what changed. */
    async dispose() {
      active = false;

      for (const timer of timers.values()) clearTimeout(timer);

      timers.clear();
      await saveNow();
    }
  };
}

function withTail(checkpoint: Checkpoint, tail: Checkpoint["tail"]): Checkpoint {
  if (tail) checkpoint.tail = tail;

  return checkpoint;
}
