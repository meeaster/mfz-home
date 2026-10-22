import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, statSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { formatSessionKey, type DescribeInput, type FileEventInput, type MoveInput, type PointerType } from "../schemas.ts";
import { CairnError, insertedId, integer, optionalInteger, optionalText, text, timestamp, transaction, type Cairn } from "./db.ts";
import { loadArtifact, type ArtifactEntry } from "./find.ts";
import { findArtifactId, requireArtifactId, requireEffortId } from "./lookup.ts";
import { readFrontMatter } from "./front-matter.ts";
import { absolutePath, folderCategory, isCairnOwned, relativeInsideRoot, safeSegment, storedPath } from "./root.ts";
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
  const inside = relativeInsideRoot(cairn, path);

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

function grantedSession(cairn: Cairn, inside: string): number | null {
  const grant = cairn.sql.get`SELECT session_id FROM location_grant WHERE path = ${inside}`;

  return grant === undefined ? null : integer(grant, "session_id");
}

// A Markdown file's front matter is its description, so it is read on every capture and replaces what was recorded.
function applyFrontMatter(cairn: Cairn, id: number, path: string, inside: string): void {
  if (!inside.endsWith(".md")) {
    return;
  }

  const found = readFrontMatter(readFileSync(path, "utf8"));

  if (found === null || (found.title === null && found.description === null && found.category === null)) {
    return;
  }

  // Front matter that names no category is the evidence a session gathered, unless the folder says otherwise.
  const category = found.category ?? folderCategory(inside) ?? "evidence";

  cairn.sql.run`
    UPDATE artifact SET category = ${category}, title = COALESCE(${found.title}, title),
      description = COALESCE(${found.description}, description),
      status = CASE WHEN status IN ('undescribed', 'active') AND (COALESCE(${found.title}, title) IS NOT NULL
          OR COALESCE(${found.description}, description) IS NOT NULL) THEN 'active' ELSE status END
    WHERE id = ${id}
  `;
}

// The session whose folder holds a file: a subagent's from its subagents/<native-id>/ folder inside the tree's
// folder, otherwise the root session's from its sessions/<harness>/<month>/<native-id>/ prefix.
export function folderSession(cairn: Cairn, inside: string): number | null {
  const match = /^sessions\/([^/]+)\/\d{4}-\d{2}\/([^/]+)\/(?:subagents\/([^/]+)\/)?/.exec(inside);

  if (match === null) {
    return null;
  }

  const [, harness = "", rootSegment, childSegment] = match;
  let rootId: number | null = null;

  for (const row of cairn.sql.all`SELECT id, native_id FROM session WHERE harness = ${harness} AND parent_session_id IS NULL`) {
    if (safeSegment(text(row, "native_id")) === rootSegment) {
      rootId = integer(row, "id");
      break;
    }
  }

  if (rootId === null || childSegment === undefined) {
    return rootId;
  }

  for (const row of cairn.sql.all`SELECT id, native_id FROM session WHERE root_session_id = ${rootId} AND id != ${rootId}`) {
    if (safeSegment(text(row, "native_id")) === childSegment) {
      return integer(row, "id");
    }
  }

  return rootId;
}

