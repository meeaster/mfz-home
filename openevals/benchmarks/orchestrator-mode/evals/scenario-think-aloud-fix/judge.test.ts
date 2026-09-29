import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import type { RecordedFile, ToolCall } from "@hona/openeval";
import type { CatalogCall } from "../../../../src/judging/facts.js";
import { preamble } from "../../../../src/judging/scenario.js";
import { gradeScenarioFacts } from "./judge.js";

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

const opening = call("open", "ses_driver", "subagent", { agent: "agent-under-test", prompt: `${preamble}\n\nso bun test is failing...` });

const decision = call("decide", "ses_driver", "subagent", {
  agent: "agent-under-test",
  prompt: "yeah go with that, you can change src/accept-release.ts",
  sessionID: "ses_aut",
});

const result = "/home/dev/workspace/artifacts/cairn/sessions/opencode/2026-09/ses_root/accept-release-fix.md";

const context = "/home/dev/workspace/artifacts/cairn/efforts/release-status-accepted/effort.md";

/** The coordinator creates a provisional effort before it dispatches, and Scribe keeps its records unread. */
const coordinator = [
  call("entry", "ses_aut", "skill", { id: "orchestrate" }),
  call("procedures", "ses_aut", "skill", { id: "orchestration" }),
  call("attach", "ses_aut", "execute", { code: "return tools.cairn.catalog_session({ ... })" }),
  call("dispatch", "ses_aut", "subagent", { agent: "worker" }),
  call("fix", "ses_worker", "edit", { filePath: "/workspace/src/accept-release.ts" }),
  call("result", "ses_worker", "write", { filePath: result }),
  call("describe", "ses_worker", "execute", { code: "return tools.cairn.catalog_describe({ ... })" }),
  call("read-result", "ses_aut", "read", { path: result }),
  call("records", "ses_aut", "subagent", { agent: "scribe" }),
  call("context", "ses_scribe", "write", { filePath: context }),
];

const catalog: CatalogCall[] = [
  { callID: "attach", sessionID: "ses_aut", tool: "session", input: { session: "opencode:ses_aut", attach: [{ create: { title: "Release status accepted", provisional: true } }] } },
  { callID: "describe", sessionID: "ses_worker", tool: "describe", input: { path: result, category: "evidence", title: "Status fix" } },
];

const sessions = [
  { id: "ses_driver" },
  { id: "ses_aut", parentID: "ses_driver", agent: "agent-under-test" },
  { id: "ses_worker", parentID: "ses_aut", agent: "worker" },
  { id: "ses_scribe", parentID: "ses_aut", agent: "scribe" },
];

const fixed = { initial: [source("a"), tests], final: [source("b"), tests] };

test("a driven conversation that delegates the fix passes every archive criterion", () => {
  const graded = gradeScenarioFacts({ tools: [opening, decision, ...coordinator], sessions, ...fixed, catalog });

  expect(graded.scores).toEqual({
    harness_preamble_sent: true,
    harness_one_conversation: true,
    harness_driver_only_converses: true,
    workflow_entered: true,
    coordinator_skills_in_role: true,
    worker_dispatched: true,
    only_source_changed: true,
    dispatches_wrote_files: true,
    returned_files_read: true,
    effort_attached_first: true,
    outputs_described: true,
  });
});

test("the driver's own tool use fails the harness without being charged to the agent under test", () => {
  const driverWork = [call("driver-skill", "ses_driver", "skill", { id: "grilling" }), call("driver-read", "ses_driver", "read", { path: "/workspace/src/accept-release.ts" })];

  const graded = gradeScenarioFacts({ tools: [opening, ...driverWork, decision, ...coordinator], sessions, ...fixed });

  expect(graded.scores.harness_driver_only_converses).toBe(false);
  expect(graded.scores.coordinator_skills_in_role).toBe(true);
  expect(graded.scores.workflow_entered).toBe(true);
});

test("a driver that omits the preamble and restarts the conversation leaves the coordinator ungraded", () => {
  const restart = call("restart", "ses_driver", "subagent", { agent: "agent-under-test", prompt: "yeah go with that" });

  const graded = gradeScenarioFacts({
    tools: [call("open", "ses_driver", "subagent", { agent: "agent-under-test", prompt: "so bun test is failing..." }), restart, ...coordinator],
    sessions: [...sessions, { id: "ses_aut_2", parentID: "ses_driver", agent: "agent-under-test" }],
    ...fixed,
  });

  expect(graded.scores.harness_preamble_sent).toBe(false);
  expect(graded.scores.harness_one_conversation).toBe(false);
  expect(graded.scores.workflow_entered).toBeNull();
  expect(graded.scores.only_source_changed).toBeNull();
  expect(JSON.parse(JSON.stringify(graded))).toEqual(graded);
});

test("the driver prompt carries the preamble the harness checks for", async () => {
  expect(await readFile(new URL("prompt.md", import.meta.url), "utf8")).toContain(preamble);
});
