import type { JudgeContext, VerificationResult } from "@hona/openeval";
import { z } from "zod";
import { dispatchesBy, rootSession, skillsIn, subtree } from "../../../../src/judging/dispatches.js";
import { changedPaths, runFacts, type RunFacts } from "../../../../src/judging/facts.js";
import { gradeOrchestration } from "../../../../src/judging/orchestration.js";

export const criteria = {
  sorted_by_due: { name: "`list` sorts by due date, undated items last" },
  lead_delegates: { name: "The lead delegates the change" },
  routed_models: { name: "Dispatches follow routing" },
  scaled_to_task: { name: "No stages a small change doesn't need" },
  implementer_loads_verification: { name: "The implementer loads the verification skill" },
  project_clean: { name: "Only source changed; no evidence left in the project" },
  no_ship: { name: "Nothing committed or pushed" },
  foreground_only: { name: "Nothing runs in the background" },
} as const;

/** A one-line sort change needs one implementer that verifies its own work; these roles add cost without need. */
const heavyRoles: ReadonlySet<string> = new Set(["architect", "reviewer", "inspector", "qa", "prototyper", "triage"]);

/** Source the change may touch: the CLI and any tests for it. Sample data and everything else must stay as it was. */
const allowedChange = /^(?:src\/.+|(?:test|tests)\/.+|.+\.test\.[cm]?[jt]s)$/u;

export const checkSource = `
const child = Bun.spawnSync(["bun", "run", "--silent", "todo", "list"], { stdout: "pipe", stderr: "pipe", timeout: 15_000 });
const ids = child.stdout.toString().split("\\n").map((line) => /^\\[[ x]\\]\\s+(\\d+)\\b/.exec(line)?.[1]).filter(Boolean).map(Number);
// Due: 3 (10-15), 5 (10-18), 1 (11-20); undated 2 and 4 in either order at the end.
const dated = ids.slice(0, 3).join(",") === "3,5,1";
const undated = [...ids.slice(3)].sort().join(",") === "2,4";
console.log(JSON.stringify({ sorted: child.exitCode === 0 && ids.length === 5 && dated && undated, ids, exitCode: child.exitCode }));
`;

const listCheck = z.object({ sorted: z.boolean() });

export function gradeSmallChange(facts: RunFacts, sorted: boolean | undefined) {
  const orchestration = gradeOrchestration(facts);

  const root = rootSession(facts.sessions);

  if (root === undefined) throw new Error("The recording has no root session");

  const dispatches = dispatchesBy(facts, root.id);

  const heavy = dispatches.filter((dispatch) => dispatch.role !== undefined && heavyRoles.has(dispatch.role));

  const implementerSkills = dispatches
    .filter((dispatch) => dispatch.role === "implementer" && dispatch.childID !== undefined)
    .flatMap((dispatch) => skillsIn(facts, subtree(facts.sessions, dispatch.childID ?? "")));

  const changed = changedPaths(facts.initial, facts.final);

  const stray = changed.filter((path) => !allowedChange.test(path));

  return {
    scores: {
      // Background work may not have finished when the recording stopped, so the behavior check can't settle the outcome.
      sorted_by_due: sorted === undefined || !orchestration.scores.foreground_only ? null : sorted,
      lead_delegates: orchestration.scores.lead_delegates,
      routed_models: orchestration.scores.routed_models,
      scaled_to_task: heavy.length === 0,
      implementer_loads_verification: implementerSkills.includes("verification"),
      project_clean: stray.length === 0,
      no_ship: orchestration.scores.no_ship,
      foreground_only: orchestration.scores.foreground_only,
    },
    observations: { ...orchestration.observations, heavy: heavy.map((dispatch) => dispatch.description), implementerSkills, changed, stray },
  };
}

function parseCheck(result: VerificationResult, stdout: string): boolean | undefined {
  if (result.state !== "completed" || result.exitCode !== 0) return undefined;

  const parsed = listCheck.safeParse(JSON.parse(stdout.trim().split("\n").at(-1) ?? "null"));

  return parsed.success ? parsed.data.sorted : undefined;
}

export default async (context: JudgeContext) => {
  const result = await context.verification.run({ revision: "final", timeoutMs: 60_000, commands: [["bun", "/verification/check.mjs"]], files: { "check.mjs": checkSource } });

  const stdout = await context.verification.text(result, "stdout");

  const graded = gradeSmallChange(await runFacts(context), parseCheck(result, stdout));

  return { ...graded, observations: { ...graded.observations, verification: { id: result.id, state: result.state, exitCode: result.exitCode, stdout: stdout.slice(0, 2000) } } };
};
