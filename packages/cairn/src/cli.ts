#!/usr/bin/env node
import { resolve } from "node:path";
import { parseArgs, type ParseArgsOptionsConfig } from "node:util";
import { z } from "zod";
import { capture, describe, move, read } from "./core/artifacts.ts";
import { backupNow, restore } from "./core/backup.ts";
import { check } from "./core/check.ts";
import { CairnError, type Cairn } from "./core/db.ts";
import { effortCommand, type EffortResult } from "./core/efforts.ts";
import { find, type ArtifactEntry, type EffortSummary, type FindResult, type SessionSummary } from "./core/find.ts";
import { link } from "./core/links.ts";
import { isUrl } from "./core/lookup.ts";
import { failureMessage, withCairn, type Mode } from "./core/operation.ts";
import { resolveRoot } from "./core/root.ts";
import { describeSession, location, sessionContext, startSession } from "./core/sessions.ts";
import { effortView, regenerateDirty, renderIndex } from "./core/views.ts";
import * as schemas from "./schemas.ts";

type Output = {
  readonly json: schemas.Json;
  readonly text: string;
};

type Values = ReturnType<typeof parseArgs>["values"];

type Command = {
  readonly usage: string;
  readonly options: ParseArgsOptionsConfig;
  readonly mode: Mode;
  readonly run: (cairn: Cairn, values: Values, positionals: readonly string[]) => Output;
};

const common: ParseArgsOptionsConfig = {
  json: { type: "boolean" },
  help: { type: "boolean", short: "h" }
};

const optionValue = z.string().optional();

const repeatedOption = z.array(z.string()).default([]);

function one(values: Values, name: string): string | undefined {
  return optionValue.parse(values[name]);
}

function many(values: Values, name: string): string[] {
  return repeatedOption.parse(values[name]);
}

function flag(values: Values, name: string): boolean {
  return values[name] === true;
}

function positional(positionals: readonly string[], index: number, name: string): string {
  const value = positionals[index];

  if (value === undefined) {
    throw new CairnError("invalid", `Missing <${name}>`);
  }

  return value;
}

// Relative paths are resolved against the working directory; URLs pass through.
function reference(value: string): string {
  return isUrl(value) ? value : resolve(value);
}

function optionalPath(value: string | undefined): string | undefined {
  return value === undefined ? undefined : resolve(value);
}

function effortLine(effort: EffortSummary): string {
  const tags = effort.tags.length === 0 ? "" : `  ${effort.tags.join(" ")}`;

  return `${effort.slug}  [${effort.status}]  ${effort.title}  (${effort.session_count} sessions, ${effort.artifact_count} artifacts)${tags}`;
}

function sessionLine(session: SessionSummary): string {
  const efforts = session.efforts.length === 0 ? "" : `  → ${session.efforts.join(", ")}`;
  const workstream = session.workstream === null ? "" : `  workstream ${session.workstream}`;

  return `${session.key}  ${session.title ?? "(untitled)"}${workstream}${efforts}`;
}

function artifactLine(entry: ArtifactEntry): string {
  const kind = entry.pointer_type ?? entry.category ?? "undescribed";
  const status = entry.status === "active" ? "" : ` ${entry.status}`;
  const title = entry.title === null ? "" : `  ${entry.title}`;
  const description = entry.description === null ? "" : ` — ${entry.description}`;

  return `${entry.path}  [${kind}${status}]${title}${description}`;
}

function findText(result: FindResult): string {
  if (result.target === "efforts") {
    return result.efforts.map(effortLine).join("\n") || "No efforts.";
  }

  if (result.target === "sessions") {
    return result.sessions.map(sessionLine).join("\n") || "No sessions.";
  }

  if ("groups" in result) {
    const blocks: string[] = [];

    for (const group of result.groups) {
      blocks.push([`${group.group}:`, ...group.artifacts.map((entry) => `  ${artifactLine(entry)}`)].join("\n"));
    }

    return blocks.join("\n\n") || "No artifacts.";
  }

  return result.artifacts.map(artifactLine).join("\n") || "No artifacts.";
}

