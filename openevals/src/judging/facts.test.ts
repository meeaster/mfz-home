import { expect, test } from "bun:test";
import type { RecordedEvent, RecordedFile, ToolCall } from "@hona/openeval";
import {
  attemptedTools,
  catalogCallsFrom,
  changedPaths,
  dispatchTools,
  dispatchesWithoutFile,
  loadedRoleProcedures,
  loadedSkills,
  returnedFilesUnread,
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
  expect(loadedRoleProcedures(["effort-context", "orchestrate", "anti-slop", "orchestration"], "orchestrate")).toBe(true);
  expect(loadedRoleProcedures(["orchestration", "orchestrate"], "orchestrate")).toBe(false);
  expect(loadedRoleProcedures(["orchestrate"], "orchestrate")).toBe(false);
  expect(loadedRoleProcedures(["orchestration"], "orchestrate")).toBe(false);
});

test("sessionSkills attributes loads in child sessions to children and all others to the root", () => {
  const skills = sessionSkills({
    tools: [
      { ...tool("skill", { id: "orchestrate" }), sessionID: "ses_root" },
      { ...tool("skill", { id: "task-output" }), sessionID: "ses_child" },
      tool("skill", { id: "orchestration" }),
    ],
    sessions: [{ id: "ses_root" }, { id: "ses_child", parentID: "ses_root" }],
  });

  expect(skills).toEqual({ root: ["orchestrate", "orchestration"], children: ["task-output"] });
});

