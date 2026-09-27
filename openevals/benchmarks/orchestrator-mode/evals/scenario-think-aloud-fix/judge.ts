import type { JudgeContext } from "@hona/openeval";
import {
  changedPaths,
  dispatchesWithoutFile,
  loadedRoleProcedures,
  returnedFilesUnread,
  roleSkills,
  runFacts,
  sessionSkills,
  skillsOutsideRole,
  subagentTargets,
  type RunFacts,
} from "../../../../src/judging/facts.js";
import { harnessChecks, underTest } from "../../../../src/judging/scenario.js";

/** Where dispatched agents save their results under the installed output guidance. */
const resultDirectory = "/orchestrator-workspaces/";

/** Direct-coordinator facts for the agent under test; null when no single conversation identifies it. */
function coordinatorScores(view: RunFacts | undefined) {
  if (view === undefined)
    return {
      scores: {
        workflow_entered: null,
        coordinator_skills_in_role: null,
        worker_dispatched: null,
        only_source_changed: null,
        dispatches_wrote_files: null,
        returned_files_read: null,
      },
      // OpenEval rejects `undefined` anywhere in judge output.
      observations: null,
    };

  const skills = sessionSkills(view);

  const outOfRole = skillsOutsideRole(skills.root, roleSkills.directCoordinator);

  const targets = subagentTargets(view.tools);

  const changed = changedPaths(view.initial, view.final);

  const withoutFile = dispatchesWithoutFile(view, resultDirectory);

  const unread = returnedFilesUnread(view, resultDirectory);

  return {
    scores: {
      workflow_entered: loadedRoleProcedures(skills.root, "orchestrate"),
      coordinator_skills_in_role: outOfRole.length === 0,
      worker_dispatched: targets.includes("worker"),
      only_source_changed: changed.length === 1 && changed[0] === "src/accept-release.ts",
      dispatches_wrote_files: targets.length > 0 && withoutFile.length === 0,
      returned_files_read: withoutFile.length === 0 && unread.length === 0,
    },
    observations: { skills, outOfRole, subagentTargets: targets, changedPaths: changed, dispatchesWithoutFile: withoutFile, returnedFilesUnread: unread },
  };
}

export function gradeScenarioFacts(facts: RunFacts) {
  const harness = harnessChecks(facts);

  const coordinator = coordinatorScores(underTest(facts));

  return {
    scores: {
      harness_preamble_sent: harness.preambleSent,
      harness_one_conversation: harness.oneConversation,
      harness_driver_only_converses: harness.driverOnlyConverses,
      ...coordinator.scores,
    },
    observations: { harness: harness.observations, coordinator: coordinator.observations },
  };
}

export default async (context: JudgeContext) => gradeScenarioFacts(await runFacts(context));
