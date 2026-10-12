import { createApp } from "../src/app";
import type { Clock } from "../src/clock";
import { openDatabase } from "../src/db";
import type { JsonObject } from "../src/http/parse";

/** A clock that moves only when a test advances it. */
export function fixedClock(start = Date.parse("2026-01-05T09:00:00Z")): Clock & { advance(ms: number): void } {
  let now = start;

  return { now: () => now, advance: (ms) => void (now += ms) };
}

/** An app over a fresh in-memory database, with helpers for JSON requests. */
export function testApp(clock = fixedClock()) {
  const db = openDatabase(":memory:");
  const app = createApp({ db, clock });

  const send = (method: string, path: string, body?: JsonObject) =>
    app(new Request(`http://inventory.test${path}`, { method, body: body === undefined ? undefined : JSON.stringify(body) }));

  return { db, clock, send };
}
