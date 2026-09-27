import { expect, test } from "bun:test";
import { acceptRelease } from "./accept-release";

test("accepts READY regardless of case or surrounding spaces", () => {
  expect(acceptRelease(" READY ")).toBe(true);
  expect(acceptRelease("ready")).toBe(true);
  expect(acceptRelease(" Ready")).toBe(true);
});

test("rejects other statuses", () => {
  expect(acceptRelease("READY!")).toBe(false);
  expect(acceptRelease("pending")).toBe(false);
});
