import { readFileSync } from "node:fs";
import { z } from "zod";
import type { ConversationRecord, ConversationSnapshot, MessageRecord } from "./export.ts";

const chainEntry = z.object({
  uuid: z.string(),
  parentUuid: z.string().nullable().optional(),
  logicalParentUuid: z.string().nullable().optional(),
  isSidechain: z.boolean().optional()
});

const titleEntry = z.union([
  z.object({ type: z.literal("custom-title"), customTitle: z.string() }),
  z.object({ type: z.literal("ai-title"), aiTitle: z.string() })
]);

const block = z.object({ type: z.string(), text: z.string().optional() });

// Claude Code wraps pasted text in <pasted_content id="…"> tags. The ID only pairs an opening tag with its
// closing one, so the export keeps the pasted text and drops the tags.
const pasteTag = /\n?<\/?pasted_content id="[^"]*">/g;

// A human message is a string, or blocks where anything besides text (an image, a document) is an attachment.
const humanContent = z.union([
  z.string().transform((text) => ({ texts: [text], attachments: 0 })),
  z.array(block).transform((blocks) => {
    const texts = blocks.flatMap((part) => (part.type === "text" && part.text !== undefined ? [part.text] : []));

    return { texts, attachments: blocks.length - texts.length };
  })
]);

const humanEntry = z.object({
  type: z.literal("user"),
  uuid: z.string(),
  timestamp: z.string(),
  // human for a prompt typed in the terminal, sdk for one given to claude -p. Task notifications and other
  // injected turns carry other origins, and tool results and command output carry none.
  turnOrigin: z.enum(["human", "sdk"]),
  message: z.object({ content: humanContent })
});

const usage = z.object({
  input_tokens: z.number(),
  cache_creation_input_tokens: z.number().optional(),
  cache_read_input_tokens: z.number().optional(),
  output_tokens: z.number()
});

const assistantEntry = z.object({
  type: z.literal("assistant"),
  uuid: z.string(),
  timestamp: z.string(),
  message: z.object({ id: z.string().optional(), model: z.string().optional(), content: z.array(block), usage: usage.optional() })
});

const compactionEntry = z.object({
  type: z.literal("system"),
  subtype: z.literal("compact_boundary"),
  uuid: z.string(),
  timestamp: z.string(),
  compactMetadata: z
    .object({ trigger: z.string(), preTokens: z.number().optional(), postTokens: z.number().optional() })
    .optional()
});

type Usage = z.infer<typeof usage>;

// Everything the model call read: fresh input and the cached prefix.
function promptTokens(counts: Usage): number {
  return counts.input_tokens + (counts.cache_creation_input_tokens ?? 0) + (counts.cache_read_input_tokens ?? 0);
}

type ChainEntry = z.infer<typeof chainEntry> & { readonly line: number; readonly value: unknown };

type Parsed = {
  readonly entries: readonly ChainEntry[];
  readonly title: string | null;
};

function parseLines(transcript: string): Parsed {
  const entries: ChainEntry[] = [];
  let custom: string | null = null;
  let generated: string | null = null;

  for (const [index, line] of readFileSync(transcript, "utf8").split("\n").entries()) {
    if (line.trim() === "") {
      continue;
    }

    let value: unknown;

    try {
      value = JSON.parse(line);
    } catch {
      // The harness may be mid-write on the last line; the next export reads it whole.
      continue;
    }

    const title = titleEntry.safeParse(value);

    if (title.success) {
      if (title.data.type === "custom-title") {
        custom = title.data.customTitle;
      } else {
        generated = title.data.aiTitle;
      }

      continue;
    }

    const entry = chainEntry.safeParse(value);

    if (entry.success && entry.data.isSidechain !== true) {
      entries.push({ ...entry.data, line: index + 1, value });
    }
  }

  return { entries, title: custom ?? generated };
}

// The live conversation is the parentUuid chain back from the last entry. Branches left by a rewind aren't on it,
// and a compaction boundary continues through logicalParentUuid to the messages before it.
function liveChain(entries: readonly ChainEntry[]): ChainEntry[] {
  const byUuid = new Map(entries.map((entry) => [entry.uuid, entry]));
  const chain: ChainEntry[] = [];
  const seen = new Set<string>();
  let current = entries.at(-1);

  while (current !== undefined && !seen.has(current.uuid)) {
    seen.add(current.uuid);
    chain.push(current);

    const parent = current.parentUuid ?? current.logicalParentUuid ?? null;

    current = parent === null ? undefined : byUuid.get(parent);
  }

  return chain.reverse();
}

