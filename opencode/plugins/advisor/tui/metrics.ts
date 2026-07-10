export type AdvisorUsage = {
  input?: number;
  output?: number;
  reasoning?: number;
  cacheRead?: number;
  cacheWrite?: number;
  total?: number;
  cost?: number;
};

export type AdvisorModel = {
  providerID?: string;
  modelID?: string;
  variant?: string;
};

export type AdvisorTargetMetadata = {
  harness?: string;
  actualModel?: string;
  effort?: string;
  reportedCost?: number;
  usage?: AdvisorUsage;
} & AdvisorModel;

export type AdvisorToolMetadata = {
  usage?: AdvisorUsage;
  targets?: readonly AdvisorTargetMetadata[];
} & AdvisorModel;

export type AdvisorToolPart = {
  id?: string;
  type: string;
  tool?: string;
  state?: {
    status?: string;
    metadata?: AdvisorToolMetadata;
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
  harness: string;
  usage?: AdvisorUsage;
  reportedCost?: number;
  model: AdvisorModel;
  key: string;
  label: string;
};

export type AdvisorMetricGroup = {
  key: string;
  harness: string;
  label: string;
  calls: readonly AdvisorCall[];
  metrics: AdvisorMetrics;
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

export type DescendantSessionsClient = SessionMessagesClient & {
  session: SessionMessagesClient["session"] & {
    children(input: { sessionID: string }): Promise<{
      data?: readonly { id?: string }[];
      error?: unknown;
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

export type RefreshScheduler = {
  schedule(): void;
  dispose(): void;
};

export function createRefreshScheduler(refresh: () => Promise<void>, delayMs = 100): RefreshScheduler {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let running = false;
  let dirty = false;
  let disposed = false;

  const run = async () => {
    timer = undefined;
    if (disposed || !dirty) return;
    dirty = false;
    running = true;
    try {
      await refresh();
    } finally {
      running = false;
      if (dirty && !disposed) schedule();
    }
  };
  const schedule = () => {
    dirty = true;
    if (running || timer || disposed) return;
    timer = setTimeout(() => void run(), delayMs);
  };

  return {
    schedule,
    dispose() {
      disposed = true;
      if (timer) clearTimeout(timer);
      timer = undefined;
    },
  };
}

function number(value: number | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function advisorMetrics(parts: readonly AdvisorToolPart[]): AdvisorMetrics {
  return advisorMetricsFor(advisorCalls(parts));
}

function advisorMetricsFor(calls: readonly AdvisorCall[]): AdvisorMetrics {
  let callCount = 0;
  let meteredCalls = 0;
  let total = 0;
  let input = 0;
  let output = 0;
  let reasoning = 0;
  let cacheRead = 0;
  let cacheWrite = 0;

  for (const call of calls) {
    callCount += 1;

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
    calls: callCount,
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

export function advisorMetricGroups(parts: readonly AdvisorToolPart[]): AdvisorMetricGroup[] {
  const grouped = new Map<string, AdvisorCall[]>();
  for (const call of advisorCalls(parts)) {
    const calls = grouped.get(call.key) ?? [];
    calls.push(call);
    grouped.set(call.key, calls);
  }
  return [...grouped].map(([key, calls]) => ({
    key,
    harness: calls[0]!.harness,
    label: calls[0]!.label,
    calls,
    metrics: advisorMetricsFor(calls),
  }));
}

function targetDetails(input: AdvisorTargetMetadata): Pick<AdvisorCall, "harness" | "key" | "label" | "model" | "reportedCost"> | undefined {
  const harness = input.harness ?? "opencode";
  const modelID = harness === "claude-code" ? input.actualModel : input.modelID;
  if (!modelID) return undefined;
  const variant = harness === "claude-code" ? input.effort : input.variant;
  const providerID = harness === "claude-code" ? input.providerID ?? "anthropic" : input.providerID;
  const model = {
    ...(providerID !== undefined ? { providerID } : {}),
    modelID,
    ...(variant !== undefined ? { variant } : {}),
  };
  const reportedCost =
    typeof input.reportedCost === "number" && Number.isFinite(input.reportedCost)
      ? input.reportedCost
      : harness === "claude-code" && typeof input.usage?.cost === "number" && Number.isFinite(input.usage.cost)
        ? input.usage.cost
        : undefined;
  return {
    harness,
    model,
    key: [harness, providerID ?? "", modelID, variant ?? ""].join(":"),
    label: `${modelID}${variant ? ` @ ${variant}` : ""}`,
    ...(reportedCost !== undefined ? { reportedCost } : {}),
  };
}

export function advisorCalls(parts: readonly AdvisorToolPart[]): AdvisorCall[] {
  return parts
    .filter(
      (part) =>
        part.type === "tool" &&
        part.tool === "advisor" &&
        part.state?.status === "completed",
    )
    .flatMap((part) => {
      const metadata = part.state?.metadata;
      if (!metadata) return [];
      if (metadata.targets) {
        return metadata.targets.flatMap((target) => {
          const details = targetDetails(target);
          if (!details) return [];
          return [
            {
              ...(target.usage ? { usage: target.usage } : {}),
              ...details,
            },
          ];
        });
      }
      const details = targetDetails(metadata);
      if (!details) return [];
      return [
        {
          ...(metadata.usage ? { usage: metadata.usage } : {}),
          ...details,
        },
      ];
    });
}

function orderedMessages(messages: readonly AdvisorMessage[]): AdvisorMessage[] {
  const unique = new Map<string, AdvisorMessage>();
  for (const message of messages) unique.set(message.info.id, message);
  return [...unique.values()].sort(
    (left, right) => left.info.time.created - right.info.time.created || left.info.id.localeCompare(right.info.id)
  );
}

export function dedupeAdvisorParts(parts: readonly AdvisorToolPart[]): AdvisorToolPart[] {
  const seen = new Set<string>();
  const result: AdvisorToolPart[] = [];
  for (const part of parts) {
    if (part.id && seen.has(part.id)) continue;
    if (part.id) seen.add(part.id);
    result.push(part);
  }
  return result;
}

function partsFor(messages: readonly AdvisorMessage[]): AdvisorToolPart[] {
  return dedupeAdvisorParts(messages.flatMap((message) => message.parts));
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

export async function loadDescendantAdvisorParts(
  client: DescendantSessionsClient,
  sessionID: string,
): Promise<AdvisorToolPart[]> {
  const descendants: string[] = [];
  const seen = new Set([sessionID]);
  const pending = [sessionID];

  while (pending.length > 0) {
    const parentID = pending.shift()!;
    const children = await client.session.children({ sessionID: parentID });
    if (children.error) continue;
    for (const child of children.data ?? []) {
      if (!child.id || seen.has(child.id)) continue;
      seen.add(child.id);
      descendants.push(child.id);
      pending.push(child.id);
    }
  }

  const histories = await Promise.all(
    descendants.map(async (childID) => {
      const messages: AdvisorMessage[] = [];
      let before: string | undefined;
      const cursors = new Set<string>();
      while (true) {
        const page = await client.session.messages({ sessionID: childID, limit: 200, before });
        if (page.error) return [];
        messages.push(...(page.data ?? []));
        const next = page.response.headers.get("x-next-cursor") ?? undefined;
        if (!next || cursors.has(next)) return partsFor(messages);
        cursors.add(next);
        before = next;
      }
    }),
  );
  return dedupeAdvisorParts(histories.flat());
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
