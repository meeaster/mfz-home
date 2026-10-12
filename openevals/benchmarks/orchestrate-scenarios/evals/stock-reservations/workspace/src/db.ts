import { Database } from "bun:sqlite";
import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

const migrations = join(import.meta.dir, "..", "migrations");

/** Opens the database and applies pending migrations in file-name order. */
export function openDatabase(path: string): Database {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });

  const db = new Database(path, { create: true, strict: true });

  db.run("PRAGMA foreign_keys = ON");
  db.run("CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, sql TEXT NOT NULL)");

  const applied = new Map(
    db.query<{ name: string; sql: string }, []>("SELECT name, sql FROM schema_migrations").all().map((row) => [row.name, row.sql]),
  );

  for (const name of readdirSync(migrations).filter((file) => file.endsWith(".sql")).sort()) {
    const sql = readFileSync(join(migrations, name), "utf8");
    const previous = applied.get(name);

    if (previous !== undefined) {
      if (previous !== sql) throw new Error(`Migration ${name} changed after it was applied`);
      continue;
    }

    db.transaction(() => {
      db.run(sql);
      db.query("INSERT INTO schema_migrations (name, sql) VALUES (?, ?)").run(name, sql);
    })();
  }

  return db;
}
