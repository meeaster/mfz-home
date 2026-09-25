import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, statSync } from "node:fs";
import { dirname } from "node:path";
import { formatSessionKey, type DescribeInput, type FileEventInput, type MoveInput, type PointerType } from "../schemas.ts";
import { CairnError, insertedId, integer, optionalInteger, timestamp, transaction, type Cairn } from "./db.ts";
import { loadArtifact, type ArtifactEntry } from "./find.ts";
import { findArtifactId, requireArtifactId, requireEffortId } from "./lookup.ts";
import { isCairnOwned, relativeInsideRoot, storedPath } from "./root.ts";
import { ensureSession } from "./sessions.ts";
import { markArtifactDirty } from "./views.ts";

export type FileEventResult =
  | { readonly recorded: false; readonly reason: string }
  | { readonly recorded: true; readonly created: boolean; readonly artifact: ArtifactEntry };

export type FileFacts = { readonly sha256: string; readonly size: number };

export function fileFacts(path: string): FileFacts | null {
  if (!existsSync(path) || !statSync(path).isFile()) {
    return null;
  }

  const content = readFileSync(path);

  return { sha256: createHash("sha256").update(content).digest("hex"), size: content.byteLength };
}

function insideRootOrReason(cairn: Cairn, path: string): { inside: string } | { reason: string } {
  const inside = relativeInsideRoot(cairn.root, path);

  if (inside === null) {
    return { reason: "The file is outside the Cairn root." };
  }

  if (isCairnOwned(inside)) {
    return { reason: "The file is maintained by Cairn." };
  }

  return { inside };
}

// Records a managed file, or refreshes its hash, and reports whether the row is new.
export type RecordedFile = {
  readonly id: number;
  readonly created: boolean;
};

export function recordManagedFile(cairn: Cairn, inside: string, facts: FileFacts, producerId: number | null): RecordedFile {
  const now = timestamp(cairn);
  const existing = cairn.sql.get`SELECT id, producer_session_id FROM artifact WHERE path_or_url = ${inside}`;

  if (existing === undefined) {
    const id = insertedId(cairn.sql.run`
      INSERT INTO artifact (location, path_or_url, sha256, size, status, producer_session_id, captured_at, updated_at)
      VALUES ('managed', ${inside}, ${facts.sha256}, ${facts.size}, 'undescribed', ${producerId}, ${now}, ${now})
    `);

    return { id, created: true };
  }

  const id = integer(existing, "id");
  const producer = optionalInteger(existing, "producer_session_id") ?? producerId;

  cairn.sql.run`
    UPDATE artifact SET sha256 = ${facts.sha256}, size = ${facts.size}, updated_at = ${now},
      producer_session_id = ${producer},
      status = CASE WHEN status = 'missing'
        THEN CASE WHEN category IS NULL THEN 'undescribed' ELSE 'active' END
        ELSE status END
    WHERE id = ${id}
  `;

  return { id, created: false };
}

export function capture(cairn: Cairn, input: FileEventInput): FileEventResult {
  const checked = insideRootOrReason(cairn, input.path);

  if ("reason" in checked) {
    return { recorded: false, reason: checked.reason };
  }

  const facts = fileFacts(input.path);

  if (facts === null) {
    return { recorded: false, reason: "The path is not a file." };
  }

  return transaction(cairn, () => {
    const sessionId = ensureSession(cairn, input.session, {});
    const { id, created } = recordManagedFile(cairn, checked.inside, facts, sessionId);

    markArtifactDirty(cairn, id);

    return { recorded: true, created, artifact: loadArtifact(cairn, id) };
  });
}

// A read of an unrecorded file records it without a producer, since the reader didn't write it.
export function read(cairn: Cairn, input: FileEventInput): FileEventResult {
  const checked = insideRootOrReason(cairn, input.path);

  if ("reason" in checked) {
    return { recorded: false, reason: checked.reason };
  }

  const facts = fileFacts(input.path);

  if (facts === null) {
    return { recorded: false, reason: "The path is not a file." };
  }

  return transaction(cairn, () => {
    const sessionId = ensureSession(cairn, input.session, {});
    const known = findArtifactId(cairn, input.path);

    const { id, created } =
      known === undefined ? recordManagedFile(cairn, checked.inside, facts, null) : { id: known, created: false };

    cairn.sql.run`
      INSERT OR IGNORE INTO link (src_kind, src_id, rel, dst_kind, dst_id, origin, created_by, created_at)
      VALUES ('artifact', ${id}, 'read_in', 'session', ${sessionId}, 'explicit',
        ${formatSessionKey(input.session)}, ${timestamp(cairn)})
    `;

    return { recorded: true, created, artifact: loadArtifact(cairn, id) };
  });
}

export function pointerType(url: string): PointerType {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    throw new CairnError("invalid", `Not a valid URL: ${url}`);
  }

  const path = parsed.pathname;
  const host = parsed.hostname.toLowerCase();

  if (/\/(pull|pulls|merge_requests|pull-requests)\/\d+/.test(path)) {
    return "pull_request";
  }

  if (/\/browse\/[A-Z][A-Z0-9_]*-\d+/.test(path) || parsed.searchParams.has("selectedIssue")) {
    return "jira_issue";
  }

  if ((host.endsWith("atlassian.net") && path.startsWith("/wiki/")) || /\/(confluence|display)\//.test(path)) {
    return "confluence_page";
  }

  if (/\/issues\/\d+/.test(path)) {
    return "issue";
  }

  return "url";
}

