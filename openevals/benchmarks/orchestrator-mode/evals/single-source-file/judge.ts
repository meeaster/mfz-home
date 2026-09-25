import type { JudgeContext } from "@hona/openeval";
import {
  changedPaths,
  childSessionCount,
  loadedRoleProcedures,
  roleSkills,
  runFacts,
  sessionSkills,
  skillsOutsideRole,
  subagentTargets,
  type RunFacts,
} from "../../../../src/judging/facts.js";

export function gradeSourceFacts(facts: RunFacts) {
  const skills = sessionSkills(facts);

  const outOfRole = {
    root: skillsOutsideRole(skills.root, roleSkills.directCoordinator),
    children: skillsOutsideRole(skills.children, roleSkills.evidenceProducer),
  };

  const targets = subagentTargets(facts.tools);

  const children = childSessionCount(facts.sessions);

  const changed = changedPaths(facts.initial, facts.final);

  return {
    scores: {
      workflow_entered: loadedRoleProcedures(skills.root, "orchestrate"),
      coordinator_skills_in_role: outOfRole.root.length === 0,
      producer_skills_in_role: outOfRole.children.length === 0,
      explore_dispatched: targets.includes("explore") && children > 0,
      workspace_unchanged: changed.length === 0,
    },
    observations: { skills, outOfRole, subagentTargets: targets, childSessions: children, changedPaths: changed },
  };
}

export default async (context: JudgeContext) => gradeSourceFacts(await runFacts(context));
