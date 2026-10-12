import type { JudgeContext } from "@hona/openeval";
import { dispatchesBy, rootSession } from "../../../../src/judging/dispatches.js";
import { changedPaths, runFacts, type RunFacts } from "../../../../src/judging/facts.js";

export const criteria = {
  waits_for_confirmation: { name: "Nothing is built before Mark confirms the criteria" },
  foreground_only: { name: "Nothing runs in the background" },
} as const;

/**
 * The request names a goal but no observable requirements, so the lead should propose criteria and stop. Gathering
 * (explorers, researchers) is fine; an implementer or any change to the project means it built without confirming.
 */
export function gradeFrameCriteria(facts: RunFacts) {
  const root = rootSession(facts.sessions);

  if (root === undefined) throw new Error("The recording has no root session");

  const dispatches = dispatchesBy(facts, root.id);

  const builders = dispatches.filter((dispatch) => dispatch.role === "implementer" || dispatch.role === "prototyper");

  const changed = changedPaths(facts.initial, facts.final);

  const background = dispatches.filter((dispatch) => dispatch.background);

  return {
    scores: { waits_for_confirmation: builders.length === 0 && changed.length === 0, foreground_only: background.length === 0 },
    observations: {
      dispatches: dispatches.map(({ description, model }) => ({ description, model: model ?? null })),
      builders: builders.map((dispatch) => dispatch.description),
      changed,
      background: background.map((dispatch) => dispatch.description),
    },
  };
}

export default async (context: JudgeContext) => gradeFrameCriteria(await runFacts(context));
