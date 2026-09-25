import type { SQLInputValue } from "node:sqlite";
import {
  artifactStatuses,
  categories,
  effortStatuses,
  formatSessionKey,
  pointerTypes,
  type ArtifactStatus,
  type Category,
  type EffortStatus,
  type FindInput,
  type PointerType
} from "../schemas.ts";
import { integer, optionalText, text, type Cairn, type Row } from "./db.ts";
import { findSessionId, requireEffortId } from "./lookup.ts";
import { absolutePath, sessionFolder } from "./root.ts";
import { significantWords } from "./words.ts";

export type ArtifactLocation = "managed" | "external" | "url";

export type ArtifactEntry = {
  readonly path: string;
  readonly location: ArtifactLocation;
  readonly category: Category | null;
  readonly pointer_type: PointerType | null;
  readonly title: string | null;
  readonly description: string | null;
  readonly status: ArtifactStatus;
  readonly origin: string | null;
  readonly producer: { readonly session: string; readonly title: string | null } | null;
  readonly efforts: readonly string[];
  readonly captured_at: string;
  readonly updated_at: string;
};

export type SessionSummary = {
  readonly key: string;
  readonly title: string | null;
  readonly description: string | null;
  readonly agent: string | null;
  readonly cwd: string | null;
  readonly workstream: string | null;
  readonly subject: string | null;
  readonly parent: string | null;
  readonly root: string;
  readonly folder: string;
  readonly efforts: readonly string[];
  readonly conversation: string | null;
  readonly started_at: string;
  readonly last_activity_at: string;
};

export type EffortSummary = {
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly status: EffortStatus;
  readonly tags: readonly string[];
  readonly session_count: number;
  readonly artifact_count: number;
  readonly last_activity_at: string;
};

export type ArtifactGroup = {
  readonly group: string;
  readonly artifacts: readonly ArtifactEntry[];
};

export type FindResult =
  | { readonly target: "efforts"; readonly efforts: readonly EffortSummary[] }
  | { readonly target: "sessions"; readonly sessions: readonly SessionSummary[] }
  | { readonly target: "artifacts"; readonly artifacts: readonly ArtifactEntry[] }
  | { readonly target: "artifacts"; readonly groups: readonly ArtifactGroup[] };

export function member<const Values extends readonly string[]>(values: Values, value: string): Values[number] {
  const found = values.find((candidate) => candidate === value);

  if (found === undefined) {
    throw new Error(`Unexpected value ${value}; expected one of ${values.join(", ")}`);
  }

  return found;
}

function optionalMember<const Values extends readonly string[]>(values: Values, value: string | null): Values[number] | null {
  return value === null ? null : member(values, value);
}

function artifactLocation(value: string): ArtifactLocation {
  return member(["managed", "external", "url"], value);
}

export function likePattern(value: string): string {
  return `%${value.replaceAll(/[\\%_]/g, (character) => `\\${character}`)}%`;
}

type TextScore = {
  readonly sql: string;
  readonly params: Readonly<Record<string, SQLInputValue>>;
};

// Scores a row by how many of the text's significant words appear in the haystack, so a search phrased
// differently from a title still finds it. With no text, every row scores 1.
function textScore(haystack: string, value: string | undefined): TextScore {
  if (value === undefined) {
    return { sql: "1", params: {} };
  }

  const words = significantWords(value);
  const patterns = words.size === 0 ? [value] : [...words];
  const params: Record<string, SQLInputValue> = {};
  const terms: string[] = [];

  for (const [index, word] of patterns.entries()) {
    params[`word${index}`] = likePattern(word);
    terms.push(`(${haystack} LIKE :word${index} ESCAPE '\\')`);
  }

  return { sql: `(${terms.join(" + ")})`, params };
}

type TagFilter = {
  readonly namespace: string | null;
  readonly value: string | null;
};

function splitTag(value: string | undefined): TagFilter {
  if (value === undefined) {
    return { namespace: null, value: null };
  }

  const separator = value.indexOf(":");

  return { namespace: value.slice(0, separator), value: value.slice(separator + 1) };
}

function idList(ids: readonly number[]): string {
  return JSON.stringify(ids);
}

