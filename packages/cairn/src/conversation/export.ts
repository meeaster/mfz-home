import { createHash } from "node:crypto";
import { closeSync, mkdirSync, openSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { formatSessionKey, type SessionKey } from "../schemas.ts";
import { fileFacts, recordManagedFile } from "../core/artifacts.ts";
import { optionalText, timestamp, transaction, type Cairn } from "../core/db.ts";
import { loadSession } from "../core/find.ts";
import { rootPaths, safeSegment, storedPath } from "../core/root.ts";
import { ensureSession } from "../core/sessions.ts";
import { markArtifactDirty } from "../core/views.ts";

// One exported body: a user message's text, or one text part of an assistant message.
export type ConversationRecord = {
  readonly seq: number;
  readonly messageId: string;
  readonly role: "user" | "assistant";
  readonly contentIndex: number | null;
  readonly phase: string | null;
  readonly createdAt: number;
  readonly attachments: number;
  readonly text: string;
};

export type ConversationSnapshot = {
  readonly parent: string | null;
  readonly title: string | null;
  readonly records: readonly ConversationRecord[];
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

const watermarkJson = z.object({ last_seq: z.number().int(), tail_hash: z.string() });

type Watermark = z.infer<typeof watermarkJson>;

// A lock older than this belongs to a process that died.
const staleLockMs = 10 * 60 * 1000;

function header(key: string): string {
  return [
    "# Conversation",
    "",
    `Session \`${key}\`. The human's messages and the assistant's text, copied verbatim in order. ` +
      "Tool calls and results, reasoning, synthetic and system messages, compaction summaries, attachment bodies, " +
      "and subagent sessions are left out. Each body's SHA-256 identifies its exact UTF-8 text, and its locator " +
      "points at the harness record. Cairn appends new messages after each turn and rewrites the file when " +
      "earlier messages change, as after a revert.",
    ""
  ].join("\n");
}

function renderRecord(record: ConversationRecord): string {
  const label = record.role === "user" ? "User" : "Assistant";
  const phase = record.phase === null ? "" : ` · ${record.phase}`;
  const index = record.contentIndex === null ? "" : ` content_index=${record.contentIndex}`;
  const digest = createHash("sha256").update(record.text).digest("hex");

  const lines = [
    "",
    "---",
    "",
    `## ${label} · seq ${record.seq}${phase}`,
    "",
    `${new Date(record.createdAt).toISOString()} · \`seq=${record.seq} message=${record.messageId}${index}\``,
    ""
  ];

  if (record.attachments > 0) {
    lines.push(`Attachments not included: ${record.attachments}.`, "");
  }

  lines.push(`<!-- body-start sha256=${digest} -->`, record.text, "<!-- body-end -->", "");

  return lines.join("\n");
}

// The records at the last exported seq identify the tail. A revert deletes them, and a message still
// streaming at the last export changes them; either way the export no longer matches its source.
function tailHash(records: readonly ConversationRecord[], seq: number): string {
  const hash = createHash("sha256");

  for (const record of records) {
    if (record.seq === seq) {
      hash.update(`${record.messageId}\n${record.contentIndex ?? ""}\n${record.text}\0`);
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
function writeExport(path: string, key: string, source: ConversationSource, state: ExportState, full: boolean): Written {
  const current = fileFacts(path);
  const intact = !full && state.watermark !== null && current !== null && current.sha256 === state.artifactSha;

  if (intact) {
    const { last_seq: lastSeq, tail_hash: tail } = state.watermark;
    const snapshot = source(lastSeq);

    if (tailHash(snapshot.records, lastSeq) === tail) {
      const added = snapshot.records.filter((record) => record.seq > lastSeq);
      const last = added.at(-1);

      if (last === undefined) {
        return { mode: "unchanged", records: [], watermark: state.watermark };
      }

      writeAtomically(path, readFileSync(path, "utf8") + added.map(renderRecord).join(""));

      return { mode: "append", records: added, watermark: { last_seq: last.seq, tail_hash: tailHash(added, last.seq) } };
    }
  }

  const { records } = source(0);
  const lastSeq = records.at(-1)?.seq ?? 0;

  writeAtomically(path, header(key) + records.map(renderRecord).join(""));

  return { mode: "full", records, watermark: { last_seq: lastSeq, tail_hash: tailHash(records, lastSeq) } };
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

