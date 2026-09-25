import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { effortStatuses, type EffortStatus } from "../schemas.ts";
import { integer, text, type Cairn } from "./db.ts";
import {
  artifactGroup,
  groupArtifacts,
  groupOrder,
  loadArtifacts,
  loadEffort,
  loadSession,
  member,
  type ArtifactEntry,
  type EffortSummary,
  type SessionSummary
} from "./find.ts";
import { requireEffortId } from "./lookup.ts";
import { effortFolder, recordNames } from "./root.ts";

export type RecordFile = {
  readonly name: string;
  readonly path: string;
  readonly approx_tokens: number;
};

export type LinkedEffort = {
  readonly relation: "depends_on" | "needed_by" | "split_from" | "split_into" | "related";
  readonly slug: string;
  readonly title: string;
  readonly status: EffortStatus;
  readonly summary: string | null;
};

export type EffortView = EffortSummary & {
  readonly folder: string;
  readonly summary: string | null;
  readonly records: readonly RecordFile[];
  readonly links: readonly LinkedEffort[];
  readonly sessions: readonly SessionSummary[];
  readonly artifacts: readonly ArtifactEntry[];
};

export function markEffortDirty(cairn: Cairn, effortId: number): void {
  cairn.sql.run`UPDATE effort SET index_dirty = 1 WHERE id = ${effortId}`;
}

export function markArtifactDirty(cairn: Cairn, artifactId: number): void {
  cairn.sql.run`
    UPDATE effort SET index_dirty = 1
    WHERE id IN (SELECT effort_id FROM artifact_effort WHERE artifact_id = ${artifactId})
  `;
}

export function markSessionDirty(cairn: Cairn, sessionId: number): void {
  cairn.sql.run`
    UPDATE effort SET index_dirty = 1
    WHERE id IN (
      WITH RECURSIVE up (id, depth) AS (
        SELECT ${sessionId}, 0
        UNION ALL
        SELECT session.parent_session_id, up.depth + 1 FROM up JOIN session ON session.id = up.id
        WHERE session.parent_session_id IS NOT NULL AND up.depth < 64
      )
      SELECT attachment.effort_id FROM attachment JOIN up ON up.id = attachment.session_id
    )
  `;
}

