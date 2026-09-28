import { expect, test } from "bun:test";
import { sessionExpiry } from "./session";

test("a session lasts its configured lifetime", () => {
  expect(sessionExpiry({ ttlHours: 24 }, 0)).toBe(24 * 3_600_000);
});

test("a session without a configured lifetime lasts one hour", () => {
  expect(sessionExpiry({}, 0)).toBe(3_600_000);
});
