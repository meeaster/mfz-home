import { expect, test } from "bun:test";
import type { RecordedFile, ToolCall } from "@hona/openeval";
import { gradeFacts } from "./judge.js";

function tool(name: string, input?: { agent: string } | { id: string }, sessionID = "ses_root"): ToolCall {
  return { id: `call_${name}`, sessionID, assistantMessageId: "msg_1", name, status: "succeeded", input };
}

function file(path: string, sha256: string): RecordedFile {
  return { path, bytes: 1, sha256 };
}

const cleanRun = {
  tools: [
    tool("skill", { id: "orchestrate" }),
    tool("skill", { id: "orchestration" }),
    tool("skill", { id: "evidence-gathering" }),
    tool("subagent", { agent: "explore" }),
    tool("skill", { id: "task-evidence" }, "ses_child"),
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
  const result = gradeFacts({ ...cleanRun, tools: [...cleanRun.tools, tool("skill", { id: "task-evidence" })] });

  expect(result.scores.coordinator_skills_in_role).toBe(false);
  expect(result.scores.producer_skills_in_role).toBe(true);
  expect(result.observations.outOfRole).toEqual({ root: ["task-evidence"], children: [] });
});

test("a producer entering orchestration fails the producer's role", () => {
  const result = gradeFacts({ ...cleanRun, tools: [...cleanRun.tools, tool("skill", { id: "orchestration" }, "ses_child")] });

  expect(result.scores.coordinator_skills_in_role).toBe(true);
  expect(result.scores.producer_skills_in_role).toBe(false);
});
