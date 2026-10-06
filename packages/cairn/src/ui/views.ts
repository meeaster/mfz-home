import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, resolve, sep } from "node:path";
import { CairnError, integer, text, type Cairn } from "../core/db.ts";
import {
  artifactGroup,
  findEfforts,
  groupArtifacts,
  groupOrder,
  likePattern,
  loadArtifacts,
  loadSession,
  type ArtifactEntry,
  type EffortSummary
} from "../core/find.ts";
import { findArtifactId, findSessionId, requireSessionId } from "../core/lookup.ts";
import { relativeInsideRoot } from "../core/root.ts";
import { articlesInformed, effortView, knowledgeArticles, type ArticleReference } from "../core/views.ts";
import * as schemas from "../schemas.ts";
import { sessionCost } from "../usage/rollup.ts";
import type {
  ArtifactItem,
  DesignItem,
  EffortListItem,
  EffortPage,
  FilePage,
  KnowledgeItem,
  SessionListItem,
  SessionPage,
  SidebarData,
  SourceItem
} from "./api.ts";
import { countChanges, type DesignStats, designStats, docSlug, jsonDesignStats, meetingIntake, publishedMark, threadState } from "./records.ts";

// Files larger than this are listed but not shown in the viewer.
const viewerLimit = 2 * 1024 * 1024;

function displayPath(cairn: Cairn, entry: ArtifactEntry): string {
  return entry.location === "managed" ? (relativeInsideRoot(cairn.root, entry.path) ?? entry.path) : entry.path;
}

function artifactItem(cairn: Cairn, entry: ArtifactEntry, writtenUp: readonly ArticleReference[] = []): ArtifactItem {
  return {
    path: entry.path,
    display_path: displayPath(cairn, entry),
    location: entry.location,
    category: entry.category,
    pointer_type: entry.pointer_type,
    title: entry.title,
    description: entry.description,
    status: entry.status,
    producer: entry.producer,
    efforts: entry.efforts,
    captured_at: entry.captured_at,
    written_up_in: writtenUp
  };
}

// Artifacts by id, each with the knowledge articles it informs.
function artifactItems(cairn: Cairn, ids: readonly number[]): ArtifactItem[] {
  const writtenUp = articlesInformed(cairn, ids);

  return loadArtifacts(cairn, ids).map((entry) => artifactItem(cairn, entry, writtenUp.get(entry.path) ?? []));
}

function effortListItem(effort: EffortSummary): EffortListItem {
  return { ...effort };
}

export function effortList(cairn: Cairn): EffortListItem[] {
  return findEfforts(cairn, schemas.findInput.parse({ target: "efforts", limit: 500 })).map(effortListItem);
}

function sessionTitle(cairn: Cairn, key: string): string | null {
  return loadSession(cairn, requireSessionId(cairn, schemas.sessionKey.parse(key))).title;
}

function sessionListItem(cairn: Cairn, id: number): SessionListItem {
  const session = loadSession(cairn, id);

  const counts = cairn.sql.get`
    WITH RECURSIVE tree (id) AS (
      SELECT ${id} UNION SELECT session.id FROM session JOIN tree ON session.parent_session_id = tree.id
    )
    SELECT (SELECT count(*) FROM tree) - 1 AS child_count,
      (SELECT count(*) FROM artifact WHERE artifact.status != 'archived'
        AND artifact.producer_session_id IN (SELECT id FROM tree)) AS file_count
  `;

  return {
    key: session.key,
    harness: session.key.slice(0, session.key.indexOf(":")),
    title: session.title,
    description: session.description,
    agent: session.agent,
    cwd: session.cwd,
    parent: session.parent,
    origin: session.origin,
    spawned_by: session.spawned_by === null ? null : { key: session.spawned_by, title: sessionTitle(cairn, session.spawned_by) },
    efforts: session.efforts,
    file_count: counts === undefined ? 0 : integer(counts, "file_count"),
    child_count: counts === undefined ? 0 : integer(counts, "child_count"),
    cost: sessionCost(cairn, id),
    started_at: session.started_at,
    last_activity_at: session.last_activity_at
  };
}

