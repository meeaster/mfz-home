import { expect, test } from "bun:test";
import type { ToolCall } from "@hona/openeval";
import { provisionalEffortFirst, undescribedOutputs } from "./catalog.js";
import type { CatalogCall } from "./facts.js";

const call = (id: string, sessionID: string, name: string, input: ToolCall["input"]): ToolCall => ({
  id,
  sessionID,
  assistantMessageId: "msg_1",
  name,
  status: "succeeded",
  input,
});

const sessions = [{ id: "ses_root" }, { id: "ses_explore", parentID: "ses_root", agent: "explore" }, { id: "ses_scribe", parentID: "ses_root", agent: "scribe" }];

const execute = (id: string, sessionID: string) => call(id, sessionID, "execute", { code: "return tools.cairn.catalog_session({ ... })" });

const dispatch = call("dispatch", "ses_root", "subagent", { agent: "explore" });

const attachCall = (callID: string, attach: readonly (string | { create: { title: string; provisional?: boolean } })[]): CatalogCall => ({
  callID,
  sessionID: "ses_root",
  tool: "session",
  input: { session: "opencode:ses_root", attach: [...attach] },
});

const provisional = { create: { title: "Release status accepted", provisional: true } };

test("a provisional effort counts only when the root attaches it before its first dispatch", () => {
  const before = provisionalEffortFirst({ tools: [execute("attach", "ses_root"), dispatch], sessions, catalog: [attachCall("attach", [provisional])] });

  const after = provisionalEffortFirst({ tools: [dispatch, execute("attach", "ses_root")], sessions, catalog: [attachCall("attach", [provisional])] });

  expect(before.attached).toBe(true);
  expect(after.attached).toBe(false);
});

test("attaching an existing effort or creating a regular one is not the provisional effort orchestration creates", () => {
  const existing = provisionalEffortFirst({ tools: [execute("attach", "ses_root")], sessions, catalog: [attachCall("attach", ["release-status"])] });

  const regular = provisionalEffortFirst({ tools: [execute("attach", "ses_root")], sessions, catalog: [attachCall("attach", [{ create: { title: "Release status accepted" } }])] });

  expect(existing.attached).toBe(false);
  expect(regular.attached).toBe(false);
});

test("a producer's file needs its own description, and Scribe's records need none", () => {
  const evidence = "/home/dev/workspace/artifacts/cairn/sessions/opencode/2026-09/ses_root/cause.md";

  const tools = [
    dispatch,
    call("write", "ses_explore", "write", { filePath: evidence }),
    call("context", "ses_scribe", "write", { filePath: "/home/dev/workspace/artifacts/cairn/efforts/release/effort.md" }),
    execute("describe", "ses_root"),
  ];

  const byParent: CatalogCall = { callID: "describe", sessionID: "ses_root", tool: "describe", input: { path: evidence, category: "evidence" } };

  expect(undescribedOutputs({ tools, sessions, catalog: [byParent] })).toEqual({ described: false, undescribed: [evidence] });

  expect(undescribedOutputs({ tools, sessions, catalog: [{ ...byParent, sessionID: "ses_explore" }] }).described).toBe(true);

  expect(undescribedOutputs({ tools: [dispatch], sessions, catalog: [] }).described).toBeNull();
});
