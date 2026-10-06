import { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import type { SessionKey } from "../schemas.ts";
import type { ModelCall, SessionUsage } from "./store.ts";

const sessionRow = z.object({ id: z.string(), parent_id: z.string().nullable(), title: z.string().nullable() });

const callRow = z.object({
  session_id: z.string(),
  provider: z.string().nullable(),
  model: z.string().nullable(),
  input: z.number().nullable(),
  output: z.number().nullable(),
  reasoning: z.number().nullable(),
  cache_read: z.number().nullable(),
  cache_write: z.number().nullable()
});

function opencodeKey(nativeId: string): SessionKey {
  return { harness: "opencode", nativeId };
}

// The session and every child under it, to any depth. UNION keeps a cycle from repeating.
const treeSql = `
  WITH RECURSIVE tree (id) AS (
    SELECT ? UNION SELECT session_v2.id FROM session_v2 JOIN tree ON session_v2.parent_id = tree.id
  )`;

// An OpenCode session's usage and its child sessions', one per session. Each assistant message is one model call,
// and a completed compaction is one more. The database is opened read-only.
export function readOpenCodeUsage(database: string, sessionId: string): SessionUsage[] {
  const db = new DatabaseSync(database, { readOnly: true, timeout: 5000 });

  try {
    const sessions = db
      .prepare(`${treeSql} SELECT id, parent_id, title FROM session_v2 WHERE id IN (SELECT id FROM tree)`)
      .all(sessionId)
      .map((row) => sessionRow.parse(row));

    const bySession = new Map<string, ModelCall[]>(sessions.map((session) => [session.id, []]));

    const rows = db
      .prepare(
        `${treeSql}
        SELECT session_id, json_extract(data, '$.model.providerID') AS provider, json_extract(data, '$.model.id') AS model,
          json_extract(data, '$.tokens.input') AS input, json_extract(data, '$.tokens.output') AS output,
          json_extract(data, '$.tokens.reasoning') AS reasoning, json_extract(data, '$.tokens.cache.read') AS cache_read,
          json_extract(data, '$.tokens.cache.write') AS cache_write
        FROM session_message
        WHERE session_id IN (SELECT id FROM tree) AND json_type(data, '$.tokens') IS NOT NULL
          AND (type = 'assistant' OR (type = 'compaction' AND json_extract(data, '$.status') = 'completed'))
        ORDER BY seq`
      )
      .all(sessionId)
      .map((row) => callRow.parse(row));

    for (const row of rows) {
      if (row.provider === null || row.model === null) {
        continue;
      }

      bySession.get(row.session_id)?.push({
        provider: row.provider,
        model: row.model,
        tokens: {
          input: row.input ?? 0,
          output: row.output ?? 0,
          reasoning: row.reasoning ?? 0,
          cacheRead: row.cache_read ?? 0,
          cacheWrite: row.cache_write ?? 0,
          cacheWriteLong: 0
        }
      });
    }

    return sessions.map((session) => ({
      key: opencodeKey(session.id),
      parent: session.id === sessionId || session.parent_id === null ? null : opencodeKey(session.parent_id),
      // The plugin records each session's agent when it registers it.
      agent: undefined,
      title: session.id === sessionId ? undefined : (session.title ?? undefined),
      calls: bySession.get(session.id) ?? []
    }));
  } finally {
    db.close();
  }
}
