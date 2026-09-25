import { createHash } from "node:crypto";
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { formatSessionKey, type SessionKey } from "../schemas.ts";
import { fileFacts, recordManagedFile } from "../core/artifacts.ts";
import { optionalText, timestamp, transaction, type Cairn } from "../core/db.ts";
import { loadSession } from "../core/find.ts";
import { rootPaths, safeSegment, storedPath } from "../core/root.ts";
import { ensureSession } from "../core/sessions.ts";
import { markArtifactDirty } from "../core/views.ts";

type RecordBase = {
  readonly seq: number;
  readonly messageId: string;
  readonly contentIndex: number | null;
  readonly createdAt: number;
};

// One exported body: a user message's text, or one text part of an assistant message. context is the tokens in
// the context window once the message was in it: the prompt of the model call that read it, plus that call's
// output for the assistant's own text. It's null when the harness recorded no usage.
export type MessageRecord = RecordBase & {
  readonly role: "user" | "assistant";
  readonly phase: string | null;
  readonly attachments: number;
  readonly text: string;
  readonly context: number | null;
};

// Where the harness replaced the context with a summary. before and after are the context's tokens on either
// side, when the harness recorded them.
export type CompactionRecord = RecordBase & {
  readonly role: "compaction";
  readonly trigger: string;
  readonly before: number | null;
  readonly after: number | null;
};

export type ConversationRecord = MessageRecord | CompactionRecord;

export type ConversationSnapshot = {
  readonly parent: string | null;
  readonly title: string | null;
  readonly records: readonly ConversationRecord[];
  // The final assistant text the harness reported but hadn't saved to its source yet.
  readonly provisional: string | null;
};

// Reads a harness session's records with seq at or after fromSeq.
export type ConversationSource = (fromSeq: number) => ConversationSnapshot;

export type IndexResult =
  | { readonly indexed: false; readonly session: string; readonly reason: string }
  | {
      readonly indexed: true;
      readonly session: string;
      readonly path: string;
      readonly mode: "append" | "full" | "unchanged";
      readonly records_written: number;
      readonly last_seq: number;
    };

// length is the byte length of the file up to the last watermarked record, before any provisional tail.
// Exports written before provisional tails existed have no length and no tail. format is the rendering the
// file was written with; a file in an older one is rewritten rather than appended to.
const watermarkJson = z.object({
  last_seq: z.number().int(),
  tail_hash: z.string(),
  length: z.number().int().optional(),
  format: z.number().int().optional()
});

const exportFormat = 4;

type Watermark = z.infer<typeof watermarkJson>;

// A lock older than this belongs to a process that died.
const staleLockMs = 10 * 60 * 1000;

function header(key: string): string {
  return [
    "# Conversation",
    "",
    `Session \`${key}\`. The human's messages and the assistant's text, copied verbatim in order. ` +
      "Each heading gives the message's time in UTC, its seq, its message ID in the harness's record, and the " +
      "tokens in the context window once the message was in it. A compaction heading marks where the harness " +
      "replaced the context with a summary. " +
      "Tool calls and results, reasoning, synthetic and system messages, compaction summaries, attachment bodies, " +
      "and subagent sessions are left out. Cairn appends new messages after each turn and rewrites the file when " +
      "earlier messages change, as after a revert. A final message marked provisional came from the harness " +
      "before it was saved, and the next export replaces it.",
    ""
  ].join("\n");
}

function utc(ms: number): string {
  return `${new Date(ms).toISOString().slice(0, 19).replace("T", " ")} UTC`;
}

function tokens(count: number): string {
  return count.toLocaleString("en-US");
}

function renderCompaction(record: CompactionRecord): string {
  const heading = ["Compaction", utc(record.createdAt), `seq ${record.seq}`, record.messageId, record.trigger];

  if (record.before !== null) {
    heading.push(record.after === null ? `context ${tokens(record.before)} before` : `context ${tokens(record.before)} → ${tokens(record.after)}`);
  }

  return ["", `## ${heading.join(" · ")}`, ""].join("\n");
}

