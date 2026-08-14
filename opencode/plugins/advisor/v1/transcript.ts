export type Role = "user" | "assistant" | string;

export type MessageEntry = {
  info?: {
    id?: string;
    parentID?: string;
    role?: Role;
    providerID?: string;
    modelID?: string;
    variant?: string;
    summary?: boolean;
    finish?: string;
    error?: unknown;
    cost?: number;
    tokens?: {
      total?: number;
      input?: number;
      output?: number;
      reasoning?: number;
      cache?: { read?: number; write?: number };
    };
  };
  parts?: Array<Record<string, unknown>>;
};

function str(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function renderPart(part: Record<string, unknown>, includeReasoning: boolean): string {
  const type = str(part.type);
  if (type === "text") {
    if (part.synthetic === true || part.ignored === true) return "";
    return str(part.text)?.trim() ?? "";
  }
  if (type === "reasoning") {
    if (!includeReasoning) return "";
    const text = str(part.text)?.trim();
    return text ? `[reasoning]\n${text}` : "";
  }
  if (type === "tool") {
    const name = str(part.tool) ?? "tool";
    const state = (part.state ?? {}) as Record<string, unknown>;
    const status = str(state.status);
    const input = state.input !== undefined ? JSON.stringify(state.input) : "";
    if (status === "completed") {
      const time = state.time as { compacted?: unknown } | undefined;
      const output = time?.compacted !== undefined ? "[Old tool result content cleared]" : (str(state.output)?.trim() ?? "");
      return `[tool ${name}] input=${input}\n-> ${output}`;
    }
    if (status === "error") {
      return `[tool ${name}] input=${input}\n-> ERROR: ${str(state.error)?.trim() ?? ""}`;
    }
    return `[tool ${name}] (${status ?? "pending"})`;
  }
  return "";
}

export function serializeTranscript(messages: MessageEntry[]): string {
  const blocks: string[] = [];
  for (const message of messages) {
    const role = message.info?.role ?? "unknown";
    const includeReasoning = !message.info?.modelID?.startsWith("gpt-5.6");
    const rendered = (message.parts ?? [])
      .map((part) => renderPart(part, includeReasoning))
      .filter((line) => line.length > 0)
      .join("\n");
    if (rendered.length > 0) blocks.push(`## ${role}\n${rendered}`);
  }
  return blocks.join("\n\n");
}

type CompletedCompaction = {
  markerIndex: number;
  summaryIndex: number;
  markerID: string;
  tailStartID: string | undefined;
};

function latestCompletedCompaction(messages: MessageEntry[]): CompletedCompaction | undefined {
  const markers = new Map<string, number>();
  let latest: CompletedCompaction | undefined;

  for (const [index, message] of messages.entries()) {
    if (message.info?.role === "user" && message.info.id && message.parts?.some((part) => part.type === "compaction")) {
      markers.set(message.info.id, index);
      continue;
    }
    if (
      message.info?.role === "assistant" &&
      message.info.summary &&
      message.info.finish &&
      !message.info.error &&
      message.info.parentID &&
      markers.has(message.info.parentID)
    ) {
      const markerIndex = markers.get(message.info.parentID)!;
      const marker = messages[markerIndex]!;
      const tailStartID = str(marker.parts?.find((part) => part.type === "compaction")?.tail_start_id);
      latest = { markerIndex, summaryIndex: index, markerID: message.info.parentID, tailStartID };
    }
  }

  return latest;
}

export function selectAdvisorContext(messages: MessageEntry[]): { messages: MessageEntry[]; epoch: string } {
  const latest = latestCompletedCompaction(messages);

  if (!latest) return { messages, epoch: "uncompacted" };
  const tailIndex = latest.tailStartID ? messages.findIndex((message) => message.info?.id === latest.tailStartID) : -1;
  if (tailIndex >= 0 && tailIndex < latest.markerIndex) {
    return {
      messages: [
        ...messages.slice(latest.markerIndex, latest.summaryIndex + 1),
        ...messages.slice(tailIndex, latest.markerIndex),
        ...messages.slice(latest.summaryIndex + 1),
      ],
      epoch: `compaction:${latest.markerID}`,
    };
  }
  return { messages: messages.slice(latest.summaryIndex), epoch: `compaction:${latest.markerID}` };
}

export function latestMessageID(messages: MessageEntry[]): string | undefined {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const id = messages[index]?.info?.id;
    if (id) return id;
  }
  return undefined;
}

export function messagesAfterCursor(messages: MessageEntry[], cursor: string | undefined): MessageEntry[] {
  if (!cursor) return messages;
  const cursorIndex = messages.findIndex((message) => message.info?.id === cursor);
  return cursorIndex >= 0 ? messages.slice(cursorIndex + 1) : messages;
}

export function withoutAdvisorToolResults(messages: MessageEntry[]): MessageEntry[] {
  return messages.map((message) => {
    const parts = message.parts?.filter((part) => {
      if (part.type !== "tool" || part.tool !== "advisor") return true;
      const state = part.state as Record<string, unknown> | undefined;
      return state?.status !== "completed" && state?.status !== "error";
    });
    return parts?.length === message.parts?.length ? message : { ...message, parts };
  });
}

export function estimateAdvisorTokens(transcript: string): number {
  return transcript.length === 0 ? 0 : Math.ceil(new TextEncoder().encode(transcript).length / 4);
}

export type TranscriptPlan = {
  epoch: string;
  cursor: string | undefined;
  rotate: boolean;
  messages: MessageEntry[];
  transcript: string;
  estimatedTokens: number;
};

export function planAdvisorTranscript(
  messages: MessageEntry[],
  previous: { epoch: string; cursor: string | undefined } | undefined,
): TranscriptPlan {
  const context = selectAdvisorContext(messages);
  const rotate = !previous || previous.epoch !== context.epoch;
  const selected = rotate ? context.messages : withoutAdvisorToolResults(messagesAfterCursor(messages, previous.cursor));
  const transcript = serializeTranscript(selected);
  return {
    epoch: context.epoch,
    cursor: latestMessageID(messages),
    rotate,
    messages: selected,
    transcript,
    estimatedTokens: estimateAdvisorTokens(transcript),
  };
}
