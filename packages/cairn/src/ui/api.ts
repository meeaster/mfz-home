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
    readonly designs: number;
    // Jira items and Confluence pages registered across the efforts.
    readonly links: number;
    readonly sessions: number;
    readonly knowledge: number;
    readonly sources: number;
    readonly origins: number;
  };
  // Every effort's title by slug, for naming efforts wherever a page lists them.
  readonly efforts: readonly { readonly slug: string; readonly title: string }[];
};

// Whether the work created a page or ticket (category deliverable) or relies on someone else's (source).
export type LinkRole = "created" | "referenced" | null;

// A plan deliverable a Jira item delivers, worked out from the design whose plan links the item or its epic.
export type DeliverableRef = {
  readonly design: string;
  readonly design_title: string;
  readonly id: string;
  readonly title: string;
};

// A Jira item as an agent last read it. Jira owns these facts; read_at says when they held.
export type JiraItem = {
  readonly url: string;
  readonly key: string;
  readonly title: string | null;
  readonly description: string | null;
  readonly type: string | null;
  readonly status: string | null;
  readonly category: "todo" | "progress" | "done" | null;
  readonly parent: string | null;
  readonly blocks: readonly string[];
  readonly read_at: string | null;
  readonly role: LinkRole;
  readonly efforts: readonly string[];
  readonly delivers: DeliverableRef | null;
};

// A Confluence page, pull request or other page registered as a link.
export type PageLink = {
  readonly url: string;
  readonly title: string | null;
  readonly description: string | null;
  readonly pointer_type: string | null;
  readonly role: LinkRole;
  readonly space: string | null;
  readonly version: number | null;
  readonly updated: string | null;
  readonly efforts: readonly string[];
};

// A design an effort delivers part of, with where its plan stands.
export type DeliveredDesign = {
  readonly slug: string;
  readonly title: string;
  readonly doc_url: string | null;
  // The design's deliverables whose Jira items the effort includes.
  readonly deliverables: readonly { readonly id: string; readonly title: string; readonly status: string }[];
  readonly plan: { readonly total: number; readonly done: number; readonly in_progress: number };
};

export type EffortWork = {
  readonly designs: readonly DeliveredDesign[];
  readonly jira: readonly JiraItem[];
  readonly confluence: readonly PageLink[];
  readonly other: readonly PageLink[];
};

// Every registered Jira item and Confluence page, across efforts.
export type LinksPage = {
  readonly efforts: readonly { readonly slug: string; readonly title: string }[];
  readonly jira: readonly JiraItem[];
  readonly confluence: readonly PageLink[];
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
  readonly work: EffortWork;
};

// What a session cost at models.dev rates. total is own plus subagents plus cli_runs: its main agent, every
// session under it, and every CLI run it started, with theirs. unpriced_calls went to models without a price.
export type SessionCost = {
  readonly total: number;
  readonly own: number;
  readonly subagents: number;
  readonly cli_runs: number;
  readonly unpriced_calls: number;
};

export type SessionListItem = {
  readonly key: string;
  readonly harness: string;
  readonly title: string | null;
  readonly description: string | null;
  readonly agent: string | null;
  readonly cwd: string | null;
  readonly parent: string | null;
  // interactive for a person's session, cli for a headless run such as claude -p, null when unknown.
  readonly origin: "interactive" | "cli" | null;
  // The session whose shell started this one, when it was a CLI run.
  readonly spawned_by: { readonly key: string; readonly title: string | null } | null;
  readonly efforts: readonly string[];
  readonly file_count: number;
  readonly child_count: number;
  // Null until an export has recorded usage for the session or anything it reaches.
  readonly cost: SessionCost | null;
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
  // CLI runs this session's shell started, which keep their own files and efforts.
  readonly spawned: readonly SessionListItem[];
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
  // Proposals from its meetings still waiting for the user to accept, change, defer or reject them.
  readonly proposals_to_review: number;
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

// How to reach an origin from here: a tool and what it needs, such as an AWS CLI profile.
export type OriginAccess = {
  readonly method: string;
  readonly detail: string;
};

// A system knowledge comes from, keyed <kind>:<identifier>, with how many articles and references rest on it.
export type OriginItem = {
  readonly key: string;
  readonly kind: string;
  readonly identifier: string;
  readonly title: string;
  readonly description: string;
  readonly access: readonly OriginAccess[];
  readonly articles: number;
  readonly references: number;
};

// A kind of origin, and what its identifiers are.
export type OriginKindItem = {
  readonly name: string;
  readonly identifier: string;
  readonly description: string;
  readonly origins: number;
};

export type OriginsPage = {
  readonly kinds: readonly OriginKindItem[];
  readonly origins: readonly OriginItem[];
};

// What an article looked at inside an origin. observed_at and version describe one look; sections empty means the
// whole article.
export type ReferenceItem = {
  readonly origin: string;
  readonly locator: string;
  readonly title: string;
  readonly sections: readonly string[];
  readonly observed_at: string;
  readonly version: string | null;
};

// A knowledge article with its content and its references, oldest observed first.
export type ArticlePage = {
  readonly article: KnowledgeItem;
  readonly file: FilePage;
  readonly references: readonly ReferenceItem[];
  readonly origins: readonly OriginItem[];
};
