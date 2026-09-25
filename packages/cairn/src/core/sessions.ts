import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  formatSessionKey,
  type LocationInput,
  type SessionContextInput,
  type SessionDescribeInput,
  type SessionKey,
  type SessionStartInput
} from "../schemas.ts";
import { CairnError, insertedId, integer, optionalInteger, optionalText, timestamp, transaction, type Cairn } from "./db.ts";
import { attach, createEffort, detach } from "./efforts.ts";
import { loadEffort, loadSession, type EffortSummary, type SessionSummary } from "./find.ts";
import { requireEffortId, requireSessionId } from "./lookup.ts";
import { effortFolder, storedPath } from "./root.ts";
import { effortView, markSessionDirty } from "./views.ts";

export type SessionDetails = {
  readonly parent?: SessionKey | undefined;
  readonly cwd?: string | undefined;
  readonly agent?: string | undefined;
  readonly title?: string | undefined;
};

export type DescribedSession = {
  readonly session: SessionSummary;
  readonly attached: readonly EffortSummary[];
  readonly close_matches: readonly { readonly requested: string; readonly matches: readonly EffortSummary[] }[];
};

export type SessionContext = {
  readonly session: string;
  readonly note: string;
  readonly efforts: readonly { readonly slug: string; readonly title: string; readonly records: readonly string[] }[];
  readonly coordination: readonly string[];
};

function ancestors(cairn: Cairn, sessionId: number): number[] {
  const ids: number[] = [];

  for (const row of cairn.sql.all`
    WITH RECURSIVE up (id, depth) AS (
      SELECT ${sessionId}, 0
      UNION ALL
      SELECT session.parent_session_id, up.depth + 1 FROM up JOIN session ON session.id = up.id
      WHERE session.parent_session_id IS NOT NULL AND up.depth < 64
    )
    SELECT id FROM up ORDER BY depth
  `) {
    ids.push(integer(row, "id"));
  }

  return ids;
}

function setParent(cairn: Cairn, sessionId: number, parentId: number): void {
  if (ancestors(cairn, parentId).includes(sessionId)) {
    throw new CairnError("invalid", "A session can't be its own ancestor");
  }

  const parent = cairn.sql.get`SELECT root_session_id FROM session WHERE id = ${parentId}`;
  const rootId = parent === undefined ? parentId : (optionalInteger(parent, "root_session_id") ?? parentId);

  cairn.sql.run`UPDATE session SET parent_session_id = ${parentId} WHERE id = ${sessionId}`;
  cairn.sql.run`
    WITH RECURSIVE tree (id) AS (
      SELECT ${sessionId} UNION SELECT session.id FROM session JOIN tree ON session.parent_session_id = tree.id
    )
    UPDATE session SET root_session_id = ${rootId} WHERE id IN (SELECT id FROM tree)
  `;
}

// Registration is an idempotent upsert, because a harness's start event can be missed.
export function ensureSession(cairn: Cairn, key: SessionKey, details: SessionDetails): number {
  return transaction(cairn, () => {
    const now = timestamp(cairn);

    const existing = cairn.sql.get`
      SELECT id, parent_session_id FROM session WHERE harness = ${key.harness} AND native_id = ${key.nativeId}
    `;

    let sessionId: number;

    if (existing === undefined) {
      sessionId = insertedId(cairn.sql.run`
        INSERT INTO session (harness, native_id, cwd, agent, title, started_at, last_activity_at)
        VALUES (${key.harness}, ${key.nativeId}, ${details.cwd ?? null}, ${details.agent ?? null},
          ${details.title ?? null}, ${now}, ${now})
      `);
      cairn.sql.run`UPDATE session SET root_session_id = id WHERE id = ${sessionId}`;
    } else {
      sessionId = integer(existing, "id");
      cairn.sql.run`
        UPDATE session SET last_activity_at = ${now},
          cwd = COALESCE(cwd, ${details.cwd ?? null}),
          agent = COALESCE(agent, ${details.agent ?? null}),
          title = COALESCE(title, ${details.title ?? null})
        WHERE id = ${sessionId}
      `;
    }

    if (details.parent !== undefined) {
      const parentId = ensureSession(cairn, details.parent, {});
      const currentParent = existing === undefined ? null : optionalInteger(existing, "parent_session_id");

      if (parentId === sessionId) {
        throw new CairnError("invalid", "A session can't be its own parent");
      }

      if (currentParent !== parentId) {
        setParent(cairn, sessionId, parentId);
      }
    }

    return sessionId;
  });
}

export function startSession(cairn: Cairn, input: SessionStartInput): SessionSummary {
  const sessionId = ensureSession(cairn, input.session, input);

  return loadSession(cairn, sessionId);
}

export function describeSession(cairn: Cairn, input: SessionDescribeInput): DescribedSession {
  return transaction(cairn, () => {
    const sessionId = ensureSession(cairn, input.session, {});
    const actor = formatSessionKey(input.session);
    const attached: EffortSummary[] = [];
    const closeMatches: { requested: string; matches: EffortSummary[] }[] = [];

    cairn.sql.run`
      UPDATE session SET
        title = COALESCE(${input.title ?? null}, title),
        description = COALESCE(${input.description ?? null}, description),
        workstream = COALESCE(${input.workstream ?? null}, workstream),
        subject = COALESCE(${input.subject ?? null}, subject)
      WHERE id = ${sessionId}
    `;

    for (const item of input.attach) {
      if (item.kind === "existing") {
        const effortId = requireEffortId(cairn, item.slug);

        attach(cairn, sessionId, effortId, actor);
        attached.push(loadEffort(cairn, effortId));
        continue;
      }

      const created = createEffort(cairn, item.draft, item.confirmNew);

      if (created.effort === null) {
        closeMatches.push({ requested: item.draft.title, matches: [...created.close_matches] });
        continue;
      }

      attach(cairn, sessionId, requireEffortId(cairn, created.effort.slug), actor);
      attached.push(created.effort);
    }

    for (const slug of input.detach) {
      detach(cairn, sessionId, requireEffortId(cairn, slug));
    }

    markSessionDirty(cairn, sessionId);

    return { session: loadSession(cairn, sessionId), attached, close_matches: closeMatches };
  });
}

