import { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import type { ConversationRecord, ConversationSnapshot } from "./export.ts";

const columnInfo = z.object({ name: z.string() });

const sessionRow = z.object({ title: z.string().nullable(), parent_id: z.string().nullable() });

const userRow = z.object({
  seq: z.number().int(),
  id: z.string(),
  time_created: z.number(),
  text: z.string(),
  attachments: z.number().int()
});

const partRow = z.object({
  seq: z.number().int(),
  id: z.string(),
  time_created: z.number(),
  content_index: z.number().int(),
  text: z.string(),
  phase: z.string().nullable()
});

function requireColumns(db: DatabaseSync, table: string, required: readonly string[]): void {
  const actual = new Set(db.prepare(`PRAGMA table_info(${table})`).all().map((row) => columnInfo.parse(row).name));
  const missing = required.filter((name) => !actual.has(name));

  if (missing.length > 0) {
    throw new Error(`Unsupported OpenCode schema: ${table} lacks ${missing.join(", ")}`);
  }
}

// One read transaction over OpenCode's durable message projection: user text and assistant text parts from
// fromSeq on. Reasoning and tool bodies are never selected. The database is opened read-only and never migrated.
export function readOpenCodeSession(database: string, sessionId: string, fromSeq: number): ConversationSnapshot {
  const db = new DatabaseSync(database, { readOnly: true, timeout: 5000 });

  try {
    db.exec("BEGIN");
    requireColumns(db, "session_v2", ["id", "title", "parent_id"]);
    requireColumns(db, "session_message", ["id", "session_id", "type", "seq", "time_created", "data"]);

    const found = db.prepare("SELECT title, parent_id FROM session_v2 WHERE id = ?").get(sessionId);

    if (found === undefined) {
      throw new Error(`OpenCode has no session ${sessionId}`);
    }

    const session = sessionRow.parse(found);

    const users = db
      .prepare(
        `SELECT seq, id, time_created, json_extract(data, '$.text') AS text,
          coalesce(json_array_length(data, '$.files'), 0) AS attachments
        FROM session_message WHERE session_id = ? AND type = 'user' AND seq >= ? ORDER BY seq`
      )
      .all(sessionId, fromSeq)
      .map((row): ConversationRecord => {
        const user = userRow.parse(row);

        return {
          seq: user.seq,
          messageId: user.id,
          role: "user",
          contentIndex: null,
          phase: null,
          createdAt: user.time_created,
          attachments: user.attachments,
          text: user.text
        };
      });

    const parts = db
      .prepare(
        `SELECT message.seq, message.id, message.time_created, CAST(item.key AS INTEGER) AS content_index,
          json_extract(item.value, '$.text') AS text, json_extract(item.value, '$.state.phase') AS phase
        FROM session_message AS message, json_each(message.data, '$.content') AS item
        WHERE message.session_id = ? AND message.type = 'assistant' AND message.seq >= ?
          AND json_extract(item.value, '$.type') = 'text'
        ORDER BY message.seq, CAST(item.key AS INTEGER)`
      )
      .all(sessionId, fromSeq)
      .map((row): ConversationRecord => {
        const part = partRow.parse(row);

        return {
          seq: part.seq,
          messageId: part.id,
          role: "assistant",
          contentIndex: part.content_index,
          phase: part.phase,
          createdAt: part.time_created,
          attachments: 0,
          text: part.text
        };
      });

    const records = [...users, ...parts].sort((a, b) => a.seq - b.seq || (a.contentIndex ?? -1) - (b.contentIndex ?? -1));

    return { parent: session.parent_id, title: session.title, records };
  } finally {
    if (db.isTransaction) {
      db.exec("ROLLBACK");
    }

    db.close();
  }
}
