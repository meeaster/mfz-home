import type { Context } from "@opencode-ai/plugin/tui/plugin";

export type PricingUsage = {
  providerID: string;
  modelID: string;
  variant?: string;
  tokens: {
    input: number;
    output: number;
    reasoning: number;
    cacheRead: number;
    cacheWrite: number;
  };
};

type SessionMessage = {
  type?: string;
  model?: { providerID?: string; id?: string; variant?: string };
  time?: { created?: number; completed?: number };
  tokens?: {
    input?: number;
    output?: number;
    reasoning?: number;
    cache?: { read?: number; write?: number };
  };
};

export async function loadSessionMessages(client: Context["client"], sessionID: string): Promise<SessionMessage[]> {
  const messages: SessionMessage[] = [];
  const cursors = new Set<string>();
  let cursor: string | undefined;

  do {
    const page = await client.message.list(cursor
      ? { sessionID, limit: 200, cursor }
      : { sessionID, limit: 200, order: "asc" });
    messages.push(...page.data);
    const next = page.cursor.next ?? undefined;
    if (next && cursors.has(next)) throw new Error("Message pagination returned a repeated cursor");
    if (next) cursors.add(next);
    cursor = next;
  } while (cursor);

  return messages;
}

export async function loadFamilyMessages(client: Context["client"], sessionIDs: readonly string[]) {
  return (await Promise.all(sessionIDs.map((sessionID) => loadSessionMessages(client, sessionID)))).flat();
}

export function pricingUsage(message: SessionMessage): PricingUsage | undefined {
  if (
    message.type !== "assistant" ||
    !message.model?.providerID ||
    !message.model.id ||
    message.time?.completed === undefined ||
    !message.tokens
  ) return undefined;

  const usage: PricingUsage = {
    providerID: message.model.providerID,
    modelID: message.model.id,
    tokens: {
      input: finite(message.tokens.input),
      output: finite(message.tokens.output),
      reasoning: finite(message.tokens.reasoning),
      cacheRead: finite(message.tokens.cache?.read),
      cacheWrite: finite(message.tokens.cache?.write)
    }
  };
  if (message.model.variant) usage.variant = message.model.variant;
  return usage;
}

function finite(value: number | undefined) {
  return value !== undefined && Number.isFinite(value) && value >= 0 ? value : 0;
}
