import { existsSync, readdirSync, renameSync, rmSync } from "node:fs";
import { join } from "node:path";
import type { EffortDraft, EffortInput, EffortStatus } from "../schemas.ts";
import { CairnError, insertedId, integer, text, timestamp, transaction, type Cairn } from "./db.ts";
import { loadEffort, type EffortSummary } from "./find.ts";
import { findEffortId, requireArtifactId, requireEffortId, requireSessionId } from "./lookup.ts";
import { effortFolder, recordNames } from "./root.ts";
import { effortView, markEffortDirty, type EffortView } from "./views.ts";
import { significantWords } from "./words.ts";

export type CreatedEffort = {
  readonly effort: EffortSummary | null;
  readonly close_matches: readonly EffortSummary[];
};

export type MergedEffort = {
  readonly effort: EffortSummary;
  readonly merged: string;
  readonly records_left_behind: readonly string[];
};

export type EffortResult =
  | { readonly action: "create"; readonly result: CreatedEffort }
  | { readonly action: "show"; readonly result: EffortView }
  | { readonly action: "update" | "rename" | "split"; readonly result: EffortSummary }
  | { readonly action: "merge"; readonly result: MergedEffort };

export function slugify(title: string): string {
  const slug = title
    .normalize("NFKD")
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "");

  const shortened = slug.length <= 60 ? slug : slug.slice(0, 60).replace(/-[^-]*$/, "");

  return shortened === "" ? "effort" : shortened;
}

function uniqueSlug(cairn: Cairn, base: string): string {
  let candidate = base;

  for (let suffix = 2; findEffortId(cairn, candidate) !== undefined; suffix += 1) {
    candidate = `${base}-${suffix}`;
  }

  return candidate;
}

// Active or paused efforts whose titles share at least half of the shorter title's significant words.
export function similarEfforts(cairn: Cairn, title: string, slug: string | undefined): EffortSummary[] {
  const wanted = significantWords(title);
  const matches: EffortSummary[] = [];

  for (const row of cairn.sql.all`SELECT id, slug, title FROM effort WHERE status IN ('active', 'paused')`) {
    const existing = significantWords(text(row, "title"));
    let shared = 0;

    for (const word of wanted) {
      if (existing.has(word)) {
        shared += 1;
      }
    }

    const smaller = Math.min(wanted.size, existing.size);

    if (text(row, "slug") === slug || (shared > 0 && smaller > 0 && shared / smaller >= 0.5)) {
      matches.push(loadEffort(cairn, integer(row, "id")));
    }
  }

  return matches;
}

function addTags(cairn: Cairn, effortId: number, tags: readonly string[]): void {
  for (const tag of tags) {
    const separator = tag.indexOf(":");

    cairn.sql.run`
      INSERT OR IGNORE INTO tag (effort_id, namespace, value)
      VALUES (${effortId}, ${tag.slice(0, separator)}, ${tag.slice(separator + 1)})
    `;
  }
}

function removeTags(cairn: Cairn, effortId: number, tags: readonly string[]): void {
  for (const tag of tags) {
    const separator = tag.indexOf(":");

    cairn.sql.run`
      DELETE FROM tag WHERE effort_id = ${effortId} AND namespace = ${tag.slice(0, separator)}
        AND value = ${tag.slice(separator + 1)}
    `;
  }
}

function insertEffort(cairn: Cairn, draft: EffortDraft): number {
  if (draft.slug !== undefined && findEffortId(cairn, draft.slug) !== undefined) {
    throw new CairnError("conflict", `Effort ${draft.slug} already exists`);
  }

  const slug = draft.slug ?? uniqueSlug(cairn, slugify(draft.title));
  const now = timestamp(cairn);

  const effortId = insertedId(cairn.sql.run`
    INSERT INTO effort (slug, title, description, created_at, updated_at)
    VALUES (${slug}, ${draft.title}, ${draft.description}, ${now}, ${now})
  `);

  addTags(cairn, effortId, draft.tags);

  return effortId;
}

export function createEffort(cairn: Cairn, draft: EffortDraft, confirmNew: boolean): CreatedEffort {
  return transaction(cairn, () => {
    if (!confirmNew) {
      const closeMatches = similarEfforts(cairn, draft.title, draft.slug);

      if (closeMatches.length > 0) {
        return { effort: null, close_matches: closeMatches };
      }
    }

    return { effort: loadEffort(cairn, insertEffort(cairn, draft)), close_matches: [] };
  });
}

