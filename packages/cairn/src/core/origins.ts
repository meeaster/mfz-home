import { existsSync, readFileSync } from "node:fs";
import { z } from "zod";
import { formatOriginKey, type AccessMethod, type OriginInput, type OriginKey, type ReferenceInput } from "../schemas.ts";
import { CairnError, insertedId, integer, optionalText, text, timestamp, transaction, type Cairn, type Row } from "./db.ts";
import { requireArtifactId } from "./lookup.ts";
import { absolutePath } from "./root.ts";

export type OriginKindEntry = {
  readonly name: string;
  readonly identifier: string;
  readonly description: string;
  readonly origins: number;
};

export type OriginEntry = {
  readonly key: string;
  readonly kind: string;
  readonly identifier: string;
  readonly title: string;
  readonly description: string;
  readonly access: readonly AccessMethod[];
  readonly articles: number;
  readonly references: number;
};

export type OriginResult =
  | { readonly action: "kinds"; readonly kinds: readonly OriginKindEntry[] }
  | { readonly action: "find"; readonly origins: readonly OriginEntry[] }
  | { readonly action: "register"; readonly origin: OriginEntry; readonly existing: boolean; readonly kind: OriginKindEntry }
  | { readonly action: "update"; readonly origin: OriginEntry };

export type ReferenceEntry = {
  readonly article: string;
  readonly origin: string;
  readonly locator: string;
  readonly title: string;
  readonly sections: readonly string[];
  readonly observed_at: string;
  readonly version: string | null;
};

export type ReferenceResult =
  | { readonly action: "record"; readonly reference: ReferenceEntry; readonly created: boolean }
  | { readonly action: "list"; readonly references: readonly ReferenceEntry[]; readonly origins: readonly OriginEntry[] }
  | { readonly action: "remove"; readonly removed: boolean };

const sectionList = z.array(z.string());

function kindEntry(row: Row): OriginKindEntry {
  return {
    name: text(row, "name"),
    identifier: text(row, "identifier"),
    description: text(row, "description"),
    origins: integer(row, "origins")
  };
}

export function originKinds(cairn: Cairn): OriginKindEntry[] {
  return cairn.sql.all`
    SELECT k.name, k.identifier, k.description, COUNT(o.id) AS origins
    FROM origin_kind k LEFT JOIN origin o ON o.kind_id = k.id
    GROUP BY k.id ORDER BY k.name
  `.map(kindEntry);
}

function requireKind(cairn: Cairn, name: string): OriginKindEntry {
  const found = originKinds(cairn).find((kind) => kind.name === name);

  if (found === undefined) {
    throw new CairnError("not_found", `No origin kind ${name}`);
  }

  return found;
}

function accessOf(cairn: Cairn, originId: number): AccessMethod[] {
  return cairn.sql.all`SELECT method, detail FROM origin_access WHERE origin_id = ${originId} ORDER BY rowid`.map((row) => ({
    method: text(row, "method"),
    detail: text(row, "detail")
  }));
}

function originEntry(cairn: Cairn, row: Row): OriginEntry {
  const id = integer(row, "id");
  const kind = text(row, "kind");
  const identifier = text(row, "identifier");

  return {
    key: formatOriginKey({ kind, identifier }),
    kind,
    identifier,
    title: text(row, "title"),
    description: text(row, "description"),
    access: accessOf(cairn, id),
    articles: integer(row, "articles"),
    references: integer(row, "refs")
  };
}

const originColumns = `
  SELECT o.id, k.name AS kind, o.identifier, o.title, o.description,
    (SELECT COUNT(DISTINCT r.artifact_id) FROM origin_reference r WHERE r.origin_id = o.id) AS articles,
    (SELECT COUNT(*) FROM origin_reference r WHERE r.origin_id = o.id) AS refs
  FROM origin o JOIN origin_kind k ON k.id = o.kind_id
`;

