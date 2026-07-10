import { describe, expect, it, vi } from "vitest";

import {
  advisorCalls,
  advisorHistory,
  advisorMetricGroups,
  advisorMetrics,
  createRefreshScheduler,
  loadAdvisorHistory,
  loadDescendantAdvisorParts,
  type AdvisorMessage,
} from "./metrics.js";

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

  it("flattens nested dual-target metadata and uses Claude's actual model", () => {
    const parts = [
      {
        type: "tool",
        tool: "advisor",
        state: {
          status: "completed",
          metadata: {
            modelID: "ignored-chair-model",
            usage: { total: 999 },
            targets: [
              {
                providerID: "openai",
                modelID: "gpt-5.6-sol",
                variant: "high",
                usage: { total: 10, input: 2 },
              },
              {
                harness: "claude-code",
                modelID: "fable",
                actualModel: "claude-fable-5",
                effort: "high",
                usage: { cacheRead: 120, cacheWrite: 8, cost: 0.354 },
              },
            ],
          },
        },
      },
    ] as const;

    expect(advisorCalls(parts)).toEqual([
      {
        harness: "opencode",
        key: "opencode:openai:gpt-5.6-sol:high",
        label: "gpt-5.6-sol @ high",
        model: { providerID: "openai", modelID: "gpt-5.6-sol", variant: "high" },
        usage: { total: 10, input: 2 },
      },
      {
        harness: "claude-code",
        key: "claude-code:anthropic:claude-fable-5:high",
        label: "claude-fable-5 @ high",
        model: { providerID: "anthropic", modelID: "claude-fable-5", variant: "high" },
        reportedCost: 0.354,
        usage: { cacheRead: 120, cacheWrite: 8, cost: 0.354 },
      },
    ]);
    expect(advisorMetrics(parts)).toEqual({
      calls: 2,
      meteredCalls: 1,
      input: 2,
      output: 0,
      reasoning: 0,
      cacheRead: 120,
      cacheWrite: 8,
      total: 10,
      cacheRate: 120 / 130,
    });
    expect(advisorMetricGroups(parts)).toMatchObject([
      { key: "opencode:openai:gpt-5.6-sol:high", harness: "opencode", metrics: { calls: 1, input: 2 } },
      { key: "claude-code:anthropic:claude-fable-5:high", harness: "claude-code", metrics: { calls: 1, cacheRead: 120 } },
    ]);
  });

  it("groups historical and current Claude metadata under one target", () => {
    const parts = [
      {
        type: "tool",
        tool: "advisor",
        state: {
          status: "completed",
          metadata: {
            targets: [{ harness: "claude-code", actualModel: "claude-fable-5", effort: "high", usage: { cacheRead: 10, cost: 0.1 } }],
          },
        },
      },
      {
        type: "tool",
        tool: "advisor",
        state: {
          status: "completed",
          metadata: {
            targets: [
              {
                harness: "claude-code",
                providerID: "anthropic",
                actualModel: "claude-fable-5",
                effort: "high",
                reportedCost: 0.2,
                usage: { cacheRead: 20, cost: 0.2 },
              },
            ],
          },
        },
      },
    ] as const;

    expect(advisorMetricGroups(parts)).toMatchObject([
      { key: "claude-code:anthropic:claude-fable-5:high", metrics: { calls: 2, cacheRead: 30 } },
    ]);
  });

  it("serializes refreshes and coalesces streaming events into one trailing crawl", async () => {
    vi.useFakeTimers();
    try {
      let resolveFirst!: () => void;
      const first = new Promise<void>((resolve) => {
        resolveFirst = resolve;
      });
      const refresh = vi.fn().mockReturnValueOnce(first).mockResolvedValueOnce(undefined);
      const scheduler = createRefreshScheduler(refresh, 100);

      scheduler.schedule();
      await vi.advanceTimersByTimeAsync(100);
      expect(refresh).toHaveBeenCalledTimes(1);

      scheduler.schedule();
      scheduler.schedule();
      resolveFirst();
      await Promise.resolve();
      await vi.advanceTimersByTimeAsync(100);

      expect(refresh).toHaveBeenCalledTimes(2);
      scheduler.dispose();
    } finally {
      vi.useRealTimers();
    }
  });

  it("loads recursive descendant advisor parts and deduplicates shared parts", async () => {
    const page = (id: string, parts: AdvisorMessage["parts"]) => ({
      data: [{ info: { id, role: "assistant", time: { created: 1 } }, parts }],
      response: { headers: { get: () => null } },
    });
    const children = new Map([
      ["root", [{ id: "child" }]],
      ["child", [{ id: "grandchild" }]],
      ["grandchild", []],
    ]);
    const messages = new Map([
      ["child", page("child-message", [{ id: "shared", type: "tool", tool: "advisor", state: { status: "completed" } }])],
      ["grandchild", page("grandchild-message", [
        { id: "shared", type: "tool", tool: "advisor", state: { status: "completed" } },
        { id: "nested", type: "tool", tool: "advisor", state: { status: "completed" } },
      ])],
    ]);

    await expect(
      loadDescendantAdvisorParts(
        {
          session: {
            children: async ({ sessionID }) => ({ data: children.get(sessionID) ?? [] }),
            messages: async ({ sessionID }) => messages.get(sessionID) ?? page(sessionID, []),
          },
        },
        "root",
      ),
    ).resolves.toMatchObject([{ id: "shared" }, { id: "nested" }]);
  });

  it("finds a child created after the first refresh and its completed advisor part", async () => {
    const advisorPart = {
      id: "live-advisor",
      type: "tool",
      tool: "advisor",
      state: { status: "running", metadata: { modelID: "gpt-5.6-sol", usage: { input: 10 } } },
    };
    const children = new Map<string, { id: string }[]>([["root", []]]);
    const client = {
      session: {
        children: async ({ sessionID }: { sessionID: string }) => ({ data: children.get(sessionID) ?? [] }),
        messages: async () => ({
          data: [{ info: { id: "child-message", role: "assistant", time: { created: 1 } }, parts: [advisorPart] }],
          response: { headers: { get: () => null } },
        }),
      },
    };

    await expect(loadDescendantAdvisorParts(client, "root")).resolves.toEqual([]);
    children.set("root", [{ id: "child" }]);
    await expect(loadDescendantAdvisorParts(client, "root").then(advisorMetricGroups)).resolves.toEqual([]);
    advisorPart.state.status = "completed";
    await expect(loadDescendantAdvisorParts(client, "root").then(advisorMetricGroups)).resolves.toMatchObject([
      { key: "opencode::gpt-5.6-sol:", metrics: { calls: 1, input: 10 } },
    ]);
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
