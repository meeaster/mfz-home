import type { Context } from "@opencode/plugin/tui/plugin";

import { loadMessagesAfter, loadSessionMessages, type SessionMessage, type SessionMessageGroup } from "./messages.js";
import type { CachedSession, SessionStore } from "./session-store.js";

export type MessageCache = ReturnType<typeof createMessageCache>;

/** How long after a session changes it is saved, so a busy session is written about once a minute, not every step. */
const SAVE_DELAY = 60_000;

/**
 * The shown family's messages, kept between refreshes. While a session stays in the family it is read again only when
 * an event says it changed. When it joins the family it starts from its saved copy, if the session's fingerprint
 * still matches. Either way, a read starts from the first message that can still change.
 */
export function createMessageCache(client: Context["client"], store?: SessionStore) {
  const sessions = new Map<string, CachedSession>();
  const changed = new Set<string>();
  const unsaved = new Set<string>();
  let pending = Promise.resolve();
  let timer: ReturnType<typeof setTimeout> | undefined;

  // Loads and saves run one at a time, so an older read never overwrites a newer one.
  const queue = <Value>(task: () => Promise<Value>) => {
    const result = pending.then(task);

    pending = result.then(() => undefined, () => undefined);

    return result;
  };

  const save = async (sessionIDs: readonly string[]) => {
    for (const sessionID of sessionIDs) {
      const session = sessions.get(sessionID);

      unsaved.delete(sessionID);

      if (!session || !store) continue;

      try {
        await store.write(session);
      } catch {
        // The saved copy is only a head start for the next open; a session that can't be written is read in full then.
      }
    }
  };

  const current = async (sessionID: string, stale: boolean) => {
    const shown = sessions.get(sessionID);

    if (shown && !stale) return shown;

    const saved = shown ?? await store?.read(sessionID);
    const fingerprint = await sessionFingerprint(client, sessionID);

    if (!shown && saved?.fingerprint === fingerprint && !compacting(saved.messages)) return saved;

    unsaved.add(sessionID);

    return { sessionID, fingerprint, messages: await sync(client, sessionID, saved?.messages) };
  };

  const load = async (sessionIDs: readonly string[]): Promise<SessionMessageGroup[]> => {
    const family = new Set(sessionIDs);
    const leaving = [...sessions.keys()].filter((id) => !family.has(id));

    await save(leaving.filter((id) => unsaved.has(id)));

    for (const id of leaving) sessions.delete(id);

    const stale = new Set(changed);

    changed.clear();

    try {
      return await Promise.all(sessionIDs.map(async (sessionID) => {
        const session = await current(sessionID, stale.has(sessionID));

        sessions.set(sessionID, session);

        return { sessionID, messages: session.messages };
      }));
    } catch (error) {
      for (const id of stale) changed.add(id);

      throw error;
    } finally {
      if (unsaved.size > 0 && !timer) {
        timer = setTimeout(() => {
          timer = undefined;
          void queue(() => save([...unsaved]));
        }, SAVE_DELAY);
      }
    }
  };

  return {
    /** Marks a session whose messages may have changed since they were read. */
    invalidate(sessionID: string) {
      changed.add(sessionID);
    },
    /** Each family session's messages. */
    load(sessionIDs: readonly string[]) {
      return queue(() => load(sessionIDs));
    },
    /** Saves every session that changed since it was last saved, and stops the timed save. */
    close() {
      if (timer) clearTimeout(timer);

      timer = undefined;

      return queue(() => save([...unsaved]));
    }
  };
}

/**
 * What changes when the session's messages do: the update time, which steps and reverts set, and the usage totals,
 * which steps and compactions add to. Read before the messages, so a saved copy is never older than its fingerprint.
 */
async function sessionFingerprint(client: Context["client"], sessionID: string) {
  const { time, tokens, cost } = await client.session.get({ sessionID });

  return [time.updated, tokens.input, tokens.output, tokens.reasoning, tokens.cache.read, tokens.cache.write, cost].join(":");
}

// A compaction that fails before its first model call changes neither, so a running one is always read again.
function compacting(messages: readonly SessionMessage[]) {
  return messages.some((message) => message.type === "compaction" && message.status === "running");
}

async function sync(client: Context["client"], sessionID: string, cached: readonly SessionMessage[] | undefined) {
  const keep = cached ? settledLength(cached) : 0;
  const anchor = cached?.[keep - 1]?.id;

  if (!cached || anchor === undefined) return loadSessionMessages(client, sessionID);

  const newer = await loadMessagesAfter(client, sessionID, anchor);

  return newer.found ? [...cached.slice(0, keep), ...newer.messages] : newer.messages;
}

/**
 * How many leading messages can no longer change: those before the latest assistant message, which a retry reopens
 * under the same ID, and before a compaction still running. Steps left unfinished earlier in the history were
 * interrupted and stay as they are.
 */
function settledLength(messages: readonly SessionMessage[]) {
  const latest = messages.findLastIndex((message) => message.type === "assistant");
  const running = messages.findLastIndex((message) => message.type === "compaction" && message.status === "running");

  return Math.min(latest === -1 ? messages.length : latest, running === -1 ? messages.length : running);
}
