import { expect, test } from "bun:test";
import type { RecordedFile, ToolCall } from "@hona/openeval";
import { changedPaths, gradeFacts, subagentTargets } from "./judge.js";

const rootID = "ses_root";

function tool(name: string, input?: { agent: string }, status: ToolCall["status"] = "succeeded", sessionID = rootID): ToolCall {
  return { id: `call_${name}_${status}`, assistantMessageId: "msg_1", name, status, input, sessionID };
}

function file(path: string, sha256: string): RecordedFile {
  return { path, bytes: 1, sha256 };
}

const root = { parentID: undefined };

const cleanRun = {
  tools: [tool("read"), tool("subagent", { agent: "explore" })],
  sessions: [root, { parentID: "ses_root" }],
  initial: [file("checkout/README.md", "a"), file("opencode.json", "c")],
  final: [file("checkout/README.md", "a"), file("opencode.json", "c")],
};

test("passes a run that dispatched explore without touching the checkout", () => {
  const result = gradeFacts(cleanRun);

  expect(result.scores).toEqual({
    explore_dispatched: true,
    repository_unchanged: true,
  });
});

test("fails explore_dispatched when the orchestrator answered directly", () => {
  const result = gradeFacts({ ...cleanRun, sessions: [root], tools: [tool("read"), tool("grep")] });

  expect(result.scores.explore_dispatched).toBe(false);
  expect(result.observations.childSessions).toBe(0);
});

test("fails explore_dispatched for a different subagent", () => {
  const result = gradeFacts({ ...cleanRun, tools: [tool("subagent", { agent: "general" })] });

  expect(result.scores.explore_dispatched).toBe(false);
  expect(result.observations.subagentTargets).toEqual(["general"]);
});

test("fails explore_dispatched when no child session exists", () => {
  const result = gradeFacts({ ...cleanRun, sessions: [root] });

  expect(result.scores.explore_dispatched).toBe(false);
});

test("fails repository_unchanged when a checkout file changed", () => {
  const result = gradeFacts({
    ...cleanRun,
    final: [file("checkout/README.md", "b"), file("opencode.json", "c")],
  });

  expect(result.scores.repository_unchanged).toBe(false);
  expect(result.observations.changedPaths).toEqual(["checkout/README.md"]);
});

test("ignores VCS metadata and dependency directories", () => {
  const changed = changedPaths(
    [file("checkout/.git/index", "a"), file("upstream.git/HEAD", "a")],
    [file("checkout/.git/index", "b"), file("upstream.git/HEAD", "b")],
  );

  expect(changed).toEqual([]);
});

test("subagentTargets ignores failed calls and malformed inputs", () => {
  const wrongType: ToolCall = {
    id: "call_wrong",
    assistantMessageId: "msg_1",
    name: "subagent",
    status: "succeeded",
    input: { agent: 5 },
  };

  expect(subagentTargets([tool("subagent", { agent: "explore" }, "failed")])).toEqual([]);

  expect(subagentTargets([wrongType])).toEqual([]);

  expect(subagentTargets([tool("subagent", { agent: "explore" })])).toEqual(["explore"]);
});
