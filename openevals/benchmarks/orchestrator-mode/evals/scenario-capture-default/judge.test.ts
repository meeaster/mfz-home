import { expect, test } from "bun:test";
import type { RecordedFile, ToolCall } from "@hona/openeval";
import type { CatalogCall } from "../../../../src/judging/facts.js";
import { preamble } from "../../../../src/judging/scenario.js";
import { gradeCaptureFacts } from "./judge.js";

const file = (path: string, sha256 = "a"): RecordedFile => ({ path, bytes: 10, sha256 });

const initial = ["README.md", "install.sh", "cron/crontab", "systemd/backup.timer", "systemd/cache-cleanup.timer"].map((path) => file(path));

const call = (id: string, sessionID: string, name: string, input: ToolCall["input"]): ToolCall => ({
  id,
  sessionID,
  assistantMessageId: "msg_1",
  name,
  status: "succeeded",
  input,
});

const conversation = [
  call("open", "ses_driver", "subagent", { agent: "agent-under-test", prompt: `${preamble}\n\nwhat jobs does this thing actually run` }),
  call("capture", "ses_driver", "subagent", { agent: "agent-under-test", prompt: "out of time can you capture this", sessionID: "ses_aut" }),
];

const sessions = [{ id: "ses_driver" }, { id: "ses_aut", parentID: "ses_driver", agent: "agent-under-test" }];

const root = "/home/dev/workspace/artifacts/cairn";

const context = `${root}/efforts/systemd-timers-only/effort.md`;

/** A catalog call as OpenCode records it: made by code inside an `execute` call. */
const catalogCall = (callID: string, tool: CatalogCall["tool"], input: CatalogCall["input"]): CatalogCall => ({ callID, sessionID: "ses_aut", tool, input });

const attachNew = catalogCall("attach", "session", {
  session: "opencode:ses_aut",
  attach: [{ create: { title: "Systemd timers only", description: "Move every job off cron", provisional: true } }],
});

const capture = [
  call("ec", "ses_aut", "skill", { id: "effort-context" }),
  call("attach", "ses_aut", "execute", { code: "return tools.cairn.catalog_session({ ... })" }),
  call("where", "ses_aut", "execute", { code: "return tools.cairn.catalog_location({ ... })" }),
  call("context", "ses_aut", "write", { filePath: context, content: "# Systemd timers only\n" }),
];

const captured = [attachNew, catalogCall("where", "location", { session: "opencode:ses_aut", topic: "effort", effort: "systemd-timers-only" })];

const unchanged = { initial, final: initial };

test("capturing into a provisional effort without a workflow passes the archive criteria", () => {
  const lookup = [call("grep", "ses_aut", "grep", { pattern: "OnCalendar" })];

  const graded = gradeCaptureFacts({ tools: [...conversation, ...lookup, ...capture], sessions, ...unchanged, catalog: captured });

  expect(graded.scores).toEqual({
    harness_preamble_sent: true,
    harness_one_conversation: true,
    harness_driver_only_converses: true,
    no_workflow_entered: true,
    effort_context_loaded: true,
    no_task_output: true,
    effort_attached: true,
    effort_record_written: true,
    workspace_unchanged: true,
  });
});

test("attaching a named effort by slug counts, and a context written by a delegated helper counts", () => {
  const byHelper = [
    call("ec", "ses_aut", "skill", { id: "effort-context" }),
    call("attach", "ses_aut", "execute", { code: "return tools.cairn.catalog_session({ ... })" }),
    call("dispatch", "ses_aut", "subagent", { agent: "scribe", prompt: `Write ${context}` }),
    call("context", "ses_scribe", "write", { filePath: context, content: "# Systemd timers only\n" }),
  ];

  const graded = gradeCaptureFacts({
    tools: [...conversation, ...byHelper],
    sessions: [...sessions, { id: "ses_scribe", parentID: "ses_aut", agent: "scribe" }],
    ...unchanged,
    catalog: [catalogCall("attach", "session", { session: "opencode:ses_aut", attach: ["systemd-timers-only"] })],
  });

  expect(graded.scores.effort_attached).toBe(true);
  expect(graded.scores.effort_record_written).toBe(true);
});

test("entering orchestration or loading task-output fails those criteria", () => {
  const entered = [call("orch", "ses_aut", "skill", { id: "orchestrate" }), call("proc", "ses_aut", "skill", { id: "orchestration" }), call("to", "ses_aut", "skill", { id: "task-output" })];

  const graded = gradeCaptureFacts({ tools: [...conversation, ...entered, ...capture], sessions, ...unchanged, catalog: captured });

  expect(graded.scores.no_workflow_entered).toBe(false);
  expect(graded.scores.no_task_output).toBe(false);
  expect(graded.observations.session?.entered).toEqual(["orchestrate", "orchestration"]);
});

test("a summary written outside an effort, a search without an attach, or a changed workspace does not count as a capture", () => {
  const note = [
    call("ec", "ses_aut", "skill", { id: "effort-context" }),
    call("find", "ses_aut", "execute", { code: "return tools.cairn.catalog_find({ ... })" }),
    call("note", "ses_aut", "write", { filePath: `${root}/sessions/opencode/2026-09/ses_driver/handoff.md`, content: "# Notes\n" }),
    call("readme", "ses_aut", "edit", { filePath: "/workspace/README.md" }),
  ];

  const searched = [catalogCall("find", "find", { target: "efforts", text: "systemd timers" }), catalogCall("describe", "session", { session: "opencode:ses_aut", title: "Jobs" })];

  const graded = gradeCaptureFacts({ tools: [...conversation, ...note], sessions, initial, final: [...initial.slice(1), file("README.md", "b")], catalog: searched });

  expect(graded.scores.effort_attached).toBe(false);
  expect(graded.scores.effort_record_written).toBe(false);
  expect(graded.scores.workspace_unchanged).toBe(false);
});

test("without exactly one agent-under-test session the session criteria are null", () => {
  const graded = gradeCaptureFacts({ tools: conversation, sessions: [{ id: "ses_driver" }], ...unchanged });

  expect(graded.scores.effort_attached).toBeNull();
  expect(graded.observations.session).toBeNull();
});
