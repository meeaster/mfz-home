import { expect, test } from "bun:test";
import type { RecordedFile, ToolCall } from "@hona/openeval";
import { gradeFixFacts } from "./judge.js";

const source = (sha256: string): RecordedFile => ({ path: "src/accept-release.ts", bytes: 10, sha256 });

const tests: RecordedFile = { path: "src/accept-release.test.ts", bytes: 10, sha256: "t" };

const call = (id: string, sessionID: string, name: string, input: ToolCall["input"]): ToolCall => ({
  id,
  sessionID,
  assistantMessageId: "msg_1",
  name,
  status: "succeeded",
  input,
});

const entered = [call("entry", "ses_root", "skill", { id: "orchestrate" }), call("procedures", "ses_root", "skill", { id: "orchestration" })];

const dispatch = call("dispatch", "ses_root", "subagent", { agent: "worker" });

const fix = call("fix", "ses_worker", "edit", { filePath: "/workspace/src/accept-release.ts" });

const result = call("result", "ses_worker", "write", {
  filePath: "/home/dev/workspace/scratch/orchestrator-workspaces/e/evidence/accept-release-fix--worker.md",
});

const readResult = call("read-result", "ses_root", "read", {
  path: "/home/dev/workspace/scratch/orchestrator-workspaces/e/evidence/accept-release-fix--worker.md",
});

const sessions = [{ id: "ses_root" }, { id: "ses_worker", parentID: "ses_root" }];

test("a worker fix with a result file passes the archive criteria", () => {
  const graded = gradeFixFacts({
    tools: [...entered, dispatch, fix, result, readResult],
    sessions,
    initial: [source("a"), tests],
    final: [source("b"), tests],
  });

  expect(Object.values(graded.scores).every(Boolean)).toBe(true);
});

test("a worker that returns without a result file fails only the file criteria", () => {
  const graded = gradeFixFacts({ tools: [...entered, dispatch, fix], sessions, initial: [source("a"), tests], final: [source("b"), tests] });

  expect(graded.scores.dispatches_wrote_files).toBe(false);
  expect(graded.scores.returned_files_read).toBe(false);
  expect(graded.scores.worker_dispatched).toBe(true);
  expect(graded.scores.only_source_changed).toBe(true);
});

test("a coordinator that edits directly and changes the tests fails dispatch and scope", () => {
  const graded = gradeFixFacts({
    tools: [...entered, call("direct", "ses_root", "edit", { filePath: "/workspace/src/accept-release.ts" })],
    sessions: [{ id: "ses_root" }],
    initial: [source("a"), tests],
    final: [source("b"), { ...tests, sha256: "u" }],
  });

  expect(graded.scores.worker_dispatched).toBe(false);
  expect(graded.scores.dispatches_wrote_files).toBe(false);
  expect(graded.scores.only_source_changed).toBe(false);
});

test("a coordinator that never opens the worker's result file fails returned_files_read", () => {
  const graded = gradeFixFacts({ tools: [...entered, dispatch, fix, result], sessions, initial: [source("a"), tests], final: [source("b"), tests] });

  expect(graded.scores.dispatches_wrote_files).toBe(true);
  expect(graded.scores.returned_files_read).toBe(false);
});
