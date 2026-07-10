import { afterEach, describe, expect, it, vi } from "vitest";

import AdvisorPlugin, { extractUsage, resolveAdvisorPrompt, selectAdvisorMessages } from "./advisor.js";

afterEach(() => vi.unstubAllEnvs());

describe("resolveAdvisorPrompt", () => {
  it("selects the GPT-5.6 prompt automatically for GPT-5.6 advisors", () => {
    const prompt = resolveAdvisorPrompt("gpt-5.6-sol", "auto");

    expect(prompt.variant).toBe("gpt56");
    expect(prompt.system).toContain("smallest specific evidence");
    expect(prompt.system).toContain("Include the evidence needed");
  });

  it("uses the baseline prompt for other advisors in auto mode", () => {
    const prompt = resolveAdvisorPrompt("claude-opus-4-8", "auto");

    expect(prompt.variant).toBe("baseline");
    expect(prompt.system).toContain("do not ask the executor to run things for you");
  });

  it("allows a prompt variant to be selected explicitly", () => {
    expect(resolveAdvisorPrompt("claude-opus-4-8", "gpt56").variant).toBe("gpt56");
    expect(resolveAdvisorPrompt("gpt-5.6-sol", "baseline").variant).toBe("baseline");
  });

  it("rejects unknown prompt variants", () => {
    expect(() => resolveAdvisorPrompt("gpt-5.6-sol", "experimental")).toThrow(
      'Invalid OPENCODE_ADVISOR_PROMPT value "experimental". Use auto, baseline, or gpt56.',
    );
  });
});

describe("selectAdvisorMessages", () => {
  it("keeps all messages when the session has not compacted", () => {
    const messages = [{ info: { role: "user" }, parts: [{ type: "text", text: "Keep this." }] }];

    expect(selectAdvisorMessages(messages)).toBe(messages);
  });

  it("starts at the most recent completed compaction summary", () => {
    const older = { info: { role: "user" }, parts: [{ type: "text", text: "Old raw context" }] };
    const firstMarker = { info: { id: "first", role: "user" }, parts: [{ type: "compaction" }] };
    const firstSummary = {
      info: { role: "assistant", parentID: "first", summary: true, finish: "stop" },
      parts: [{ type: "text", text: "First summary" }],
    };
    const middle = { info: { role: "user" }, parts: [{ type: "text", text: "Middle raw context" }] };
    const secondMarker = { info: { id: "second", role: "user" }, parts: [{ type: "compaction" }] };
    const secondSummary = {
      info: { role: "assistant", parentID: "second", summary: true, finish: "stop" },
      parts: [{ type: "text", text: "Second summary" }],
    };
    const recent = { info: { role: "user" }, parts: [{ type: "text", text: "Recent context" }] };

    expect(selectAdvisorMessages([older, firstMarker, firstSummary, middle, secondMarker, secondSummary, recent])).toEqual([
      secondSummary,
      recent,
    ]);
  });

  it("retains the prior completed summary when a newer compaction is incomplete", () => {
    const firstMarker = { info: { id: "first", role: "user" }, parts: [{ type: "compaction" }] };
    const firstSummary = {
      info: { role: "assistant", parentID: "first", summary: true, finish: "stop" },
      parts: [{ type: "text", text: "First summary" }],
    };
    const incompleteMarker = { info: { id: "incomplete", role: "user" }, parts: [{ type: "compaction" }] };
    const failedSummary = {
      info: { role: "assistant", parentID: "incomplete", summary: true, finish: "stop", error: "failed" },
      parts: [{ type: "text", text: "Bad summary" }],
    };

    expect(selectAdvisorMessages([firstMarker, firstSummary, incompleteMarker, failedSummary])).toEqual([
      firstSummary,
      incompleteMarker,
      failedSummary,
    ]);
  });

  it("keeps the recent tail preserved by compaction", () => {
    const old = { info: { role: "user" }, parts: [{ type: "text", text: "Obsolete context" }] };
    const tail = { info: { id: "tail", role: "user" }, parts: [{ type: "text", text: "Recent verbatim context" }] };
    const marker = {
      info: { id: "compaction", role: "user" },
      parts: [{ type: "compaction", tail_start_id: "tail" }],
    };
    const summary = {
      info: { role: "assistant", parentID: "compaction", summary: true, finish: "stop" },
      parts: [{ type: "text", text: "Summary" }],
    };
    const recent = { info: { role: "user" }, parts: [{ type: "text", text: "Later context" }] };

    expect(selectAdvisorMessages([old, tail, marker, summary, recent])).toEqual([marker, summary, tail, recent]);
  });
});

