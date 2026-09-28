import type { JudgeContext } from "@hona/openeval";
import {
  attemptedTools,
  changedPaths,
  childSessionCount,
  dispatchTools,
  loadedRoleProcedures,
  roleSkills,
  runFacts,
  sessionSkills,
  skillsOutsideRole,
  type RunFacts,
} from "../../../../src/judging/facts.js";
import { provisionalEffortFirst, undescribedOutputs } from "../../../../src/judging/catalog.js";

export function gradeInstructionFacts(facts: RunFacts) {
  const skills = sessionSkills(facts);

  const outOfRole = skillsOutsideRole([...skills.root, ...skills.children], roleSkills.directCoordinator);

  const dispatches = attemptedTools(facts.tools, dispatchTools);

  const children = childSessionCount(facts.sessions);

  const changed = changedPaths(facts.initial, facts.final);

  const effort = provisionalEffortFirst(facts);

  return {
    scores: {
      workflow_entered: loadedRoleProcedures(skills.root, "orchestrate"),
      coordinator_skills_in_role: outOfRole.length === 0,
      no_child_dispatch: dispatches.length === 0 && children === 0,
      workspace_unchanged: changed.length === 0,
      effort_attached_first: effort.attached,
    },
    observations: { skills, outOfRole, dispatchTools: dispatches, childSessions: children, changedPaths: changed, attachInputs: effort.attachInputs },
  };
}

export default async (context: JudgeContext) => gradeInstructionFacts(await runFacts(context));