function effortText(result: EffortResult): string {
  switch (result.action) {
    case "create":
      if (result.result.effort === null) {
        const matches = result.result.close_matches.map(effortLine).join("\n");

        return `Similar efforts already exist. Use one of them, or repeat with --confirm-new:\n${matches}`;
      }

      return `Created ${effortLine(result.result.effort)}`;
    case "show":
      return renderIndex(result.result);
    case "merge": {
      const left =
        result.result.records_left_behind.length === 0
          ? ""
          : `\nThese records were not merged; fold their content into ${result.result.effort.slug}'s records:\n${result.result.records_left_behind.join("\n")}`;

      return `Merged ${result.result.merged} into ${effortLine(result.result.effort)}${left}`;
    }

    case "update":
    case "rename":
    case "split":
      return effortLine(result.result);
  }
}

function fileEventText(result: ReturnType<typeof capture>): string {
  if (!result.recorded) {
    return `Not recorded. ${result.reason}`;
  }

  const efforts = result.artifact.efforts.length === 0 ? "no effort" : result.artifact.efforts.join(", ");

  return `${result.created ? "Recorded" : "Updated"} ${result.artifact.path} (${result.artifact.status}; ${efforts})`;
}

const commandTable = {
  "session start": {
    usage: "cairn session start <harness>:<id> [--parent <harness>:<id>] [--cwd <dir>] [--agent <name>] [--title <text>]",
    options: { parent: { type: "string" }, cwd: { type: "string" }, agent: { type: "string" }, title: { type: "string" } },
    mode: "hot",
    run: (cairn, values, positionals) => {
      const input = schemas.sessionStartInput.parse({
        session: positional(positionals, 0, "session"),
        parent: one(values, "parent"),
        cwd: optionalPath(one(values, "cwd")),
        agent: one(values, "agent"),
        title: one(values, "title")
      });

      const session = startSession(cairn, input);

      return { json: session, text: sessionLine(session) };
    }
  },
  "session describe": {
    usage:
      "cairn session describe <harness>:<id> [--title <text>] [--description <text>] [--attach <effort>]... " +
      "[--create <title> [--create-description <text>] [--create-tag <ns:value>]... [--confirm-new]] [--detach <effort>]... " +
      "[--workstream <key>] [--subject <ref>]",
    options: {
      title: { type: "string" },
      description: { type: "string" },
      attach: { type: "string", multiple: true },
      create: { type: "string" },
      "create-description": { type: "string" },
      "create-tag": { type: "string", multiple: true },
      "confirm-new": { type: "boolean" },
      detach: { type: "string", multiple: true },
      workstream: { type: "string" },
      subject: { type: "string" }
    },
    mode: "write",
    run: (cairn, values, positionals) => {
      const title = one(values, "create");

      const creation =
        title === undefined
          ? []
          : [
              {
                create: {
                  title,
                  description: one(values, "create-description") ?? "",
                  tags: many(values, "create-tag")
                },
                confirm_new: flag(values, "confirm-new")
              }
            ];

      const input = schemas.sessionDescribeInput.parse({
        session: positional(positionals, 0, "session"),
        title: one(values, "title"),
        description: one(values, "description"),
        attach: [...many(values, "attach"), ...creation],
        detach: many(values, "detach"),
        workstream: one(values, "workstream"),
        subject: one(values, "subject")
      });

      const result = describeSession(cairn, input);
      const lines = [sessionLine(result.session)];

      for (const request of result.close_matches) {
        lines.push(
          `Similar efforts already exist for "${request.requested}". Attach one of them, or repeat with --confirm-new:`,
          ...request.matches.map((effort) => `  ${effortLine(effort)}`)
        );
      }

      return { json: result, text: lines.join("\n") };
    }
  },
  "session context": {
    usage: "cairn session context <harness>:<id>",
    options: {},
    mode: "read",
    run: (cairn, _values, positionals) => {
      const result = sessionContext(cairn, schemas.sessionContextInput.parse({ session: positional(positionals, 0, "session") }));

      return { json: result, text: result.note };
    }
  },
  capture: {
    usage: "cairn capture <path> --session <harness>:<id>",
    options: { session: { type: "string" } },
    mode: "hot",
    run: (cairn, values, positionals) => {
      const input = schemas.fileEventInput.parse({ path: resolve(positional(positionals, 0, "path")), session: one(values, "session") });
      const result = capture(cairn, input);

      return { json: result, text: fileEventText(result) };
    }
  },
  read: {
    usage: "cairn read <path> --session <harness>:<id>",
    options: { session: { type: "string" } },
    mode: "hot",
    run: (cairn, values, positionals) => {
      const input = schemas.fileEventInput.parse({ path: resolve(positional(positionals, 0, "path")), session: one(values, "session") });
      const result = read(cairn, input);

      return { json: result, text: fileEventText(result) };
    }
  },
  describe: {
    usage:
      "cairn describe <path|url> [--category <category>] [--title <text>] [--description <text>] [--origin <ref>] " +
      "[--session <harness>:<id>] [--include <effort>]... [--exclude <effort>]... [--informs <path|url>]... [--supersedes <path|url>]...",
    options: {
      category: { type: "string" },
      title: { type: "string" },
      description: { type: "string" },
      origin: { type: "string" },
      session: { type: "string" },
      include: { type: "string", multiple: true },
      exclude: { type: "string", multiple: true },
      informs: { type: "string", multiple: true },
      supersedes: { type: "string", multiple: true }
    },
    mode: "write",
    run: (cairn, values, positionals) => {
      const target = reference(positional(positionals, 0, "path|url"));

      const input = schemas.describeInput.parse({
        path: isUrl(target) ? undefined : target,
        url: isUrl(target) ? target : undefined,
        category: one(values, "category"),
        title: one(values, "title"),
        description: one(values, "description"),
        origin: one(values, "origin"),
        session: one(values, "session"),
        efforts: { include: many(values, "include"), exclude: many(values, "exclude") },
        informs: many(values, "informs").map(reference),
        supersedes: many(values, "supersedes").map(reference)
      });

      const entry = describe(cairn, input, one(values, "session") ?? "cli");

      return { json: entry, text: artifactLine(entry) };
    }
  },
  find: {
    usage:
      "cairn find <efforts|sessions|artifacts> [--effort <slug>] [--session <harness>:<id>] [--tag <ns:value>] " +
      "[--category <category>] [--pointer-type <type>] [--workstream <key>] [--subject <ref>] [--status <status>] " +
      "[--text <text>] [--group-by category|session] [--limit <n>]",
    options: {
      effort: { type: "string" },
      session: { type: "string" },
      tag: { type: "string" },
      category: { type: "string" },
      "pointer-type": { type: "string" },
      workstream: { type: "string" },
      subject: { type: "string" },
      status: { type: "string" },
      text: { type: "string" },
      "group-by": { type: "string" },
      limit: { type: "string" }
    },
    mode: "read",
    run: (cairn, values, positionals) => {
      const limit = one(values, "limit");

      const input = schemas.findInput.parse({
        target: positional(positionals, 0, "target"),
        effort: one(values, "effort"),
        session: one(values, "session"),
        tag: one(values, "tag"),
        category: one(values, "category"),
        pointer_type: one(values, "pointer-type"),
        workstream: one(values, "workstream"),
        subject: one(values, "subject"),
        status: one(values, "status"),
        text: one(values, "text"),
        group_by: one(values, "group-by"),
        limit: limit === undefined ? undefined : Number(limit)
      });

      const result = find(cairn, input);

      return { json: result, text: findText(result) };
    }
  },
  location: {
    usage: "cairn location --session <harness>:<id> --topic <topic> [--effort <slug>]",
    options: { session: { type: "string" }, topic: { type: "string" }, effort: { type: "string" } },
    mode: "write",
    run: (cairn, values) => {
      const result = location(
        cairn,
        schemas.locationInput.parse({ session: one(values, "session"), topic: one(values, "topic"), effort: one(values, "effort") })
      );

      return { json: result, text: result.path };
    }
  },
  "effort create": {
    usage: "cairn effort create --title <text> [--description <text>] [--tag <ns:value>]... [--slug <slug>] [--confirm-new]",
    options: {
      title: { type: "string" },
      description: { type: "string" },
      tag: { type: "string", multiple: true },
      slug: { type: "string" },
      "confirm-new": { type: "boolean" }
    },
    mode: "write",
    run: (cairn, values) =>
      effortOutput(cairn, schemas.effortInput.parse({
        action: "create",
        effort: {
          title: one(values, "title"),
          description: one(values, "description"),
          tags: many(values, "tag"),
          slug: one(values, "slug")
        },
        confirm_new: flag(values, "confirm-new")
      }))
  },
  "effort show": {
    usage: "cairn effort show <slug>",
    options: {},
    mode: "read",
    run: (cairn, _values, positionals) => effortOutput(cairn, schemas.effortInput.parse({ action: "show", effort: positional(positionals, 0, "slug") }))
  },
  "effort update": {
    usage:
      "cairn effort update <slug> [--title <text>] [--description <text>] [--status active|paused|done|archived] " +
      "[--tag <ns:value>]... [--untag <ns:value>]...",
    options: {
      title: { type: "string" },
      description: { type: "string" },
      status: { type: "string" },
      tag: { type: "string", multiple: true },
      untag: { type: "string", multiple: true }
    },
    mode: "write",
    run: (cairn, values, positionals) =>
      effortOutput(cairn, schemas.effortInput.parse({
        action: "update",
        effort: positional(positionals, 0, "slug"),
        title: one(values, "title"),
        description: one(values, "description"),
        status: one(values, "status"),
        add_tags: many(values, "tag"),
        remove_tags: many(values, "untag")
      }))
  },
  "effort rename": {
    usage: "cairn effort rename <slug> <new-slug>",
    options: {},
    mode: "write",
    run: (cairn, _values, positionals) =>
      effortOutput(cairn, schemas.effortInput.parse({ action: "rename", effort: positional(positionals, 0, "slug"), to: positional(positionals, 1, "new-slug") }))
  },
  "effort split": {
    usage:
      "cairn effort split <slug> --title <text> [--description <text>] [--tag <ns:value>]... [--slug <slug>] " +
      "[--session <harness>:<id>]... [--artifact <path|url>]...",
    options: {
      title: { type: "string" },
      description: { type: "string" },
      tag: { type: "string", multiple: true },
      slug: { type: "string" },
      session: { type: "string", multiple: true },
      artifact: { type: "string", multiple: true }
    },
    mode: "write",
    run: (cairn, values, positionals) =>
      effortOutput(cairn, schemas.effortInput.parse({
        action: "split",
        effort: positional(positionals, 0, "slug"),
        into: {
          title: one(values, "title"),
          description: one(values, "description"),
          tags: many(values, "tag"),
          slug: one(values, "slug")
        },
        sessions: many(values, "session"),
        artifacts: many(values, "artifact").map(reference)
      }))
  },
  "effort merge": {
    usage: "cairn effort merge <slug> --into <slug>",
    options: { into: { type: "string" } },
    mode: "write",
    run: (cairn, values, positionals) =>
      effortOutput(cairn, schemas.effortInput.parse({ action: "merge", effort: positional(positionals, 0, "slug"), into: one(values, "into") }))
  },
  link: {
    usage: "cairn link add|remove|accept|reject effort|artifact <src> <rel> <dst>",
    options: {},
    mode: "write",
    run: (cairn, _values, positionals) => {
      const kind = positional(positionals, 1, "effort|artifact");
      const endpoint = (value: string): string => (kind === "artifact" ? reference(value) : value);

      const input = schemas.linkInput.parse({
        action: positional(positionals, 0, "action"),
        kind,
        src: endpoint(positional(positionals, 2, "src")),
        rel: positional(positionals, 3, "rel"),
        dst: endpoint(positional(positionals, 4, "dst"))
      });

      const result = link(cairn, input, "cli");
      const verb = result.changed ? "Done" : "No change";

      return { json: result, text: `${verb}: ${result.action} ${result.src} ${result.rel} ${result.dst}` };
    }
  },
  ls: {
    usage: "cairn ls [<effort>] [--by session]",
    options: { by: { type: "string" } },
    mode: "read",
    run: (cairn, values, positionals) => {
      const slug = positionals[0];

      if (slug === undefined) {
        const result = find(cairn, schemas.findInput.parse({ target: "efforts" }));

        return { json: result, text: findText(result) };
      }

      if (one(values, "by") === "session") {
        const result = find(cairn, schemas.findInput.parse({ target: "artifacts", effort: slug, group_by: "session", limit: 500 }));

        return { json: result, text: findText(result) };
      }

      const view = effortView(cairn, schemas.slug.parse(slug));

      return { json: view, text: renderIndex(view) };
    }
  },
  check: {
    usage: "cairn check",
    options: {},
    mode: "write",
    run: (cairn) => {
      const report = check(cairn);

      const lines = [
        ...report.missing.map((path) => `missing   ${path}`),
        ...report.changed.map((path) => `changed   ${path}`),
        ...report.moved.map((move) => `moved     ${move.from} → ${move.to}`),
        ...report.captured.map((path) => `recorded  ${path}`)
      ];

      return { json: report, text: lines.join("\n") || "Everything matches the catalog." };
    }
  },
  mv: {
    usage: "cairn mv <artifact-path> <new-path>",
    options: {},
    mode: "write",
    run: (cairn, _values, positionals) => {
      const entry = move(
        cairn,
        schemas.moveInput.parse({ artifact: resolve(positional(positionals, 0, "artifact-path")), to: resolve(positional(positionals, 1, "new-path")) })
      );

      return { json: entry, text: artifactLine(entry) };
    }
  },
  index: {
    usage: "cairn index",
    options: {},
    mode: "write",
    run: (cairn) => {
      cairn.sql.run`UPDATE effort SET index_dirty = 1`;

      const written = regenerateDirty(cairn);

      return { json: { written }, text: written.join("\n") || "No efforts." };
    }
  },
  backup: {
    usage: "cairn backup",
    options: {},
    mode: "read",
    run: (cairn) => {
      const path = backupNow(cairn);

      return { json: { path }, text: path };
    }
  }
} satisfies Record<string, Command>;

