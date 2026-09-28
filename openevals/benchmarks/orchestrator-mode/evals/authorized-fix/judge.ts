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
import { provisionalEffortFirst, undescribedOutputs } from "../../../../src/judging/catalog.js";

export function gradeFixFacts(facts: RunFacts) {
  const skills = sessionSkills(facts);

  const outOfRole = skillsOutsideRole(skills.root, roleSkills.directCoordinator);

  const targets = subagentTargets(facts.tools);

  const changed = changedPaths(facts.initial, facts.final);

  const withoutFile = dispatchesWithoutFile(facts);

  const unread = returnedFilesUnread(facts);

  const effort = provisionalEffortFirst(facts);

  const outputs = undescribedOutputs(facts);

  return {
    scores: {
      workflow_entered: loadedRoleProcedures(skills.root, "orchestrate"),
      coordinator_skills_in_role: outOfRole.length === 0,
      worker_dispatched: targets.includes("worker"),
      only_source_changed: changed.length === 1 && changed[0] === "src/accept-release.ts",
      dispatches_wrote_files: targets.length > 0 && withoutFile.length === 0,
      returned_files_read: withoutFile.length === 0 && unread.length === 0,
      effort_attached_first: effort.attached,
      outputs_described: outputs.described,
    },
    observations: { skills, outOfRole, subagentTargets: targets, changedPaths: changed, dispatchesWithoutFile: withoutFile, returnedFilesUnread: unread, attachInputs: effort.attachInputs, undescribedOutputs: outputs.undescribed },
  };
}

export default async (context: JudgeContext) => gradeFixFacts(await runFacts(context));
