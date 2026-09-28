import { expect, test } from "bun:test";
import type { RecordedFile, ToolCall } from "@hona/openeval";
import type { CatalogCall } from "../../../../src/judging/facts.js";
import { gradeSourceFacts } from "./judge.js";

const file = (sha256: string): RecordedFile => ({ path: "src/accept-release.ts", bytes: 10, sha256 });

const explore: ToolCall = {
  id: "call_explore",
  sessionID: "ses_root",
  assistantMessageId: "msg_1",
  name: "subagent",
  status: "succeeded",
  input: { agent: "explore" },
};

const entered: ToolCall[] = [
  { ...explore, id: "call_entry", name: "skill", input: { id: "orchestrate" } },
  { ...explore, id: "call_procedures", name: "skill", input: { id: "orchestration" } },
];

const attach: ToolCall = { ...explore, id: "call_attach", name: "execute", input: { code: "return tools.cairn.catalog_session({ ... })" } };

const catalog: CatalogCall[] = [{ callID: "call_attach", sessionID: "ses_root", tool: "session", input: { session: "opencode:ses_root", attach: [{ create: { title: "Resume rerun decisions", provisional: true } }] } }];

const child = [{ id: "ses_root" }, { id: "ses_child", parentID: "ses_root" }];

test("completed explore dispatch and unchanged file pass archive criteria", () => {
  const result = gradeSourceFacts({ tools: [...entered, attach, explore], sessions: child, initial: [file("a")], final: [file("a")], catalog });

  expect(result.scores).toEqual({
    workflow_entered: true,
    coordinator_skills_in_role: true,
    producer_skills_in_role: true,
    explore_dispatched: true,
    workspace_unchanged: true,
    effort_attached_first: true,
    // The explore child replied without a file, so no output needed a description.
    outputs_described: null,
  });
});

test("direct investigation without a child fails routing even with a correct answer", () => {
  const result = gradeSourceFacts({ tools: entered, sessions: [{ id: "ses_root" }], initial: [file("a")], final: [file("a")] });

  expect(result.scores.workflow_entered).toBe(true);
  expect(result.scores.explore_dispatched).toBe(false);
});

test("a missing entry, failed explore call, and changed file fail independently", () => {
  const result = gradeSourceFacts({
    tools: [{ ...explore, status: "failed" }],
    sessions: [{ id: "ses_root" }],
    initial: [file("a")],
    final: [file("b")],
  });

  expect(result.scores.workflow_entered).toBe(false);
  expect(result.scores.explore_dispatched).toBe(false);
  expect(result.scores.workspace_unchanged).toBe(false);
});