function findOriginId(cairn: Cairn, key: OriginKey): number | undefined {
  const row = cairn.sql.get`
    SELECT o.id FROM origin o JOIN origin_kind k ON k.id = o.kind_id WHERE k.name = ${key.kind} AND o.identifier = ${key.identifier}
  `;

  return row === undefined ? undefined : integer(row, "id");
}

function requireOriginId(cairn: Cairn, key: OriginKey): number {
  const id = findOriginId(cairn, key);

  if (id === undefined) {
    throw new CairnError("not_found", `No origin ${formatOriginKey(key)}. Find it with catalog_origin find, or register it.`);
  }

  return id;
}

function originById(cairn: Cairn, id: number): OriginEntry {
  const row = cairn.db.prepare(`${originColumns} WHERE o.id = ?`).get(id);

  if (row === undefined) {
    throw new Error(`Origin ${id} disappeared`);
  }

  return originEntry(cairn, row);
}

// A null limit returns every match.
export function findOrigins(cairn: Cairn, kind: string | undefined, search: string | undefined, limit: number | null): OriginEntry[] {
  const pattern = search === undefined ? null : `%${search}%`;

  return cairn.db
    .prepare(
      `${originColumns}
      WHERE (?1 IS NULL OR k.name = ?1)
        AND (?2 IS NULL OR o.identifier LIKE ?2 OR o.title LIKE ?2 OR o.description LIKE ?2 OR k.name LIKE ?2)
      ORDER BY k.name, o.title LIMIT coalesce(?3, -1)`
    )
    .all(kind ?? null, pattern, limit)
    .map((row) => originEntry(cairn, row));
}

function addAccess(cairn: Cairn, originId: number, methods: readonly AccessMethod[]): void {
  for (const { method, detail } of methods) {
    cairn.sql.run`INSERT INTO origin_access (origin_id, method, detail) VALUES (${originId}, ${method}, ${detail}) ON CONFLICT DO NOTHING`;
  }
}

function ensureKind(cairn: Cairn, input: Extract<OriginInput, { action: "register" }>, actor: string): void {
  const exists = cairn.sql.get`SELECT 1 AS found FROM origin_kind WHERE name = ${input.origin.kind}`;

  if (exists !== undefined) {
    return;
  }

  if (input.new_kind === undefined) {
    throw new CairnError(
      "not_found",
      `No origin kind ${input.origin.kind}. Check catalog_origin kinds for an existing one; to add it, repeat with new_kind saying what its identifiers are.`
    );
  }

  cairn.sql.run`
    INSERT INTO origin_kind (name, identifier, description, created_by, created_at)
    VALUES (${input.origin.kind}, ${input.new_kind.identifier}, ${input.new_kind.description}, ${actor}, ${timestamp(cairn)})
  `;
}

function register(cairn: Cairn, input: Extract<OriginInput, { action: "register" }>, actor: string): OriginResult {
  ensureKind(cairn, input, actor);

  const existingId = findOriginId(cairn, input.origin);

  if (existingId !== undefined) {
    addAccess(cairn, existingId, input.access);

    return { action: "register", origin: originById(cairn, existingId), existing: true, kind: requireKind(cairn, input.origin.kind) };
  }

  const now = timestamp(cairn);

  const id = insertedId(
    cairn.sql.run`
      INSERT INTO origin (kind_id, identifier, title, description, created_by, created_at, updated_at)
      SELECT id, ${input.origin.identifier}, ${input.title}, ${input.description}, ${actor}, ${now}, ${now}
      FROM origin_kind WHERE name = ${input.origin.kind}
    `
  );

  addAccess(cairn, id, input.access);

  return { action: "register", origin: originById(cairn, id), existing: false, kind: requireKind(cairn, input.origin.kind) };
}

