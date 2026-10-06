#!/usr/bin/env node
// Removes the child sessions an older Cairn recorded for Claude Code's internal work. Claude Code sends subagent
// events with an agent_id for that work too, but only an Agent tool subagent gets an agent-<id>.meta.json beside
// its transcript. Those rows have no agent type, or the type claude. A row is removed only when it has no metadata
// file and nothing else depends on it: no files, reads, efforts, links, grants, usage, title, description, or
// sessions under it, and no activity after it started.
//
// Usage: node prune-phantom-subagents.mjs [--apply]
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { backup, claudeProjects, openCatalog, wantsApply } from "./lib.mjs";

const projects = claudeProjects();

const folders = existsSync(projects) ? readdirSync(projects).map((folder) => join(projects, folder)) : [];

function hasMetadata(rootId, agentId) {
  return folders.some((folder) => existsSync(join(folder, rootId, "subagents", `agent-${agentId}.meta.json`)));
}

const db = openCatalog(!wantsApply());

const tables = new Set(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((row) => row.name));

const columns = new Set(db.prepare("PRAGMA table_info(session)").all().map((row) => row.name));

// Tables and columns a newer schema adds count as dependents only once they exist.
const dependents = [
  "NOT EXISTS (SELECT 1 FROM artifact WHERE producer_session_id = c.id)",
  "NOT EXISTS (SELECT 1 FROM attachment WHERE session_id = c.id)",
  "NOT EXISTS (SELECT 1 FROM location_grant WHERE session_id = c.id)",
  "NOT EXISTS (SELECT 1 FROM link WHERE (src_kind = 'session' AND src_id = c.id) OR (dst_kind = 'session' AND dst_id = c.id))",
  "NOT EXISTS (SELECT 1 FROM session AS below WHERE below.parent_session_id = c.id)",
  ...(columns.has("spawned_by_session_id") ? ["NOT EXISTS (SELECT 1 FROM session AS run WHERE run.spawned_by_session_id = c.id)"] : []),
  ...(tables.has("session_usage") ? ["NOT EXISTS (SELECT 1 FROM session_usage WHERE session_id = c.id)"] : [])
];

const candidates = db
  .prepare(
    `SELECT c.id, c.native_id, root.native_id AS root_id, coalesce(c.agent, '') AS agent
    FROM session AS c JOIN session AS root ON root.id = c.root_session_id
    WHERE c.harness = 'claude-code' AND c.parent_session_id IS NOT NULL
      AND coalesce(c.agent, '') IN ('', 'claude')
      AND c.title IS NULL AND c.description IS NULL AND c.started_at = c.last_activity_at
      AND ${dependents.join(" AND ")}`
  )
  .all()
  .filter((row) => !hasMetadata(row.root_id, row.native_id));

const byRoot = new Map();

for (const row of candidates) {
  byRoot.set(row.root_id, (byRoot.get(row.root_id) ?? 0) + 1);
}

console.log(`Phantom subagent sessions: ${candidates.length}`);

for (const [rootId, count] of [...byRoot].sort((a, b) => b[1] - a[1]).slice(0, 10)) {
  console.log(`  ${count}\tunder claude-code:${rootId}`);
}

if (!wantsApply()) {
  console.log(candidates.length === 0 ? "Nothing to remove." : "Dry run. Run again with --apply to remove them.");
  process.exit(0);
}

if (candidates.length > 0) {
  console.log(`Backed up to ${backup()}`);

  const remove = db.prepare("DELETE FROM session WHERE id = ?");

  db.exec("BEGIN");

  for (const row of candidates) {
    remove.run(row.id);
  }

  db.exec("COMMIT");
  console.log(`Removed ${candidates.length} sessions.`);
}
