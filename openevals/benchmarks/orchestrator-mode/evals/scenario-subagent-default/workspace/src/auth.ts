import { loadConfig } from "./config";
import { sessionExpiry } from "./session";

export type Session = { userId: string; expiresAt: number; sliding: boolean };

/** Start a session for a signed-in user under the running environment's configuration. */
export function issueSession(userId: string, now = Date.now()): Session {
  const { session } = loadConfig();

  return { userId, expiresAt: sessionExpiry(session, now), sliding: session.slidingRefresh === true };
}