// Root sessions, most recently active first. Child sessions appear on their root's page.
export function sessionList(cairn: Cairn): SessionListItem[] {
  const items: SessionListItem[] = [];

  for (const row of cairn.sql.all`
    SELECT id FROM session WHERE parent_session_id IS NULL ORDER BY last_activity_at DESC, id DESC LIMIT 500
  `) {
    items.push(sessionListItem(cairn, integer(row, "id")));
  }

  return items;
}

function latestBackup(cairn: Cairn): string | null {
  const folder = join(cairn.root, "backups");

  if (!existsSync(folder)) {
    return null;
  }

  const dates = readdirSync(folder)
    .map((name) => /^catalog-(\d{4}-\d{2}-\d{2})\.db$/.exec(name)?.[1])
    .filter((date) => date !== undefined)
    .sort();

  return dates.at(-1) ?? null;
}

export function sidebar(cairn: Cairn): SidebarData {
  const efforts = effortList(cairn);
  const byInitiative = new Map<string | null, EffortListItem[]>();

  for (const effort of efforts) {
    const initiatives = effort.tags.filter((tag) => tag.startsWith("initiative:"));

    for (const initiative of initiatives.length === 0 ? [null] : initiatives) {
      const members = byInitiative.get(initiative) ?? [];

      members.push(effort);
      byInitiative.set(initiative, members);
    }
  }

  const initiatives = [...byInitiative.entries()]
    .sort(([left], [right]) => (left === null ? 1 : right === null ? -1 : left.localeCompare(right)))
    .map(([initiative, members]) => ({ initiative, efforts: members.sort((a, b) => a.title.localeCompare(b.title)) }));

  const roots = cairn.sql.get`SELECT count(*) AS count FROM session WHERE parent_session_id IS NULL`;

  const home = homedir();

  return {
    root: cairn.root.startsWith(`${home}/`) ? `~${cairn.root.slice(home.length)}` : cairn.root,
    last_backup: latestBackup(cairn),
    counts: {
      efforts: efforts.length,
      sessions: roots === undefined ? 0 : integer(roots, "count"),
      knowledge: knowledgeArticles(cairn).length,
      designs: designList(cairn).length,
      sources: sourceList(cairn).length
    },
    initiatives
  };
}

export function effortPage(cairn: Cairn, slug: string): EffortPage {
  const view = effortView(cairn, schemas.slug.parse(slug));
  const created = cairn.sql.get`SELECT created_at FROM effort WHERE slug = ${view.slug}`;

  const groups = groupArtifacts(view.artifacts, artifactGroup, groupOrder).map((group) => ({
    group: group.group,
    artifacts: group.artifacts.map((entry) => artifactItem(cairn, entry, entry.written_up_in))
  }));

  const sessions: SessionListItem[] = [];

  for (const session of view.sessions) {
    const id = findSessionId(cairn, schemas.sessionKey.parse(session.key));

    if (id !== undefined) {
      sessions.push(sessionListItem(cairn, id));
    }
  }

  return {
    slug: view.slug,
    title: view.title,
    description: view.description,
    status: view.status,
    tags: view.tags,
    session_count: view.session_count,
    artifact_count: view.artifact_count,
    last_activity_at: view.last_activity_at,
    folder: view.folder,
    created_at: created === undefined ? view.last_activity_at : text(created, "created_at"),
    summary: view.summary,
    records: view.records,
    links: view.links,
    sessions,
    groups
  };
}