// A child session works for the efforts of its nearest attached ancestor.
export function workingEfforts(cairn: Cairn, sessionId: number): number[] {
  for (const id of ancestors(cairn, sessionId)) {
    const efforts: number[] = [];

    for (const row of cairn.sql.all`SELECT effort_id FROM attachment WHERE session_id = ${id} ORDER BY attached_at`) {
      efforts.push(integer(row, "effort_id"));
    }

    if (efforts.length > 0) {
      return efforts;
    }
  }

  return [];
}

function nearestWorkstream(cairn: Cairn, sessionId: number): string | null {
  for (const id of ancestors(cairn, sessionId)) {
    const row = cairn.sql.get`SELECT workstream FROM session WHERE id = ${id}`;
    const workstream = row === undefined ? null : optionalText(row, "workstream");

    if (workstream !== null) {
      return workstream;
    }
  }

  return null;
}

export function sessionContext(cairn: Cairn, input: SessionContextInput): SessionContext {
  const sessionId = requireSessionId(cairn, input.session);
  const session = loadSession(cairn, sessionId);
  const efforts: { slug: string; title: string; records: string[] }[] = [];
  const lines = [`This session's catalog ID is ${session.key}.`];
  const linked = new Map<string, string>();

  for (const effortId of workingEfforts(cairn, sessionId)) {
    const view = effortView(cairn, loadEffort(cairn, effortId).slug);
    const recordPaths = view.records.map((record) => record.path);

    efforts.push({ slug: view.slug, title: view.title, records: recordPaths });

    for (const link of view.links) {
      linked.set(link.slug, `${link.title} (${view.slug} ${link.relation.replace("_", " ")} ${link.slug})`);
    }
  }

  if (efforts.length === 0) {
    lines.push("This session is not attached to an effort.");
  } else {
    lines.push("Attached efforts:");

    for (const effort of efforts) {
      const records =
        effort.records.length === 0
          ? `no records yet; its folder is ${effortFolder(cairn.root, effort.slug)}`
          : effort.records.join(", ");

      lines.push(`- ${effort.title} (${effort.slug}): ${records}`);
    }
  }

  for (const effort of efforts) {
    linked.delete(effort.slug);
  }

  if (linked.size > 0) {
    lines.push(`Linked efforts, read by summary: ${[...linked.values()].join("; ")}.`);
  }

  const coordination: string[] = [];
  const workstream = nearestWorkstream(cairn, sessionId);
  const candidates = [join(session.folder, "coordination.md")];

  if (workstream !== null) {
    candidates.push(join(session.folder, workstream, "coordination.md"));
  }

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      coordination.push(candidate);
      lines.push(`Coordination record: ${candidate}.`);
    }
  }

  return { session: session.key, note: lines.join("\n"), efforts, coordination };
}

type TopicFile = {
  readonly base: string;
  readonly extension: string;
};

export type WritePath = {
  readonly path: string;
};

function topicFileName(topic: string): TopicFile {
  const match = /^(.*?)(\.[A-Za-z0-9]{1,8})$/.exec(topic.trim());
  const stem = match?.[1] ?? topic;
  const extension = match?.[2]?.toLowerCase() ?? ".md";

  const base = stem
    .normalize("NFKD")
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "")
    .slice(0, 80);

  return { base: base === "" ? "output" : base, extension };
}

// A path nobody has written, recorded, or been handed yet, in the effort's folder or the session tree's folder.
// The grant credits the session with a file written there that no capture records.
export function location(cairn: Cairn, input: LocationInput): WritePath {
  return transaction(cairn, () => {
    const sessionId = ensureSession(cairn, input.session, {});
    const session = loadSession(cairn, sessionId);
    let folder: string;

    if (input.effort === undefined) {
      const workstream = nearestWorkstream(cairn, sessionId);

      folder = workstream === null ? session.folder : join(session.folder, workstream);
    } else {
      requireEffortId(cairn, input.effort);
      folder = effortFolder(cairn.root, input.effort);
    }

    mkdirSync(folder, { recursive: true });

    const { base, extension } = topicFileName(input.topic);

    for (let suffix = 1; ; suffix += 1) {
      const path = join(folder, suffix === 1 ? `${base}${extension}` : `${base}-${suffix}${extension}`);
      const stored = storedPath(cairn.root, path).stored;

      const taken = cairn.sql.get`
        SELECT 1 AS found FROM artifact WHERE path_or_url = ${stored}
        UNION ALL SELECT 1 FROM location_grant WHERE path = ${stored}
      `;

      if (!existsSync(path) && taken === undefined) {
        cairn.sql.run`INSERT INTO location_grant (path, session_id, granted_at) VALUES (${stored}, ${sessionId}, ${timestamp(cairn)})`;

        return { path };
      }
    }
  });
}

