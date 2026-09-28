import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import type { RecordedFile, ToolCall } from "@hona/openeval";
import { preamble } from "../../../../src/judging/scenario.js";
import { gradeQuickLookupFacts } from "./judge.js";

const file = (path: string, sha256 = "a"): RecordedFile => ({ path, bytes: 10, sha256 });

const initial = [
  "README.md",
  "install.sh",
  "cron/crontab",
  "scripts/backup.sh",
  "scripts/cleanup-cache.sh",
  "scripts/rotate-logs.sh",
  "systemd/backup.service",
  "systemd/backup.timer",
  "systemd/cache-cleanup.service",
  "systemd/cache-cleanup.timer",
].map((path) => file(path));

const without = (...paths: string[]) => initial.filter((recorded) => !paths.includes(recorded.path));

const call = (id: string, sessionID: string, name: string, input: ToolCall["input"]): ToolCall => ({
  id,
  sessionID,
  assistantMessageId: "msg_1",
  name,
  status: "succeeded",
  input,
});

const conversation = [
  call("open", "ses_driver", "subagent", { agent: "agent-under-test", prompt: `${preamble}\n\nis the cache cleanup still running on a schedule` }),
  call("remove", "ses_driver", "subagent", { agent: "agent-under-test", prompt: "ok get rid of it", sessionID: "ses_aut" }),
];

const sessions = [{ id: "ses_driver" }, { id: "ses_aut", parentID: "ses_driver", agent: "agent-under-test" }];

const removal = [call("rm", "ses_aut", "bash", { command: "rm systemd/cache-cleanup.timer systemd/cache-cleanup.service" })];

const removed = { initial, final: without("systemd/cache-cleanup.timer", "systemd/cache-cleanup.service") };

test("answering and removing the job directly passes the archive criteria", () => {
  const lookup = [call("grep", "ses_aut", "grep", { pattern: "cleanup-cache" })];

  const graded = gradeQuickLookupFacts({ tools: [...conversation, ...lookup, ...removal], sessions, ...removed });

  expect(graded.scores).toEqual({
    harness_preamble_sent: true,
    harness_one_conversation: true,
    harness_driver_only_converses: true,
    no_workflow_entered: true,
    session_output_skills: true,
    no_session_output_file: true,
    delegated_outputs_read: null,
    cleanup_timer_removed: true,
    other_jobs_intact: true,
    changes_within_scope: true,
  });
});

test("saving the lookup as an investigation file fails the session output criteria", () => {
  const saved = "/home/dev/workspace/artifacts/cairn/sessions/opencode/2026-09/ses_driver/cleanup-schedule.md";

  const investigation = [
    call("ec", "ses_aut", "skill", { id: "effort-context" }),
    call("to", "ses_aut", "skill", { id: "task-output" }),
    call("save", "ses_aut", "write", { filePath: saved }),
  ];

  const graded = gradeQuickLookupFacts({ tools: [...conversation, ...investigation, ...removal], sessions, ...removed });

  expect(graded.scores.session_output_skills).toBe(false);
  expect(graded.scores.no_session_output_file).toBe(false);
  expect(graded.observations.session?.output.outputSkills).toEqual(["effort-context", "task-output"]);
  expect(graded.observations.session?.output.outputFiles).toEqual([saved]);
});

test("a dispatched lookup may assign an output path, and its returned file must be read", () => {
  const response = "/home/dev/workspace/artifacts/cairn/sessions/opencode/2026-09/ses_aut/cleanup-schedule.md";

  const delegated = [
    call("ec", "ses_aut", "skill", { id: "effort-context" }),
    call("dispatch", "ses_aut", "subagent", { agent: "explore", prompt: "find the cleanup schedule" }),
    call("to", "ses_explore", "skill", { id: "task-output" }),
    call("write", "ses_explore", "write", { filePath: response }),
  ];

  const tree = [...sessions, { id: "ses_explore", parentID: "ses_aut", agent: "explore" }];

  const unread = gradeQuickLookupFacts({ tools: [...conversation, ...delegated, ...removal], sessions: tree, ...removed });

  expect(unread.scores.session_output_skills).toBe(true);
  expect(unread.scores.no_session_output_file).toBe(true);
  expect(unread.scores.delegated_outputs_read).toBe(false);

  const read = gradeQuickLookupFacts({
    tools: [...conversation, ...delegated, call("read", "ses_aut", "read", { path: response }), ...removal],
    sessions: tree,
    ...removed,
  });

  expect(read.scores.delegated_outputs_read).toBe(true);
});

test("removing a kept job or touching an unrelated file fails the scope criteria", () => {
  const backupGone = gradeQuickLookupFacts({ tools: conversation, sessions, initial, final: without("systemd/cache-cleanup.timer", "systemd/backup.timer") });

  expect(backupGone.scores.other_jobs_intact).toBe(false);
  expect(backupGone.scores.changes_within_scope).toBe(false);

  const unrelated = gradeQuickLookupFacts({ tools: conversation, sessions, initial, final: [...without("systemd/cache-cleanup.timer"), file("notes.md")] });

  expect(unrelated.scores.other_jobs_intact).toBe(true);
  expect(unrelated.scores.changes_within_scope).toBe(false);
});

test("retiring the installed timer through the installer stays in scope", () => {
  const installer = gradeQuickLookupFacts({
    tools: conversation,
    sessions,
    initial,
    final: [...without("systemd/cache-cleanup.timer", "install.sh"), file("install.sh", "b")],
  });

  expect(installer.scores.changes_within_scope).toBe(true);
});

test("a timer left in place fails the removal criterion", () => {
  expect(gradeQuickLookupFacts({ tools: conversation, sessions, initial, final: initial }).scores.cleanup_timer_removed).toBe(false);
});

test("the driver prompt carries the preamble and selects no workflow", async () => {
  const prompt = await readFile(new URL("prompt.md", import.meta.url), "utf8");

  expect(prompt).toContain(preamble);
  expect(prompt).not.toContain("orchestrat");
});