export function loadArtifacts(cairn: Cairn, ids: readonly number[]): ArtifactEntry[] {
  const effortsByArtifact = new Map<number, string[]>();

  for (const row of cairn.sql.all`
    SELECT artifact_effort.artifact_id, effort.slug
    FROM artifact_effort JOIN effort ON effort.id = artifact_effort.effort_id
    WHERE artifact_effort.artifact_id IN (SELECT value FROM json_each(${idList(ids)}))
    ORDER BY effort.slug
  `) {
    const artifactId = integer(row, "artifact_id");
    const slugs = effortsByArtifact.get(artifactId) ?? [];

    slugs.push(text(row, "slug"));
    effortsByArtifact.set(artifactId, slugs);
  }

  const byId = new Map<number, ArtifactEntry>();

  for (const row of cairn.sql.all`
    SELECT artifact.*, producer.harness AS producer_harness, producer.native_id AS producer_native_id,
      producer.title AS producer_title
    FROM artifact LEFT JOIN session AS producer ON producer.id = artifact.producer_session_id
    WHERE artifact.id IN (SELECT value FROM json_each(${idList(ids)}))
  `) {
    const id = integer(row, "id");

    byId.set(id, artifactEntry(cairn, row, effortsByArtifact.get(id) ?? []));
  }

  const ordered: ArtifactEntry[] = [];

  for (const id of ids) {
    const entry = byId.get(id);

    if (entry !== undefined) {
      ordered.push(entry);
    }
  }

  return ordered;
}

function artifactEntry(cairn: Cairn, row: Row, efforts: readonly string[]): ArtifactEntry {
  const location = artifactLocation(text(row, "location"));
  const stored = text(row, "path_or_url");
  const producerHarness = optionalText(row, "producer_harness");
  const producerNativeId = optionalText(row, "producer_native_id");

  return {
    path: location === "url" ? stored : absolutePath(cairn.root, location, stored),
    location,
    category: optionalMember(categories, optionalText(row, "category")),
    pointer_type: optionalMember(pointerTypes, optionalText(row, "pointer_type")),
    title: optionalText(row, "title"),
    description: optionalText(row, "description"),
    status: member(artifactStatuses, text(row, "status")),
    origin: optionalText(row, "origin"),
    producer:
      producerHarness === null || producerNativeId === null
        ? null
        : {
            session: formatSessionKey({ harness: producerHarness, nativeId: producerNativeId }),
            title: optionalText(row, "producer_title")
          },
    efforts,
    captured_at: text(row, "captured_at"),
    updated_at: text(row, "updated_at")
  };
}

export function loadArtifact(cairn: Cairn, id: number): ArtifactEntry {
  const [entry] = loadArtifacts(cairn, [id]);

  if (entry === undefined) {
    throw new Error(`Artifact row ${id} disappeared`);
  }

  return entry;
}

export function loadSession(cairn: Cairn, id: number): SessionSummary {
  const row = cairn.sql.get`
    SELECT session.*, parent.harness AS parent_harness, parent.native_id AS parent_native_id,
      root.harness AS root_harness, root.native_id AS root_native_id, root.started_at AS root_started_at,
      conversation.path_or_url AS conversation_path
    FROM session
    LEFT JOIN session AS parent ON parent.id = session.parent_session_id
    JOIN session AS root ON root.id = session.root_session_id
    LEFT JOIN artifact AS conversation ON conversation.id = session.export_artifact_id
    WHERE session.id = ${id}
  `;

  if (row === undefined) {
    throw new Error(`Session row ${id} disappeared`);
  }

  const efforts: string[] = [];

  for (const effortRow of cairn.sql.all`
    SELECT effort.slug FROM attachment JOIN effort ON effort.id = attachment.effort_id
    WHERE attachment.session_id = ${id} ORDER BY effort.slug
  `) {
    efforts.push(text(effortRow, "slug"));
  }

  const parentHarness = optionalText(row, "parent_harness");
  const parentNativeId = optionalText(row, "parent_native_id");
  const rootHarness = text(row, "root_harness");
  const rootNativeId = text(row, "root_native_id");
  const conversation = optionalText(row, "conversation_path");

  return {
    key: formatSessionKey({ harness: text(row, "harness"), nativeId: text(row, "native_id") }),
    title: optionalText(row, "title"),
    description: optionalText(row, "description"),
    agent: optionalText(row, "agent"),
    cwd: optionalText(row, "cwd"),
    workstream: optionalText(row, "workstream"),
    subject: optionalText(row, "subject"),
    parent:
      parentHarness === null || parentNativeId === null
        ? null
        : formatSessionKey({ harness: parentHarness, nativeId: parentNativeId }),
    root: formatSessionKey({ harness: rootHarness, nativeId: rootNativeId }),
    folder: sessionFolder(cairn.root, rootHarness, text(row, "root_started_at").slice(0, 7), rootNativeId),
    efforts,
    conversation: conversation === null ? null : absolutePath(cairn.root, "managed", conversation),
    started_at: text(row, "started_at"),
    last_activity_at: text(row, "last_activity_at")
  };
}