function recordReference(cairn: Cairn, input: DescribeInput, producerId: number | null): number {
  const now = timestamp(cairn);

  if (input.url !== undefined) {
    const known = findArtifactId(cairn, input.url);

    if (known !== undefined) {
      return known;
    }

    return insertedId(cairn.sql.run`
      INSERT INTO artifact (location, path_or_url, pointer_type, status, producer_session_id, captured_at, updated_at)
      VALUES ('url', ${input.url}, ${pointerType(input.url)}, 'undescribed', ${producerId}, ${now}, ${now})
    `);
  }

  const path = input.path ?? "";
  const facts = fileFacts(path);

  if (facts === null) {
    throw new CairnError("not_found", `No file at ${path}`);
  }

  const stored = storedPath(cairn.root, path);

  if (stored.location === "managed") {
    if (isCairnOwned(stored.stored)) {
      throw new CairnError("invalid", `${path} is maintained by Cairn and can't be described`);
    }

    return recordManagedFile(cairn, stored.stored, facts, producerId).id;
  }

  const known = findArtifactId(cairn, path);

  if (known !== undefined) {
    cairn.sql.run`UPDATE artifact SET sha256 = ${facts.sha256}, size = ${facts.size} WHERE id = ${known}`;

    return known;
  }

  return insertedId(cairn.sql.run`
    INSERT INTO artifact (location, path_or_url, sha256, size, status, producer_session_id, captured_at, updated_at)
    VALUES ('external', ${stored.stored}, ${facts.sha256}, ${facts.size}, 'undescribed', ${producerId}, ${now}, ${now})
  `);
}

function setMembership(cairn: Cairn, artifactId: number, slug: string, mode: "include" | "exclude", actor: string): void {
  cairn.sql.run`
    INSERT INTO membership (artifact_id, effort_id, mode, set_by)
    VALUES (${artifactId}, ${requireEffortId(cairn, slug)}, ${mode}, ${actor})
    ON CONFLICT (artifact_id, effort_id) DO UPDATE SET mode = excluded.mode, set_by = excluded.set_by
  `;
}

function addArtifactLink(cairn: Cairn, srcId: number, rel: "informs" | "supersedes", dstId: number, actor: string): void {
  if (srcId === dstId) {
    throw new CairnError("invalid", "An artifact can't link to itself");
  }

  cairn.sql.run`
    INSERT INTO link (src_kind, src_id, rel, dst_kind, dst_id, origin, created_by, created_at)
    VALUES ('artifact', ${srcId}, ${rel}, 'artifact', ${dstId}, 'explicit', ${actor}, ${timestamp(cairn)})
    ON CONFLICT (src_kind, src_id, rel, dst_kind, dst_id) DO UPDATE SET origin = 'explicit'
  `;
}

export function describe(cairn: Cairn, input: DescribeInput, actor: string): ArtifactEntry {
  return transaction(cairn, () => {
    const producerId = input.session === undefined ? null : ensureSession(cairn, input.session, {});
    const id = recordReference(cairn, input, producerId);

    markArtifactDirty(cairn, id);
    cairn.sql.run`
      UPDATE artifact SET
        category = COALESCE(${input.category ?? null}, category),
        title = COALESCE(${input.title ?? null}, title),
        description = COALESCE(${input.description ?? null}, description),
        origin = COALESCE(${input.origin ?? null}, origin),
        producer_session_id = COALESCE(producer_session_id, ${producerId}),
        updated_at = ${timestamp(cairn)}
      WHERE id = ${id}
    `;
    cairn.sql.run`
      UPDATE artifact SET status = 'active'
      WHERE id = ${id} AND status = 'undescribed' AND category IS NOT NULL
        AND (title IS NOT NULL OR description IS NOT NULL)
    `;

    for (const slug of input.efforts.include) {
      setMembership(cairn, id, slug, "include", actor);
    }

    for (const slug of input.efforts.exclude) {
      setMembership(cairn, id, slug, "exclude", actor);
    }

    for (const target of input.informs) {
      addArtifactLink(cairn, id, "informs", requireArtifactId(cairn, target), actor);
    }

    for (const target of input.supersedes) {
      const targetId = requireArtifactId(cairn, target);

      addArtifactLink(cairn, id, "supersedes", targetId, actor);
      cairn.sql.run`UPDATE artifact SET status = 'superseded', updated_at = ${timestamp(cairn)} WHERE id = ${targetId}`;
      markArtifactDirty(cairn, targetId);
    }

    markArtifactDirty(cairn, id);

    return loadArtifact(cairn, id);
  });
}

export function move(cairn: Cairn, input: MoveInput): ArtifactEntry {
  return transaction(cairn, () => {
    const id = requireArtifactId(cairn, input.artifact);
    const destination = storedPath(cairn.root, input.to);

    if (destination.location === "managed" && isCairnOwned(destination.stored)) {
      throw new CairnError("invalid", `${input.to} is reserved for Cairn`);
    }

    if (existsSync(input.to)) {
      throw new CairnError("conflict", `${input.to} already exists`);
    }

    if (findArtifactId(cairn, input.to) !== undefined) {
      throw new CairnError("conflict", `The catalog already records ${input.to}`);
    }

    markArtifactDirty(cairn, id);
    cairn.sql.run`
      UPDATE artifact SET path_or_url = ${destination.stored}, location = ${destination.location},
        updated_at = ${timestamp(cairn)}
      WHERE id = ${id}
    `;
    mkdirSync(dirname(input.to), { recursive: true });
    renameSync(input.artifact, input.to);
    markArtifactDirty(cairn, id);

    return loadArtifact(cairn, id);
  });
}
