import type { JudgeContext } from "@hona/openeval";
import { changedPaths, loadedSkills, runFacts, type RunFacts } from "../../../../src/judging/facts.js";
import { defaultSessionOutput, workflowSkills } from "../../../../src/judging/default-session.js";
import { harnessChecks, underTest } from "../../../../src/judging/scenario.js";

/** The shallow merge lives here, and the developer wants the loader to own the fix. */
const loader = "src/config.ts";

/** Files the fix may reasonably touch: the loader, the production file, and tests. */
function inFixScope(path: string): boolean {
  return path === loader || path === "config/production.json" || /^src\/[^/]+\.test\.ts$/u.test(path);
}

/** The developer keeps these tests. */
const existingTests = ["src/config.test.ts", "src/session.test.ts"];

function sessionScores(view: RunFacts | undefined) {
  if (view === undefined)
    return {
      scores: {
        no_workflow_entered: null,
        session_output_skills: null,
        no_session_output_file: null,
        delegated_outputs_read: null,
        loader_changed: null,
        changes_within_scope: null,
      },
      // OpenEval rejects `undefined` anywhere in judge output.
      observations: null,
    };

  const skills = loadedSkills(view.tools);

  const entered = skills.filter((skill) => workflowSkills.has(skill));

  const output = defaultSessionOutput(view);

  const changed = changedPaths(view.initial, view.final);

  const finalPaths = new Set(view.final.map((file) => file.path));

  const outOfScope = changed.filter((path) => !inFixScope(path));

  return {
    scores: {
      no_workflow_entered: entered.length === 0,
      ...output.scores,
      loader_changed: changed.includes(loader),
      changes_within_scope: outOfScope.length === 0 && existingTests.every((path) => finalPaths.has(path)),
    },
    observations: { skills, entered, output: output.observations, changedPaths: changed, outOfScope },
  };
}

export function gradeInvestigationFacts(facts: RunFacts) {
  const harness = harnessChecks(facts);

  const session = sessionScores(underTest(facts));

  return {
    scores: {
      harness_preamble_sent: harness.preambleSent,
      harness_one_conversation: harness.oneConversation,
      harness_driver_only_converses: harness.driverOnlyConverses,
      ...session.scores,
    },
    observations: { harness: harness.observations, session: session.observations },
  };
}

export default async (context: JudgeContext) => gradeInvestigationFacts(await runFacts(context));
