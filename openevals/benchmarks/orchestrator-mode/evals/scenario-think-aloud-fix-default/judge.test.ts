import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import type { RecordedFile, ToolCall } from "@hona/openeval";
import { preamble } from "../../../../src/judging/scenario.js";
import { gradeDefaultScenarioFacts } from "./judge.js";

const source = (sha256: string): RecordedFile => ({ path: "src/accept-release.ts", bytes: 10, sha256 });

const tests: RecordedFile = { path: "src/accept-release.test.ts", bytes: 10, sha256: "t" };

const call = (id: string, sessionID: string, name: string, input: ToolCall["input"]): ToolCall => ({
  id,
  sessionID,
  assistantMessageId: "msg_1",
  name,
  status: "succeeded",
  input,
});

const conversation = [
  call("open", "ses_driver", "subagent", { agent: "agent-under-test", prompt: `${preamble}\n\nso bun test is failing...` }),
  call("decide", "ses_driver", "subagent", { agent: "agent-under-test", prompt: "yeah go with that", sessionID: "ses_aut" }),
];

const sessions = [
  { id: "ses_driver" },
  { id: "ses_aut", parentID: "ses_driver", agent: "agent-under-test" },
  { id: "ses_worker", parentID: "ses_aut", agent: "worker" },
];

const fixed = { initial: [source("a"), tests], final: [source("b"), tests] };

test("a default session that fixes the file directly passes the archive criteria", () => {
  const work = [call("lint", "ses_aut", "skill", { id: "anti-slop" }), call("fix", "ses_aut", "edit", { filePath: "/workspace/src/accept-release.ts" })];

  const graded = gradeDefaultScenarioFacts({ tools: [...conversation, ...work], sessions, ...fixed });

  expect(Object.values(graded.scores).every(Boolean)).toBe(true);
});

test("entering orchestration anywhere in the agent's tree fails", () => {
  const entered = [call("entry", "ses_aut", "skill", { id: "orchestrate" }), call("procedures", "ses_worker", "skill", { id: "orchestration" })];

  const graded = gradeDefaultScenarioFacts({ tools: [...conversation, ...entered], sessions, ...fixed });

  expect(graded.scores.no_workflow_entered).toBe(false);
  expect(graded.observations.session?.entered).toEqual(["orchestrate", "orchestration"]);
});

test("changing the tests fails the scope criterion", () => {
  const graded = gradeDefaultScenarioFacts({
    tools: conversation,
    sessions,
    initial: fixed.initial,
    final: [source("b"), { ...tests, sha256: "u" }],
  });

  expect(graded.scores.only_source_changed).toBe(false);
});

test("the driver prompt carries the preamble and selects no workflow", async () => {
  const prompt = await readFile(new URL("prompt.md", import.meta.url), "utf8");

  expect(prompt).toContain(preamble);
  expect(prompt).not.toContain("orchestrat");
});