const commands = new Map<string, Command>(Object.entries(commandTable));

function effortOutput(cairn: Cairn, input: schemas.EffortInput): Output {
  const result = effortCommand(cairn, input, "cli");

  return { json: result, text: effortText(result) };
}

function helpText(): string {
  const usages = [...commands.values()].map((command) => `  ${command.usage}`);

  return ["Usage:", ...usages, "  cairn restore <backup-file>", "", "Every command accepts --json. CAIRN_ROOT sets the root."].join("\n");
}

type SelectedCommand = {
  readonly command: Command;
  readonly rest: readonly string[];
};

function selectCommand(args: readonly string[]): SelectedCommand | null {
  const [first, second] = args;
  const pair = commands.get(`${first} ${second}`);

  if (pair !== undefined) {
    return { command: pair, rest: args.slice(2) };
  }

  const single = first === undefined ? undefined : commands.get(first);

  return single === undefined ? null : { command: single, rest: args.slice(1) };
}

export type CliIo = {
  readonly stdout: (text: string) => void;
  readonly stderr: (text: string) => void;
  readonly now: () => Date;
};

const processIo: CliIo = {
  stdout: (text) => process.stdout.write(text),
  stderr: (text) => process.stderr.write(text),
  now: () => new Date()
};

function restoreCommand(root: string, rest: readonly string[], json: boolean, io: CliIo): void {
  const file = rest.find((arg) => !arg.startsWith("--"));

  if (file === undefined) {
    throw new CairnError("invalid", "Missing <backup-file>");
  }

  const result = restore(root, file, io.now);

  io.stdout(json ? `${JSON.stringify(result)}\n` : `Restored ${result.restored}. The previous catalog was kept at ${result.previous ?? "(none)"}.\n`);
}

