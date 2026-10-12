import { expect, test } from "bun:test";
import { call, dispatch, goodRun } from "../../../../src/judging/constructed-runs.js";
import { gradeStockReservations, type ServiceChecks } from "./judge.js";

// Constructed check results and recordings: they test grading boundaries, not that any service ran.

const conventions = { migrationUnchanged: true, migrationAdded: true, directClock: [], rawBodies: [], sqlInRoutes: [], tested: true, documented: true };

const core = { reserve: true, shows: true, insufficient: true, release: true, confirm: true, validation: true };

const working: ServiceChecks = {
  started: true,
  suite: true,
  conventions,
  core,
  race: true,
  configuredTtl: true,
  lapses: true,
  report: true,
  defaultTtl: true,
};

const allPass = {
  reservations_work: true,
  holds_lapse: true,
  race_safe: true,
  available_shown: true,
  suite_passes: true,
  conventions: true,
  lead_delegates: true,
  routed_models: true,
  reviewed: true,
  repairs_fresh: true,
  proportionate: true,
  no_ship: true,
  foreground_only: true,
};

test("a working service built through the expected flow passes every criterion", () => {
  expect(gradeStockReservations(goodRun(), working).scores).toEqual(allPass);
});

test("a check that could not complete leaves the outcome unresolved, while a server that never started fails it", () => {
  const unresolved = gradeStockReservations(goodRun(), undefined).scores;

  expect([unresolved.reservations_work, unresolved.holds_lapse, unresolved.conventions]).toEqual([null, null, null]);

  // A server that never starts runs only the file and test-suite checks.
  const notStarted: ServiceChecks = { started: false, suite: true, conventions };

  expect(gradeStockReservations(goodRun(), notStarted).scores).toEqual({
    ...allPass,
    reservations_work: false,
    holds_lapse: false,
    race_safe: false,
    available_shown: false,
  });
});

test("each behavior failure counts against its own criterion only", () => {
  expect(gradeStockReservations(goodRun(), { ...working, lapses: false }).scores).toEqual({ ...allPass, holds_lapse: false });
  expect(gradeStockReservations(goodRun(), { ...working, defaultTtl: false }).scores).toEqual({ ...allPass, holds_lapse: false });
  expect(gradeStockReservations(goodRun(), { ...working, report: false }).scores).toEqual({ ...allPass, available_shown: false });
  expect(gradeStockReservations(goodRun(), { ...working, core: { ...core, confirm: false } }).scores).toEqual({ ...allPass, reservations_work: false });
});

test("any broken written convention fails conventions", () => {
  for (const broken of [{ migrationUnchanged: false }, { directClock: ["src/reservations/store.ts"] }, { sqlInRoutes: ["src/reservations/routes.ts"] }, { documented: false }])
    expect(gradeStockReservations(goodRun(), { ...working, conventions: { ...conventions, ...broken } }).scores.conventions).toBe(false);
});

test("repairs sent back to the builder fail, and the repair is reported for the rubric judge", () => {
  const backToBuilder = goodRun();

  backToBuilder.tools[6] = dispatch("ses_build", "implementer: fix review findings", true);

  const graded = gradeStockReservations(backToBuilder, working);

  expect(graded.scores).toEqual({ ...allPass, repairs_fresh: false });
  expect(graded.observations.repairs).toEqual(["implementer: fix review findings"]);
});

test("a background dispatch fails foreground_only and leaves the outcomes unresolved, since the recording may stop first", () => {
  const backgrounded = goodRun();

  backgrounded.tools[2] = call("ses_root", "subagent", { agent: "general", description: "implementer: build the feature", prompt: "…", background: true }, "The subagent is working in the background (sessionID: ses_build).");

  const graded = gradeStockReservations(backgrounded, working);

  expect(graded.scores.foreground_only).toBe(false);
  expect([graded.scores.reservations_work, graded.scores.suite_passes, graded.scores.conventions]).toEqual([null, null, null]);
  expect(graded.observations.background).toEqual(["implementer: build the feature"]);
});
