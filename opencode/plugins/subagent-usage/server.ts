import type { PluginModule } from "@opencode-ai/plugin";

const CONTEXT_LIMIT = 200_000;

type AssistantMessage = {
  role?: string;
  tokens?: {
    input?: number;
    output?: number;
    reasoning?: number;
    cache?: { read?: number; write?: number };
  };
};

type MessageEntry = { info?: AssistantMessage };

type SessionClient = {
  messages(input: {
    path: { id: string };
    query?: { directory?: string };
  }): Promise<{ data?: MessageEntry[]; error?: unknown }>;
};

type Usage = {
  maxContext: number;
};

function finite(value: number | undefined): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;
}

export function summarizeUsage(messages: readonly MessageEntry[]): Usage {
  return messages.reduce<Usage>(
    (usage, message) => {
      const info = message.info;
      if (info?.role !== "assistant") return usage;

      const tokens = info.tokens;
      const context =
        finite(tokens?.input) + finite(tokens?.cache?.read) + finite(tokens?.cache?.write);

      return {
        maxContext: Math.max(usage.maxContext, context),
      };
    },
    { maxContext: 0 },
  );
}

function formatTokens(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

export function usageGuidance(sessionID: string, usage: Usage): string {
  const reusable = usage.maxContext < CONTEXT_LIMIT;
  return [
    "",
    "<subagent-usage>",
    `Child session: ${sessionID}`,
    `Maximum context: ${formatTokens(usage.maxContext)} / ${formatTokens(CONTEXT_LIMIT)}`,
    `Reuse: ${reusable ? "eligible" : "avoid; context is at or above 200,000"}`,
    "</subagent-usage>",
  ].join("\n");
}

export function backgroundGuidance(sessionID: string): string {
  return [
    "",
    "<subagent-usage>",
    `Child session: ${sessionID}`,
    "Usage: unavailable; background task is still running",
    "Reuse: decide after it completes",
    "</subagent-usage>",
  ].join("\n");
}

const SubagentUsagePlugin: PluginModule = {
  id: "subagent-usage",
  server: async ({ client, directory }) => ({
    "tool.execute.after": async (input, output) => {
      if (input.tool !== "task") return;

      const metadata = output.metadata as { sessionId?: unknown; background?: unknown } | undefined;
      const sessionID = typeof metadata?.sessionId === "string" ? metadata.sessionId : undefined;
      if (!sessionID) return;

      if (metadata?.background === true) {
        output.output += backgroundGuidance(sessionID);
        return;
      }

      try {
        const response = await (client.session as unknown as SessionClient).messages({
          path: { id: sessionID },
          query: { directory },
        });
        if (!response.data || response.error) return;
        output.output += usageGuidance(sessionID, summarizeUsage(response.data));
      } catch {
        // Usage reporting must not interrupt a completed subagent task.
      }
    },
  }),
};

export default SubagentUsagePlugin;
