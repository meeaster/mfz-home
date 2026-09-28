import type { JudgeContext } from "@hona/openeval";
import {
  changedPaths,
  childSessionCount,
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

/**
 * Grade the archive facts. The response is graded separately by `judge.md`;
 * these criteria must be decidable without reading the response.
 */
export function gradeFacts(facts: RunFacts) {
  const skills = sessionSkills(facts);

  const outOfRole = {
    root: skillsOutsideRole(skills.root, roleSkills.directCoordinator),
    children: skillsOutsideRole(skills.children, roleSkills.evidenceProducer),
  };

  const targets = subagentTargets(facts.tools);

  const children = childSessionCount(facts.sessions);

  const changed = changedPaths(facts.initial, facts.final);

  const withoutFile = dispatchesWithoutFile(facts);

  const unread = returnedFilesUnread(facts);

  const effort = provisionalEffortFirst(facts);

  const outputs = undescribedOutputs(facts);

  return {
    scores: {
      workflow_entered: loadedRoleProcedures(skills.root, "orchestrate"),
      coordinator_skills_in_role: outOfRole.root.length === 0,
      producer_skills_in_role: outOfRole.children.length === 0,
      explore_dispatched: targets.includes("explore") && children > 0,
      repository_unchanged: changed.length === 0,
      dispatches_wrote_files: children > 0 && withoutFile.length === 0,
      returned_files_read: withoutFile.length === 0 && unread.length === 0,
      effort_attached_first: effort.attached,
      outputs_described: outputs.described,
    },
    observations: { skills, outOfRole, subagentTargets: targets, childSessions: children, changedPaths: changed, dispatchesWithoutFile: withoutFile, returnedFilesUnread: unread, attachInputs: effort.attachInputs, undescribedOutputs: outputs.undescribed },
  };
}

export default async (context: JudgeContext) => gradeFacts(await runFacts(context));