// Each message is a heading and its text. The heading carries the locator: seq, the message ID, and, when the
// message has several text parts, the part's index in the harness's message.
function renderRecord(record: ConversationRecord, parts: number): string {
  if (record.role === "compaction") {
    return renderCompaction(record);
  }

  const heading = [record.role === "user" ? "User" : "Assistant", utc(record.createdAt), `seq ${record.seq}`, record.messageId];

  if (parts > 1 && record.contentIndex !== null) {
    heading.push(`part ${record.contentIndex}`);
  }

  if (record.phase !== null) {
    heading.push(record.phase);
  }

  if (record.context !== null) {
    heading.push(`context ${tokens(record.context)}`);
  }

  if (record.attachments > 0) {
    heading.push(`${record.attachments} ${record.attachments === 1 ? "attachment" : "attachments"} not included`);
  }

  return ["", `## ${heading.join(" · ")}`, "", record.text.trim(), ""].join("\n");
}

// A message's text parts share its seq, so an append always renders all of them together.
function renderRecords(records: readonly ConversationRecord[]): string {
  const parts = new Map<string, number>();

  for (const record of records) {
    parts.set(record.messageId, (parts.get(record.messageId) ?? 0) + 1);
  }

  return records.map((record) => renderRecord(record, parts.get(record.messageId) ?? 1)).join("");
}

function renderProvisional(text: string | null): string {
  if (text === null) {
    return "";
  }

  return ["", "## Assistant · provisional, reported at the end of the turn before the transcript held it", "", text.trim(), ""].join("\n");
}

// The records at the last exported seq identify the tail. A revert deletes them, and a message still
// streaming at the last export changes them; either way the export no longer matches its source.
function tailHash(records: readonly ConversationRecord[], seq: number): string {
  const hash = createHash("sha256");

  for (const record of records) {
    if (record.seq === seq) {
      hash.update(`${record.messageId}\n${record.contentIndex ?? ""}\n${record.role === "compaction" ? record.trigger : record.text}\0`);
    }
  }

  return hash.digest("hex");
}

function acquireLock(root: string, key: string): string | null {
  const locks = join(rootPaths(root).root, "locks");
  const path = join(locks, `${safeSegment(key)}.lock`);

  mkdirSync(locks, { recursive: true });

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      closeSync(openSync(path, "wx"));

      return path;
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "EEXIST")) {
        throw error;
      }

      if (Date.now() - statSync(path).mtimeMs < staleLockMs) {
        return null;
      }

      unlinkSync(path);
    }
  }

  return null;
}

function writeAtomically(path: string, content: string): void {
  const temporary = `${path}.${process.pid}.tmp`;

  writeFileSync(temporary, content);
  renameSync(temporary, path);
}

type ExportState = {
  readonly artifactSha: string | null;
  readonly watermark: Watermark | null;
};

function exportState(cairn: Cairn, sessionId: number): ExportState {
  const row = cairn.sql.get`
    SELECT artifact.sha256, session.watermark_json FROM session
    LEFT JOIN artifact ON artifact.id = session.export_artifact_id
    WHERE session.id = ${sessionId}
  `;

  const stored = row === undefined ? null : optionalText(row, "watermark_json");

  return {
    artifactSha: row === undefined ? null : optionalText(row, "sha256"),
    watermark: stored === null ? null : watermarkJson.parse(JSON.parse(stored))
  };
}

type Written = {
  readonly mode: "append" | "full" | "unchanged";
  readonly records: readonly ConversationRecord[];
  readonly watermark: Watermark;
};

