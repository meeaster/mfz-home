import { expect, test } from "bun:test";
import type { RecordedFile, ToolCall } from "@hona/openeval";
import { gradeDesignFacts } from "./judge.js";

const design: ToolCall = {
  id: "call_design",
  assistantMessageId: "msg_1",
  name: "skill",
  status: "succeeded",
  input: { id: "design-partner" },
};

const captured: RecordedFile = { path: "context.md", bytes: 10, sha256: "captured" };

test("standalone selection passes the archive facts", () => {
  expect(gradeDesignFacts({ tools: [design], sessions: [{ id: "ses_root" }], initial: [], final: [] }).scores).toEqual({
    design_skill_loaded: true,
    skills_in_role: true,
    no_child_dispatch: true,
    workspace_unchanged: true,
  });
});

test("any orchestration or evidence-production skill load fails even when design also loaded", () => {
  for (const id of ["orchestrate", "orchestrate-chief", "orchestration", "task-evidence"]) {
    const orchestration = { ...design, id: `call_${id}`, input: { id } };

    const result = gradeDesignFacts({ tools: [design, orchestration], sessions: [{ id: "ses_root" }], initial: [], final: [] });

    expect(result.scores.skills_in_role).toBe(false);
  }
});

test("a recorded child and newly created capture fail without a dispatch tool record", () => {
  const result = gradeDesignFacts({ tools: [design], sessions: [{ id: "ses_root" }, { id: "ses_child", parentID: "ses_root" }], initial: [], final: [captured] });

  expect(result.scores.design_skill_loaded).toBe(true);
  expect(result.scores.no_child_dispatch).toBe(false);
  expect(result.scores.workspace_unchanged).toBe(false);
});

test("a successful unrelated tool with a skill-shaped input is not a skill load", () => {
  const result = gradeDesignFacts({ tools: [{ ...design, name: "read" }], sessions: [{ id: "ses_root" }], initial: [], final: [] });

  expect(result.scores.design_skill_loaded).toBe(false);
});
