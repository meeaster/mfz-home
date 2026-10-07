#!/usr/bin/env node
import { McpServer, type CallToolResult } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { z } from "zod";
import { describe } from "./core/artifacts.ts";
import type { Cairn } from "./core/db.ts";
import { effortCommand } from "./core/efforts.ts";
import { find } from "./core/find.ts";
import { link } from "./core/links.ts";
import { failureMessage, withCairn, type Mode } from "./core/operation.ts";
import { originCommand, referenceCommand } from "./core/origins.ts";
import { resolveRoot } from "./core/root.ts";
import { describeSession, location } from "./core/sessions.ts";
import * as schemas from "./schemas.ts";

export type CairnServerOptions = {
  readonly root: string;
  readonly now: () => Date;
};

// MCP tool inputs must be objects, so the effort and link tools take one flat object that is then parsed
// into the discriminated inputs the core uses.
const effortToolInput = z.object({
  action: z.enum(["create", "show", "update", "rename", "split", "merge"]),
  effort: schemas.slug.optional().describe("The effort's slug. Required for every action except create."),
  title: z.string().optional().describe("create and split: the new effort's title. update: the new title."),
  description: z.string().optional().describe("create and split: the new effort's description. update: the new description."),
  tags: z.array(schemas.tag).optional().describe("create and split: tags such as area:observability."),
  slug: schemas.slug.optional().describe("create and split: the new effort's slug, when the one derived from the title won't do."),
  provisional: z.boolean().optional().describe("create: create it with status provisional, for work the human hasn't placed in an effort yet."),
  confirm_new: z.boolean().optional().describe("create: create even though similar efforts exist."),
  status: z.enum(schemas.effortStatuses).optional().describe("update: the new status. Setting a provisional effort to active promotes it."),
  add_tags: z.array(schemas.tag).optional().describe("update: tags to add."),
  remove_tags: z.array(schemas.tag).optional().describe("update: tags to remove."),
  to: schemas.slug.optional().describe("rename: the new slug."),
  into: schemas.slug.optional().describe("merge: the effort that absorbs this one."),
  sessions: z.array(z.string()).optional().describe("split: sessions (<harness>:<id>) to attach to the new effort."),
  artifacts: z.array(z.string()).optional().describe("split: files (absolute paths) or URLs to include in the new effort.")
});

type EffortToolInput = z.infer<typeof effortToolInput>;

type NewEffortFields = Pick<EffortToolInput, "title" | "description" | "tags" | "slug" | "provisional">;

function newEffortDraft(input: EffortToolInput): NewEffortFields {
  return { title: input.title, description: input.description, tags: input.tags, slug: input.slug, provisional: input.provisional };
}

function effortInput(input: EffortToolInput): schemas.EffortInput {
  switch (input.action) {
    case "create":
      return schemas.effortInput.parse({ action: "create", effort: newEffortDraft(input), confirm_new: input.confirm_new });
    case "show":
      return schemas.effortInput.parse({ action: "show", effort: input.effort });
    case "update":
      return schemas.effortInput.parse({
        action: "update",
        effort: input.effort,
        title: input.title,
        description: input.description,
        status: input.status,
        add_tags: input.add_tags,
        remove_tags: input.remove_tags
      });
    case "rename":
      return schemas.effortInput.parse({ action: "rename", effort: input.effort, to: input.to });
    case "split":
      return schemas.effortInput.parse({
        action: "split",
        effort: input.effort,
        into: newEffortDraft(input),
        sessions: input.sessions,
        artifacts: input.artifacts
      });
    case "merge":
      return schemas.effortInput.parse({ action: "merge", effort: input.effort, into: input.into });
  }
}

const linkToolInput = z.object({
  kind: z.enum(["artifact", "effort"]).describe("artifact links files or URLs by absolute path or URL; effort links efforts by slug."),
  action: z.enum(["add", "remove", "accept", "reject"]).describe("accept and reject apply only to suggested artifact links."),
  src: z.string(),
  rel: z
    .enum([...schemas.artifactRelations, ...schemas.effortRelations])
    .describe("Artifacts: informs, supersedes, related. Efforts: depends_on (src needs dst), split_from, related."),
  dst: z.string()
});

