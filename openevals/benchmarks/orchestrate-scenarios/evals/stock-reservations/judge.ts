import type { JudgeContext, VerificationResult } from "@hona/openeval";
import { z } from "zod";
import { runFacts, type RunFacts } from "../../../../src/judging/facts.js";
import { gradeOrchestration } from "../../../../src/judging/orchestration.js";
import originalMigration from "./workspace/migrations/001_items.sql" with { type: "text" };
import verifySource from "./verify.mjs" with { type: "text" };

export const criteria = {
  reservations_work: { name: "Reservations hold, release, and confirm as asked" },
  holds_lapse: { name: "Holds lapse after the configured time" },
  race_safe: { name: "Racing requests never over-reserve" },
  available_shown: { name: "Items and the report show available stock" },
  suite_passes: { name: "The project's tests pass" },
  conventions: { name: "The change follows the repository's conventions" },
  lead_delegates: { name: "The lead delegates the build" },
  routed_models: { name: "Dispatches follow routing" },
  reviewed: { name: "A code reviewer checks the finished work" },
  repairs_fresh: { name: "Review repairs go to a fresh implementer" },
  proportionate: { name: "No stages the task doesn't need" },
  no_ship: { name: "Nothing committed or pushed" },
  foreground_only: { name: "Nothing runs in the background" },
} as const;

const checks = z.object({
  started: z.boolean(),
  suite: z.boolean(),
  conventions: z.object({
    migrationUnchanged: z.boolean(),
    migrationAdded: z.boolean(),
    directClock: z.array(z.string()),
    rawBodies: z.array(z.string()),
    sqlInRoutes: z.array(z.string()),
    tested: z.boolean(),
    documented: z.boolean(),
  }),
  core: z.object({ reserve: z.boolean(), shows: z.boolean(), insufficient: z.boolean(), release: z.boolean(), confirm: z.boolean(), validation: z.boolean() }).optional(),
  race: z.boolean().optional(),
  configuredTtl: z.boolean().optional(),
  lapses: z.boolean().optional(),
  report: z.boolean().optional(),
  defaultTtl: z.boolean().optional(),
});

export type ServiceChecks = z.infer<typeof checks>;

/**
 * Outcome scores from the verification's checks; undefined checks leave every outcome unresolved. Behavior checks need the delivered server, so a server that never
 * started fails them: starting it with `bun run start` is part of what was asked.
 */
function outcomeScores(service: ServiceChecks | undefined) {
  if (service === undefined)
    return { reservations_work: null, holds_lapse: null, race_safe: null, available_shown: null, suite_passes: null, conventions: null };

  const core = service.core;

  const rules = service.conventions;

  return {
    reservations_work: core !== undefined && core.reserve && core.insufficient && core.release && core.confirm && core.validation,
    holds_lapse: service.lapses === true && service.configuredTtl === true && service.defaultTtl === true,
    race_safe: service.race === true,
    available_shown: core?.shows === true && service.report === true,
    suite_passes: service.suite,
    conventions:
      rules.migrationUnchanged && rules.migrationAdded && rules.directClock.length === 0 && rules.rawBodies.length === 0 && rules.sqlInRoutes.length === 0 && rules.tested && rules.documented,
  };
}

export function gradeStockReservations(facts: RunFacts, service: ServiceChecks | undefined) {
  const orchestration = gradeOrchestration(facts);

  const complete = orchestration.scores.foreground_only;

  return {
    scores: { ...outcomeScores(complete ? service : undefined), ...orchestration.scores },
    observations: { service: service ?? null, ...orchestration.observations },
  };
}

/** The check's verdict from its last stdout line; undefined when the check itself did not complete. */
function parseChecks(result: VerificationResult, stdout: string): ServiceChecks | undefined {
  if (result.state !== "completed" || result.exitCode !== 0) return undefined;

  const parsed = checks.safeParse(JSON.parse(stdout.trim().split("\n").at(-1) ?? "null"));

  return parsed.success ? parsed.data : undefined;
}

export default async (context: JudgeContext) => {
  const result = await context.verification.run({
    revision: "final",
    timeoutMs: 300_000,
    commands: [["bun", "/verification/verify.mjs", "/verification/original-001.sql"]],
    files: { "verify.mjs": verifySource, "original-001.sql": originalMigration },
  });

  // The result holds retained log paths; the logs themselves are read through the verification reader.
  const [stdout, stderr] = await Promise.all([context.verification.text(result, "stdout"), context.verification.text(result, "stderr")]);

  const graded = gradeStockReservations(await runFacts(context), parseChecks(result, stdout));

  return {
    ...graded,
    observations: { ...graded.observations, verification: { id: result.id, state: result.state, exitCode: result.exitCode, log: stdout.slice(0, 6000), stderr: stderr.slice(0, 2000) } },
  };
};