export function main(args: readonly string[], env: NodeJS.ProcessEnv, io: CliIo = processIo): number {
  const root = resolveRoot(env.CAIRN_ROOT);
  const json = args.includes("--json");

  try {
    if (args.length === 0 || args[0] === "--help" || args[0] === "-h" || args[0] === "help") {
      io.stdout(`${helpText()}\n`);

      return 0;
    }

    if (args[0] === "restore") {
      restoreCommand(root, args.slice(1), json, io);

      return 0;
    }

    const selected = selectCommand(args);

    if (selected === null) {
      throw new CairnError("invalid", `Unknown command: ${args.join(" ")}\n${helpText()}`);
    }

    const { command } = selected;

    const parsed = parseArgs({
      args: selected.rest,
      options: { ...common, ...command.options },
      allowPositionals: true,
      strict: true
    });

    if (parsed.values.help === true) {
      io.stdout(`${command.usage}\n`);

      return 0;
    }

    const output = withCairn(root, io.now, command.mode, (cairn) => command.run(cairn, parsed.values, parsed.positionals));

    io.stdout(json ? `${JSON.stringify(output.json, null, 2)}\n` : `${output.text}\n`);

    return 0;
  } catch (error) {
    const failure = error instanceof Error ? error : new Error(String(error));
    const message = failureMessage(root, args.join(" "), failure, io.now());

    io.stderr(json ? `${JSON.stringify({ error: message })}\n` : `cairn: ${message}\n`);

    return 1;
  }
}

if (import.meta.main) {
  process.exitCode = main(process.argv.slice(2), process.env);
}
