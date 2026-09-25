import { expect, test } from "bun:test";
import type { RecordedFile, ToolCall } from "@hona/openeval";
import { gradeInstructionFacts } from "./judge.js";

const file = (sha256: string): RecordedFile => ({ path: "policy.md", bytes: 10, sha256 });

const entry: ToolCall = {
  id: "call_skill",
  assistantMessageId: "msg_1",
  name: "skill",
  status: "succeeded",
  input: { id: "orchestrate" },
};

const procedures: ToolCall = { ...entry, id: "call_procedures", input: { id: "orchestration" } };

test("direct read without mutation passes archive criteria", () => {
  const result = gradeInstructionFacts({ tools: [entry, procedures], sessions: [{ id: "ses_root" }], initial: [file("a")], final: [file("a")] });

  expect(result.scores).toEqual({
    workflow_entered: true,
    coordinator_skills_in_role: true,
    no_child_dispatch: true,
    workspace_unchanged: true,
  });
});

test("a child, missing entry, and changed file fail independently", () => {
  const child: ToolCall = { ...entry, name: "subagent", input: { agent: "explore" } };

  const result = gradeInstructionFacts({
    tools: [child],
    sessions: [{ id: "ses_root" }, { id: "ses_child", parentID: "ses_root" }],
    initial: [file("a")],
    final: [file("b")],
  });

  expect(result.scores.workflow_entered).toBe(false);
  expect(result.scores.no_child_dispatch).toBe(false);
  expect(result.scores.workspace_unchanged).toBe(false);
});

test("a denied dispatch attempt still fails no_child_dispatch", () => {
  const denied: ToolCall = { ...entry, id: "call_denied", name: "subagent", status: "failed", input: { agent: "explore" } };

  const result = gradeInstructionFacts({ tools: [entry, procedures, denied], sessions: [{ id: "ses_root" }], initial: [], final: [] });

  expect(result.scores.no_child_dispatch).toBe(false);
});

test("invoking the human-only design entry fails the coordinator's role", () => {
  const design: ToolCall = { ...entry, id: "call_design", input: { id: "design-partner" } };

  const result = gradeInstructionFacts({ tools: [entry, procedures, design], sessions: [{ id: "ses_root" }], initial: [], final: [] });

  expect(result.scores.coordinator_skills_in_role).toBe(false);
  expect(result.observations.outOfRole).toEqual(["design-partner"]);
});
