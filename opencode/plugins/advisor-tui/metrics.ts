export type AdvisorUsage = {
  input?: number;
  output?: number;
  reasoning?: number;
  cacheRead?: number;
  cacheWrite?: number;
  total?: number;
};

export type AdvisorModel = {
  providerID?: string;
  modelID?: string;
  variant?: string;
};

export type AdvisorToolPart = {
  id?: string;
  type: string;
  tool?: string;
  state?: {
    status?: string;
    metadata?: { usage?: AdvisorUsage } & AdvisorModel;
  };
};

export type AdvisorMessage = {
  info: {
    id: string;
    role: string;
    summary?: boolean;
    finish?: unknown;
    error?: unknown;
    time: { created: number };
  };
  parts: readonly AdvisorToolPart[];
};

export type AdvisorMetrics = {
  calls: number;
  meteredCalls: number;
  input: number;
  output: number;
  reasoning: number;
  cacheRead: number;
  cacheWrite: number;
  total: number;
  cacheRate?: number;
};

export type AdvisorCall = {
  usage?: AdvisorUsage;
  model: AdvisorModel;
};

export type AdvisorHistory = {
  session: AdvisorMetrics;
  sinceCompaction?: AdvisorMetrics;
};

export type SessionMessagesClient = {
  session: {
    messages(input: { sessionID: string; limit: number; before?: string }): Promise<{
      data?: readonly AdvisorMessage[];
      error?: unknown;
      response: { headers: { get(name: string): string | null } };
    }>;
  };
};

export type HistoryLoadOptions = {
  onPage?: (page: number) => void;
  timeoutMs?: number;
  pageSize?: number;
  maxPages?: number;
  onRequest?: (event: "start" | "response", details: { page: number; elapsedMs?: number; itemCount?: number; hasNext?: boolean }) => void;
};

function number(value: number | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function advisorMetrics(parts: readonly AdvisorToolPart[]): AdvisorMetrics {
  let calls = 0;
  let meteredCalls = 0;
  let total = 0;
  let input = 0;
  let output = 0;
  let reasoning = 0;
  let cacheRead = 0;
  let cacheWrite = 0;

  for (const call of advisorCalls(parts)) {
    calls += 1;

    const usage = call.usage;
    if (!usage) continue;
    if (typeof usage.total === "number" && Number.isFinite(usage.total)) meteredCalls += 1;
    input += number(usage.input);
    output += number(usage.output);
    reasoning += number(usage.reasoning);
    cacheRead += number(usage.cacheRead);
    cacheWrite += number(usage.cacheWrite);
    total += number(usage.total);
  }

  const prompt = input + cacheRead + cacheWrite;
  return {
    calls,
    meteredCalls,
    input,
    output,
    reasoning,
    cacheRead,
    cacheWrite,
    total,
    ...(prompt > 0 ? { cacheRate: cacheRead / prompt } : {})
  };
}

export function advisorCalls(parts: readonly AdvisorToolPart[]): AdvisorCall[] {
  return parts
    .filter((part) => part.type === "tool" && part.tool === "advisor" && part.state?.status === "completed")
    .map((part) => {
      const metadata = part.state?.metadata;
      return {
        ...(metadata?.usage ? { usage: metadata.usage } : {}),
        model: {
          ...(metadata?.providerID !== undefined ? { providerID: metadata.providerID } : {}),
          ...(metadata?.modelID !== undefined ? { modelID: metadata.modelID } : {}),
          ...(metadata?.variant !== undefined ? { variant: metadata.variant } : {})
        }
      };
    });
}

function orderedMessages(messages: readonly AdvisorMessage[]): AdvisorMessage[] {
  const unique = new Map<string, AdvisorMessage>();
  for (const message of messages) unique.set(message.info.id, message);
  return [...unique.values()].sort(
    (left, right) => left.info.time.created - right.info.time.created || left.info.id.localeCompare(right.info.id)
  );
}

function partsFor(messages: readonly AdvisorMessage[]): AdvisorToolPart[] {
  const seen = new Set<string>();
  const parts: AdvisorToolPart[] = [];
  for (const message of messages) {
    for (const part of message.parts) {
      if (part.id && seen.has(part.id)) continue;
      if (part.id) seen.add(part.id);
      parts.push(part);
    }
  }
  return parts;
}

export function advisorHistory(messages: readonly AdvisorMessage[]): AdvisorHistory {
  const ordered = orderedMessages(messages);
  let summary = -1;
  for (let index = ordered.length - 1; index >= 0; index -= 1) {
    const message = ordered[index]!;
    if (
      message.info.role === "assistant" &&
      message.info.summary === true &&
      message.info.finish !== undefined &&
      message.info.error === undefined
    ) {
      summary = index;
      break;
    }
  }
  return {
    session: advisorMetrics(partsFor(ordered)),
    ...(summary >= 0 ? { sinceCompaction: advisorMetrics(partsFor(ordered.slice(summary + 1))) } : {})
  };
}

function within<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("OpenCode session-history request timed out")), timeoutMs);
    })
  ]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

export async function loadAdvisorHistory(
  client: SessionMessagesClient,
  sessionID: string,
  options: HistoryLoadOptions = {}
): Promise<AdvisorHistory & { complete: boolean; loadedMessages: number }> {
  const messages: AdvisorMessage[] = [];
  const cursors = new Set<string>();
  let before: string | undefined;
  let pageNumber = 0;

  while (true) {
    pageNumber += 1;
    options.onPage?.(pageNumber);
    const started = Date.now();
    options.onRequest?.("start", { page: pageNumber });
    const page = await within(
      client.session.messages({ sessionID, limit: options.pageSize ?? 200, before }),
      options.timeoutMs ?? 10_000
    );
    if (page.error) throw new Error("OpenCode could not load advisor history");
    messages.push(...(page.data ?? []));

    const next = page.response.headers.get("x-next-cursor") ?? undefined;
    options.onRequest?.("response", {
      page: pageNumber,
      elapsedMs: Date.now() - started,
      itemCount: page.data?.length ?? 0,
      hasNext: next !== undefined
    });
    if (!next) return { ...advisorHistory(messages), complete: true, loadedMessages: messages.length };
    if (options.maxPages !== undefined && pageNumber >= options.maxPages)
      return { ...advisorHistory(messages), complete: false, loadedMessages: messages.length };
    if (cursors.has(next)) throw new Error("OpenCode returned a repeated session-history cursor");
    cursors.add(next);
    before = next;
  }

}