export function attach(cairn: Cairn, sessionId: number, effortId: number, actor: string): void {
  cairn.sql.run`
    INSERT OR IGNORE INTO attachment (session_id, effort_id, attached_at, attached_by)
    VALUES (${sessionId}, ${effortId}, ${timestamp(cairn)}, ${actor})
  `;
  markEffortDirty(cairn, effortId);
}

export function detach(cairn: Cairn, sessionId: number, effortId: number): void {
  cairn.sql.run`DELETE FROM attachment WHERE session_id = ${sessionId} AND effort_id = ${effortId}`;
  markEffortDirty(cairn, effortId);
}

function touchEffort(cairn: Cairn, effortId: number): void {
  cairn.sql.run`UPDATE effort SET updated_at = ${timestamp(cairn)}, index_dirty = 1 WHERE id = ${effortId}`;
}

function markLinkedEffortsDirty(cairn: Cairn, effortId: number): void {
  cairn.sql.run`
    UPDATE effort SET index_dirty = 1 WHERE id IN (
      SELECT dst_id FROM link WHERE src_kind = 'effort' AND dst_kind = 'effort' AND src_id = ${effortId}
      UNION
      SELECT src_id FROM link WHERE src_kind = 'effort' AND dst_kind = 'effort' AND dst_id = ${effortId}
    )
  `;
}

function updateEffort(
  cairn: Cairn,
  input: Extract<EffortInput, { action: "update" }>
): EffortSummary {
  return transaction(cairn, () => {
    const effortId = requireEffortId(cairn, input.effort);
    const status: EffortStatus | null = input.status ?? null;

    cairn.sql.run`
      UPDATE effort SET
        title = COALESCE(${input.title ?? null}, title),
        description = COALESCE(${input.description ?? null}, description),
        status = COALESCE(${status}, status)
      WHERE id = ${effortId}
    `;
    addTags(cairn, effortId, input.add_tags);
    removeTags(cairn, effortId, input.remove_tags);
    touchEffort(cairn, effortId);
    markLinkedEffortsDirty(cairn, effortId);

    return loadEffort(cairn, effortId);
  });
}

function renameEffort(cairn: Cairn, from: string, to: string): EffortSummary {
  return transaction(cairn, () => {
    const effortId = requireEffortId(cairn, from);

    if (findEffortId(cairn, to) !== undefined) {
      throw new CairnError("conflict", `Effort ${to} already exists`);
    }

    const oldFolder = effortFolder(cairn.root, from);
    const newFolder = effortFolder(cairn.root, to);

    if (existsSync(newFolder)) {
      throw new CairnError("conflict", `Folder ${newFolder} already exists`);
    }

    const oldPrefix = `efforts/${from}/`;
    const newPrefix = `efforts/${to}/`;

    cairn.sql.run`UPDATE effort SET slug = ${to} WHERE id = ${effortId}`;
    cairn.sql.run`
      UPDATE artifact SET path_or_url = ${newPrefix} || substr(path_or_url, ${oldPrefix.length + 1}),
        updated_at = ${timestamp(cairn)}
      WHERE location = 'managed' AND substr(path_or_url, 1, ${oldPrefix.length}) = ${oldPrefix}
    `;
    touchEffort(cairn, effortId);
    markLinkedEffortsDirty(cairn, effortId);

    if (existsSync(oldFolder)) {
      renameSync(oldFolder, newFolder);
    }

    return loadEffort(cairn, effortId);
  });
}

function splitEffort(
  cairn: Cairn,
  input: Extract<EffortInput, { action: "split" }>,
  actor: string
): EffortSummary {
  return transaction(cairn, () => {
    const sourceId = requireEffortId(cairn, input.effort);
    const inheritedTags: string[] = [];

    for (const row of cairn.sql.all`SELECT namespace || ':' || value AS tag FROM tag WHERE effort_id = ${sourceId}`) {
      inheritedTags.push(text(row, "tag"));
    }

    const effortId = insertEffort(cairn, { ...input.into, tags: [...inheritedTags, ...input.into.tags] });

    cairn.sql.run`
      INSERT INTO link (src_kind, src_id, rel, dst_kind, dst_id, origin, created_by, created_at)
      VALUES ('effort', ${effortId}, 'split_from', 'effort', ${sourceId}, 'explicit', ${actor}, ${timestamp(cairn)})
    `;

    for (const session of input.sessions) {
      attach(cairn, requireSessionId(cairn, session), effortId, actor);
    }

    for (const reference of input.artifacts) {
      cairn.sql.run`
        INSERT INTO membership (artifact_id, effort_id, mode, set_by)
        VALUES (${requireArtifactId(cairn, reference)}, ${effortId}, 'include', ${actor})
        ON CONFLICT (artifact_id, effort_id) DO UPDATE SET mode = 'include', set_by = excluded.set_by
      `;
    }

    markEffortDirty(cairn, sourceId);

    return loadEffort(cairn, effortId);
  });
}

