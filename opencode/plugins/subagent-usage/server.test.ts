import { describe, expect, it, vi } from "vitest";
import SubagentUsagePlugin, { backgroundGuidance, summarizeUsage, usageGuidance } from "./server";

describe("subagent usage", () => {
  it("summarizes the largest context and total assistant cost", () => {
    expect(
      summarizeUsage([
        {
          info: {
            role: "user",
            tokens: { input: 100_000 },
          },
        },
        {
          info: {
            role: "assistant",
            tokens: { input: 120_000, cache: { read: 30_000, write: 5_000 } },
          },
        },
        {
          info: {
            role: "assistant",
            tokens: { input: 180_000, cache: { read: 25_000 } },
          },
        },
      ]),
    ).toEqual({ maxContext: 205_000 });
  });

  it("reports reuse eligibility and cost", () => {
    const guidance = usageGuidance("ses_child", {
      maxContext: 180_000,
    });

    expect(guidance).toContain("180,000 / 200,000");
    expect(guidance).toContain("Reuse: eligible");
    expect(guidance).not.toContain("handoff");
  });

  it("does not claim usage for a still-running background task", () => {
    expect(backgroundGuidance("ses_child")).toContain("Usage: unavailable");
  });

  it("marks context at the limit as not reusable", () => {
    expect(usageGuidance("ses_child", { maxContext: 200_000 })).toContain("Reuse: avoid");
    expect(usageGuidance("ses_child", { maxContext: 200_001 })).toContain("Reuse: avoid");
  });

  it("appends usage to completed task output without replacing the task result", async () => {
    const messages = vi.fn().mockResolvedValue({
      data: [
        {
          info: {
            role: "assistant",
            tokens: { input: 180_000, cache: { read: 25_000 } },
          },
        },
      ],
    });
    const plugin = SubagentUsagePlugin as unknown as {
      server(input: { client: { session: { messages: typeof messages } }; directory: string }): Promise<{
        "tool.execute.after": Function;
      }>;
    };
    const hooks = await plugin.server({ client: { session: { messages } }, directory: "/workspace" });
    const output = {
      title: "Review",
      output: "<task id=\"ses_child\" state=\"completed\">result</task>",
      metadata: { sessionId: "ses_child" },
    };

    await hooks["tool.execute.after"](
      { tool: "task", sessionID: "ses_parent", callID: "call_1", args: {} },
      output,
    );

    expect(messages).toHaveBeenCalledWith({
      path: { id: "ses_child" },
      query: { directory: "/workspace" },
    });
    expect(output.output).toContain("<task id=\"ses_child\" state=\"completed\">result</task>");
    expect(output.output).toContain("205,000 / 200,000");
  });

  it("reports background launch without querying incomplete usage", async () => {
    const messages = vi.fn();
    const plugin = SubagentUsagePlugin as unknown as {
      server(input: { client: { session: { messages: typeof messages } }; directory: string }): Promise<{
        "tool.execute.after": Function;
      }>;
    };
    const hooks = await plugin.server({ client: { session: { messages } }, directory: "/workspace" });
    const output = {
      title: "Research",
      output: "<task id=\"ses_child\" state=\"running\">started</task>",
      metadata: { sessionId: "ses_child", background: true },
    };

    await hooks["tool.execute.after"](
      { tool: "task", sessionID: "ses_parent", callID: "call_1", args: {} },
      output,
    );

    expect(messages).not.toHaveBeenCalled();
    expect(output.output).toContain("Usage: unavailable");
  });

  it("does not append guidance when child message lookup fails", async () => {
    const messages = vi.fn().mockRejectedValue(new Error("missing child"));
    const plugin = SubagentUsagePlugin as unknown as {
      server(input: { client: { session: { messages: typeof messages } }; directory: string }): Promise<{
        "tool.execute.after": Function;
      }>;
    };
    const hooks = await plugin.server({ client: { session: { messages } }, directory: "/workspace" });
    const output = { output: "result", metadata: { sessionId: "ses_child" } };

    await expect(
      hooks["tool.execute.after"]({ tool: "task", sessionID: "ses_parent" }, output),
    ).resolves.toBeUndefined();
    expect(output.output).toBe("result");
  });

  it("ignores task errors", async () => {
    const messages = vi.fn();
    const plugin = SubagentUsagePlugin as unknown as {
      server(input: { client: { session: { messages: typeof messages } }; directory: string }): Promise<{
        "tool.execute.after": Function;
      }>;
    };
    const hooks = await plugin.server({ client: { session: { messages } }, directory: "/workspace" });
    const output = { output: "error", metadata: undefined };

    await hooks["tool.execute.after"]({ tool: "task", sessionID: "ses_parent" }, output);
    expect(messages).not.toHaveBeenCalled();
  });
});