test("skillsOutsideRole lists each out-of-role skill once in first-load order", () => {
  const role = new Set(["orchestrate", "orchestration"]);

  expect(skillsOutsideRole(["orchestrate", "task-output", "design-partner", "task-output"], role)).toEqual([
    "task-output",
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

test("dispatchesWithoutFile requires a file from each directly dispatched session, not from nested helpers", () => {
  const sessions = [
    { id: "ses_root" },
    { id: "ses_worker", parentID: "ses_root" },
    { id: "ses_explore", parentID: "ses_root" },
    { id: "ses_helper", parentID: "ses_worker" },
  ];

  const patch = (sessionID: string, header: string): ToolCall => ({
    ...tool("patch", { patchText: `*** Begin Patch\n${header}\n+x\n*** End Patch` }),
    sessionID,
  });

  const written = [
    patch("ses_worker", "*** Update File: /home/dev/workspace/artifacts/cairn/sessions/opencode/2026-09/ses_root/fix.md"),
    { ...tool("write", { filePath: "/home/dev/workspace/artifacts/cairn/sessions/opencode/2026-09/ses_root/x.md" }, "failed"), sessionID: "ses_explore" },
    { ...tool("edit", { filePath: "/workspace/src/a.ts" }), sessionID: "ses_explore" },
  ];

  expect(dispatchesWithoutFile({ tools: written, sessions })).toEqual(["ses_explore"]);

  const both = [...written, patch("ses_explore", "*** Add File: /home/dev/workspace/artifacts/cairn/sessions/opencode/2026-09/ses_root/q.md")];

  expect(dispatchesWithoutFile({ tools: both, sessions })).toEqual([]);
});

test("Scribe keeps records rather than returning a file, so neither check counts it", () => {
  const sessions = [{ id: "ses_root" }, { id: "ses_scribe", parentID: "ses_root", agent: "scribe" }];

  const records = { ...tool("write", { filePath: "/home/dev/workspace/artifacts/cairn/efforts/release/context.md" }), sessionID: "ses_scribe" };

  expect(dispatchesWithoutFile({ tools: [], sessions })).toEqual([]);
  expect(returnedFilesUnread({ tools: [records], sessions })).toEqual([]);
});

test("returnedFilesUnread requires the root to read each returned file whole after its last write", () => {
  const sessions = [
    { id: "ses_root" },
    { id: "ses_worker", parentID: "ses_root" },
    { id: "ses_explore", parentID: "ses_root" },
    { id: "ses_helper", parentID: "ses_worker" },
  ];

  const result = "/home/dev/workspace/artifacts/cairn/sessions/opencode/2026-09/ses_root/fix.md";

  const learnings = "/home/dev/workspace/artifacts/cairn/sessions/opencode/2026-09/ses_root/fix-learnings.md";

  const evidence = "/home/dev/workspace/artifacts/cairn/sessions/opencode/2026-09/ses_root/mechanism.md";

  const at = (sessionID: string, call: ToolCall): ToolCall => ({ ...call, sessionID });

  const tools = [
    at("ses_worker", tool("write", { filePath: result })),
    at("ses_worker", tool("write", { filePath: learnings })),
    at("ses_explore", tool("write", { filePath: evidence })),
    at("ses_helper", tool("write", { filePath: "/home/dev/workspace/artifacts/cairn/sessions/opencode/2026-09/ses_root/helper.md" })),
    at("ses_worker", tool("write", { filePath: "/workspace/src/accept-release.ts" })),
    at("ses_root", tool("read", { path: result })),
    at("ses_root", tool("bash", { command: `cat ${learnings}` })),
    at("ses_root", tool("read", { path: evidence, offset: 40, limit: 20 })),
  ];

  expect(returnedFilesUnread({ tools, sessions })).toEqual([evidence]);
});

test("returnedFilesUnread accepts a windowed read of a follow-up after an earlier whole read", () => {
  const sessions = [{ id: "ses_root" }, { id: "ses_explore", parentID: "ses_root" }];

  const evidence = "/home/dev/workspace/artifacts/cairn/sessions/opencode/2026-09/ses_root/mechanism.md";

  const at = (sessionID: string, call: ToolCall): ToolCall => ({ ...call, sessionID });

  const firstWrite = at("ses_explore", tool("write", { filePath: evidence }));

  const followUp = at("ses_explore", tool("edit", { filePath: evidence }));

  const addition = at("ses_root", tool("read", { path: evidence, offset: 350 }));

  const whole = at("ses_root", tool("read", { path: evidence }));

  expect(returnedFilesUnread({ tools: [firstWrite, whole, followUp, addition], sessions })).toEqual([]);
  expect(returnedFilesUnread({ tools: [firstWrite, followUp, addition], sessions })).toEqual([evidence]);
});

test("returnedFilesUnread counts only reads by the root after the file's last write", () => {
  const sessions = [{ id: "ses_root" }, { id: "ses_explore", parentID: "ses_root" }];

  const evidence = "/home/dev/workspace/artifacts/cairn/sessions/opencode/2026-09/ses_root/mechanism.md";

  const at = (sessionID: string, call: ToolCall): ToolCall => ({ ...call, sessionID });

  const tools = [
    at("ses_explore", tool("write", { filePath: evidence })),
    at("ses_root", tool("read", { path: evidence })),
    at("ses_explore", tool("edit", { filePath: evidence })),
    at("ses_explore", tool("read", { path: evidence })),
  ];

  expect(returnedFilesUnread({ tools, sessions })).toEqual([evidence]);
});

test("shell redirects count as writes, and a redirect into a file is not a read of it", () => {
  const sessions = [{ id: "ses_root" }, { id: "ses_worker", parentID: "ses_root" }];

  const result = "/home/dev/workspace/artifacts/cairn/sessions/opencode/2026-09/ses_root/fix.md";

  const at = (sessionID: string, call: ToolCall): ToolCall => ({ ...call, sessionID });

  const heredoc = at("ses_worker", tool("bash", { command: `mkdir -p /home/dev/workspace/artifacts/cairn/sessions/opencode/2026-09/ses_root && cat > ${result} <<'MD'\n# Fix\nMD` }));

  expect(dispatchesWithoutFile({ tools: [heredoc], sessions })).toEqual([]);

  const overwrite = at("ses_root", tool("bash", { command: `cat > ${result} <<'MD'\nMD` }));

  expect(returnedFilesUnread({ tools: [heredoc, overwrite], sessions })).toEqual([result]);

  expect(returnedFilesUnread({ tools: [heredoc, at("ses_root", tool("bash", { command: `cat ${result}` }))], sessions })).toEqual([]);
});

/** An `execute` call's progress as OpenCode records it, listing the calls its code has made so far. */
function progress(sequence: number, id: string, toolCalls: { tool: string; status: string; input: Record<string, string> }[]): RecordedEvent {
  return {
    sequence,
    time: "2026-09-27T23:59:37.451Z",
    event: {
      id: `evt_${sequence}`,
      created: sequence,
      type: "session.tool.progress",
      location: { directory: "/workspace" },
      data: { sessionID: "ses_aut", assistantMessageID: "msg_1", id, metadata: { toolCalls } },
    },
  };
}

test("catalogCallsFrom keeps completed Cairn calls from each execute call's latest progress", () => {
  const attach = { session: "opencode:ses_aut", attach: "provisional" };

  const events = [
    progress(1, "call_search", [{ tool: "search", status: "completed", input: { namespace: "cairn" } }]),
    progress(2, "call_attach", [{ tool: "cairn.catalog_session", status: "running", input: attach }]),
    progress(3, "call_attach", [{ tool: "cairn.catalog_session", status: "completed", input: attach }]),
    progress(4, "call_where", [
      { tool: "cairn.catalog_location", status: "completed", input: { topic: "context" } },
      { tool: "cairn.catalog_describe", status: "failed", input: { path: "/x" } },
    ]),
  ];

  expect(catalogCallsFrom(events)).toEqual([
    { callID: "call_attach", sessionID: "ses_aut", tool: "session", input: attach },
    { callID: "call_where", sessionID: "ses_aut", tool: "location", input: { topic: "context" } },
  ]);
});
