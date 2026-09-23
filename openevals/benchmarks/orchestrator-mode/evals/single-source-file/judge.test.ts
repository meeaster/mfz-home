import { expect, test } from "bun:test";
import type { RecordedFile, ToolCall } from "@hona/openeval";
import { gradeSourceFacts } from "./judge.js";

const file = (sha256: string): RecordedFile => ({ path: "src/accept-release.ts", bytes: 10, sha256 });

const explore: ToolCall = {
  id: "call_explore",
  assistantMessageId: "msg_1",
  name: "subagent",
  status: "succeeded",
  input: { agent: "explore" },
};

test("completed explore dispatch and unchanged file pass archive criteria", () => {
  const result = gradeSourceFacts(
    [explore],
    [{ parentID: undefined }, { parentID: "ses_parent" }],
    [file("a")],
    [file("a")],
  );

  expect(result.scores).toEqual({ explore_dispatched: true, workspace_unchanged: true });
});

test("direct investigation without a child fails routing even with a correct answer", () => {
  const result = gradeSourceFacts([], [{ parentID: undefined }], [file("a")], [file("a")]);

  expect(result.scores).toEqual({ explore_dispatched: false, workspace_unchanged: true });
});

test("a failed explore call and a changed file fail independently", () => {
  const result = gradeSourceFacts(
    [{ ...explore, status: "failed" }],
    [{ parentID: undefined }],
    [file("a")],
    [file("b")],
  );

  expect(result.scores).toEqual({ explore_dispatched: false, workspace_unchanged: false });
});