export function effortTags(cairn: Cairn, effortId: number): string[] {
  const tags: string[] = [];

  for (const row of cairn.sql.all`
    SELECT namespace || ':' || value AS tag FROM tag WHERE effort_id = ${effortId} ORDER BY namespace, value
  `) {
    tags.push(text(row, "tag"));
  }

  return tags;
}

const effortSummaryColumns = `
  effort.id, effort.slug, effort.title, effort.description, effort.status,
  (SELECT COUNT(*) FROM attachment WHERE attachment.effort_id = effort.id) AS session_count,
  (SELECT COUNT(*) FROM artifact_effort JOIN artifact ON artifact.id = artifact_effort.artifact_id
    WHERE artifact_effort.effort_id = effort.id AND artifact.status != 'archived') AS artifact_count,
  MAX(effort.updated_at, COALESCE((SELECT MAX(session.last_activity_at) FROM attachment
    JOIN session ON session.id = attachment.session_id WHERE attachment.effort_id = effort.id), '')) AS last_activity_at
`;

function effortSummary(cairn: Cairn, row: Row): EffortSummary {
  return {
    slug: text(row, "slug"),
    title: text(row, "title"),
    description: text(row, "description"),
    status: member(effortStatuses, text(row, "status")),
    tags: effortTags(cairn, integer(row, "id")),
    session_count: integer(row, "session_count"),
    artifact_count: integer(row, "artifact_count"),
    last_activity_at: text(row, "last_activity_at")
  };
}

export function loadEffort(cairn: Cairn, effortId: number): EffortSummary {
  const row = cairn.db.prepare(`SELECT ${effortSummaryColumns} FROM effort WHERE effort.id = ?`).get(effortId);

  if (row === undefined) {
    throw new Error(`Effort row ${effortId} disappeared`);
  }

  return effortSummary(cairn, row);
}

export function findEfforts(cairn: Cairn, input: FindInput): EffortSummary[] {
  const tag = splitTag(input.tag);
  const score = textScore("effort.slug || ' ' || effort.title || ' ' || effort.description", input.text);
  const status = input.status ?? null;

  const rows = cairn.db
    .prepare(
      `SELECT ${effortSummaryColumns} FROM effort
      WHERE (:status IS NULL OR effort.status = :status)
        AND (:status IS NOT NULL OR effort.status != 'archived')
        AND (:namespace IS NULL OR EXISTS (SELECT 1 FROM tag
          WHERE tag.effort_id = effort.id AND tag.namespace = :namespace AND tag.value = :value))
        AND ${score.sql} > 0
      ORDER BY ${score.sql} DESC, last_activity_at DESC
      LIMIT :limit`
    )
    .all({ ...score.params, status, namespace: tag.namespace, value: tag.value, limit: input.limit });

  return rows.map((row) => effortSummary(cairn, row));
}

export function findSessions(cairn: Cairn, input: FindInput): SessionSummary[] {
  const tag = splitTag(input.tag);

  const score = textScore(
    "coalesce(session.title, '') || ' ' || coalesce(session.description, '') || ' ' || session.native_id",
    input.text
  );

  const effortId = input.effort === undefined ? null : requireEffortId(cairn, input.effort);

  const rows = cairn.db
    .prepare(
      `SELECT session.id FROM session
      WHERE (:effort IS NULL OR EXISTS (SELECT 1 FROM attachment
          WHERE attachment.session_id = session.id AND attachment.effort_id = :effort))
        AND (:workstream IS NULL OR session.workstream = :workstream)
        AND (:subject IS NULL OR session.subject = :subject)
        AND (:namespace IS NULL OR EXISTS (SELECT 1 FROM attachment JOIN tag ON tag.effort_id = attachment.effort_id
          WHERE attachment.session_id = session.id AND tag.namespace = :namespace AND tag.value = :value))
        AND ${score.sql} > 0
      ORDER BY ${score.sql} DESC, session.last_activity_at DESC
      LIMIT :limit`
    )
    .all({
      ...score.params,
      effort: effortId,
      workstream: input.workstream ?? null,
      subject: input.subject ?? null,
      namespace: tag.namespace,
      value: tag.value,
      limit: input.limit
    });

  return rows.map((row) => loadSession(cairn, integer(row, "id")));
}

