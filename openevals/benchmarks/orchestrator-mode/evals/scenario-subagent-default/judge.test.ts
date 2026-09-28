import { expect, test } from "bun:test";
import type { RecordedFile, ToolCall } from "@hona/openeval";
import type { CatalogCall } from "../../../../src/judging/facts.js";
import { preamble } from "../../../../src/judging/scenario.js";
import { gradeSubagentFacts } from "./judge.js";

const file = (path: string, sha256 = "a"): RecordedFile => ({ path, bytes: 10, sha256 });

const initial = ["config/production.json", "src/config.ts", "src/session.ts", "src/config.test.ts"].map((path) => file(path));

const call = (id: string, sessionID: string, name: string, input: ToolCall["input"]): ToolCall => ({
  id,
  sessionID,
  assistantMessageId: "msg_1",
  name,
  status: "succeeded",
  input,
});

const conversation = [
  call("open", "ses_driver", "subagent", { agent: "agent-under-test", prompt: `${preamble}\n\ncan you get a subagent to look into why prod logs people out` }),
];

const sessions = [
  { id: "ses_driver" },
  { id: "ses_aut", parentID: "ses_driver", agent: "agent-under-test" },
  { id: "ses_explore", parentID: "ses_aut", agent: "explore" },
];

const result = "/home/dev/workspace/artifacts/cairn/sessions/opencode/2026-09/ses_driver/session-logout-cause.md";

const located = [
  call("ec", "ses_aut", "skill", { id: "effort-context" }),
  call("where", "ses_aut", "execute", { code: "return tools.cairn.catalog_location({ ... })" }),
];

/** The location call OpenCode records inside the `execute` call above. */
const catalog: CatalogCall[] = [
  { callID: "where", sessionID: "ses_aut", tool: "location", input: { session: "opencode:ses_aut", topic: "session-logout-cause" } },
  { callID: "describe", sessionID: "ses_explore", tool: "describe", input: { path: result, category: "evidence", title: "Logout cause" } },
];

const dispatch = call("dispatch", "ses_aut", "subagent", { agent: "explore", prompt: `Find why production sessions expire after an hour. Write your result to ${result}.` });

const childWrite = call("write", "ses_explore", "write", { filePath: result, content: "# Cause\n" });

const produced = [call("to", "ses_explore", "skill", { id: "task-output" }), childWrite, call("describe", "ses_explore", "execute", { code: "return tools.cairn.catalog_describe({ ... })" })];

const readBack = call("read", "ses_aut", "read", { path: result });

const unchanged = { initial, final: initial };

test("dispatching with a Cairn path, a task-output producer, and a full read passes the archive criteria", () => {
  const graded = gradeSubagentFacts({ tools: [...conversation, ...located, dispatch, ...produced, readBack], sessions, ...unchanged, catalog });

  expect(graded.scores).toEqual({
    harness_preamble_sent: true,
    harness_one_conversation: true,
    harness_driver_only_converses: true,
    no_workflow_entered: true,
    subagent_dispatched: true,
    output_path_assigned: true,
    producer_task_output: true,
    outputs_described: true,
    session_output_skills: true,
    no_session_output_file: true,
    delegated_outputs_read: true,
    workspace_unchanged: true,
  });
});

test("a composed path, a producer without task-output, and an unread file each fail", () => {
  const composed = call("dispatch", "ses_aut", "subagent", { agent: "explore", prompt: `Write your result to ${result}.` });

  const graded = gradeSubagentFacts({ tools: [...conversation, composed, childWrite], sessions, ...unchanged });

  expect(graded.scores.output_path_assigned).toBe(false);
  expect(graded.scores.producer_task_output).toBe(false);
  expect(graded.scores.delegated_outputs_read).toBe(false);
});

test("a location call made after the dispatch does not count as assigning the path", () => {
  const late = [dispatch, ...located, ...produced, readBack];

  const graded = gradeSubagentFacts({ tools: [...conversation, ...late], sessions, ...unchanged, catalog });

  expect(graded.scores.output_path_assigned).toBe(false);
});

test("a brief that asks for an answer in the reply fails the path assignment even after a location call", () => {
  const replyOnly = call("dispatch", "ses_aut", "subagent", { agent: "explore", prompt: "Find why production sessions expire after an hour and tell me." });

  const graded = gradeSubagentFacts({ tools: [...conversation, ...located, replyOnly], sessions, ...unchanged, catalog });

  expect(graded.scores.output_path_assigned).toBe(false);
  expect(graded.scores.delegated_outputs_read).toBe(false);
  expect(graded.observations.session?.paths.briefsWithoutPath).toEqual(["dispatch"]);
});

test("investigating without a subagent, or writing its own file, fails the delegation and output criteria", () => {
  const own = [
    call("to", "ses_aut", "skill", { id: "task-output" }),
    call("save", "ses_aut", "write", { filePath: result, content: "# Cause\n" }),
  ];

  const graded = gradeSubagentFacts({ tools: [...conversation, ...own], sessions: sessions.slice(0, 2), ...unchanged });

  expect(graded.scores.subagent_dispatched).toBe(false);
  expect(graded.scores.output_path_assigned).toBeNull();
  expect(graded.scores.producer_task_output).toBeNull();
  expect(graded.scores.session_output_skills).toBe(false);
  expect(graded.scores.no_session_output_file).toBe(false);
});

test("fixing the loader fails the unchanged workspace criterion", () => {
  const fixed = { initial, final: [file("config/production.json"), file("src/config.ts", "b"), ...initial.slice(2)] };

  const graded = gradeSubagentFacts({ tools: [...conversation, ...located, dispatch, ...produced, readBack], sessions, ...fixed, catalog });

  expect(graded.scores.workspace_unchanged).toBe(false);
});
