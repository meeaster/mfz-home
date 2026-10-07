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
  `,
  `
  -- The session each path from location was handed to. A file written there without a capture, for example
  -- by a shell command, takes that session as its producer when it is first recorded.
  CREATE TABLE location_grant (
    path TEXT PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES session (id),
    granted_at TEXT NOT NULL
  ) STRICT;
  `,
  `
  -- Adds the provisional effort status and the learning category. SQLite can't change a CHECK constraint in
  -- place, so both tables are rebuilt, and the view that reads them is dropped first and recreated after.
  DROP VIEW artifact_effort;

  CREATE TABLE effort_new (
    id INTEGER PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('provisional', 'active', 'paused', 'done', 'archived')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    index_dirty INTEGER NOT NULL DEFAULT 1
  ) STRICT;

  INSERT INTO effort_new SELECT id, slug, title, description, status, created_at, updated_at, index_dirty FROM effort;
  DROP TABLE effort;
  ALTER TABLE effort_new RENAME TO effort;

  CREATE TABLE artifact_new (
    id INTEGER PRIMARY KEY,
    category TEXT CHECK (category IN ('evidence', 'source', 'synthesis', 'deliverable', 'record', 'conversation', 'learning', 'other')),
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

  INSERT INTO artifact_new
  SELECT id, category, pointer_type, title, description, location, path_or_url, origin, sha256, size, status,
    producer_session_id, captured_at, updated_at
  FROM artifact;
  DROP TABLE artifact;
  ALTER TABLE artifact_new RENAME TO artifact;
  CREATE INDEX artifact_producer ON artifact (producer_session_id);

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
  `,
  `
  -- Adds the knowledge category, rebuilding the artifact table the same way as version 3.
  DROP VIEW artifact_effort;

  CREATE TABLE artifact_new (
    id INTEGER PRIMARY KEY,
    category TEXT CHECK (category IN (
      'evidence', 'source', 'synthesis', 'knowledge', 'deliverable', 'record', 'conversation', 'learning', 'other'
    )),
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

  INSERT INTO artifact_new
  SELECT id, category, pointer_type, title, description, location, path_or_url, origin, sha256, size, status,
    producer_session_id, captured_at, updated_at
  FROM artifact;
  DROP TABLE artifact;
  ALTER TABLE artifact_new RENAME TO artifact;
  CREATE INDEX artifact_producer ON artifact (producer_session_id);

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
  `,
  `
  -- The title the harness gives a session, refreshed by each conversation export. title, set by an agent or
  -- the human, takes precedence.
  ALTER TABLE session ADD COLUMN harness_title TEXT;
  `,
  `
  -- origin is how a session was started: interactive, by a person in a terminal or app, or cli, by a headless
  -- command such as claude -p or opencode run. spawned_by_session_id is the session whose shell ran that
  -- command. Unlike a parent, a spawner shares no folder or efforts with the session.
  ALTER TABLE session ADD COLUMN origin TEXT CHECK (origin IN ('interactive', 'cli'));
  ALTER TABLE session ADD COLUMN spawned_by_session_id INTEGER REFERENCES session (id);
  CREATE INDEX session_spawned_by ON session (spawned_by_session_id);
  `,
  `
  -- A session's own model usage, one row per model: what its main agent's calls used, not its subagents' or CLI
  -- runs', which have their own rows. cost_usd prices the calls at models.dev rates and is null when the model has
  -- no price there; unpriced_calls counts those calls.
  CREATE TABLE session_usage (
    session_id INTEGER NOT NULL REFERENCES session (id),
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    calls INTEGER NOT NULL,
    input_tokens INTEGER NOT NULL,
    output_tokens INTEGER NOT NULL,
    reasoning_tokens INTEGER NOT NULL,
    cache_read_tokens INTEGER NOT NULL,
    cache_write_tokens INTEGER NOT NULL,
    cost_usd REAL,
    unpriced_calls INTEGER NOT NULL,
    PRIMARY KEY (session_id, provider, model)
  ) STRICT;
  `,
  `
  -- What an agent last read about a Jira item or a Confluence page, through the Atlassian MCP server: Cairn can't reach
  -- Atlassian itself. Jira owns these facts; read_at says when they were true. blocks is a JSON array of issue keys.
  CREATE TABLE jira_item (
    artifact_id INTEGER PRIMARY KEY REFERENCES artifact (id),
    issue_key TEXT NOT NULL,
    issue_type TEXT,
    status TEXT,
    status_category TEXT CHECK (status_category IN ('todo', 'progress', 'done')),
    parent_key TEXT,
    blocks TEXT NOT NULL DEFAULT '[]',
    read_at TEXT NOT NULL
  ) STRICT;
  CREATE INDEX jira_item_key ON jira_item (issue_key);
  CREATE TABLE confluence_page (
    artifact_id INTEGER PRIMARY KEY REFERENCES artifact (id),
    space TEXT,
    version INTEGER,
    page_updated TEXT,
    read_at TEXT NOT NULL
  ) STRICT;
  `,
  `
  -- Origins are the systems knowledge comes from (an AWS account, a Datadog org, a repository, a documentation site),
  -- each described once with how to reach it. Kinds are an open list that grows as agents register origins;
  -- identifier says what a kind's identifiers are, so the next agent registers the same system the same way.
  CREATE TABLE origin_kind (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    identifier TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL
  ) STRICT;
  CREATE TABLE origin (
    id INTEGER PRIMARY KEY,
    kind_id INTEGER NOT NULL REFERENCES origin_kind (id),
    identifier TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (kind_id, identifier)
  ) STRICT;
  -- How to reach an origin from here: a tool and what it needs, such as an AWS CLI profile. Never a credential.
  CREATE TABLE origin_access (
    origin_id INTEGER NOT NULL REFERENCES origin (id) ON DELETE CASCADE,
    method TEXT NOT NULL,
    detail TEXT NOT NULL DEFAULT '',
    PRIMARY KEY (origin_id, method, detail)
  ) STRICT;
  -- What a knowledge article looked at inside an origin. locator says where, precisely enough to look again.
  -- observed_at and version describe one look and change together. sections is a JSON array of the article's
  -- headings the reference supports; empty means the whole article.
  CREATE TABLE origin_reference (
    id INTEGER PRIMARY KEY,
    artifact_id INTEGER NOT NULL REFERENCES artifact (id) ON DELETE CASCADE,
    origin_id INTEGER NOT NULL REFERENCES origin (id),
    locator TEXT NOT NULL,
    title TEXT NOT NULL,
    sections TEXT NOT NULL DEFAULT '[]',
    observed_at TEXT NOT NULL,
    version TEXT,
    recorded_by TEXT NOT NULL,
    UNIQUE (artifact_id, origin_id, locator)
  ) STRICT;
  CREATE INDEX origin_reference_origin ON origin_reference (origin_id);
  `
];

export const schemaVersion = migrations.length;

const userVersionRow = z.object({ user_version: z.number().int() });

export function userVersion(db: DatabaseSync): number {
  return userVersionRow.parse(db.prepare("PRAGMA user_version").get()).user_version;
}

// target stops at an earlier version, so tests can build a catalog as an older Cairn left it.
export function migrate(db: DatabaseSync, target = schemaVersion): void {
  const current = userVersion(db);

  if (current > schemaVersion) {
    throw new Error(`The catalog schema version ${current} is newer than this Cairn (${schemaVersion})`);
  }

  if (current >= target) {
    return;
  }

  // A migration that rebuilds a table drops the old one, which with foreign keys on would cascade to the rows
  // that reference it. SQLite's rebuild procedure turns them off, which only works outside a transaction, and
  // checks the references before committing.
  db.exec("PRAGMA foreign_keys = OFF");

  try {
    for (let version = current; version < target; version += 1) {
      db.exec("BEGIN IMMEDIATE");

      try {
        db.exec(migrations[version] ?? "");
        db.exec(`PRAGMA user_version = ${version + 1}`);

        if (db.prepare("PRAGMA foreign_key_check").all().length > 0) {
          throw new Error(`Migration to schema version ${version + 1} left broken references`);
        }

        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    }
  } finally {
    db.exec("PRAGMA foreign_keys = ON");
  }
}