export function findArtifactIds(cairn: Cairn, input: FindInput): number[] {
  const tag = splitTag(input.tag);

  const score = textScore(
    "coalesce(artifact.title, '') || ' ' || coalesce(artifact.description, '') || ' ' || artifact.path_or_url",
    input.text
  );

  const effortId = input.effort === undefined ? null : requireEffortId(cairn, input.effort);
  const sessionId = input.session === undefined ? null : (findSessionId(cairn, input.session) ?? -1);

  const rows = cairn.db
    .prepare(
      `SELECT artifact.id FROM artifact
      WHERE (:category IS NULL OR artifact.category = :category)
        AND (:pointer_type IS NULL OR artifact.pointer_type = :pointer_type)
        AND (:status IS NULL OR artifact.status = :status)
        AND (:status IS NOT NULL OR artifact.status != 'archived')
        AND (:effort IS NULL OR artifact.id IN (SELECT artifact_id FROM artifact_effort WHERE effort_id = :effort))
        AND (:namespace IS NULL OR artifact.id IN (SELECT artifact_effort.artifact_id FROM artifact_effort
          JOIN tag ON tag.effort_id = artifact_effort.effort_id WHERE tag.namespace = :namespace AND tag.value = :value))
        AND (:session IS NULL OR artifact.producer_session_id IN (
          WITH RECURSIVE tree (id) AS (
            SELECT :session UNION SELECT session.id FROM session JOIN tree ON session.parent_session_id = tree.id
          ) SELECT id FROM tree))
        AND ${score.sql} > 0
      ORDER BY ${score.sql} DESC, artifact.updated_at DESC, artifact.id DESC
      LIMIT :limit`
    )
    .all({
      ...score.params,
      category: input.category ?? null,
      pointer_type: input.pointer_type ?? null,
      status: input.status ?? null,
      effort: effortId,
      namespace: tag.namespace,
      value: tag.value,
      session: sessionId,
      limit: input.limit
    });

  return rows.map((row) => integer(row, "id"));
}

// The label an artifact is grouped under in an effort view.
export function artifactGroup(entry: ArtifactEntry): string {
  if (entry.pointer_type !== null && entry.pointer_type !== "url") {
    return entry.pointer_type;
  }

  return entry.category ?? "undescribed";
}

export const groupOrder: readonly string[] = [
  "pull_request",
  "jira_issue",
  "issue",
  "confluence_page",
  "record",
  "deliverable",
  "synthesis",
  "evidence",
  "source",
  "conversation",
  "other",
  "undescribed"
];

export function groupArtifacts(
  entries: readonly ArtifactEntry[],
  keyOf: (entry: ArtifactEntry) => string,
  order: readonly string[]
): ArtifactGroup[] {
  const groups = new Map<string, ArtifactEntry[]>();

  for (const entry of entries) {
    const key = keyOf(entry);
    const members = groups.get(key) ?? [];

    members.push(entry);
    groups.set(key, members);
  }

  const rank = (key: string): number => {
    const index = order.indexOf(key);

    return index === -1 ? order.length : index;
  };

  return [...groups.entries()]
    .sort(([left], [right]) => rank(left) - rank(right) || left.localeCompare(right))
    .map(([group, artifacts]) => ({ group, artifacts }));
}

export function find(cairn: Cairn, input: FindInput): FindResult {
  if (input.target === "efforts") {
    return { target: "efforts", efforts: findEfforts(cairn, input) };
  }

  if (input.target === "sessions") {
    return { target: "sessions", sessions: findSessions(cairn, input) };
  }

  const artifacts = loadArtifacts(cairn, findArtifactIds(cairn, input));

  if (input.group_by === "category") {
    return { target: "artifacts", groups: groupArtifacts(artifacts, artifactGroup, groupOrder) };
  }

  if (input.group_by === "session") {
    return {
      target: "artifacts",
      groups: groupArtifacts(artifacts, (entry) => entry.producer?.session ?? "no session", [])
    };
  }

  return { target: "artifacts", artifacts };
}