type AssistantText = { readonly record: MessageRecord; readonly apiMessage: string };

type ChainRecords = {
  readonly others: ConversationRecord[];
  readonly assistant: AssistantText[];
};

type PendingHuman = { readonly entry: ChainEntry; readonly data: z.infer<typeof humanEntry> };

// A human message joins the context of the next model call, so its record waits for that call's usage.
function humanRecord({ entry, data }: PendingHuman, context: number | null): MessageRecord | null {
  const { texts, attachments } = data.message.content;
  const text = texts.join("\n\n").replaceAll(pasteTag, "");

  if (text.trim() === "" && attachments === 0) {
    return null;
  }

  return {
    seq: entry.line,
    messageId: data.uuid,
    role: "user",
    contentIndex: null,
    phase: null,
    createdAt: Date.parse(data.timestamp),
    attachments,
    text,
    context
  };
}

function records(chain: readonly ChainEntry[]): ChainRecords {
  const others: ConversationRecord[] = [];
  const assistant: AssistantText[] = [];
  let pending: PendingHuman[] = [];

  const settle = (context: number | null) => {
    for (const human of pending) {
      const record = humanRecord(human, context);

      if (record !== null) {
        others.push(record);
      }
    }

    pending = [];
  };

  for (const entry of chain) {
    const user = humanEntry.safeParse(entry.value);

    if (user.success) {
      pending.push({ entry, data: user.data });

      continue;
    }

    const boundary = compactionEntry.safeParse(entry.value);

    if (boundary.success) {
      const meta = boundary.data.compactMetadata;

      others.push({
        seq: entry.line,
        messageId: boundary.data.uuid,
        role: "compaction",
        contentIndex: null,
        createdAt: Date.parse(boundary.data.timestamp),
        trigger: meta?.trigger ?? "unknown",
        before: meta?.preTokens ?? null,
        after: meta?.postTokens ?? null
      });

      continue;
    }

    const reply = assistantEntry.safeParse(entry.value);

    if (!reply.success || reply.data.message.model === "<synthetic>") {
      continue;
    }

    const counts = reply.data.message.usage;
    const prompt = counts === undefined ? null : promptTokens(counts);

    settle(prompt);

    for (const [index, part] of reply.data.message.content.entries()) {
      if (part.type === "text" && part.text !== undefined && part.text.trim() !== "") {
        assistant.push({
          record: {
            seq: entry.line,
            messageId: reply.data.uuid,
            role: "assistant",
            contentIndex: index,
            phase: null,
            createdAt: Date.parse(reply.data.timestamp),
            attachments: 0,
            text: part.text,
            context: prompt === null || counts === undefined ? null : prompt + counts.output_tokens
          },
          apiMessage: reply.data.message.id ?? reply.data.uuid
        });
      }
    }
  }

  // A human message the model hasn't answered yet has no known context.
  settle(null);

  return { others, assistant };
}

function squeeze(text: string): string {
  return text.replaceAll(/\s+/g, "");
}

// The transcript may not hold the turn's final message yet. The harness's copy of it becomes the provisional tail
// unless the transcript's last assistant message already has the same text.
function provisionalTail(assistant: readonly AssistantText[], lastMessage: string | null): string | null {
  if (lastMessage === null || lastMessage.trim() === "") {
    return null;
  }

  const last = assistant.at(-1);
  const saved = last === undefined ? "" : assistant.flatMap((part) => (part.apiMessage === last.apiMessage ? [part.record.text] : [])).join("");

  return squeeze(saved) === squeeze(lastMessage) ? null : lastMessage;
}

// Reads a Claude Code transcript: the human's messages and the main agent's text blocks on the live chain.
// seq is the transcript line number, which only grows, since the harness appends to the file.
export function readClaudeCodeTranscript(transcript: string, lastMessage: string | null): ConversationSnapshot {
  const parsed = parseLines(transcript);
  const { others, assistant } = records(liveChain(parsed.entries));
  const all = [...others, ...assistant.map((part) => part.record)];

  return {
    parent: null,
    title: parsed.title,
    records: all.sort((a, b) => a.seq - b.seq || (a.contentIndex ?? -1) - (b.contentIndex ?? -1)),
    provisional: provisionalTail(assistant, lastMessage)
  };
}
