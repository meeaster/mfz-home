import { expect, test } from "bun:test";
import type { RecordedFile, ToolCall } from "@hona/openeval";
import { changedPaths, gradeFacts, loadedSkill } from "./judge.js";

function tool(name: string, input?: { id: string }, status: ToolCall["status"] = "succeeded"): ToolCall {
  return { id: `call_${name}`, assistantMessageId: "msg_1", name, status, input };
}

function file(path: string, sha256: string): RecordedFile {
  return { path, bytes: 1, sha256 };
}

const cleanRun = {
  tools: [tool("glob"), tool("read"), tool("skill", { id: "orchestrator-mode" })],
  sessions: [{ parentID: undefined }],
  initial: [file("AGENTS.md", "a")],
  final: [file("AGENTS.md", "a")],
};

test("passes a read-only run that loaded the guidance", () => {
  const result = gradeFacts(cleanRun);

  expect(result.scores).toEqual({
    guidance_loaded: true,
    restraint_observed: true,
  });
});

test("fails guidance_loaded when no skill was loaded", () => {
  const result = gradeFacts({ ...cleanRun, tools: [tool("read")] });

  expect(result.scores.guidance_loaded).toBe(false);
});

test("fails guidance_loaded for a different skill", () => {
  const result = gradeFacts({
    ...cleanRun,
    tools: [tool("skill", { id: "mindframe-z" })],
  });

  expect(result.scores.guidance_loaded).toBe(false);
});

test("fails restraint_observed when a child session exists", () => {
  const result = gradeFacts({
    ...cleanRun,
    sessions: [{ parentID: undefined }, { parentID: "ses_parent" }],
  });

  expect(result.scores.restraint_observed).toBe(false);
  expect(result.observations.childSessions).toBe(1);
});

test("fails restraint_observed when a dispatch tool ran", () => {
  const result = gradeFacts({
    ...cleanRun,
    tools: [...cleanRun.tools, tool("subagent")],
  });

  expect(result.scores.restraint_observed).toBe(false);
  expect(result.observations.dispatchTools).toEqual(["subagent"]);
});

test("fails restraint_observed when a mutating tool ran", () => {
  const result = gradeFacts({
    ...cleanRun,
    tools: [...cleanRun.tools, tool("write")],
  });

  expect(result.scores.restraint_observed).toBe(false);
  expect(result.observations.mutatingTools).toEqual(["write"]);
});

test("fails restraint_observed when the workspace changed", () => {
  const result = gradeFacts({
    ...cleanRun,
    final: [file("AGENTS.md", "b")],
  });

  expect(result.scores.restraint_observed).toBe(false);
  expect(result.observations.changedPaths).toEqual(["AGENTS.md"]);
});

test("changedPaths reports added, removed, and edited files", () => {
  const changed = changedPaths(
    [file("kept.md", "a"), file("removed.md", "b")],
    [file("kept.md", "a"), file("added.md", "c")],
  );

  expect(changed).toEqual(["removed.md", "added.md"]);
});

test("loadedSkill ignores failed and malformed skill calls", () => {
  const wrongType: ToolCall = {
    id: "call_wrong",
    assistantMessageId: "msg_1",
    name: "skill",
    status: "succeeded",
    input: { id: 5 },
  };

  expect(loadedSkill([tool("skill", { id: "orchestrator-mode" }, "failed")])).toBeNull();

  expect(loadedSkill([tool("skill")])).toBeNull();

  expect(loadedSkill([wrongType])).toBeNull();

  expect(loadedSkill([tool("skill", { id: "orchestrator-mode" })])).toBe("orchestrator-mode");
});
