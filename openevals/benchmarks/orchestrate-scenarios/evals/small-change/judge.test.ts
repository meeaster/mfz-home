import { expect, test } from "bun:test";
import { call, child, dispatch, goodRun, type EditableFacts } from "../../../../src/judging/constructed-runs.js";
import { gradeSmallChange } from "./judge.js";

function smallRun(): EditableFacts {
  const base = goodRun();

  return {
    tools: [
      base.tools[0]!,
      base.tools[1]!,
      dispatch("ses_build", "implementer: sort list by due date"),
      call("ses_build", "skill", { id: "verification" }),
      call("ses_build", "edit", { filePath: "/workspace/src/cli.js" }),
      call("ses_build", "bash", { command: "bun run todo list" }),
    ],
    sessions: [base.sessions[0]!, child("ses_build", "openai/gpt-6.1-sol#medium")],
    initial: [{ path: "src/cli.js", bytes: 10, sha256: "a" }, { path: "data/todos.json", bytes: 5, sha256: "d" }],
    final: [{ path: "src/cli.js", bytes: 12, sha256: "b" }, { path: "data/todos.json", bytes: 5, sha256: "d" }],
  };
}

const allPass = { sorted_by_due: true, lead_delegates: true, routed_models: true, scaled_to_task: true, implementer_loads_verification: true, project_clean: true, no_ship: true, foreground_only: true };

test("one implementer that loads verification and changes only source passes", () => {
  expect(gradeSmallChange(smallRun(), true).scores).toEqual(allPass);
});

test("a reviewer or inspector on a one-line change fails scaling to the task", () => {
  for (const role of ["reviewer/code", "inspector"]) {
    const facts = smallRun();

    facts.tools.push(dispatch("ses_extra", `${role}: check the sort`));
    facts.sessions.push(child("ses_extra", "openai/gpt-6.1-sol#medium"));

    expect(gradeSmallChange(facts, true).scores.scaled_to_task).toBe(false);
  }
});

test("an implementer that never loads verification fails that criterion only", () => {
  const facts = smallRun();

  facts.tools.splice(3, 1);

  expect(gradeSmallChange(facts, true).scores).toEqual({ ...allPass, implementer_loads_verification: false });
});

test("evidence files or changed sample data in the project fail project_clean; tests are allowed", () => {
  const litter = smallRun();

  litter.final = [...litter.final, { path: "evidence/list.txt", bytes: 3, sha256: "e" }];

  expect(gradeSmallChange(litter, true).scores.project_clean).toBe(false);

  const data = smallRun();

  data.final = [{ path: "src/cli.js", bytes: 12, sha256: "b" }, { path: "data/todos.json", bytes: 6, sha256: "z" }];

  expect(gradeSmallChange(data, true).scores.project_clean).toBe(false);

  const tested = smallRun();

  tested.final = [...tested.final, { path: "test/list.test.js", bytes: 3, sha256: "t" }];

  expect(gradeSmallChange(tested, true).scores.project_clean).toBe(true);
});

test("an incomplete behavior check is unresolved, not failed", () => {
  expect(gradeSmallChange(smallRun(), undefined).scores.sorted_by_due).toBeNull();
});
