import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import type { RecordedFile, ToolCall } from "@hona/openeval";
import { preamble } from "../../../../src/judging/scenario.js";
import { gradeInvestigationFacts } from "./judge.js";

const file = (path: string, sha256 = "a"): RecordedFile => ({ path, bytes: 10, sha256 });

const initial = ["config/production.json", "src/auth.ts", "src/config.ts", "src/config.test.ts", "src/session.ts", "src/session.test.ts"].map((path) => file(path));

/** The initial files with the given paths changed. */
const changing = (...paths: string[]) => initial.map((recorded) => (paths.includes(recorded.path) ? file(recorded.path, "b") : recorded));

const call = (id: string, sessionID: string, name: string, input: ToolCall["input"]): ToolCall => ({
  id,
  sessionID,
  assistantMessageId: "msg_1",
  name,
  status: "succeeded",
  input,
});

const conversation = [
  call("open", "ses_driver", "subagent", { agent: "agent-under-test", prompt: `${preamble}\n\nso people keep getting logged out after like an hour in prod` }),
  call("follow", "ses_driver", "subagent", { agent: "agent-under-test", prompt: "so what was it", sessionID: "ses_aut" }),
];

const sessions = [{ id: "ses_driver" }, { id: "ses_aut", parentID: "ses_driver", agent: "agent-under-test" }];

const direct = [
  call("read", "ses_aut", "read", { path: "/workspace/src/config.ts" }),
  call("fix", "ses_aut", "edit", { filePath: "/workspace/src/config.ts" }),
  call("test", "ses_aut", "bash", { command: "bun test" }),
];

test("investigating and fixing the loader directly passes the archive criteria", () => {
  const graded = gradeInvestigationFacts({
    tools: [...conversation, ...direct],
    sessions,
    initial,
    final: [...changing("src/config.ts"), file("src/auth.test.ts")],
  });

  expect(graded.scores).toEqual({
    harness_preamble_sent: true,
    harness_one_conversation: true,
    harness_driver_only_converses: true,
    no_workflow_entered: true,
    session_output_skills: true,
    no_session_output_file: true,
    delegated_outputs_read: null,
    loader_changed: true,
    changes_within_scope: true,
  });
});

test("a session that saves its own investigation fails the output criteria", () => {
  const saved = "/home/dev/workspace/artifacts/cairn/sessions/opencode/2026-09/ses_aut/session-ttl-cause.md";

  const investigation = [call("eg", "ses_aut", "skill", { id: "evidence-gathering" }), call("to", "ses_aut", "skill", { id: "task-output" }), call("save", "ses_aut", "write", { filePath: saved })];

  const graded = gradeInvestigationFacts({ tools: [...conversation, ...investigation, ...direct], sessions, initial, final: changing("src/config.ts") });

  expect(graded.scores.session_output_skills).toBe(false);
  expect(graded.scores.no_session_output_file).toBe(false);
});

test("repeating the defaults in the production file leaves the loader unchanged", () => {
  const graded = gradeInvestigationFacts({ tools: conversation, sessions, initial, final: changing("config/production.json") });

  expect(graded.scores.loader_changed).toBe(false);
  expect(graded.scores.changes_within_scope).toBe(true);
});

test("changing the fallback or removing an existing test fails the scope criterion", () => {
  expect(gradeInvestigationFacts({ tools: conversation, sessions, initial, final: changing("src/config.ts", "src/session.ts") }).scores.changes_within_scope).toBe(false);

  const withoutTest = changing("src/config.ts").filter((recorded) => recorded.path !== "src/session.test.ts");

  expect(gradeInvestigationFacts({ tools: conversation, sessions, initial, final: withoutTest }).scores.changes_within_scope).toBe(false);
});

test("the driver prompt carries the preamble and selects no workflow", async () => {
  const prompt = await readFile(new URL("prompt.md", import.meta.url), "utf8");

  expect(prompt).toContain(preamble);
  expect(prompt).not.toContain("orchestrat");
});