export function sessionPage(cairn: Cairn, key: string): SessionPage {
  const id = requireSessionId(cairn, schemas.sessionKey.parse(key));
  const session = loadSession(cairn, id);
  const tree: SessionPage["tree"][number][] = [];

  for (const row of cairn.sql.all`
    WITH RECURSIVE tree (id, depth) AS (
      SELECT ${id}, 0 UNION ALL
      SELECT session.id, tree.depth + 1 FROM session JOIN tree ON session.parent_session_id = tree.id WHERE tree.depth < 64
    )
    SELECT tree.id, tree.depth FROM tree JOIN session ON session.id = tree.id ORDER BY tree.depth > 0, session.started_at, session.id
  `) {
    const member = integer(row, "id");
    const files: number[] = [];

    for (const file of cairn.sql.all`
      SELECT id FROM artifact WHERE producer_session_id = ${member} AND status != 'archived' ORDER BY captured_at, id
    `) {
      files.push(integer(file, "id"));
    }

    tree.push({ session: sessionListItem(cairn, member), depth: integer(row, "depth"), files: artifactItems(cairn, files) });
  }

  const reads: number[] = [];

  for (const row of cairn.sql.all`
    SELECT DISTINCT link.src_id AS id FROM link
    WHERE link.rel = 'read_in' AND link.src_kind = 'artifact' AND link.dst_kind = 'session' AND link.dst_id = ${id}
    ORDER BY link.created_at
  `) {
    reads.push(integer(row, "id"));
  }

  const spawned: SessionListItem[] = [];

  for (const row of cairn.sql.all`SELECT id FROM session WHERE spawned_by_session_id = ${id} ORDER BY started_at, id`) {
    spawned.push(sessionListItem(cairn, integer(row, "id")));
  }

  const attachments: SessionPage["attachments"][number][] = [];

  for (const row of cairn.sql.all`
    SELECT effort.slug, effort.title, attachment.attached_at, attachment.attached_by
    FROM attachment JOIN effort ON effort.id = attachment.effort_id WHERE attachment.session_id = ${id}
    ORDER BY attachment.attached_at
  `) {
    attachments.push({
      slug: text(row, "slug"),
      title: text(row, "title"),
      attached_at: text(row, "attached_at"),
      attached_by: text(row, "attached_by")
    });
  }

  return {
    ...sessionListItem(cairn, id),
    folder: session.folder,
    workstream: session.workstream,
    subject: session.subject,
    root: session.root,
    conversation: session.conversation,
    attachments,
    tree,
    reads: artifactItems(cairn, reads),
    spawned
  };
}

export function knowledgeList(cairn: Cairn): KnowledgeItem[] {
  return knowledgeArticles(cairn).map((article) => ({
    ...artifactItem(cairn, article),
    informed_by: article.informed_by,
    updated_at: article.updated_at
  }));
}

function readIfPresent(path: string): string | null {
  return existsSync(path) ? readFileSync(path, "utf8") : null;
}

function modifiedAt(paths: readonly string[]): string {
  let latest = 0;

  for (const path of paths) {
    if (existsSync(path)) {
      latest = Math.max(latest, statSync(path).mtimeMs);
    }
  }

  return new Date(latest).toISOString();
}

function subfolders(folder: string): string[] {
  if (!existsSync(folder)) {
    return [];
  }

  return readdirSync(folder, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => entry.name)
    .sort();
}

// The catalog entry for a file, when Cairn has recorded it.
function catalogEntry(cairn: Cairn, path: string): ArtifactEntry | null {
  const id = findArtifactId(cairn, path);

  return id === undefined ? null : (loadArtifacts(cairn, [id])[0] ?? null);
}

// The efforts of every recorded file under a folder, for material that spans several files.
function folderEfforts(cairn: Cairn, folder: string): string[] {
  const inside = relativeInsideRoot(cairn.root, folder);

  if (inside === null) {
    return [];
  }

  const slugs = new Set<string>();

  for (const row of cairn.sql.all`
    SELECT DISTINCT effort.slug FROM artifact
    JOIN artifact_effort ON artifact_effort.artifact_id = artifact.id
    JOIN effort ON effort.id = artifact_effort.effort_id
    WHERE artifact.location = 'managed' AND artifact.path_or_url LIKE ${`${likePattern(inside).slice(1, -1)}/%`} ESCAPE '\\'
    ORDER BY effort.slug
  `) {
    slugs.add(text(row, "slug"));
  }

  return [...slugs];
}

