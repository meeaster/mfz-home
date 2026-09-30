// The JSON the UI server returns. Types only, so the browser app can import them without pulling in Node code.

export type EffortStatus = "provisional" | "active" | "paused" | "done" | "archived";

export type ArtifactItem = {
  readonly path: string;
  readonly display_path: string;
  readonly location: "managed" | "external" | "url";
  readonly category: string | null;
  readonly pointer_type: string | null;
  readonly title: string | null;
  readonly description: string | null;
  readonly status: string;
  readonly producer: { readonly session: string; readonly title: string | null } | null;
  readonly efforts: readonly string[];
  readonly captured_at: string;
  readonly written_up_in: readonly { readonly title: string | null; readonly path: string }[];
};

export type ArtifactGroupItem = {
  readonly group: string;
  readonly artifacts: readonly ArtifactItem[];
};

export type EffortListItem = {
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly status: EffortStatus;
  readonly tags: readonly string[];
  readonly session_count: number;
  readonly artifact_count: number;
  readonly last_activity_at: string;
};

export type SidebarData = {
  // The root folder, with the home folder shown as ~.
  readonly root: string;
  readonly last_backup: string | null;
  readonly counts: {
    readonly efforts: number;
    readonly sessions: number;
    readonly knowledge: number;
    readonly designs: number;
    readonly sources: number;
  };
  // Efforts grouped by their initiative: tag, then the ones without one.
  readonly initiatives: readonly { readonly initiative: string | null; readonly efforts: readonly EffortListItem[] }[];
};

export type EffortPage = EffortListItem & {
  readonly folder: string;
  readonly created_at: string;
  readonly summary: string | null;
  readonly records: readonly { readonly name: string; readonly path: string; readonly approx_tokens: number }[];
  readonly links: readonly {
    readonly relation: "depends_on" | "needed_by" | "split_from" | "split_into" | "related";
    readonly slug: string;
    readonly title: string;
    readonly status: EffortStatus;
    readonly summary: string | null;
  }[];
  readonly sessions: readonly SessionListItem[];
  readonly groups: readonly ArtifactGroupItem[];
};

export type SessionListItem = {
  readonly key: string;
  readonly harness: string;
  readonly title: string | null;
  readonly description: string | null;
  readonly agent: string | null;
  readonly cwd: string | null;
  readonly parent: string | null;
  readonly efforts: readonly string[];
  readonly file_count: number;
  readonly child_count: number;
  readonly started_at: string;
  readonly last_activity_at: string;
};

export type SessionPage = SessionListItem & {
  readonly folder: string;
  readonly workstream: string | null;
  readonly subject: string | null;
  readonly root: string;
  readonly conversation: string | null;
  readonly attachments: readonly { readonly slug: string; readonly title: string; readonly attached_at: string; readonly attached_by: string }[];
  // The session and each session under it, with the files each produced.
  readonly tree: readonly { readonly session: SessionListItem; readonly depth: number; readonly files: readonly ArtifactItem[] }[];
  readonly reads: readonly ArtifactItem[];
};

export type KnowledgeItem = ArtifactItem & {
  readonly informed_by: number;
  readonly updated_at: string;
};

export type DesignItem = {
  readonly slug: string;
  readonly title: string;
  readonly summary: string | null;
  readonly folder: string;
  readonly design_path: string;
  readonly efforts: readonly string[];
  readonly decisions: { readonly total: number; readonly decided: number };
  readonly open_questions: number;
  // Questions put off on someone's word; they wait on nothing, so they aren't open.
  readonly deferred_questions: number;
  // Whether the built doc includes every change in changes.md.
  readonly published: { readonly state: "current" } | { readonly state: "behind"; readonly changes: number } | { readonly state: "unpublished" };
  // Where the UI serves the built doc, or null until it's built.
  readonly doc_url: string | null;
  readonly updated_at: string;
};

export type SourceKind = "meeting" | "email" | "chat" | "tickets" | (string & {});

export type SourceItem = {
  readonly kind: SourceKind;
  readonly title: string;
  readonly description: string | null;
  readonly path: string;
  readonly display_path: string;
  readonly date: string;
  readonly efforts: readonly string[];
  readonly intake:
    | { readonly state: "not_reviewed" }
    | { readonly state: "outcomes"; readonly accepted: number; readonly deferred: number; readonly rejected: number }
    | { readonly state: "reviewed_through"; readonly through: string; readonly newer: number };
};

export type FilePage = {
  readonly path: string;
  readonly display_path: string;
  readonly artifact: ArtifactItem | null;
  readonly size: number;
  readonly content: string | null;
  // Why content is missing: a binary file, one too large to show, or one no longer on disk.
  readonly omitted: "binary" | "too_large" | "missing" | null;
};