// A path a Markdown file names, with an extension: absolute, or relative to the file's folder.
const citedPath = /(?:^|[\s`'"(<[])((?:\/|\.{1,2}\/)?[\w@+.-]+(?:\/[\w@+.-]+)*\.[A-Za-z0-9]{1,8})(?=$|[\s`'")>\].,:;])/gm;

// A file that can't carry front matter, such as captured command output, is described by the Markdown in a session
// folder that names it: its file name as its title and the citing line as its description, with an informs link to
// the Markdown. Only undescribed files take this, and a cited file not yet recorded is recorded by its folder.
function describeCited(cairn: Cairn, citingId: number, path: string, inside: string): void {
  // The conversation export quotes paths people mentioned; it describes nothing.
  if (!inside.startsWith("sessions/") || !inside.endsWith(".md") || basename(inside) === "conversation.md") {
    return;
  }

  const citing = cairn.sql.get`SELECT title FROM artifact WHERE id = ${citingId}`;
  const citingTitle = (citing === undefined ? null : optionalText(citing, "title")) ?? basename(path);

  for (const line of readFileSync(path, "utf8").split("\n")) {
    for (const match of line.matchAll(citedPath)) {
      const target = resolve(dirname(path), match[1] ?? "");
      const cited = relativeInsideRoot(cairn, target);
      const facts = cited === null || cited.endsWith(".md") || isCairnOwned(cited) ? null : fileFacts(target);

      if (cited === null || facts === null) {
        continue;
      }

      const known = cairn.sql.get`SELECT id, status FROM artifact WHERE path_or_url = ${cited}`;
      const id = known === undefined ? recordFile(cairn, cited, facts, folderSession(cairn, cited)).id : integer(known, "id");

      if (known !== undefined && text(known, "status") !== "undescribed") {
        continue;
      }

      const said = line.replaceAll(/[`*_#>|]/g, " ").replaceAll(/\s+/g, " ").trim().slice(0, 240);

      cairn.sql.run`
        UPDATE artifact SET category = COALESCE(category, 'evidence'), title = COALESCE(title, ${basename(cited)}),
          description = COALESCE(description, ${`${said} (cited in ${citingTitle})`}), status = 'active', updated_at = ${timestamp(cairn)}
        WHERE id = ${id}
      `;
      addArtifactLink(cairn, id, "informs", citingId, "cairn");
      markArtifactDirty(cairn, id);
    }
  }
}

// Without a known producer, a file at a path from location is credited to the session it was handed to.
export function recordManagedFile(cairn: Cairn, inside: string, facts: FileFacts, producerId: number | null): RecordedFile {
  const recorded = recordFile(cairn, inside, facts, producerId);
  const path = absolutePath(cairn, "managed", inside);

  applyFrontMatter(cairn, recorded.id, path, inside);
  describeCited(cairn, recorded.id, path, inside);

  return recorded;
}

function recordFile(cairn: Cairn, inside: string, facts: FileFacts, producerId: number | null): RecordedFile {
  const now = timestamp(cairn);
  const existing = cairn.sql.get`SELECT id, producer_session_id FROM artifact WHERE path_or_url = ${inside}`;

  if (existing === undefined) {
    const producer = producerId ?? grantedSession(cairn, inside);

    const category = folderCategory(inside);

    const id = insertedId(cairn.sql.run`
      INSERT INTO artifact (category, location, path_or_url, sha256, size, status, producer_session_id, captured_at, updated_at)
      VALUES (${category}, 'managed', ${inside}, ${facts.sha256}, ${facts.size}, ${category === null ? "undescribed" : "active"}, ${producer}, ${now}, ${now})
    `);

    return { id, created: true };
  }

  const id = integer(existing, "id");
  const producer = optionalInteger(existing, "producer_session_id") ?? producerId ?? grantedSession(cairn, inside);

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

  const stored = storedPath(cairn, path);

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

// What an agent read about a Jira item or a Confluence page. Each read replaces the last: Jira and Confluence own these
// facts, and read_at says when they held.
function recordDetails(cairn: Cairn, id: number, input: DescribeInput): void {
  const type = input.url === undefined ? null : pointerType(input.url);
  const readAt = (given: string | undefined): string => given ?? timestamp(cairn);

  if (input.jira !== undefined) {
    if (type !== "jira_issue") {
      throw new CairnError("invalid", `jira describes a Jira item's url; ${input.url ?? "this"} isn't one`);
    }

    const { key, type: issueType, status, category, parent, blocks, read_at } = input.jira;

    cairn.sql.run`
      INSERT INTO jira_item (artifact_id, issue_key, issue_type, status, status_category, parent_key, blocks, read_at)
      VALUES (${id}, ${key}, ${issueType ?? null}, ${status ?? null}, ${category ?? null}, ${parent ?? null}, ${JSON.stringify(blocks)}, ${readAt(read_at)})
      ON CONFLICT (artifact_id) DO UPDATE SET issue_key = excluded.issue_key, issue_type = excluded.issue_type,
        status = excluded.status, status_category = excluded.status_category, parent_key = excluded.parent_key,
        blocks = excluded.blocks, read_at = excluded.read_at
    `;
  }

  if (input.confluence !== undefined) {
    if (type !== "confluence_page") {
      throw new CairnError("invalid", `confluence describes a Confluence page's url; ${input.url ?? "this"} isn't one`);
    }

    const { space, version, updated, read_at } = input.confluence;

    cairn.sql.run`
      INSERT INTO confluence_page (artifact_id, space, version, page_updated, read_at)
      VALUES (${id}, ${space ?? null}, ${version ?? null}, ${updated ?? null}, ${readAt(read_at)})
      ON CONFLICT (artifact_id) DO UPDATE SET space = excluded.space, version = excluded.version,
        page_updated = excluded.page_updated, read_at = excluded.read_at
    `;
  }
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

    recordDetails(cairn, id, input);

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
    const destination = storedPath(cairn, input.to);

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
