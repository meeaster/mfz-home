import { describe, expect, it } from "vitest";

import {
  estimateAdvisorTokens,
  planAdvisorTranscript,
  selectAdvisorContext,
  serializeTranscript,
} from "./transcript.js";

describe("advisor transcript planning", () => {
  it("plans the first synchronization from the selected context", () => {
    const messages = [{ info: { id: "user-1", role: "user" }, parts: [{ type: "text", text: "Review this." }] }];

    const plan = planAdvisorTranscript(messages, undefined);

    expect(plan).toMatchObject({ epoch: "uncompacted", cursor: "user-1", rotate: true, estimatedTokens: 5 });
    expect(plan.transcript).toContain("Review this.");
  });

  it("plans only the eligible delta and removes completed advisor results", () => {
    const messages = [
      { info: { id: "user-1", role: "user" }, parts: [{ type: "text", text: "Initial context" }] },
      { info: { id: "advisor-1", role: "assistant" }, parts: [{ type: "tool", tool: "advisor", state: { status: "completed", output: "Prior advice" } }] },
      { info: { id: "user-2", role: "user" }, parts: [{ type: "text", text: "New context" }] },
    ];

    const plan = planAdvisorTranscript(messages, { epoch: "uncompacted", cursor: "user-1" });

    expect(plan.rotate).toBe(false);
    expect(plan.transcript).toContain("New context");
    expect(plan.transcript).not.toContain("Prior advice");
    expect(plan.transcript).not.toContain("Initial context");
  });

  it("reports no pending input immediately after a call, then only new main-session messages", () => {
    const afterCall = [
      { info: { id: "user-1", role: "user" }, parts: [{ type: "text", text: "Initial context" }] },
      { info: { id: "assistant-1", role: "assistant" }, parts: [{ type: "tool", tool: "advisor", state: { status: "completed", output: "Advice" } }] },
    ];
    const continuation = { epoch: "uncompacted", cursor: "assistant-1" };

    const synchronized = planAdvisorTranscript(afterCall, continuation);
    expect(synchronized.estimatedTokens).toBe(0);

    const pending = planAdvisorTranscript(
      [...afterCall, { info: { id: "user-2", role: "user" }, parts: [{ type: "text", text: "New context" }] }],
      continuation,
    );
    expect(pending.transcript).toBe("## user\nNew context");
    expect(pending.estimatedTokens).toBe(estimateAdvisorTokens(pending.transcript));
  });

  it("falls back to the available history when the synchronized cursor is missing", () => {
    const messages = [
      { info: { id: "user-1", role: "user" }, parts: [{ type: "text", text: "Initial context" }] },
      { info: { id: "user-2", role: "user" }, parts: [{ type: "text", text: "Current context" }] },
    ];

    const plan = planAdvisorTranscript(messages, { epoch: "uncompacted", cursor: "missing" });

    expect(plan.rotate).toBe(false);
    expect(plan.transcript).toContain("Initial context");
    expect(plan.transcript).toContain("Current context");
  });

  it("rotates to a new compaction epoch", () => {
    const messages = [
      { info: { id: "marker", role: "user" }, parts: [{ type: "compaction", tail_start_id: "tail" }] },
      { info: { id: "summary", parentID: "marker", role: "assistant", summary: true, finish: "stop" }, parts: [{ type: "text", text: "Summary" }] },
      { info: { id: "tail", role: "user" }, parts: [{ type: "text", text: "Tail" }] },
      { info: { id: "new", role: "user" }, parts: [{ type: "text", text: "New" }] },
    ];

    const plan = planAdvisorTranscript(messages, { epoch: "uncompacted", cursor: "old" });

    expect(plan.rotate).toBe(true);
    expect(plan.epoch).toBe("compaction:marker");
    expect(plan.transcript).toContain("Summary");
  });

  it("uses the same serializer for estimation and submission", () => {
    const messages = [{ info: { role: "user" }, parts: [{ type: "text", text: "A😀" }] }];
    const transcript = serializeTranscript(messages);

    expect(estimateAdvisorTokens(transcript)).toBe(Math.ceil(new TextEncoder().encode(transcript).length / 4));
  });

  it("omits GPT-5.6 reasoning while retaining reasoning from other models", () => {
    const transcript = serializeTranscript([
      { info: { role: "assistant", modelID: "gpt-5.6-luna" }, parts: [{ type: "reasoning", text: "Executor planning details" }, { type: "text", text: "Visible answer" }] },
      { info: { role: "assistant", modelID: "gpt-5.5" }, parts: [{ type: "reasoning", text: "Older model reasoning" }] },
    ]);

    expect(transcript).not.toContain("Executor planning details");
    expect(transcript).toContain("Older model reasoning");
    expect(transcript).toContain("Visible answer");
  });

  it("retains the existing context selection for incomplete compactions", () => {
    const messages = [
      { info: { id: "old", role: "user" }, parts: [{ type: "text", text: "Old" }] },
      { info: { id: "marker", role: "user" }, parts: [{ type: "compaction" }] },
      { info: { id: "failed", parentID: "marker", role: "assistant", summary: true, finish: "stop", error: "failed" }, parts: [{ type: "text", text: "Failed" }] },
    ];

    expect(selectAdvisorContext(messages).messages).toEqual(messages);
  });
});