// The summary a linked session reads: a "Summary" section if context.md has one, otherwise its first paragraph.
export function contextSummary(contextPath: string): string | null {
  if (!existsSync(contextPath)) {
    return null;
  }

  const lines = readFileSync(contextPath, "utf8").split("\n");
  const summaryHeading = lines.findIndex((line) => /^#{2,6}\s+summary\s*$/i.test(line));
  const start = summaryHeading === -1 ? 0 : summaryHeading + 1;
  const paragraph: string[] = [];

  for (const line of lines.slice(start)) {
    const trimmed = line.trim();

    if (trimmed.startsWith("#")) {
      if (paragraph.length > 0 || summaryHeading !== -1) {
        break;
      }

      continue;
    }

    if (trimmed === "") {
      if (paragraph.length > 0 && summaryHeading === -1) {
        break;
      }

      continue;
    }

    paragraph.push(trimmed);
  }

  return paragraph.length === 0 ? null : paragraph.join(" ");
}

function records(folder: string): RecordFile[] {
  const found: RecordFile[] = [];

  for (const name of recordNames) {
    const path = join(folder, name);

    if (existsSync(path)) {
      found.push({ name, path, approx_tokens: Math.round(statSync(path).size / 4) });
    }
  }

  return found;
}

function linkedEfforts(cairn: Cairn, effortId: number): LinkedEffort[] {
  const linked: LinkedEffort[] = [];

  for (const row of cairn.sql.all`
    SELECT link.rel, link.src_id = ${effortId} AS outgoing, other.slug, other.title, other.status
    FROM link JOIN effort AS other ON other.id = CASE WHEN link.src_id = ${effortId} THEN link.dst_id ELSE link.src_id END
    WHERE link.src_kind = 'effort' AND link.dst_kind = 'effort' AND (link.src_id = ${effortId} OR link.dst_id = ${effortId})
    ORDER BY link.rel, other.slug
  `) {
    const rel = text(row, "rel");
    const outgoing = integer(row, "outgoing") === 1;
    const slug = text(row, "slug");

    linked.push({
      relation: relationFromPerspective(rel, outgoing),
      slug,
      title: text(row, "title"),
      status: member(effortStatuses, text(row, "status")),
      summary: contextSummary(join(effortFolder(cairn.root, slug), "context.md"))
    });
  }

  return linked;
}

function relationFromPerspective(rel: string, outgoing: boolean): LinkedEffort["relation"] {
  if (rel === "depends_on") {
    return outgoing ? "depends_on" : "needed_by";
  }

  if (rel === "split_from") {
    return outgoing ? "split_from" : "split_into";
  }

  return "related";
}

export function effortView(cairn: Cairn, slug: string): EffortView {
  const effortId = requireEffortId(cairn, slug);
  const folder = effortFolder(cairn.root, slug);
  const recordPaths = new Set(recordNames.map((name) => join(folder, name)));
  const artifactIds: number[] = [];

  for (const row of cairn.sql.all`
    SELECT artifact.id FROM artifact_effort JOIN artifact ON artifact.id = artifact_effort.artifact_id
    WHERE artifact_effort.effort_id = ${effortId} AND artifact.status != 'archived'
    ORDER BY artifact.captured_at, artifact.id
  `) {
    artifactIds.push(integer(row, "id"));
  }

  const sessions: SessionSummary[] = [];

  for (const row of cairn.sql.all`
    SELECT session.id FROM attachment JOIN session ON session.id = attachment.session_id
    WHERE attachment.effort_id = ${effortId} ORDER BY session.started_at, session.id
  `) {
    sessions.push(loadSession(cairn, integer(row, "id")));
  }

  const artifacts: ArtifactEntry[] = [];

  for (const entry of loadArtifacts(cairn, artifactIds)) {
    if (!recordPaths.has(entry.path)) {
      artifacts.push(entry);
    }
  }

  return {
    ...loadEffort(cairn, effortId),
    folder,
    summary: contextSummary(join(folder, "context.md")),
    records: records(folder),
    links: linkedEfforts(cairn, effortId),
    sessions,
    artifacts
  };
}

const groupHeadings = new Map<string, string>([
  ["pull_request", "Pull requests"],
  ["jira_issue", "Jira items"],
  ["issue", "Issues"],
  ["confluence_page", "Confluence pages"],
  ["record", "Session records"],
  ["deliverable", "Deliverables"],
  ["synthesis", "Synthesis"],
  ["evidence", "Evidence"],
  ["source", "Sources"],
  ["conversation", "Conversations"],
  ["other", "Other"],
  ["undescribed", "Undescribed"]
]);

const relationLabels: Readonly<Record<LinkedEffort["relation"], string>> = {
  depends_on: "Depends on",
  needed_by: "Needed by",
  split_from: "Split from",
  split_into: "Split into",
  related: "Related to"
};

function linkText(value: string): string {
  return value.replaceAll(/[[\]]/g, (character) => `\\${character}`);
}

function target(folder: string, entry: ArtifactEntry): string {
  return entry.location === "url" ? entry.path : relative(folder, entry.path).replaceAll("\\", "/");
}

function artifactLine(folder: string, entry: ArtifactEntry): string {
  const parts = [`- [${linkText(entry.title ?? basename(entry.path))}](${target(folder, entry)})`];

  if (entry.description !== null) {
    parts.push(` — ${entry.description}`);
  }

  if (entry.status !== "active") {
    parts.push(` · *${entry.status}*`);
  }

  if (entry.producer !== null) {
    parts.push(` · from ${entry.producer.title ?? `\`${entry.producer.session}\``}`);
  }

  return parts.join("");
}

function sessionLine(folder: string, session: SessionSummary): string {
  const label = session.title ?? "Untitled session";
  const description = session.description === null ? "" : ` — ${session.description}`;
  const folderLink = relative(folder, session.folder).replaceAll("\\", "/");

  const conversation =
    session.conversation === null ? "" : ` · [conversation](${relative(folder, session.conversation).replaceAll("\\", "/")})`;

  return `- ${label} (\`${session.key}\`)${description} · started ${session.started_at.slice(0, 10)} · [folder](${folderLink}/)${conversation}`;
}

export function renderIndex(view: EffortView): string {
  const lines = [
    `# ${view.title}`,
    "",
    "> Generated by Cairn from the catalog. Edits here are overwritten.",
    ""
  ];

  if (view.description !== "") {
    lines.push(view.description, "");
  }

  lines.push(`- **Status:** ${view.status}`);

  if (view.tags.length > 0) {
    lines.push(`- **Tags:** ${view.tags.map((tag) => `\`${tag}\``).join(", ")}`);
  }

  lines.push(
    `- **Sessions:** ${view.session_count} · **Artifacts:** ${view.artifact_count}`,
    `- **Last activity:** ${view.last_activity_at.slice(0, 10)}`,
    "",
    "## Summary",
    "",
    view.summary ?? "`context.md` has no summary yet.",
    ""
  );

  if (view.records.length > 0) {
    lines.push("## Records", "");

    for (const record of view.records) {
      lines.push(`- [${record.name}](${record.name}) · about ${record.approx_tokens.toLocaleString("en-US")} tokens`);
    }

    lines.push("");
  }

  if (view.links.length > 0) {
    lines.push("## Linked efforts", "");

    for (const link of view.links) {
      const summary = link.summary === null ? "" : ` — ${link.summary}`;

      lines.push(`- ${relationLabels[link.relation]} [${linkText(link.title)}](../${link.slug}/index.md) · ${link.status}${summary}`);
    }

    lines.push("");
  }

  for (const group of groupArtifacts(view.artifacts, artifactGroup, groupOrder)) {
    lines.push(`## ${groupHeadings.get(group.group) ?? group.group}`, "");

    for (const entry of group.artifacts) {
      lines.push(artifactLine(view.folder, entry));
    }

    lines.push("");
  }

  if (view.sessions.length > 0) {
    lines.push("## Sessions", "");

    for (const session of view.sessions) {
      lines.push(sessionLine(view.folder, session));
    }

    lines.push("");
  }

  return lines.join("\n");
}

export function writeIndex(cairn: Cairn, slug: string): string {
  const view = effortView(cairn, slug);
  const path = join(view.folder, "index.md");
  const temporary = `${path}.${process.pid}.tmp`;

  mkdirSync(view.folder, { recursive: true });
  writeFileSync(temporary, renderIndex(view));
  renameSync(temporary, path);

  return path;
}

// Clears each flag before rendering, so a change made while rendering marks the effort again.
export function regenerateDirty(cairn: Cairn): string[] {
  const written: string[] = [];

  for (const row of cairn.sql.all`SELECT id, slug FROM effort WHERE index_dirty = 1 ORDER BY slug`) {
    cairn.sql.run`UPDATE effort SET index_dirty = 0 WHERE id = ${integer(row, "id")}`;
    written.push(writeIndex(cairn, text(row, "slug")));
  }

  return written;
}
