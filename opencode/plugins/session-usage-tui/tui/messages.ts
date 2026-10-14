import type { Context } from "@opencode/plugin/tui/plugin";

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

export type SessionMessage = {
  id?: string;
  type?: string;
  status?: string;
  model?: { providerID?: string; id?: string; variant?: string };
  time?: { created?: number; completed?: number };
  tokens?: {
    input?: number;
    output?: number;
    reasoning?: number;
    cache?: { read?: number; write?: number };
  };
};

export type SessionMessageGroup = { sessionID: string; messages: SessionMessage[] };

type ListInput = Parameters<Context["client"]["message"]["list"]>[0];

/** Every message of a session, oldest first. */
export async function loadSessionMessages(client: Context["client"], sessionID: string): Promise<SessionMessage[]> {
  const messages: SessionMessage[] = [];

  for await (const page of messagePages(client, { sessionID, limit: 200, order: "asc" })) messages.push(...page);

  return messages;
}

/**
 * The session's messages after `anchorID`, oldest first, read newest first so only the tail is fetched. When the
 * anchor no longer exists, as after a revert, `messages` is the whole session.
 */
export async function loadMessagesAfter(client: Context["client"], sessionID: string, anchorID: string) {
  const newer: SessionMessage[] = [];

  for await (const page of messagePages(client, { sessionID, limit: 20, order: "desc" })) {
    for (const message of page) {
      if (message.id === anchorID) return { found: true, messages: newer.reverse() };

      newer.push(message);
    }
  }

  return { found: false, messages: newer.reverse() };
}

async function* messagePages(client: Context["client"], first: ListInput) {
  const cursors = new Set<string>();
  let page = await client.message.list(first);

  for (;;) {
    yield page.data.map(slim);
    const next = page.cursor.next ?? undefined;

    if (!next) return;

    if (cursors.has(next)) throw new Error("Message pagination returned a repeated cursor");

    cursors.add(next);
    page = await client.message.list({ sessionID: first.sessionID, limit: 200, cursor: next });
  }
}

/** Keeps only the fields this plugin reads, so cached history doesn't hold message content. */
function slim(message: SessionMessage): SessionMessage {
  const { id, type, status, model, time, tokens } = message;

  return { id, type, status, model, time, tokens };
}

export function latestCompletedCompactionIndex(messages: readonly SessionMessage[]) {
  return messages.findLastIndex(
    (message) => message.type === "compaction" && message.status === "completed",
  );
}

/**
 * Every family session's priced steps, and those since the selected session's latest completed compaction: its own
 * later steps, and its descendants' steps that started after the compaction.
 */
export function familyPricingUsages(
  family: readonly SessionMessageGroup[],
  selectedSessionID: string,
  descendants: ReadonlySet<string> = new Set(),
) {
  const selected = family.find(({ sessionID }) => sessionID === selectedSessionID);
  const compactionIndex = latestCompletedCompactionIndex(selected?.messages ?? []);
  const compactionTime = selected?.messages[compactionIndex]?.time;
  const compactedAt = compactionTime?.completed ?? compactionTime?.created;

  const pricedGroups = family.map(({ sessionID, messages }) => ({
    sessionID,
    usages: messages.flatMap((message, index) => {
      const usage = pricingUsage(message);

      return usage ? [{ index, created: message.time?.created, usage }] : [];
    }),
  }));

  const sinceCompaction =
    compactionIndex === -1
      ? undefined
      : pricedGroups.flatMap(({ sessionID, usages }) => usages.flatMap(({ index, created, usage }) => {
          if (sessionID === selectedSessionID) return index > compactionIndex ? [usage] : [];

          const later = descendants.has(sessionID) && compactedAt !== undefined && created !== undefined && created > compactedAt;

          return later ? [usage] : [];
        }));

  return {
    all: pricedGroups.flatMap(({ usages }) => usages.map(({ usage }) => usage)),
    sinceCompaction,
  };
}

export function pricingUsage(message: SessionMessage): PricingUsage | undefined {
  if (
    message.type !== "assistant" ||
    !message.model?.providerID ||
    !message.model.id ||
    message.time?.completed === undefined ||
    !message.tokens
  )
    return undefined;

  const usage: PricingUsage = {
    providerID: message.model.providerID,
    modelID: message.model.id,
    tokens: {
      input: finite(message.tokens.input),
      output: finite(message.tokens.output),
      reasoning: finite(message.tokens.reasoning),
      cacheRead: finite(message.tokens.cache?.read),
      cacheWrite: finite(message.tokens.cache?.write),
    },
  };

  if (message.model.variant) usage.variant = message.model.variant;

  return usage;
}

function finite(value: number | undefined) {
  return value !== undefined && Number.isFinite(value) && value >= 0 ? value : 0;
}