describe("extractUsage", () => {
  it("aggregates assistant token usage and cost", () => {
    expect(
      extractUsage([
        {
          info: {
            role: "assistant",
            cost: 0.012345,
            tokens: { total: 120, input: 100, output: 10, reasoning: 10, cache: { read: 30, write: 5 } },
          },
        },
        {
          info: {
            role: "assistant",
            cost: 0.0001,
            tokens: { input: 20, output: 3, reasoning: 2, cache: { read: 4, write: 1 } },
          },
        },
      ]),
    ).toEqual({
      input: 120,
      output: 13,
      reasoning: 12,
      cacheRead: 34,
      cacheWrite: 6,
      total: 150,
      cost: 0.012445,
    });
  });
});

describe("advisor", () => {
  it("returns child usage and cleans up its session", async () => {
    vi.stubEnv("OPENCODE_ADVISOR_MODEL", "openai/gpt-5.6-sol");
    vi.stubEnv("OPENCODE_ADVISOR_PROMPT", "baseline");
    const deleteSession = vi.fn().mockResolvedValue({});
    const prompt = vi.fn().mockResolvedValue({ data: { parts: [{ type: "text", text: "Proceed." }] } });
    const messages = vi
      .fn()
      .mockResolvedValueOnce({ data: [{ info: { role: "user" }, parts: [{ type: "text", text: "Review this." }] }] })
      .mockResolvedValueOnce({
        data: [
          {
            info: {
              role: "assistant",
              cost: 0.01,
              tokens: { total: 16, input: 10, output: 2, reasoning: 4, cache: { read: 1, write: 0 } },
            },
          },
        ],
      });
    const client = {
      session: {
        messages,
        create: vi.fn().mockResolvedValue({ data: { id: "advisor-session" } }),
        prompt,
        delete: deleteSession,
      },
    };
    const plugin = AdvisorPlugin as unknown as {
      server(input: { client: typeof client }): Promise<{ tool: Record<string, { execute: Function }> }>;
    };
    const tools = await plugin.server({ client });
    const metadata = vi.fn();

    const result = await tools.tool.advisor.execute({}, { sessionID: "parent", directory: "/tmp", metadata });

    expect(result.output).toContain("Usage: 16 tokens");
    expect(result.metadata.usage).toMatchObject({ total: 16, cost: 0.01 });
    expect(result.metadata.promptVariant).toBe("baseline");
    expect(prompt).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          system: expect.stringContaining("do not ask the executor to run things for you"),
        }),
      }),
    );
    expect(deleteSession).toHaveBeenCalledWith({ path: { id: "advisor-session" }, query: { directory: "/tmp" } });
  });

  it("returns advice when child usage cannot be read", async () => {
    const deleteSession = vi.fn().mockResolvedValue({});
    const client = {
      session: {
        messages: vi
          .fn()
          .mockResolvedValueOnce({ data: [{ info: { role: "user" }, parts: [{ type: "text", text: "Review this." }] }] })
          .mockRejectedValueOnce(new Error("child session gone")),
        create: vi.fn().mockResolvedValue({ data: { id: "advisor-session" } }),
        prompt: vi.fn().mockResolvedValue({ data: { parts: [{ type: "text", text: "Proceed." }] } }),
        delete: deleteSession,
      },
    };
    const plugin = AdvisorPlugin as unknown as {
      server(input: { client: typeof client }): Promise<{ tool: Record<string, { execute: Function }> }>;
    };
    const tools = await plugin.server({ client });

    const result = await tools.tool.advisor.execute({}, { sessionID: "parent", directory: "/tmp", metadata: vi.fn() });

    expect(result.output).toContain("Proceed.\n\nUsage: unavailable");
    expect(deleteSession).toHaveBeenCalled();
  });
});
