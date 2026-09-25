import { expect, test } from "bun:test";
import type { RecordedFile, ToolCall } from "@hona/openeval";
import { gradeFacts } from "./judge.js";

function tool(name: string, input?: ToolCall["input"], sessionID = "ses_root"): ToolCall {
  return { id: `call_${name}`, sessionID, assistantMessageId: "msg_1", name, status: "succeeded", input };
}

function file(path: string, sha256: string): RecordedFile {
  return { path, bytes: 1, sha256 };
}

const evidence = "/home/dev/workspace/scratch/orchestrator-workspaces/_sessions/s/evidence/rerun-mechanism--explore.md";

const cleanRun = {
  tools: [
    tool("skill", { id: "orchestrate" }),
    tool("skill", { id: "orchestration" }),
    tool("skill", { id: "evidence-gathering" }),
    tool("subagent", { agent: "explore" }),
    tool("skill", { id: "task-output" }, "ses_child"),
    tool("write", { filePath: evidence }, "ses_child"),
    tool("read", { path: evidence }),
  ],
  sessions: [{ id: "ses_root" }, { id: "ses_child", parentID: "ses_root" }],
  initial: [file("checkout/README.md", "a")],
  final: [file("checkout/README.md", "a")],
};

test("passes a run that dispatched explore without touching the checkout", () => {
  expect(gradeFacts(cleanRun).scores).toEqual({
    workflow_entered: true,
    coordinator_skills_in_role: true,
    producer_skills_in_role: true,
    explore_dispatched: true,
    repository_unchanged: true,
    dispatches_wrote_files: true,
    returned_files_read: true,
  });
});

test("answering directly fails routing", () => {
  expect(gradeFacts({ ...cleanRun, tools: [tool("read")], sessions: [{ id: "ses_root" }] }).scores.explore_dispatched).toBe(false);
});

test("a different agent or a missing child session fails routing", () => {
  expect(gradeFacts({ ...cleanRun, tools: [tool("subagent", { agent: "general" })] }).scores.explore_dispatched).toBe(false);
  expect(gradeFacts({ ...cleanRun, sessions: [{ id: "ses_root" }] }).scores.explore_dispatched).toBe(false);
});

test("a changed checkout file fails repository_unchanged", () => {
  const result = gradeFacts({ ...cleanRun, final: [file("checkout/README.md", "b")] });

  expect(result.scores.repository_unchanged).toBe(false);
  expect(result.observations.changedPaths).toEqual(["checkout/README.md"]);
});

test("the coordinator loading the producer's evidence contract fails only the coordinator's role", () => {
  const result = gradeFacts({ ...cleanRun, tools: [...cleanRun.tools, tool("skill", { id: "task-output" })] });

  expect(result.scores.coordinator_skills_in_role).toBe(false);
  expect(result.scores.producer_skills_in_role).toBe(true);
  expect(result.observations.outOfRole).toEqual({ root: ["task-output"], children: [] });
});

test("a producer entering orchestration fails the producer's role", () => {
  const result = gradeFacts({ ...cleanRun, tools: [...cleanRun.tools, tool("skill", { id: "orchestration" }, "ses_child")] });

  expect(result.scores.coordinator_skills_in_role).toBe(true);
  expect(result.scores.producer_skills_in_role).toBe(false);
});

test("an explore child that only replies fails the file criteria", () => {
  const tools = cleanRun.tools.filter((call) => call.name !== "write" && call.name !== "read");

  const result = gradeFacts({ ...cleanRun, tools });

  expect(result.scores.dispatches_wrote_files).toBe(false);
  expect(result.scores.returned_files_read).toBe(false);
});

test("a coordinator that reads only part of the returned file fails returned_files_read", () => {
  const tools = [...cleanRun.tools.filter((call) => call.name !== "read"), tool("read", { path: evidence, offset: 1, limit: 40 })];

  const result = gradeFacts({ ...cleanRun, tools });

  expect(result.scores.dispatches_wrote_files).toBe(true);
  expect(result.scores.returned_files_read).toBe(false);
  expect(result.observations.returnedFilesUnread).toEqual([evidence]);
});
