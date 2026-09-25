import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";

// Each entry moves the schema from version N to N + 1. Append only; never edit a released entry.
const migrations: readonly string[] = [
  `
  CREATE TABLE session (
    id INTEGER PRIMARY KEY,
    harness TEXT NOT NULL,
    native_id TEXT NOT NULL,
    parent_session_id INTEGER REFERENCES session (id),
    root_session_id INTEGER REFERENCES session (id),
    title TEXT,
    description TEXT,
    cwd TEXT,
    agent TEXT,
    workstream TEXT,
    subject TEXT,
    started_at TEXT NOT NULL,
    last_activity_at TEXT NOT NULL,
    export_artifact_id INTEGER REFERENCES artifact (id),
    watermark_json TEXT,
    indexed_at TEXT,
    last_error TEXT,
    UNIQUE (harness, native_id)
  ) STRICT;

  CREATE INDEX session_parent ON session (parent_session_id);
  CREATE INDEX session_workstream ON session (workstream);
  CREATE INDEX session_subject ON session (subject);

  CREATE TABLE effort (
    id INTEGER PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'done', 'archived')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    index_dirty INTEGER NOT NULL DEFAULT 1
  ) STRICT;

  CREATE TABLE attachment (
    session_id INTEGER NOT NULL REFERENCES session (id),
    effort_id INTEGER NOT NULL REFERENCES effort (id) ON DELETE CASCADE,
    attached_at TEXT NOT NULL,
    attached_by TEXT NOT NULL,
    PRIMARY KEY (session_id, effort_id)
  ) STRICT;

  CREATE INDEX attachment_effort ON attachment (effort_id);

  CREATE TABLE artifact (
    id INTEGER PRIMARY KEY,
    category TEXT CHECK (category IN ('evidence', 'source', 'synthesis', 'deliverable', 'record', 'conversation', 'other')),
    pointer_type TEXT CHECK (pointer_type IN ('pull_request', 'issue', 'jira_issue', 'confluence_page', 'url')),
    title TEXT,
    description TEXT,
    location TEXT NOT NULL CHECK (location IN ('managed', 'external', 'url')),
    path_or_url TEXT NOT NULL UNIQUE,
    origin TEXT,
    sha256 TEXT,
    size INTEGER,
    status TEXT NOT NULL CHECK (status IN ('undescribed', 'active', 'superseded', 'missing', 'archived')),
    producer_session_id INTEGER REFERENCES session (id),
    captured_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  ) STRICT;

  CREATE INDEX artifact_producer ON artifact (producer_session_id);

  CREATE TABLE membership (
    artifact_id INTEGER NOT NULL REFERENCES artifact (id) ON DELETE CASCADE,
    effort_id INTEGER NOT NULL REFERENCES effort (id) ON DELETE CASCADE,
    mode TEXT NOT NULL CHECK (mode IN ('include', 'exclude')),
    set_by TEXT NOT NULL,
    PRIMARY KEY (artifact_id, effort_id)
  ) STRICT;

  CREATE TABLE link (
    src_kind TEXT NOT NULL CHECK (src_kind IN ('artifact', 'effort', 'session')),
    src_id INTEGER NOT NULL,
    rel TEXT NOT NULL CHECK (rel IN ('informs', 'supersedes', 'related', 'read_in', 'depends_on', 'split_from')),
    dst_kind TEXT NOT NULL CHECK (dst_kind IN ('artifact', 'effort', 'session')),
    dst_id INTEGER NOT NULL,
    origin TEXT NOT NULL CHECK (origin IN ('explicit', 'suggested')),
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (src_kind, src_id, rel, dst_kind, dst_id)
  ) STRICT;

  CREATE INDEX link_destination ON link (dst_kind, dst_id);

  CREATE TABLE tag (
    effort_id INTEGER NOT NULL REFERENCES effort (id) ON DELETE CASCADE,
    namespace TEXT NOT NULL,
    value TEXT NOT NULL,
    PRIMARY KEY (effort_id, namespace, value)
  ) STRICT;

  -- An artifact belongs to the efforts of the nearest session in its producer's ancestry that has any
  -- attachment, and to the effort whose folder holds it, plus include memberships, minus exclude memberships.
  CREATE VIEW artifact_effort AS
  WITH RECURSIVE chain (artifact_id, session_id, depth) AS (
    SELECT id, producer_session_id, 0 FROM artifact WHERE producer_session_id IS NOT NULL
    UNION ALL
    SELECT chain.artifact_id, session.parent_session_id, chain.depth + 1
    FROM chain JOIN session ON session.id = chain.session_id
    WHERE session.parent_session_id IS NOT NULL AND chain.depth < 64
  ),
  attached AS (
    SELECT artifact_id, session_id, depth FROM chain
    WHERE EXISTS (SELECT 1 FROM attachment WHERE attachment.session_id = chain.session_id)
  ),
  nearest AS (
    SELECT artifact_id, MIN(depth) AS depth FROM attached GROUP BY artifact_id
  )
  SELECT attached.artifact_id, attachment.effort_id
  FROM attached
  JOIN nearest ON nearest.artifact_id = attached.artifact_id AND nearest.depth = attached.depth
  JOIN attachment ON attachment.session_id = attached.session_id
  UNION
  SELECT artifact.id, effort.id
  FROM artifact JOIN effort
    ON artifact.location = 'managed'
    AND substr(artifact.path_or_url, 1, length('efforts/' || effort.slug || '/')) = 'efforts/' || effort.slug || '/'
  UNION
  SELECT artifact_id, effort_id FROM membership WHERE mode = 'include'
  EXCEPT
  SELECT artifact_id, effort_id FROM membership WHERE mode = 'exclude';
  `
];

export const schemaVersion = migrations.length;

const userVersionRow = z.object({ user_version: z.number().int() });

export function userVersion(db: DatabaseSync): number {
  return userVersionRow.parse(db.prepare("PRAGMA user_version").get()).user_version;
}

export function migrate(db: DatabaseSync): void {
  const current = userVersion(db);

  if (current > schemaVersion) {
    throw new Error(`The catalog schema version ${current} is newer than this Cairn (${schemaVersion})`);
  }

  for (let version = current; version < schemaVersion; version += 1) {
    db.exec("BEGIN IMMEDIATE");

    try {
      db.exec(migrations[version] ?? "");
      db.exec(`PRAGMA user_version = ${version + 1}`);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
}
