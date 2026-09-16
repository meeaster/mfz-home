import { describe, expect, it, vi } from "vitest";

import type { Context } from "@opencode/plugin/tui/plugin";

import { runHandoff, type HandoffContext } from "./command.js";

function context(sessionID?: string) {
  const order: string[] = [];
  const inboxSessionID = sessionID ?? "ses_current";

  const promptResult = {
    id: "prompt",
    sessionID: inboxSessionID,
    timeCreated: 0,
    type: "user",
    payload: { text: "" },
    delivery: "queue",
  } satisfies Awaited<ReturnType<Context["client"]["session"]["prompt"]>>;

  const compactResult = {
    id: "compact",
    sessionID: inboxSessionID,
    timeCreated: 0,
    type: "compaction",
    payload: {},
    delivery: "steer",
  } satisfies Awaited<ReturnType<Context["client"]["session"]["compact"]>>;

  const prompt = vi.fn(async () => {
    order.push("prompt");

    return promptResult;
  });

  const wait = vi.fn(async () => {
    order.push("wait");
  });

  const compact = vi.fn(async () => {
    order.push("compact");

    return compactResult;
  });

  const show = vi.fn();

  const value = {
    client: { session: { prompt, wait, compact } },
    ui: {
      router: {
        current: () => (sessionID ? { type: "session", sessionID } : { type: "home" }),
      },
      toast: { show },
    },
  } satisfies HandoffContext;

  return { value, compact, order, prompt, show, wait };
}

describe("handoff TUI command", () => {
  it("writes the focused handoff before compacting the current session", async () => {
    const ui = context("ses_current");

    await runHandoff(ui.value, "preserve the active implementation state");

    expect(ui.prompt).toHaveBeenCalledWith({
      sessionID: "ses_current",
      text: "Prepare a continuation handoff. Preserve this focus: preserve the active implementation state",
      skills: [{ id: "handoff" }],
      delivery: "queue",
    });
    expect(ui.order).toEqual(["prompt", "wait", "compact", "wait"]);
    expect(ui.show).toHaveBeenCalledWith({
      variant: "success",
      message: "Handoff complete; session compacted.",
    });
  });

  it("does not call the API outside a session route", async () => {
    const ui = context();

    await runHandoff(ui.value);

    expect(ui.prompt).not.toHaveBeenCalled();
    expect(ui.compact).not.toHaveBeenCalled();
    expect(ui.show).toHaveBeenCalledWith({ variant: "info", message: "Open a session first." });
  });

  it("does not compact when handoff admission fails", async () => {
    const ui = context("ses_current");
    ui.prompt.mockRejectedValueOnce(new Error("prompt unavailable"));

    await runHandoff(ui.value);

    expect(ui.wait).not.toHaveBeenCalled();
    expect(ui.compact).not.toHaveBeenCalled();
    expect(ui.show).toHaveBeenCalledWith({ variant: "error", message: "Handoff failed: prompt unavailable" });
  });
});