function update(cairn: Cairn, input: Extract<OriginInput, { action: "update" }>): OriginResult {
  const id = requireOriginId(cairn, input.origin);

  if (input.title !== undefined) {
    cairn.sql.run`UPDATE origin SET title = ${input.title} WHERE id = ${id}`;
  }

  if (input.description !== undefined) {
    cairn.sql.run`UPDATE origin SET description = ${input.description} WHERE id = ${id}`;
  }

  for (const { method, detail } of input.remove_access) {
    cairn.sql.run`DELETE FROM origin_access WHERE origin_id = ${id} AND method = ${method} AND detail = ${detail}`;
  }

  addAccess(cairn, id, input.add_access);
  cairn.sql.run`UPDATE origin SET updated_at = ${timestamp(cairn)} WHERE id = ${id}`;

  return { action: "update", origin: originById(cairn, id) };
}

export function originCommand(cairn: Cairn, input: OriginInput, actor: string): OriginResult {
  switch (input.action) {
    case "kinds":
      return { action: "kinds", kinds: originKinds(cairn) };
    case "find":
      return { action: "find", origins: findOrigins(cairn, input.kind, input.text, input.limit) };
    case "register":
      return transaction(cairn, () => register(cairn, input, actor));
    case "update":
      return transaction(cairn, () => update(cairn, input));
  }
}

function requireArticleId(cairn: Cairn, path: string): number {
  const id = requireArtifactId(cairn, path);
  const row = cairn.sql.get`SELECT category FROM artifact WHERE id = ${id}`;

  if (row === undefined || optionalText(row, "category") !== "knowledge") {
    throw new CairnError("invalid", `${path} isn't a knowledge article. Describe it with category knowledge first.`);
  }

  return id;
}

function referenceEntry(cairn: Cairn, row: Row): ReferenceEntry {
  const location = text(row, "location");

  return {
    article: absolutePath(cairn.root, location === "external" ? "external" : "managed", text(row, "path_or_url")),
    origin: formatOriginKey({ kind: text(row, "kind"), identifier: text(row, "identifier") }),
    locator: text(row, "locator"),
    title: text(row, "title"),
    sections: sectionList.parse(JSON.parse(text(row, "sections"))),
    observed_at: text(row, "observed_at"),
    version: optionalText(row, "version")
  };
}

// Oldest observation first: the order a re-check works through.
const referenceColumns = `
  SELECT a.location, a.path_or_url, k.name AS kind, o.identifier, r.origin_id, r.locator, r.title, r.sections,
    r.observed_at, r.version
  FROM origin_reference r
    JOIN artifact a ON a.id = r.artifact_id
    JOIN origin o ON o.id = r.origin_id
    JOIN origin_kind k ON k.id = o.kind_id
`;

function referenceRows(cairn: Cairn, articleId: number | null, originId: number | null): Row[] {
  return cairn.db
    .prepare(
      `${referenceColumns}
      WHERE (?1 IS NULL OR r.artifact_id = ?1) AND (?2 IS NULL OR r.origin_id = ?2)
      ORDER BY r.observed_at, k.name, o.identifier, r.locator`
    )
    .all(articleId, originId);
}

function record(cairn: Cairn, input: Extract<ReferenceInput, { action: "record" }>, actor: string): ReferenceResult {
  const articleId = requireArticleId(cairn, input.article);
  const originId = requireOriginId(cairn, input.origin);
  const observed = input.observed_at ?? timestamp(cairn);
  const version = input.version ?? null;

  const existing = cairn.sql.get`
    SELECT id, title, sections FROM origin_reference WHERE artifact_id = ${articleId} AND origin_id = ${originId} AND locator = ${input.locator}
  `;

  if (existing === undefined) {
    if (input.title === undefined) {
      throw new CairnError("invalid", "title: a new reference needs a short title saying what was looked at");
    }

    cairn.sql.run`
      INSERT INTO origin_reference (artifact_id, origin_id, locator, title, sections, observed_at, version, recorded_by)
      VALUES (${articleId}, ${originId}, ${input.locator}, ${input.title}, ${JSON.stringify(input.sections ?? [])}, ${observed},
        ${version}, ${actor})
    `;
  } else {
    // A new look replaces the observation; title and sections change only when given.
    cairn.sql.run`
      UPDATE origin_reference SET title = ${input.title ?? text(existing, "title")},
        sections = ${input.sections === undefined ? text(existing, "sections") : JSON.stringify(input.sections)},
        observed_at = ${observed}, version = ${version}, recorded_by = ${actor}
      WHERE id = ${integer(existing, "id")}
    `;
  }

  const row = cairn.db
    .prepare(`${referenceColumns} WHERE r.artifact_id = ? AND r.origin_id = ? AND r.locator = ?`)
    .get(articleId, originId, input.locator);

  if (row === undefined) {
    throw new Error("The recorded reference disappeared");
  }

  return { action: "record", reference: referenceEntry(cairn, row), created: existing === undefined };
}

