import { expect, test } from "bun:test";
import { call, child, dispatch, type EditableFacts } from "../../../../src/judging/constructed-runs.js";
import { gradeFrameCriteria } from "./judge.js";

function proposingRun(): EditableFacts {
  return {
    tools: [
      call("ses_root", "skill", { id: "orchestrate" }),
      call("ses_root", "skill", { id: "orchestration-routing" }),
      dispatch("ses_explore", "explorer: map the todo CLI"),
    ],
    sessions: [{ id: "ses_root", model: { providerID: "openai", id: "gpt-6.1-sol", variant: "medium" } }, child("ses_explore", "openai/gpt-6-luna#high")],
    initial: [{ path: "src/cli.js", bytes: 10, sha256: "a" }],
    final: [{ path: "src/cli.js", bytes: 10, sha256: "a" }],
  };
}

test("gathering and then stopping to propose passes", () => {
  expect(gradeFrameCriteria(proposingRun()).scores).toEqual({ waits_for_confirmation: true, foreground_only: true });
});

test("dispatching an implementer before confirmation fails, even if the project is unchanged", () => {
  const facts = proposingRun();

  facts.tools.push(dispatch("ses_build", "implementer: add due dates"));
  facts.sessions.push(child("ses_build", "openai/gpt-6-luna#max"));

  expect(gradeFrameCriteria(facts).scores.waits_for_confirmation).toBe(false);
});

test("a project change without any implementer still fails", () => {
  const facts = proposingRun();

  facts.final = [{ path: "src/cli.js", bytes: 12, sha256: "b" }];

  expect(gradeFrameCriteria(facts).scores.waits_for_confirmation).toBe(false);
});