function mergeEffort(cairn: Cairn, from: string, into: string): MergedEffort {
  const merged = transaction(cairn, () => {
    const fromId = requireEffortId(cairn, from);
    const intoId = requireEffortId(cairn, into);

    if (fromId === intoId) {
      throw new CairnError("invalid", "An effort can't be merged into itself");
    }

    const prefix = `efforts/${from}/`;

    markLinkedEffortsDirty(cairn, fromId);
    cairn.sql.run`
      INSERT OR IGNORE INTO attachment (session_id, effort_id, attached_at, attached_by)
      SELECT session_id, ${intoId}, attached_at, attached_by FROM attachment WHERE effort_id = ${fromId}
    `;
    cairn.sql.run`
      INSERT OR IGNORE INTO membership (artifact_id, effort_id, mode, set_by)
      SELECT artifact_id, ${intoId}, mode, set_by FROM membership WHERE effort_id = ${fromId}
    `;
    cairn.sql.run`
      INSERT OR IGNORE INTO membership (artifact_id, effort_id, mode, set_by)
      SELECT id, ${intoId}, 'include', 'merge' FROM artifact
      WHERE location = 'managed' AND substr(path_or_url, 1, ${prefix.length}) = ${prefix}
    `;
    cairn.sql.run`
      INSERT OR IGNORE INTO tag (effort_id, namespace, value)
      SELECT ${intoId}, namespace, value FROM tag WHERE effort_id = ${fromId}
    `;
    cairn.sql.run`
      INSERT OR IGNORE INTO link (src_kind, src_id, rel, dst_kind, dst_id, origin, created_by, created_at)
      SELECT 'effort', ${intoId}, rel, dst_kind, dst_id, origin, created_by, created_at FROM link
      WHERE src_kind = 'effort' AND src_id = ${fromId} AND NOT (dst_kind = 'effort' AND dst_id = ${intoId})
    `;
    cairn.sql.run`
      INSERT OR IGNORE INTO link (src_kind, src_id, rel, dst_kind, dst_id, origin, created_by, created_at)
      SELECT src_kind, src_id, rel, 'effort', ${intoId}, origin, created_by, created_at FROM link
      WHERE dst_kind = 'effort' AND dst_id = ${fromId} AND NOT (src_kind = 'effort' AND src_id = ${intoId})
    `;
    cairn.sql.run`
      DELETE FROM link WHERE (src_kind = 'effort' AND src_id = ${fromId}) OR (dst_kind = 'effort' AND dst_id = ${fromId})
    `;
    cairn.sql.run`DELETE FROM effort WHERE id = ${fromId}`;
    touchEffort(cairn, intoId);

    return loadEffort(cairn, intoId);
  });

  const folder = effortFolder(cairn.root, from);
  const leftBehind: string[] = [];

  rmSync(join(folder, "index.md"), { force: true });

  if (existsSync(folder)) {
    for (const name of readdirSync(folder)) {
      if (recordNames.includes(name)) {
        leftBehind.push(join(folder, name));
      }
    }
  }

  return { effort: merged, merged: from, records_left_behind: leftBehind };
}

export function effortCommand(cairn: Cairn, input: EffortInput, actor: string): EffortResult {
  switch (input.action) {
    case "create":
      return { action: "create", result: createEffort(cairn, input.effort, input.confirm_new) };
    case "show":
      return { action: "show", result: effortView(cairn, input.effort) };
    case "update":
      return { action: "update", result: updateEffort(cairn, input) };
    case "rename":
      return { action: "rename", result: renameEffort(cairn, input.effort, input.to) };
    case "split":
      return { action: "split", result: splitEffort(cairn, input, actor) };
    case "merge":
      return { action: "merge", result: mergeEffort(cairn, input.effort, input.into) };
  }
}
