import { integer, number, type Cairn } from "../core/db.ts";

// What a session cost at models.dev rates: its own calls, its subagents' (every session under it), and its CLI
// runs' (every run its tree started, with the runs' own subagents and runs). unpriced_calls counts calls to models
// models.dev has no price for, which the dollars leave out.
export type SessionCost = {
  readonly total: number;
  readonly own: number;
  readonly subagents: number;
  readonly cli_runs: number;
  readonly unpriced_calls: number;
};

// Null when no session in reach has recorded usage yet.
export function sessionCost(cairn: Cairn, sessionId: number): SessionCost | null {
  const row = cairn.sql.get`
    WITH RECURSIVE tree (id) AS (
      SELECT ${sessionId} UNION SELECT session.id FROM session JOIN tree ON session.parent_session_id = tree.id
    ),
    reach (id) AS (
      SELECT ${sessionId}
      UNION
      SELECT session.id FROM session JOIN reach
        ON session.parent_session_id = reach.id OR session.spawned_by_session_id = reach.id
    )
    SELECT
      (SELECT count(*) FROM session_usage WHERE session_id IN (SELECT id FROM reach)) AS recorded,
      (SELECT total(cost_usd) FROM session_usage WHERE session_id = ${sessionId}) AS own,
      (SELECT total(cost_usd) FROM session_usage WHERE session_id IN (SELECT id FROM tree)) AS tree,
      (SELECT total(cost_usd) FROM session_usage WHERE session_id IN (SELECT id FROM reach)) AS reach,
      (SELECT total(unpriced_calls) FROM session_usage WHERE session_id IN (SELECT id FROM reach)) AS unpriced
  `;

  if (row === undefined || integer(row, "recorded") === 0) {
    return null;
  }

  // total() sums to 0.0 over no rows, where sum() would give null.
  const own = number(row, "own");
  const tree = number(row, "tree");
  const reach = number(row, "reach");

  return { total: reach, own, subagents: tree - own, cli_runs: reach - tree, unpriced_calls: number(row, "unpriced") };
}
