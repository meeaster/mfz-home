import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { Option, Schema } from "effect";

import type { SessionMessage } from "./messages.js";

/**
 * Increment when the saved format, or the rules for which saved messages can still change, no longer match what
 * earlier files assume. A file with another version is ignored and rebuilt.
 */
export const CACHE_VERSION = 1;

/** A session's messages as last read, with the session's fingerprint taken before they were read. */
export type CachedSession = { sessionID: string; fingerprint: string; messages: readonly SessionMessage[] };

export type SessionStore = {
  read(sessionID: string): Promise<CachedSession | undefined>;
  write(session: CachedSession): Promise<void>;
};

// Session IDs become file names, so anything else is never read or written.
const SESSION_ID = /^[A-Za-z0-9_-]+$/;

/** Saved sessions, one JSON file each, in a folder the system clears when it restarts. */
export function createSessionStore(directory = join(tmpdir(), "opencode-session-usage")): SessionStore {
  const path = (sessionID: string) => join(directory, `${sessionID}.json`);

  return {
    async read(sessionID) {
      if (!SESSION_ID.test(sessionID)) return undefined;

      let text: string;

      try {
        text = await readFile(path(sessionID), "utf8");
      } catch {
        return undefined;
      }

      return parseCachedSession(text, sessionID);
    },
    // Written under a name of its own and renamed into place, so another OpenCode reading at the same time sees a
    // whole file, old or new.
    async write(session) {
      if (!SESSION_ID.test(session.sessionID)) return;

      await mkdir(directory, { recursive: true });
      const temporary = `${path(session.sessionID)}.${process.pid}.${randomUUID()}.tmp`;

      try {
        await writeFile(temporary, JSON.stringify({ cacheVersion: CACHE_VERSION, ...session }));
        await rename(temporary, path(session.sessionID));
      } finally {
        await rm(temporary, { force: true });
      }
    }
  };
}

const Count = Schema.optionalKey(Schema.Number);

const SavedMessage = Schema.Struct({
  id: Schema.optionalKey(Schema.String),
  type: Schema.optionalKey(Schema.String),
  status: Schema.optionalKey(Schema.String),
  model: Schema.optionalKey(Schema.Struct({
    providerID: Schema.optionalKey(Schema.String),
    id: Schema.optionalKey(Schema.String),
    variant: Schema.optionalKey(Schema.String)
  })),
  time: Schema.optionalKey(Schema.Struct({ created: Count, completed: Count })),
  tokens: Schema.optionalKey(Schema.Struct({
    input: Count,
    output: Count,
    reasoning: Count,
    cache: Schema.optionalKey(Schema.Struct({ read: Count, write: Count }))
  }))
});

const decodeSavedSession = Schema.decodeOption(Schema.fromJsonString(Schema.Struct({
  cacheVersion: Schema.Literal(CACHE_VERSION),
  sessionID: Schema.String,
  fingerprint: Schema.String,
  messages: Schema.Array(SavedMessage)
})));

/** The saved session in `text`, or undefined when it is malformed, from another cache version, or another session's. */
function parseCachedSession(text: string, sessionID: string): CachedSession | undefined {
  const saved = Option.getOrUndefined(decodeSavedSession(text));

  if (saved?.sessionID !== sessionID) return undefined;

  return { sessionID, fingerprint: saved.fingerprint, messages: saved.messages };
}
