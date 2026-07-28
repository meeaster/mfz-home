import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

import {
  compactStatus,
  inspectionLines,
  latestByCreated,
  parseContextOutput,
  receiptsForSession,
  type WorkContext,
  type WorkReceipt,
} from "./state.js";

const bound = {
  session: { source: "opencode", id: "ses_1" },
  bound: true,
  unit: { slug: "work-context", phase: "implement", orientation: { revision: 2 } },
  freshness: "pending",
  reminder: "Active work unit work-context (implement). Keep work aligned and flag apparent scope drift.",
  delivery: { boundary: "reload" },
} satisfies WorkContext;

describe("work-context TUI state", () => {
  it("formats compact bound status and keeps unbound sessions quiet", () => {
    expect(compactStatus(bound)).toBe("work-context implement pending");
    expect(compactStatus({ session: bound.session, bound: false, reminder: "Tracking is optional." })).toBeUndefined();
  });

  it("formats pending, failed, and exact inspection details", () => {
    const lines = inspectionLines({
      context: { ...bound, freshness: "failed", delivery: { boundary: "compaction", error: "reload failed" } },
      receipts: [
        {
          unit: "work-context",
          session: bound.session,
          boundary: "orientation-revision",
          orientation_revision: 2,
          reminder: "Exact reminder",
          orientation: "Exact orientation",
          outcome: "delivered",
          error: null,
          created_at: "2026-07-22T12:00:00.000Z",
        },
      ],
      checkpoints: [{ created_at: "2026-07-22T11:00:00.000Z" }],
    });
    expect(lines).toEqual(expect.arrayContaining([
      "Freshness: failed",
      "Boundary: orientation-revision",
      "Orientation revision: 2",
      "Reminder: Exact reminder",
      "Orientation: Exact orientation",
      "Latest checkpoint: 2026-07-22T11:00:00.000Z",
      "Error: reload failed",
    ]));
    expect(inspectionLines({ context: { session: bound.session, bound: false, reminder: "Tracking is optional." } })).toEqual([
      "Work context: unbound",
      "Reminder: Tracking is optional.",
    ]);
    expect(inspectionLines({ error: "mfz unavailable" })).toEqual(["Work context unavailable", "Error: mfz unavailable"]);
  });

  it("reads valid CLI context and selects the newest record", () => {
    expect(parseContextOutput({ ok: true, context: bound })).toMatchObject({ bound: true, unit: { slug: "work-context" } });
    expect(latestByCreated([{ created_at: "2026-01-01" }, { created_at: "2026-02-01" }])?.created_at).toBe("2026-02-01");
  });

  it("inspects receipts only for the active session", () => {
    const receipt = {
      unit: "work-context",
      boundary: "request",
      orientation_revision: 2,
      reminder: "Reminder",
      orientation: null,
      outcome: "delivered",
      error: null,
      created_at: "2026-07-22T12:00:00.000Z",
    } satisfies Omit<WorkReceipt, "session">;
    const receipts = [
      { ...receipt, session: bound.session },
      { ...receipt, session: { source: "opencode", id: "other" } },
    ];

    expect(receiptsForSession(receipts, "ses_1")).toHaveLength(1);
  });

  it("activates both server and TUI entries in the personal profile", async () => {
    const profile = await readFile(new URL("../../../../profiles/personal/profile.yml", import.meta.url), "utf8");
    expect(profile).toMatch(/plugins:\n(?:.*\n)*?\s+- work-context/);
    expect(profile).toMatch(/tui_plugins:\n(?:.*\n)*?\s+- work-context/);
  });
});
