import { mkdtemp, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

import { boundedReminder, createWorkContextServer, latestCompletedCompactionSummary } from "./server.js";
import type { MfzRunner } from "./mfz.js";

const orientation = {
  revision: 1,
  outcome: "Ship the work-context adapter",
  direction: "Keep the plugin isolated",
  constraints: ["Fail open"],
  questions: [],
  next_action: "Run focused tests",
};

function boundContext(overrides: Record<string, unknown> = {}) {
  return {
    session: { source: "opencode", id: "ses_1" },
    bound: true,
    unit: { slug: "work-context", phase: "implement", orientation },
    freshness: "pending",
    reminder: "Active work unit work-context (implement). Keep work aligned and flag apparent scope drift.",
    pending_orientation: orientation,
    delivery: { state: "pending", orientation_revision: 1, boundary: "attachment", updated_at: "2026-07-22T00:00:00.000Z" },
    ...overrides,
  };
}

function hooksFor(runner: unknown, messages = vi.fn()) {
  return createWorkContextServer({ client: { session: { messages } }, directory: "/workspace", runner: runner as MfzRunner });
}

describe("work-context server", () => {
  it("adds bounded attached and unbound guidance", async () => {
    const attachedRunner = vi.fn().mockResolvedValue({ ok: true, context: boundContext() });
    const attached = hooksFor(attachedRunner);
    const output = { system: [] as string[] };
    await attached["experimental.chat.system.transform"]?.({ sessionID: "ses_1" } as never, output);

    expect(output.system[0]).toBe(boundContext().reminder);
    expect(output.system[0]!.length).toBeLessThanOrEqual(280);
    expect(output.system[1]).toContain("Work orientation (revision 1)");
    expect(attachedRunner.mock.calls[1]![0]).toEqual(expect.arrayContaining(["receipt", "--orientation", output.system[1]]));

    const unboundRunner = vi.fn().mockResolvedValue({
      ok: true,
      context: { session: { source: "opencode", id: "ses_2" }, bound: false, reminder: "Work tracking is optional. Durable work may justify a human-confirmed work-unit attachment." },
    });
    const unboundOutput = { system: [] as string[] };
    await hooksFor(unboundRunner)["experimental.chat.system.transform"]?.({ sessionID: "ses_2" } as never, unboundOutput);
    expect(unboundOutput.system).toEqual(["Work tracking is optional. Durable work may justify a human-confirmed work-unit attachment."]);
    expect(unboundRunner).toHaveBeenCalledOnce();
    expect(boundedReminder("x".repeat(300))).toHaveLength(280);
  });

  it("delivers orientation once per pending boundary and once on process resume", async () => {
    const delivered = boundContext({
      freshness: "delivered",
      pending_orientation: null,
      delivery: { state: "delivered", orientation_revision: 1, boundary: "attachment", updated_at: "2026-07-22T00:00:00.000Z" },
    });
    const runner = vi.fn().mockResolvedValue({ ok: true, context: delivered });
    const hooks = hooksFor(runner);
    const first = { system: [] as string[] };
    const second = { system: [] as string[] };
    await hooks["experimental.chat.system.transform"]?.({ sessionID: "ses_1" } as never, first);
    await hooks["experimental.chat.system.transform"]?.({ sessionID: "ses_1" } as never, second);

    expect(first.system).toHaveLength(2);
    expect(second.system).toHaveLength(1);
    expect(runner.mock.calls[1]![0]).toEqual(expect.arrayContaining(["--boundary", "resume", "--orientation"]));
    expect(runner.mock.calls[3]![0]).toEqual(expect.arrayContaining(["--boundary", "request"]));
    expect(runner.mock.calls[3]![0]).not.toContain("--orientation");
  });

  it("delivers a changed orientation revision after it becomes stale", async () => {
    const revisionTwo = { ...orientation, revision: 2, direction: "Use the new orientation" };
    const runner = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, context: boundContext({ freshness: "delivered", pending_orientation: null }) })
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({
        ok: true,
        context: boundContext({
          freshness: "stale",
          pending_orientation: revisionTwo,
          unit: { slug: "work-context", phase: "implement", orientation: revisionTwo },
          delivery: { state: "stale", orientation_revision: 1, boundary: "orientation-revision", updated_at: "2026-07-22T00:00:00.000Z" },
        }),
      })
      .mockResolvedValueOnce({ ok: true });
    const hooks = hooksFor(runner);
    await hooks["experimental.chat.system.transform"]?.({ sessionID: "ses_1" } as never, { system: [] });
    const output = { system: [] as string[] };
    await hooks["experimental.chat.system.transform"]?.({ sessionID: "ses_1" } as never, output);

    expect(output.system[1]).toContain("revision 2");
    expect(runner.mock.calls[3]![0]).toEqual(expect.arrayContaining(["--boundary", "orientation-revision", "--orientation-revision", "2"]));
  });

  it("checkpoints the latest completed compaction summary and always reloads", async () => {
    const checkpointDirectory = await mkdtemp(path.join(tmpdir(), "work-context-checkpoints-"));
    const postCompaction = boundContext({
      delivery: {
        state: "pending",
        orientation_revision: 1,
        boundary: "compaction",
        updated_at: "2026-07-22T00:00:00.000Z",
      },
    });
    const runner = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, context: boundContext() })
      .mockResolvedValueOnce({ ok: true, directory: checkpointDirectory })
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true, context: postCompaction })
      .mockResolvedValueOnce({ ok: true });
    const history = [
      { info: { role: "assistant", summary: true, finish: "stop", error: "failed" }, parts: [{ type: "text", text: "Bad" }] },
      { info: { role: "assistant", summary: true, finish: "stop" }, parts: [{ type: "text", text: "Latest summary" }] },
    ];
    const messages = vi.fn().mockResolvedValue({
      data: history,
    });
    const hooks = hooksFor(runner, messages);
    await hooks.event?.({ event: { type: "session.compacted", properties: { sessionID: "ses_1" } } } as never);

    expect(runner.mock.calls[1]![0]).toEqual([
      "work",
      "instructions",
      "checkpoint",
      "work-context",
      "--json",
    ]);
    expect(runner.mock.calls[2]![0]).toEqual(["work", "validate", "work-context", "--json"]);
    const checkpointFiles = await readdir(checkpointDirectory);
    expect(checkpointFiles).toHaveLength(1);
    expect(await readFile(path.join(checkpointDirectory, checkpointFiles[0]!), "utf8")).toContain(
      "Latest summary",
    );
    expect(await readFile(path.join(checkpointDirectory, checkpointFiles[0]!), "utf8")).toMatch(
      /^---\nid: compaction-/,
    );
    expect(runner.mock.calls.flatMap((call) => call[0])).not.toContain("--text");
    expect(runner.mock.calls[3]![0]).toEqual([
      "work",
      "reload",
      "--session",
      "opencode:ses_1",
      "--boundary",
      "compaction",
      "--json",
    ]);
    expect(latestCompletedCompactionSummary(history)).toBe("Latest summary");

    const output = { system: [] as string[] };
    await hooks["experimental.chat.system.transform"]?.({ sessionID: "ses_1" } as never, output);
    expect(output.system[1]).toContain("Work orientation (revision 1)");
    expect(runner.mock.calls[5]![0]).toEqual(
      expect.arrayContaining(["--boundary", "compaction", "--orientation", output.system[1]]),
    );
  });

  it("records compaction failures when possible, reloads, and never blocks requests", async () => {
    const runner = vi.fn().mockResolvedValue({ ok: true, context: boundContext() });
    const hooks = hooksFor(runner, vi.fn().mockResolvedValue({ error: "gone" }));
    await expect(hooks.event?.({ event: { type: "session.compacted", data: { sessionID: "ses_1" } } } as never)).resolves.toBeUndefined();
    expect(runner.mock.calls.at(-1)?.[0]).toEqual([
      "work",
      "reload",
      "--session",
      "opencode:ses_1",
      "--boundary",
      "compaction",
      "--json",
    ]);
    expect(runner.mock.calls[1]![0]).toEqual(expect.arrayContaining(["receipt", "--outcome", "failed", "--boundary", "compaction"]));

    const unavailable = hooksFor(vi.fn().mockRejectedValue(new Error("store unavailable")));
    const output = { system: ["existing"] };
    await expect(unavailable["experimental.chat.system.transform"]?.({ sessionID: "ses_1" } as never, output)).resolves.toBeUndefined();
    expect(output.system).toEqual(["existing"]);
  });
});
