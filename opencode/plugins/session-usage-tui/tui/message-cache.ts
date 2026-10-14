import type { Context } from "@opencode/plugin/tui/plugin";

import { loadMessagesAfter, loadSessionMessages, type SessionMessage, type SessionMessageGroup } from "./messages.js";

export type MessageCache = ReturnType<typeof createMessageCache>;

/**
 * Family messages kept between refreshes. A session is read again only when an event says it changed or it is new to
 * the family, and then only from the first message that can still change.
 */
export function createMessageCache(client: Context["client"]) {
  const sessions = new Map<string, SessionMessage[]>();
  const changed = new Set<string>();
  let pending = Promise.resolve();

  const load = async (sessionIDs: readonly string[]): Promise<SessionMessageGroup[]> => {
    const family = new Set(sessionIDs);

    for (const id of sessions.keys()) {
      if (!family.has(id)) sessions.delete(id);
    }

    const stale = new Set(changed);

    changed.clear();

    try {
      return await Promise.all(sessionIDs.map(async (sessionID) => {
        const cached = sessions.get(sessionID);
        const messages = cached && !stale.has(sessionID) ? cached : await sync(client, sessionID, cached);

        sessions.set(sessionID, messages);

        return { sessionID, messages };
      }));
    } catch (error) {
      for (const id of stale) changed.add(id);

      throw error;
    }
  };

  return {
    /** Marks a session whose messages may have changed since they were read. */
    invalidate(sessionID: string) {
      changed.add(sessionID);
    },
    /** Each family session's messages. Loads run one at a time so an older load never overwrites a newer one. */
    load(sessionIDs: readonly string[]) {
      const result = pending.then(() => load(sessionIDs));

      pending = result.then(() => undefined, () => undefined);

      return result;
    }
  };
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
  const compacting = messages.findLastIndex((message) => message.type === "compaction" && message.status === "running");

  return Math.min(latest === -1 ? messages.length : latest, compacting === -1 ? messages.length : compacting);
}
