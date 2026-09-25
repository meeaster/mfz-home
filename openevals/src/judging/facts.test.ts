import { expect, test } from "bun:test";
import type { RecordedFile, ToolCall } from "@hona/openeval";
import {
  attemptedTools,
  changedPaths,
  dispatchTools,
  loadedRoleProcedures,
  loadedSkills,
  sessionSkills,
  skillsOutsideRole,
  subagentTargets,
} from "./facts.js";

function tool(name: string, input: ToolCall["input"], status: ToolCall["status"] = "succeeded"): ToolCall {
  return { id: `call_${name}`, assistantMessageId: "msg_1", name, status, input };
}

function file(path: string, sha256: string): RecordedFile {
  return { path, bytes: 1, sha256 };
}

test("loadedSkills keeps successful well-formed skill calls in order", () => {
  const skills = loadedSkills([
    tool("skill", { id: "orchestrate" }),
    tool("skill", { id: "effort-context" }, "failed"),
    tool("skill", { id: 5 }),
    tool("skill", undefined),
    tool("read", { id: "design-partner" }),
    tool("skill", { id: "orchestration" }),
  ]);

  expect(skills).toEqual(["orchestrate", "orchestration"]);
});

test("loadedRoleProcedures requires orchestration after the entry skill", () => {
  expect(loadedRoleProcedures(["effort-context", "orchestrate", "evidence-gathering", "orchestration"], "orchestrate")).toBe(true);
  expect(loadedRoleProcedures(["orchestration", "orchestrate"], "orchestrate")).toBe(false);
  expect(loadedRoleProcedures(["orchestrate"], "orchestrate")).toBe(false);
  expect(loadedRoleProcedures(["orchestration"], "orchestrate")).toBe(false);
});

test("sessionSkills attributes loads in child sessions to children and all others to the root", () => {
  const skills = sessionSkills({
    tools: [
      { ...tool("skill", { id: "orchestrate" }), sessionID: "ses_root" },
      { ...tool("skill", { id: "task-evidence" }), sessionID: "ses_child" },
      tool("skill", { id: "orchestration" }),
    ],
    sessions: [{ id: "ses_root" }, { id: "ses_child", parentID: "ses_root" }],
  });

  expect(skills).toEqual({ root: ["orchestrate", "orchestration"], children: ["task-evidence"] });
});

test("skillsOutsideRole lists each out-of-role skill once in first-load order", () => {
  const role = new Set(["orchestrate", "orchestration"]);

  expect(skillsOutsideRole(["orchestrate", "task-evidence", "design-partner", "task-evidence"], role)).toEqual([
    "task-evidence",
    "design-partner",
  ]);
});

test("subagentTargets keeps successful well-formed subagent calls", () => {
  const targets = subagentTargets([
    tool("subagent", { agent: "explore" }, "failed"),
    tool("subagent", { agent: 5 }),
    tool("subagent", { agent: "research" }),
  ]);

  expect(targets).toEqual(["research"]);
});

test("attemptedTools counts denied and failed attempts", () => {
  expect(attemptedTools([tool("subagent", {}, "failed"), tool("task", {}), tool("read", {})], dispatchTools)).toEqual([
    "subagent",
    "task",
  ]);
});

test("changedPaths reports added, removed, and edited files", () => {
  const changed = changedPaths(
    [file("kept.md", "a"), file("edited.md", "a"), file("removed.md", "b")],
    [file("kept.md", "a"), file("edited.md", "b"), file("added.md", "c")],
  );

  expect(changed).toEqual(["edited.md", "removed.md", "added.md"]);
});

test("changedPaths ignores VCS metadata and dependency directories", () => {
  const changed = changedPaths(
    [file("checkout/.git/index", "a"), file("upstream.git/HEAD", "a"), file("node_modules/x.js", "a")],
    [file("checkout/.git/index", "b"), file("upstream.git/HEAD", "b"), file("node_modules/x.js", "b")],
  );

  expect(changed).toEqual([]);
});
