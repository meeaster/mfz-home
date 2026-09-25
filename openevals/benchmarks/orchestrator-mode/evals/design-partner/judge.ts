import type { JudgeContext } from "@hona/openeval";
import {
  attemptedTools,
  changedPaths,
  childSessionCount,
  dispatchTools,
  roleSkills,
  runFacts,
  sessionSkills,
  skillsOutsideRole,
  type RunFacts,
} from "../../../../src/judging/facts.js";

export function gradeDesignFacts(facts: RunFacts) {
  const skills = sessionSkills(facts);

  const outOfRole = skillsOutsideRole([...skills.root, ...skills.children], roleSkills.designPartner);

  const dispatches = attemptedTools(facts.tools, dispatchTools);

  const children = childSessionCount(facts.sessions);

  const changed = changedPaths(facts.initial, facts.final);

  return {
    scores: {
      design_skill_loaded: skills.root.includes("design-partner"),
      skills_in_role: outOfRole.length === 0,
      no_child_dispatch: dispatches.length === 0 && children === 0,
      workspace_unchanged: changed.length === 0,
    },
    observations: { skills, outOfRole, dispatchTools: dispatches, childSessions: children, changedPaths: changed },
  };
}

export default async (context: JudgeContext) => gradeDesignFacts(await runFacts(context));
