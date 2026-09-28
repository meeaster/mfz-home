import type { SessionConfig } from "./config";

const hourMs = 3_600_000;

/** When a session started at `startedAt` expires; one hour when no lifetime is configured. */
export function sessionExpiry(session: SessionConfig, startedAt: number): number {
  return startedAt + (session.ttlHours ?? 1) * hourMs;
}