export type ReferenceList = {
  readonly references: readonly ReferenceEntry[];
  readonly origins: readonly OriginEntry[];
};

function listed(cairn: Cairn, articleId: number | null, originId: number | null): ReferenceList {
  const rows = referenceRows(cairn, articleId, originId);
  const originIds = new Set(rows.map((row) => integer(row, "origin_id")));

  return { references: rows.map((row) => referenceEntry(cairn, row)), origins: [...originIds].map((id) => originById(cairn, id)) };
}

// A knowledge article's references, oldest observed first, with the origins they point into.
export function articleReferences(cairn: Cairn, article: string): ReferenceList {
  return listed(cairn, requireArticleId(cairn, article), null);
}

function list(cairn: Cairn, input: Extract<ReferenceInput, { action: "list" }>): ReferenceResult {
  if ((input.article === undefined) === (input.origin === undefined)) {
    throw new CairnError("invalid", "Give exactly one of article or origin");
  }

  const articleId = input.article === undefined ? null : requireArticleId(cairn, input.article);
  const originId = input.origin === undefined ? null : requireOriginId(cairn, input.origin);

  return { action: "list", ...listed(cairn, articleId, originId) };
}

function remove(cairn: Cairn, input: Extract<ReferenceInput, { action: "remove" }>): ReferenceResult {
  const articleId = requireArticleId(cairn, input.article);
  const originId = requireOriginId(cairn, input.origin);

  const result = cairn.sql.run`
    DELETE FROM origin_reference WHERE artifact_id = ${articleId} AND origin_id = ${originId} AND locator = ${input.locator}
  `;

  return { action: "remove", removed: Number(result.changes) > 0 };
}

export type UnplacedSection = {
  readonly article: string;
  readonly section: string;
};

function headings(markdown: string): Set<string> {
  const found = new Set<string>();

  for (const match of markdown.matchAll(/^#{1,6}[ \t]+(.+?)[ \t#]*$/gm)) {
    found.add(match[1] ?? "");
  }

  return found;
}

// Sections that references name but their article no longer has, usually because a heading was renamed.
export function unplacedSections(cairn: Cairn): UnplacedSection[] {
  const unplaced: UnplacedSection[] = [];
  const articles = new Map<string, Set<string> | null>();

  for (const row of referenceRows(cairn, null, null)) {
    const entry = referenceEntry(cairn, row);

    if (!articles.has(entry.article)) {
      articles.set(entry.article, existsSync(entry.article) ? headings(readFileSync(entry.article, "utf8")) : null);
    }

    const found = articles.get(entry.article);

    for (const section of entry.sections) {
      if (found !== null && found !== undefined && !found.has(section)) {
        unplaced.push({ article: entry.article, section });
      }
    }
  }

  return unplaced;
}

export function referenceCommand(cairn: Cairn, input: ReferenceInput, actor: string): ReferenceResult {
  switch (input.action) {
    case "record":
      return transaction(cairn, () => record(cairn, input, actor));
    case "list":
      return list(cairn, input);
    case "remove":
      return transaction(cairn, () => remove(cairn, input));
  }
}
