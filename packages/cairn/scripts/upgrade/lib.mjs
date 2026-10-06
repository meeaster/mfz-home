// Shared lookups for the upgrade scripts: the same places the Cairn CLI looks.
import { execFileSync } from "node:child_process";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

// The folder Cairn manages: CAIRN_ROOT, or ~/workspace/artifacts/cairn.
export function cairnRoot() {
  const configured = process.env.CAIRN_ROOT;

  return configured !== undefined && configured !== "" ? resolve(configured) : join(homedir(), "workspace", "artifacts", "cairn");
}

export function openCatalog(readOnly) {
  const db = new DatabaseSync(join(cairnRoot(), "catalog.db"), { readOnly, timeout: 10_000 });

  db.exec("PRAGMA foreign_keys = ON");

  return db;
}

// Claude Code keeps transcripts under projects/ in its config folder.
export function claudeProjects() {
  return join(process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude"), "projects");
}

// OpenCode's database, as `opencode debug paths db` reports it, or null without OpenCode.
export function openCodeDatabase() {
  try {
    return execFileSync("opencode", ["debug", "paths", "db"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
}

// A backup of the catalog before a script changes it; `cairn backup` prints the file it wrote.
export function backup() {
  return execFileSync("cairn", ["backup"], { encoding: "utf8" }).trim();
}

export function wantsApply() {
  return process.argv.includes("--apply");
}
