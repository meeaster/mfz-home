import { isAbsolute } from "node:path";
import { z } from "zod";

export const categories = ["evidence", "source", "synthesis", "knowledge", "deliverable", "record", "conversation", "learning", "other"] as const;

export const pointerTypes = ["pull_request", "issue", "jira_issue", "confluence_page", "url"] as const;

export const artifactStatuses = ["undescribed", "active", "superseded", "missing", "archived"] as const;

export const effortStatuses = ["provisional", "active", "paused", "done", "archived"] as const;

export const artifactRelations = ["informs", "supersedes", "related"] as const;

export const effortRelations = ["depends_on", "split_from", "related"] as const;

export type Category = (typeof categories)[number];

export type PointerType = (typeof pointerTypes)[number];

export type ArtifactStatus = (typeof artifactStatuses)[number];

export type EffortStatus = (typeof effortStatuses)[number];

export type ArtifactRelation = (typeof artifactRelations)[number];

export type EffortRelation = (typeof effortRelations)[number];

// The results Cairn prints or returns as JSON.
export type Json = string | number | boolean | null | readonly Json[] | { readonly [key: string]: Json };

export type SessionKey = {
  readonly harness: string;
  readonly nativeId: string;
};

export function formatSessionKey(key: SessionKey): string {
  return `${key.harness}:${key.nativeId}`;
}

export const sessionKey = z
  .string()
  .regex(/^[a-z][a-z0-9-]*:\S+$/, "Expected <harness>:<native-id>")
  .transform((value): SessionKey => {
    const separator = value.indexOf(":");

    return { harness: value.slice(0, separator), nativeId: value.slice(separator + 1) };
  });

export const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Expected a lowercase slug such as logs-archived-to-s3");

export const tag = z.string().regex(/^[a-z][a-z0-9-]*:\S+$/, "Expected <namespace>:<value>");

export const workstreamKey = z.string().regex(/^[a-z0-9][a-z0-9._-]*$/, "Expected a lowercase key such as review-pr-123");

export const absolutePath = z.string().refine((value) => isAbsolute(value), "Expected an absolute path");

export const url = z.string().regex(/^[a-z][a-z0-9+.-]*:\/\/\S+$/i, "Expected a URL");

// An artifact reference is an absolute path or a URL.
export const artifactReference = z.union([url, absolutePath]);

const optionalText = z.string().min(1).optional();

export const sessionOrigin = z.enum(["interactive", "cli"]);

export const sessionStartInput = z.object({
  session: sessionKey,
  parent: sessionKey.optional(),
  spawned_by: sessionKey.optional(),
  origin: sessionOrigin.optional(),
  cwd: absolutePath.optional(),
  agent: optionalText,
  title: optionalText
});

export const effortDraft = z.object({
  title: z.string().min(1),
  description: z.string().default(""),
  tags: z.array(tag).default([]),
  slug: slug.optional(),
  provisional: z.boolean().default(false)
});

// Either an existing effort's slug or a new effort to create; parsed into a tagged form.
export const attachItem = z.union([
  slug.transform((value) => ({ kind: "existing" as const, slug: value })),
  z
    .object({
      create: effortDraft,
      confirm_new: z.boolean().default(false)
    })
    .transform((value) => ({ kind: "create" as const, draft: value.create, confirmNew: value.confirm_new }))
]);

export const sessionDescribeInput = z.object({
  session: sessionKey,
  title: optionalText,
  description: optionalText,
  attach: z.array(attachItem).default([]),
  detach: z.array(slug).default([]),
  workstream: workstreamKey.optional(),
  subject: optionalText
});

export const sessionContextInput = z.object({
  session: sessionKey
});

export const fileEventInput = z.object({
  path: absolutePath,
  session: sessionKey
});

export const issueKey = z.string().regex(/^[A-Z][A-Z0-9_]*-\d+$/, "Expected a Jira key such as OBS-220");

// What an agent read about a Jira item, for a url whose pointer type is jira_issue.
export const jiraDetails = z.object({
  key: issueKey,
  type: optionalText,
  status: optionalText,
  category: z.enum(["todo", "progress", "done"]).optional(),
  parent: issueKey.optional(),
  blocks: z.array(issueKey).default([]),
  read_at: optionalText
});

// What an agent read about a Confluence page, for a url whose pointer type is confluence_page.
export const confluenceDetails = z.object({
  space: optionalText,
  version: z.number().int().positive().optional(),
  updated: optionalText,
  read_at: optionalText
});

export const describeInput = z
  .object({
    path: absolutePath.optional(),
    url: url.optional(),
    category: z.enum(categories).optional(),
    title: optionalText,
    description: optionalText,
    origin: optionalText,
    session: sessionKey.optional(),
    efforts: z
      .object({
        include: z.array(slug).default([]),
        exclude: z.array(slug).default([])
      })
      .default({ include: [], exclude: [] }),
    informs: z.array(artifactReference).default([]),
    supersedes: z.array(artifactReference).default([]),
    jira: jiraDetails.optional(),
    confluence: confluenceDetails.optional()
  })
  .refine((input) => (input.path === undefined) !== (input.url === undefined), "Give exactly one of path or url")
  .refine((input) => input.url !== undefined || (input.jira === undefined && input.confluence === undefined), "jira and confluence describe a url");

