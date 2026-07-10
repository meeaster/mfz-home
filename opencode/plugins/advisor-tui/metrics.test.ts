import { describe, expect, it } from "vitest";

import { advisorHistory, advisorMetrics, loadAdvisorHistory, type AdvisorMessage } from "./metrics.js";

describe("advisorMetrics", () => {
  it("counts completed advisor calls and aggregates their token metrics", () => {
    expect(
      advisorMetrics([
        {
          type: "tool",
          tool: "advisor",
          state: {
            status: "completed",
            metadata: { modelID: "claude-opus-4-8", usage: { total: 100, input: 10, cacheRead: 80, cacheWrite: 10 } }
          }
        },
        {
          type: "tool",
          tool: "advisor",
          state: { status: "completed", metadata: { modelID: "claude-opus-4-8", usage: { input: 5, output: 3, reasoning: 2 } } }
        },
        { type: "tool", tool: "advisor", state: { status: "error" } },
        { type: "tool", tool: "bash", state: { status: "completed" } }
      ])
    ).toEqual({
      calls: 2,
      meteredCalls: 1,
      input: 15,
      output: 3,
      reasoning: 2,
      cacheRead: 80,
      cacheWrite: 10,
      total: 100,
      cacheRate: 80 / 105
    });
  });

  it("counts completed executed calls when usage is unavailable", () => {
    expect(
      advisorMetrics([
        { type: "tool", tool: "advisor", state: { status: "completed" } },
        { type: "tool", tool: "advisor", state: { status: "completed", metadata: { modelID: "claude-opus-4-8" } } },
      ]),
    ).toEqual({
      calls: 1,
      meteredCalls: 0,
      input: 0,
      output: 0,
      reasoning: 0,
      cacheRead: 0,
      cacheWrite: 0,
      total: 0
    });
  });

  it("separates whole-session and post-compaction advisor metrics", () => {
    const message = (id: string, created: number, parts: AdvisorMessage["parts"], info: Partial<AdvisorMessage["info"]> = {}): AdvisorMessage => ({
      info: { id, role: "assistant", time: { created }, ...info },
      parts
    });
    expect(
      advisorHistory([
        message("before", 1, [{ id: "before-part", type: "tool", tool: "advisor", state: { status: "completed", metadata: { modelID: "claude-opus-4-8", usage: { total: 10 } } } }]),
        message("summary", 2, [], { summary: true, finish: "stop" }),
        message("after", 3, [{ id: "after-part", type: "tool", tool: "advisor", state: { status: "completed", metadata: { modelID: "claude-opus-4-8", usage: { total: 20 } } } }]),
        message("after", 3, [{ id: "after-part", type: "tool", tool: "advisor", state: { status: "completed", metadata: { modelID: "claude-opus-4-8", usage: { total: 20 } } } }])
      ])
    ).toMatchObject({ session: { calls: 2, meteredCalls: 2, total: 30 }, sinceCompaction: { calls: 1, meteredCalls: 1, total: 20 } });
  });

  it("loads every history page and rejects a repeated cursor", async () => {
    const pages = [
      {
        data: [{ info: { id: "new", role: "assistant", time: { created: 2 } }, parts: [{ id: "new-part", type: "tool", tool: "advisor", state: { status: "completed", metadata: { modelID: "claude-opus-4-8", usage: { total: 20 } } } }] }],
        response: { headers: { get: () => "older" } }
      },
      {
        data: [{ info: { id: "old", role: "assistant", time: { created: 1 } }, parts: [{ id: "old-part", type: "tool", tool: "advisor", state: { status: "completed", metadata: { modelID: "claude-opus-4-8", usage: { total: 10 } } } }] }],
        response: { headers: { get: () => null } }
      }
    ];
    let index = 0;
    await expect(
      loadAdvisorHistory(
        { session: { messages: async () => pages[index++]! } },
        "ses_test"
      )
    ).resolves.toMatchObject({ session: { calls: 2, total: 30 } });

    await expect(
      loadAdvisorHistory(
        { session: { messages: async () => pages[0]! } },
        "ses_test"
      )
    ).rejects.toThrow("repeated session-history cursor");
  });
});