const originToolInput = z.object({
  action: z.enum(["kinds", "find", "register", "update"]),
  origin: z.string().optional().describe("register and update: the origin's key, <kind>:<identifier>, such as aws:4471-0938-2215."),
  kind: schemas.slug.optional().describe("find: only origins of this kind."),
  text: z.string().optional().describe("find: words in the identifier, title, or description."),
  limit: z.number().int().positive().max(500).optional(),
  title: z.string().optional().describe("register: a short title such as Prod network. update: the new title."),
  description: z.string().optional().describe("register: one sentence on what the origin holds. update: the new description."),
  access: z.array(schemas.accessMethod).optional().describe("register: how to reach it, such as {method: AWS CLI, detail: --profile prod-network-ro}."),
  new_kind: schemas.originKindDraft
    .optional()
    .describe("register, for a kind catalog_origin kinds doesn't list: what its identifiers are, such as AWS account ID, and a description."),
  add_access: z.array(schemas.accessMethod).optional().describe("update: access methods to add."),
  remove_access: z.array(schemas.accessMethod).optional().describe("update: access methods to remove.")
});

const referenceToolInput = z.object({
  action: z.enum(["record", "list", "remove"]),
  article: z.string().optional().describe("The knowledge article's absolute path."),
  origin: z.string().optional().describe("The origin's key, <kind>:<identifier>."),
  locator: z.string().optional().describe("record and remove: where in the origin, precisely enough to look again."),
  title: z.string().optional().describe("record: what was looked at, in a few words. Required for a new reference."),
  sections: z.array(z.string()).optional().describe("record: the article's headings this supports; empty means the whole article."),
  observed_at: z.string().optional().describe("record: when it was looked at (ISO date or time); defaults to now."),
  version: z.string().optional().describe("record: the version seen, such as a commit or page version, when the origin has one.")
});

function actorOf(session: schemas.SessionKey | undefined): string {
  return session === undefined ? "mcp" : schemas.formatSessionKey(session);
}