export const findInput = z.object({
  target: z.enum(["efforts", "sessions", "artifacts"]),
  effort: slug.optional(),
  session: sessionKey.optional(),
  tag: tag.optional(),
  category: z.enum(categories).optional(),
  pointer_type: z.enum(pointerTypes).optional(),
  workstream: workstreamKey.optional(),
  subject: optionalText,
  status: z.enum([...artifactStatuses, ...effortStatuses]).optional(),
  text: optionalText,
  group_by: z.enum(["category", "session"]).optional(),
  limit: z.number().int().positive().max(500).default(50)
});

export const locationInput = z.object({
  session: sessionKey,
  topic: z.string().min(1),
  effort: slug.optional()
});

export const effortInput = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), effort: effortDraft, confirm_new: z.boolean().default(false) }),
  z.object({ action: z.literal("show"), effort: slug }),
  z.object({
    action: z.literal("update"),
    effort: slug,
    title: optionalText,
    description: z.string().optional(),
    status: z.enum(effortStatuses).optional(),
    add_tags: z.array(tag).default([]),
    remove_tags: z.array(tag).default([])
  }),
  z.object({ action: z.literal("rename"), effort: slug, to: slug }),
  z.object({
    action: z.literal("split"),
    effort: slug,
    into: effortDraft,
    sessions: z.array(sessionKey).default([]),
    artifacts: z.array(artifactReference).default([])
  }),
  z.object({ action: z.literal("merge"), effort: slug, into: slug })
]);

export const linkInput = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("artifact"),
    action: z.enum(["add", "remove", "accept", "reject"]),
    src: artifactReference,
    rel: z.enum(artifactRelations),
    dst: artifactReference
  }),
  z.object({
    kind: z.literal("effort"),
    action: z.enum(["add", "remove"]),
    src: slug,
    rel: z.enum(effortRelations),
    dst: slug
  })
]);

export const moveInput = z.object({
  artifact: absolutePath,
  to: absolutePath
});

export type OriginKey = {
  readonly kind: string;
  readonly identifier: string;
};

export function formatOriginKey(key: OriginKey): string {
  return `${key.kind}:${key.identifier}`;
}

// An origin's natural key: its kind's slug and the identifier within that kind, such as aws:4471-0938-2215 or
// docs:docs.datadoghq.com. Only the first colon separates them, so identifiers may hold colons.
export const originKey = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*:\S/, "Expected <kind>:<identifier> such as aws:4471-0938-2215")
  .transform((value): OriginKey => {
    const separator = value.indexOf(":");

    return { kind: value.slice(0, separator), identifier: value.slice(separator + 1).trim() };
  });

// One way to reach an origin from here: a tool, and what it needs, such as an AWS CLI profile. Never a credential.
export const accessMethod = z.object({
  method: z.string().min(1),
  detail: z.string().default("")
});

// What a new kind's identifiers are, so later agents register the same thing the same way.
export const originKindDraft = z.object({
  identifier: z.string().min(1),
  description: z.string().default("")
});

export const originInput = z.discriminatedUnion("action", [
  z.object({ action: z.literal("kinds") }),
  z.object({
    action: z.literal("find"),
    kind: slug.optional(),
    text: optionalText,
    limit: z.number().int().positive().max(500).default(50)
  }),
  z.object({
    action: z.literal("register"),
    origin: originKey,
    title: z.string().min(1),
    description: z.string().default(""),
    access: z.array(accessMethod).default([]),
    new_kind: originKindDraft.optional()
  }),
  z.object({
    action: z.literal("update"),
    origin: originKey,
    title: optionalText,
    description: z.string().optional(),
    add_access: z.array(accessMethod).default([]),
    remove_access: z.array(accessMethod).default([])
  })
]);

export const observedAt = z.union([z.iso.date(), z.iso.datetime({ offset: true })]);

export const referenceInput = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("record"),
    article: absolutePath,
    origin: originKey,
    locator: z.string().min(1),
    title: optionalText,
    sections: z.array(z.string().min(1)).optional(),
    observed_at: observedAt.optional(),
    version: optionalText
  }),
  z.object({
    action: z.literal("list"),
    article: absolutePath.optional(),
    origin: originKey.optional()
  }),
  z.object({
    action: z.literal("remove"),
    article: absolutePath,
    origin: originKey,
    locator: z.string().min(1)
  })
]);

export type SessionOrigin = z.infer<typeof sessionOrigin>;

export type SessionStartInput = z.infer<typeof sessionStartInput>;

export type EffortDraft = z.infer<typeof effortDraft>;

export type AttachItem = z.infer<typeof attachItem>;

export type SessionDescribeInput = z.infer<typeof sessionDescribeInput>;

export type SessionContextInput = z.infer<typeof sessionContextInput>;

export type FileEventInput = z.infer<typeof fileEventInput>;

export type DescribeInput = z.infer<typeof describeInput>;

export type FindInput = z.infer<typeof findInput>;

export type LocationInput = z.infer<typeof locationInput>;

export type EffortInput = z.infer<typeof effortInput>;

export type LinkInput = z.infer<typeof linkInput>;

export type MoveInput = z.infer<typeof moveInput>;

export type AccessMethod = z.infer<typeof accessMethod>;

export type OriginInput = z.infer<typeof originInput>;

export type ReferenceInput = z.infer<typeof referenceInput>;