// Appends when the file is the one last written and its tail still matches the source; otherwise rewrites it.
// A provisional tail is replaced on every run, since the watermark ends before it.
function writeExport(path: string, key: string, source: ConversationSource, state: ExportState, full: boolean): Written {
  const current = existsSync(path) ? readFileSync(path) : null;
  const sha = current === null ? null : createHash("sha256").update(current).digest("hex");

  if (!full && state.watermark?.format === exportFormat && current !== null && sha === state.artifactSha) {
    const { last_seq: lastSeq, tail_hash: tail, length } = state.watermark;
    const snapshot = source(lastSeq);

    if (tailHash(snapshot.records, lastSeq) === tail) {
      const added = snapshot.records.filter((record) => record.seq > lastSeq);
      const kept = current.subarray(0, length ?? current.byteLength).toString("utf8") + renderRecords(added);
      const content = kept + renderProvisional(snapshot.provisional);
      const last = added.at(-1);

      const watermark =
        last === undefined
          ? { ...state.watermark, length: Buffer.byteLength(kept) }
          : { last_seq: last.seq, tail_hash: tailHash(added, last.seq), length: Buffer.byteLength(kept), format: exportFormat };

      if (content === current.toString("utf8")) {
        return { mode: "unchanged", records: [], watermark };
      }

      writeAtomically(path, content);

      return { mode: "append", records: added, watermark };
    }
  }

  const { records, provisional } = source(0);
  const lastSeq = records.at(-1)?.seq ?? 0;
  const kept = header(key) + renderRecords(records);

  writeAtomically(path, kept + renderProvisional(provisional));

  const watermark = { last_seq: lastSeq, tail_hash: tailHash(records, lastSeq), length: Buffer.byteLength(kept), format: exportFormat };

  return { mode: "full", records, watermark };
}

function recordFailure(cairn: Cairn, sessionId: number, message: string): void {
  cairn.sql.run`UPDATE session SET last_error = ${message} WHERE id = ${sessionId}`;
}

// Exports a root session's conversation to conversation.md in its folder and registers it as the session's
// conversation artifact. A concurrent export of the same session makes this one a no-op.
export function indexConversation(cairn: Cairn, key: SessionKey, source: ConversationSource, full: boolean): IndexResult {
  const formatted = formatSessionKey(key);
  const sessionId = ensureSession(cairn, key, {});
  const session = loadSession(cairn, sessionId);

  if (session.parent !== null) {
    return { indexed: false, session: formatted, reason: "Only root sessions get a conversation export." };
  }

  const lock = acquireLock(cairn.root, formatted);

  if (lock === null) {
    return { indexed: false, session: formatted, reason: "Another export of this session is running." };
  }

  try {
    const probe = source(Number.MAX_SAFE_INTEGER);

    if (probe.parent !== null) {
      return { indexed: false, session: formatted, reason: "Only root sessions get a conversation export." };
    }

    const path = join(session.folder, "conversation.md");

    mkdirSync(session.folder, { recursive: true });

    const written = writeExport(path, formatted, source, exportState(cairn, sessionId), full);
    const facts = fileFacts(path);

    if (facts === null) {
      throw new Error(`The export at ${path} disappeared`);
    }

    transaction(cairn, () => {
      const { id } = recordManagedFile(cairn, storedPath(cairn.root, path).stored, facts, sessionId);
      const title = session.title ?? probe.title ?? "Untitled session";

      cairn.sql.run`
        UPDATE artifact SET category = 'conversation', title = ${title}, description = ${session.description},
          status = 'active', updated_at = ${timestamp(cairn)}
        WHERE id = ${id}
      `;
      cairn.sql.run`
        UPDATE session SET export_artifact_id = ${id}, watermark_json = ${JSON.stringify(written.watermark)},
          indexed_at = ${timestamp(cairn)}, last_error = NULL
        WHERE id = ${sessionId}
      `;
      markArtifactDirty(cairn, id);
    });

    return {
      indexed: true,
      session: formatted,
      path,
      mode: written.mode,
      records_written: written.records.length,
      last_seq: written.watermark.last_seq
    };
  } catch (error) {
    recordFailure(cairn, sessionId, error instanceof Error ? error.message : String(error));

    throw error;
  } finally {
    unlinkSync(lock);
  }
}

