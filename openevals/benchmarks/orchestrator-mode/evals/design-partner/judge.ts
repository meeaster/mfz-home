import type { JudgeContext } from "@hona/openeval";
import { z } from "zod";
import {
  attemptedTools,
  catalogCalls,
  changedPaths,
  childSessionCount,
  dispatchTools,
  roleSkills,
  runFacts,
  sessionSkills,
  skillsOutsideRole,
  type RunFacts,
} from "../../../../src/judging/facts.js";

const findInput = z.object({ target: z.literal("efforts") });

const attachInput = z.object({ attach: z.array(z.union([z.string(), z.object({})])).min(1) });

/**
 * Design partnership recommends an effort once the design has a subject: it searches existing efforts first,
 * and attaches only after the human approves, which this single turn never supplies.
 */
function effortRecommendation(facts: RunFacts) {
  const searches = catalogCalls(facts, "find").filter((call) => findInput.safeParse(call.input).success);

  const attaches = catalogCalls(facts, "session").filter((call) => attachInput.safeParse(call.input).success);

  return { searched: searches.length > 0, attached: attaches.length > 0, attachInputs: attaches.map((call) => call.input) };
}

export function gradeDesignFacts(facts: RunFacts) {
  const skills = sessionSkills(facts);

  const outOfRole = skillsOutsideRole([...skills.root, ...skills.children], roleSkills.designPartner);

  const dispatches = attemptedTools(facts.tools, dispatchTools);

  const children = childSessionCount(facts.sessions);

  const changed = changedPaths(facts.initial, facts.final);

  const effort = effortRecommendation(facts);

  return {
    scores: {
      design_skill_loaded: skills.root.includes("design-partner"),
      skills_in_role: outOfRole.length === 0,
      no_child_dispatch: dispatches.length === 0 && children === 0,
      workspace_unchanged: changed.length === 0,
      efforts_searched: effort.searched,
      effort_not_attached: !effort.attached,
    },
    observations: { skills, outOfRole, dispatchTools: dispatches, childSessions: children, changedPaths: changed, attachInputs: effort.attachInputs },
  };
}

export default async (context: JudgeContext) => gradeDesignFacts(await runFacts(context));
