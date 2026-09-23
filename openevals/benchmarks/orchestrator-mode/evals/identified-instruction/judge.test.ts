import { expect, test } from "bun:test";
import type { RecordedFile, ToolCall } from "@hona/openeval";
import { gradeInstructionFacts } from "./judge.js";

const file = (sha256: string): RecordedFile => ({ path: "policy.md", bytes: 10, sha256 });

const skill: ToolCall = {
  id: "call_skill",
  assistantMessageId: "msg_1",
  name: "skill",
  status: "succeeded",
  input: { id: "orchestrator-mode" },
};

test("direct read without mutation passes archive criteria", () => {
  const result = gradeInstructionFacts([skill], [{ parentID: undefined }], [file("a")], [file("a")]);

  expect(result.scores).toEqual({
    guidance_loaded: true,
    no_child_dispatch: true,
    workspace_unchanged: true,
  });
});

test("a successful child, missing skill, and changed file fail independently", () => {
  const child: ToolCall = { ...skill, name: "subagent", input: { agent: "explore" } };

  const result = gradeInstructionFacts(
    [child],
    [{ parentID: undefined }, { parentID: "ses_parent" }],
    [file("a")],
    [file("b")],
  );

  expect(result.scores).toEqual({
    guidance_loaded: false,
    no_child_dispatch: false,
    workspace_unchanged: false,
  });
});
