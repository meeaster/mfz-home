import { mkdirSync } from "node:fs";
import { DatabaseSync, type SQLOutputValue, type SQLTagStore } from "node:sqlite";
import { z } from "zod";
import { migrate } from "./migrations.ts";
import { rootPaths } from "./root.ts";

export type Cairn = {
  readonly db: DatabaseSync;
  readonly sql: SQLTagStore;
  readonly root: string;
  readonly now: () => Date;
};

export type Row = Record<string, SQLOutputValue>;

export type CairnErrorCode = "not_found" | "invalid" | "conflict";

export class CairnError extends Error {
  readonly code: CairnErrorCode;

  constructor(code: CairnErrorCode, message: string) {
    super(message);
    this.name = "CairnError";
    this.code = code;
  }
}

export function openCairn(root: string, now: () => Date = () => new Date()): Cairn {
  const paths = rootPaths(root);

  mkdirSync(paths.root, { recursive: true });

  const db = new DatabaseSync(paths.database, { timeout: 5000, enableForeignKeyConstraints: true });

  db.exec("PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;");
  migrate(db);

  return { db, sql: db.createTagStore(), root: paths.root, now };
}

export function transaction<T>(cairn: Cairn, work: () => T): T {
  if (cairn.db.isTransaction) {
    return work();
  }

  cairn.db.exec("BEGIN IMMEDIATE");

  try {
    const result = work();

    cairn.db.exec("COMMIT");

    return result;
  } catch (error) {
    cairn.db.exec("ROLLBACK");
    throw error;
  }
}

export function timestamp(cairn: Cairn): string {
  return cairn.now().toISOString();
}

const textColumn = z.string();

const optionalTextColumn = z.string().nullable().default(null);

const integerColumn = z.union([z.number().int(), z.bigint()]).transform(Number);

const optionalIntegerColumn = integerColumn.nullable().default(null);

function column<Parser extends z.ZodType>(parser: Parser, row: Row, name: string): z.output<Parser> {
  const parsed = parser.safeParse(row[name]);

  if (!parsed.success) {
    throw new Error(`Column ${name} has an unexpected value`);
  }

  return parsed.data;
}

export function text(row: Row, name: string): string {
  return column(textColumn, row, name);
}

export function optionalText(row: Row, name: string): string | null {
  return column(optionalTextColumn, row, name);
}

export function integer(row: Row, name: string): number {
  return column(integerColumn, row, name);
}

export function optionalInteger(row: Row, name: string): number | null {
  return column(optionalIntegerColumn, row, name);
}

export function insertedId(result: { lastInsertRowid: number | bigint }): number {
  return Number(result.lastInsertRowid);
}
