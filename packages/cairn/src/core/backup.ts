import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { CairnError, openCairn, text, type Cairn } from "./db.ts";
import { schemaVersion, userVersion } from "./migrations.ts";
import { rootPaths } from "./root.ts";

const keptBackups = 7;

function localDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${date.getFullYear()}-${month}-${day}`;
}

function localTime(date: Date): string {
  return [date.getHours(), date.getMinutes(), date.getSeconds()].map((part) => String(part).padStart(2, "0")).join("");
}

function backupFiles(folder: string): string[] {
  if (!existsSync(folder)) {
    return [];
  }

  const files: string[] = [];

  for (const name of readdirSync(folder)) {
    if (/^catalog-\d{4}-\d{2}-\d{2}.*\.db$/.test(name)) {
      files.push(name);
    }
  }

  return files.sort();
}

function copyInto(cairn: Cairn, path: string): string {
  mkdirSync(rootPaths(cairn.root).backups, { recursive: true });
  cairn.db.prepare("VACUUM INTO ?").run(path);

  return path;
}

function prune(folder: string): void {
  const files = backupFiles(folder);

  for (const name of files.slice(0, Math.max(0, files.length - keptBackups))) {
    rmSync(join(folder, name), { force: true });
  }
}

// Runs after a write. The first write of each local day copies the database.
export function dailyBackup(cairn: Cairn): string | null {
  const folder = rootPaths(cairn.root).backups;
  const date = localDate(cairn.now());

  if (backupFiles(folder).some((name) => name.startsWith(`catalog-${date}`))) {
    return null;
  }

  const path = copyInto(cairn, join(folder, `catalog-${date}.db`));

  prune(folder);

  return path;
}

function timedBackupPath(cairn: Cairn, suffix: string): string {
  const now = cairn.now();

  return join(rootPaths(cairn.root).backups, `catalog-${localDate(now)}T${localTime(now)}${suffix}.db`);
}

export function backupNow(cairn: Cairn): string {
  const path = copyInto(cairn, timedBackupPath(cairn, ""));

  prune(rootPaths(cairn.root).backups);

  return path;
}

function verifyBackup(file: string): void {
  if (!existsSync(file)) {
    throw new CairnError("not_found", `No backup at ${file}`);
  }

  const candidate = new DatabaseSync(file, { readOnly: true });

  try {
    const integrity = candidate.prepare("PRAGMA integrity_check").get();

    if (integrity === undefined || text(integrity, "integrity_check") !== "ok") {
      throw new CairnError("invalid", `${file} failed the integrity check`);
    }

    if (userVersion(candidate) > schemaVersion) {
      throw new CairnError("invalid", `${file} has a schema newer than this Cairn`);
    }
  } finally {
    candidate.close();
  }
}

// Keeps a copy of the current database, then replaces it with the backup.
export type RestoreResult = {
  readonly restored: string;
  readonly previous: string | null;
};

export function restore(root: string, file: string, now: () => Date): RestoreResult {
  const source = resolve(file);
  const paths = rootPaths(root);

  verifyBackup(source);

  let previous: string | null = null;

  if (existsSync(paths.database)) {
    const current = openCairn(root, now);

    try {
      // Not pruned here, so the backup being restored can't be deleted first.
      previous = copyInto(current, timedBackupPath(current, "-before-restore"));
    } finally {
      current.db.close();
    }
  }

  rmSync(`${paths.database}-wal`, { force: true });
  rmSync(`${paths.database}-shm`, { force: true });
  copyFileSync(source, paths.database);
  openCairn(root, now).db.close();

  return { restored: source, previous };
}