// A design's built doc, designs/<name>/published/<slug>.html, or null when it isn't built. The name comes from a URL,
// so it must be one folder under designs/, and the slug from doc.html must keep the file inside published/.
export function builtDoc(root: string, name: string): string | null {
  if (!/^[\w.-]+$/.test(name) || name.startsWith(".")) {
    return null;
  }

  const folder = join(root, "designs", name);
  const published = join(folder, "published");
  const path = resolve(published, `${docSlug(readIfPresent(join(folder, "doc.html")), name)}.html`);

  return path.startsWith(`${published}${sep}`) && existsSync(path) ? path : null;
}

// A design's records: design.json (format 3), or design.md for one not yet migrated.
function designStatsOf(folder: string): { readonly path: string; readonly stats: DesignStats } | null {
  const jsonPath = join(folder, "design.json");
  const json = readIfPresent(jsonPath);

  if (json !== null) {
    return { path: jsonPath, stats: jsonDesignStats(json, readIfPresent(join(folder, "meetings.json"))) };
  }

  const markdownPath = join(folder, "design.md");
  const markdown = readIfPresent(markdownPath);

  return markdown === null ? null : { path: markdownPath, stats: designStats(markdown) };
}

function designItem(cairn: Cairn, folder: string): DesignItem | null {
  const found = designStatsOf(folder);

  if (found === null) {
    return null;
  }

  const { path: designPath, stats } = found;
  const changesPath = join(folder, "changes.md");
  const changes = countChanges(readIfPresent(changesPath) ?? "");
  const doc = builtDoc(cairn.root, basename(folder));
  const built = doc === null ? null : readFileSync(doc, "utf8");
  const included = built === null ? null : (publishedMark(built) ?? 0);
  const entry = catalogEntry(cairn, designPath);

  return {
    slug: basename(folder),
    title: stats.title ?? basename(folder),
    summary: stats.summary ?? entry?.description ?? null,
    folder,
    design_path: designPath,
    efforts: entry?.efforts ?? [],
    decisions: stats.decisions,
    open_questions: stats.open_questions,
    deferred_questions: stats.deferred_questions,
    proposals_to_review: stats.proposals_to_review,
    published:
      included === null
        ? { state: "unpublished" }
        : changes > included
          ? { state: "behind", changes: changes - included }
          : { state: "current" },
    doc_url: doc === null ? null : `/docs/${encodeURIComponent(basename(folder))}/`,
    updated_at: modifiedAt([designPath, join(folder, "evidence.json"), join(folder, "meetings.json"), changesPath])
  };
}

export function designList(cairn: Cairn): DesignItem[] {
  const folder = join(cairn.root, "designs");
  const designs: DesignItem[] = [];

  for (const name of subfolders(folder)) {
    const design = designItem(cairn, join(folder, name));

    if (design !== null) {
      designs.push(design);
    }
  }

  return designs;
}

function humanize(name: string): string {
  const words = name.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/\.md$/, "").replaceAll("-", " ");

  return words.charAt(0).toUpperCase() + words.slice(1);
}

