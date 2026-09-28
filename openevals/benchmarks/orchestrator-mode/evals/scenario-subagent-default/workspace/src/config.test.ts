import { expect, test } from "bun:test";
import { loadConfig } from "./config";

test("development uses the defaults", () => {
  const config = loadConfig("development");

  expect(config.session.ttlHours).toBe(24);
  expect(config.server.port).toBe(8080);
});

test("production listens on port 80", () => {
  expect(loadConfig("production").server.port).toBe(80);
});
