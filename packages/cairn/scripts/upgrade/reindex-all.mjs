#!/usr/bin/env node
// Runs `cairn session index` for every root session, which brings each one up to what the current Cairn records:
// its conversation export, the harness's title, whether it was interactive or a CLI run, and its model usage and
// cost with its subagents'. A session whose transcript or OpenCode record is gone fails and is listed.
//
// Usage: node reindex-all.mjs
import { execFileSync } from "node:child_process";
import { openCatalog } from "./lib.mjs";

const db = openCatalog(true);

const keys = db
  .prepare("SELECT harness || ':' || native_id AS key FROM session WHERE parent_session_id IS NULL AND harness IN ('claude-code', 'opencode') ORDER BY started_at")
  .all()
  .map((row) => row.key);

db.close();

console.log(`Indexing ${keys.length} root sessions.`);

const failures = [];

for (const [index, key] of keys.entries()) {
  try {
    execFileSync("cairn", ["session", "index", key], { stdio: ["ignore", "ignore", "pipe"], encoding: "utf8" });
  } catch (error) {
    const reason = error instanceof Error && "stderr" in error ? String(error.stderr).trim() : String(error);

    failures.push(`${key}: ${reason.split("\n")[0]}`);
  }

  if ((index + 1) % 25 === 0) {
    console.log(`  ${index + 1}/${keys.length}`);
  }
}

console.log(`Indexed ${keys.length - failures.length} of ${keys.length}.`);

for (const failure of failures) {
  console.log(`  failed ${failure}`);
}