export function createCairnServer(options: CairnServerOptions): McpServer {
  const server = new McpServer({ name: "cairn", version: "0.1.0" });

  function run(tool: string, mode: Mode, work: (cairn: Cairn) => schemas.Json): CallToolResult {
    try {
      const result = withCairn(options.root, options.now, mode, work);

      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    } catch (error) {
      const failure = error instanceof Error ? error : new Error(String(error));

      return { content: [{ type: "text", text: failureMessage(options.root, tool, failure, options.now()) }], isError: true };
    }
  }

  server.registerTool(
    "catalog_session",
    {
      title: "Describe a session",
      description:
        "Describe a session and attach it to efforts. An effort is a durable piece of work that sessions and files belong to. " +
        "Files written by this session and its subagents join the efforts it is attached to, including files written before attaching. " +
        "Attach an existing effort by slug, or create one with {create: {title, description, tags}}; " +
        "add provisional: true to create a provisional effort, which the human can later promote or merge. " +
        "When a similar effort already exists, creating returns it under close_matches instead; attach it, or repeat with confirm_new. " +
        "workstream and subject group the sessions a Chief loop dispatches for one piece of work.",
      inputSchema: schemas.sessionDescribeInput
    },
    (input) => run("catalog_session", "write", (cairn) => describeSession(cairn, input))
  );

  server.registerTool(
    "catalog_describe",
    {
      title: "Describe a file or URL",
      description:
        "Record what a file or URL is: its category, a short title, and a one-sentence description. " +
        "Describe each file you write after its capture note. Register pull requests, issues, and published pages by url, " +
        "with session set to yours so they join your efforts. Paths are absolute. " +
        "efforts.include adds the item to an effort; efforts.exclude keeps it out of one. " +
        "category deliverable marks a page or ticket the work created, source one someone else's that it relies on. " +
        "For a Jira item you read through Atlassian, pass jira with its key, type, status, category (todo, progress or done), " +
        "parent epic and the keys it blocks; for a Confluence page, confluence with its space, version and last update. " +
        "Each read replaces the last. " +
        "Returns the catalog entry with its efforts, never file contents.",
      inputSchema: schemas.describeInput
    },
    (input) => run("catalog_describe", "write", (cairn) => describe(cairn, input, actorOf(input.session)))
  );

  server.registerTool(
    "catalog_find",
    {
      title: "Find efforts, sessions, or files",
      description:
        "Find efforts, sessions, or artifacts (files and URLs). Returns pointers (paths, titles, descriptions, and status), " +
        "never contents; read the files you need. Artifacts that no one has described have status undescribed. " +
        "Archived items are hidden unless status asks for them. group_by groups artifacts by category or by session.",
      inputSchema: schemas.findInput,
      annotations: { readOnlyHint: true }
    },
    (input) => run("catalog_find", "read", (cairn) => find(cairn, input))
  );

  server.registerTool(
    "catalog_location",
    {
      title: "Get a path for a new file",
      description:
        "Get an unused absolute path for a new file about a topic, and create its folder. " +
        "The file goes in the session's folder (or its workstream's folder) by default, or in an effort's folder when effort is given.",
      inputSchema: schemas.locationInput
    },
    (input) => run("catalog_location", "write", (cairn) => location(cairn, input))
  );

  server.registerTool(
    "catalog_effort",
    {
      title: "Show or change an effort",
      description:
        "create an effort; show its view (summary, records, linked efforts, files, and sessions); " +
        "update its title, description, status, or tags; rename its slug; " +
        "split part of it into a new effort (the original keeps everything, and the new one gets a split_from link); " +
        "or merge it into another effort.",
      inputSchema: effortToolInput
    },
    (input) =>
      run("catalog_effort", input.action === "show" ? "read" : "write", (cairn) => effortCommand(cairn, effortInput(input), "mcp"))
  );

  server.registerTool(
    "catalog_link",
    {
      title: "Link files or efforts",
      description:
        "Add or remove a relationship between two files or URLs (informs, supersedes, related) " +
        "or between two efforts (depends_on, split_from, related). Links read both ways.",
      inputSchema: linkToolInput
    },
    (input) => run("catalog_link", "write", (cairn) => link(cairn, schemas.linkInput.parse(input), "mcp"))
  );

  server.registerTool(
    "catalog_origin",
    {
      title: "Find or register an origin",
      description:
        "An origin is a system knowledge comes from, such as an AWS account, a Datadog org, a repository, a Confluence space, " +
        "or a documentation site, described once with how to reach it. Its key is <kind>:<identifier>. " +
        "kinds lists the kinds in use and what their identifiers are; find searches origins. " +
        "register returns the existing origin when the key is taken, adding any new access methods; " +
        "a new kind needs new_kind. update changes the title, description, or access methods. Never store credentials.",
      inputSchema: originToolInput
    },
    (input) =>
      run("catalog_origin", input.action === "kinds" || input.action === "find" ? "read" : "write", (cairn) =>
        originCommand(cairn, schemas.originInput.parse(input), "mcp")
      )
  );

  server.registerTool(
    "catalog_reference",
    {
      title: "Record what a knowledge article looked at",
      description:
        "A reference records what a knowledge article looked at inside an origin: where (locator), the sections it supports, " +
        "and when and at which version it was observed. record adds one, or records a new look at an existing one " +
        "(same article, origin, and locator), replacing its observed time and version. " +
        "list gives an article's references, oldest observed first, with their origins' access methods, " +
        "or every reference to one origin. remove deletes one.",
      inputSchema: referenceToolInput
    },
    (input) =>
      run("catalog_reference", input.action === "list" ? "read" : "write", (cairn) =>
        referenceCommand(cairn, schemas.referenceInput.parse(input), "mcp")
      )
  );

  return server;
}

if (import.meta.main) {
  const options: CairnServerOptions = { root: resolveRoot(process.env.CAIRN_ROOT), now: () => new Date() };

  serveStdio(() => createCairnServer(options));
}