function meetingItem(cairn: Cairn, folder: string): SourceItem {
  const name = basename(folder);
  const summaryPath = join(folder, "summary.md");
  const summary = readIfPresent(summaryPath);
  const entry = summary === null ? null : catalogEntry(cairn, summaryPath);
  const heading = summary === null ? null : /^# (.+?)\s*$/m.exec(summary)?.[1];

  // The viewer opens the summary, or before one is written, whichever transcript there is.
  const shown = [summaryPath, join(folder, "transcript.md"), join(folder, "transcript-raw.md")].find((path) => existsSync(path)) ?? folder;

  return {
    kind: "meeting",
    title: entry?.title ?? heading ?? humanize(name),
    description: entry?.description ?? null,
    path: shown,
    display_path: `${relativeInsideRoot(cairn.root, folder) ?? folder}/`,
    date: /^\d{4}-\d{2}-\d{2}/.exec(name)?.[0] ?? modifiedAt([folder]).slice(0, 10),
    efforts: folderEfforts(cairn, folder),
    intake: summary === null ? { state: "not_reviewed" } : meetingIntake(summary)
  };
}

function threadItem(cairn: Cairn, kind: string, path: string): SourceItem {
  const content = readFileSync(path, "utf8");
  const state = threadState(content);
  const entry = catalogEntry(cairn, path);

  return {
    kind,
    title: entry?.title ?? state.title ?? humanize(basename(path)),
    description: entry?.description ?? null,
    path,
    display_path: relativeInsideRoot(cairn.root, path) ?? path,
    date: state.last_message ?? modifiedAt([path]).slice(0, 10),
    efforts: entry?.efforts ?? [],
    intake: state.intake
  };
}

// Meetings are folders under sources/meetings/; every other kind is one Markdown file per thread.
export function sourceList(cairn: Cairn): SourceItem[] {
  const sources = join(cairn.root, "sources");
  const items: SourceItem[] = [];

  for (const kind of subfolders(sources)) {
    const folder = join(sources, kind);

    if (kind === "meetings") {
      for (const meeting of subfolders(folder)) {
        items.push(meetingItem(cairn, join(folder, meeting)));
      }

      continue;
    }

    for (const file of readdirSync(folder, { withFileTypes: true })) {
      if (file.isFile() && file.name.endsWith(".md")) {
        items.push(threadItem(cairn, kind, join(folder, file.name)));
      }
    }
  }

  return items.sort((left, right) => right.date.localeCompare(left.date) || left.title.localeCompare(right.title));
}

// The folder to open for a path: a folder under the root as it is, or the folder holding a file the viewer may show.
export function folderToOpen(cairn: Cairn, requested: string): string {
  const path = resolve(requested);

  if (existsSync(path) && statSync(path).isDirectory()) {
    const root = realpathSync(cairn.root);
    const real = realpathSync(path);

    if (real !== root && relativeInsideRoot(root, real) === null) {
      throw new CairnError("not_found", `No folder at ${requested}`);
    }

    return path;
  }

  return dirname(filePage(cairn, path).path);
}

// The viewer shows files under the root, and outside it only files the catalog records.
export function filePage(cairn: Cairn, requested: string): FilePage {
  const path = resolve(requested);
  const id = findArtifactId(cairn, path);
  const artifact = id === undefined ? null : (artifactItems(cairn, [id])[0] ?? null);

  if (!existsSync(path)) {
    if (artifact === null) {
      throw new CairnError("not_found", `No file at ${requested}`);
    }

    return { path, display_path: artifact.display_path, artifact, size: 0, content: null, omitted: "missing" };
  }

  const real = realpathSync(path);

  if (artifact === null && relativeInsideRoot(realpathSync(cairn.root), real) === null) {
    throw new CairnError("not_found", `No file at ${requested}`);
  }

  const stats = statSync(real);

  if (!stats.isFile()) {
    throw new CairnError("invalid", `${requested} is not a file`);
  }

  const size = stats.size;
  const shown = { path, display_path: relativeInsideRoot(cairn.root, path) ?? path, artifact, size };

  if (size > viewerLimit) {
    return { ...shown, content: null, omitted: "too_large" };
  }

  const bytes = readFileSync(real);

  if (bytes.subarray(0, 8192).includes(0)) {
    return { ...shown, content: null, omitted: "binary" };
  }

  return { ...shown, content: bytes.toString("utf8"), omitted: null };
}
