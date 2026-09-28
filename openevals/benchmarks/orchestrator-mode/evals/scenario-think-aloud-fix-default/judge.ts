import type { JudgeContext } from "@hona/openeval";
import { changedPaths, loadedSkills, runFacts, type RunFacts } from "../../../../src/judging/facts.js";
import { workflowSkills } from "../../../../src/judging/default-session.js";
import { harnessChecks, underTest } from "../../../../src/judging/scenario.js";

/** Default-session facts for the agent under test; null when no single conversation identifies it. */
function defaultSessionScores(view: RunFacts | undefined) {
  if (view === undefined)
    return {
      scores: { no_workflow_entered: null, only_source_changed: null },
      // OpenEval rejects `undefined` anywhere in judge output.
      observations: null,
    };

  const skills = loadedSkills(view.tools);

  const entered = skills.filter((skill) => workflowSkills.has(skill));

  const changed = changedPaths(view.initial, view.final);

  return {
    scores: {
      no_workflow_entered: entered.length === 0,
      only_source_changed: changed.length === 1 && changed[0] === "src/accept-release.ts",
    },
    observations: { skills, entered, changedPaths: changed },
  };
}

export function gradeDefaultScenarioFacts(facts: RunFacts) {
  const harness = harnessChecks(facts);

  const session = defaultSessionScores(underTest(facts));

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

export default async (context: JudgeContext) => gradeDefaultScenarioFacts(await runFacts(context));
