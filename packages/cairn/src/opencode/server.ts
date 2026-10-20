import { execFile, spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "@opencode/plugin";
import type { Result } from "@opencode/plugin/promise/tool";
import { z } from "zod";
import { conventions, sessionIntro } from "../core/conventions.ts";
import { frontMatterBlock, hasFrontMatter } from "../core/front-matter.ts";
import { contentNote, folderCategory, isCairnOwned, relativeInsideRoot, resolveLayout, type Layout } from "../core/root.ts";
import { formatSessionKey } from "../schemas.ts";
import { findRunClient, type RunClient, type RunSession } from "./run-client.ts";

type Content = Exclude<NonNullable<Result["content"]>, string>[number];

export type CairnCli = {
  // Starts a command and doesn't wait for it. Cairn logs its own failures.
  readonly fire: (args: readonly string[]) => void;
  // Runs a command and returns what it printed.
  readonly output: (args: readonly string[]) => Promise<string>;
};

export type SessionFacts = {
  readonly parentID?: string;
  readonly agent?: string;
  readonly title?: string;
  readonly directory: string;
  // When OpenCode created the session, in milliseconds since the epoch.
  readonly created: number;
};

export type CairnFiles = {
  readonly write: (path: string, text: string) => Promise<void>;
  // The file's text, or null when it doesn't exist.
  readonly read: (path: string) => Promise<string | null>;
};

export type CairnPluginOptions = {
  readonly layout: Layout;
  readonly cli: CairnCli;
  readonly files: CairnFiles;
  readonly session: (sessionID: string) => Promise<SessionFacts>;
  // The directory of the OpenCode location this instance serves.
  readonly directory: string;
  // The opencode run process that created a root session, or null when it came from the TUI or another client.
  readonly runClient: (session: RunSession) => RunClient | null;
  readonly log: (message: string, error: Error) => void;
};

export type CompletedTool = {
  readonly tool: string;
  readonly sessionID: string;
  readonly input: unknown;
  readonly output: unknown;
  readonly content: Result["content"];
};

const pathInput = z.object({ path: z.string() });

const writeOutput = z.object({ target: z.string() });

const filesOutput = z.object({ files: z.array(z.object({ file: z.string() })) });

const compactionNote = z.object({ note: z.string() });

const registeredSession = z.object({ key: z.string(), folder: z.string() });

// A session as Cairn registered it: what OpenCode says about it, and the folder its files go in.
type Registered = SessionFacts & { readonly key: string; readonly folder: string };

const subagentOutput = z.object({ sessionID: z.string(), status: z.literal("completed"), output: z.string() });

const subagentInput = z.object({ description: z.string() });

const completionMetadata = z.object({ source: z.literal("subagent"), childID: z.string(), state: z.literal("completed") });

type OpenCodeEvent = ReturnType<Plugin.Context["event"]["subscribe"]> extends AsyncIterable<infer E> ? E : never;

// The parts of OpenCode's session.synthetic event that Cairn reads.
export type SyntheticMessage = Pick<Extract<OpenCodeEvent, { type: "session.synthetic" }>["data"], "text" | "description" | "metadata">;

const completionWrapper = /^<subagent [^\n]*>\n([\s\S]*)\n<\/subagent>$/;

// A background subagent's response arrives as a synthetic message, wrapped in a <subagent> element.
export function backgroundReturn(message: SyntheticMessage): SubagentReturn | null {
  const metadata = completionMetadata.safeParse(message.metadata);

  if (!metadata.success || message.description === undefined) {
    return null;
  }

  const text = completionWrapper.exec(message.text)?.[1] ?? message.text;

  return { childID: metadata.data.childID, description: message.description, text };
}

// The parts of a model request's message that Cairn reads to find background results.
export type RequestMessage = {
  readonly role: string;
  readonly content: readonly unknown[];
};

const textPart = z.object({ type: z.literal("text"), text: z.string() });

// The <subagent> element OpenCode wraps a completed background result in, as the parent's model request carries it.
const completedResult = /^<subagent sessionID="([^"]+)" state="completed" description="(.*)">\n([\s\S]*)\n<\/subagent>$/;

// How long a request waits for a background result to be saved before going without its note.
const noteWait = 15_000;

// OpenCode's result for a subagent that ended without text.
const noText = "Subagent completed without a text response.";

// Where a subagent's response was saved, and its learnings file when it wrote one.
export type SavedReturn = {
  readonly response: string;
  readonly learnings: string | null;
};

// A subagent's final response, as the session that ran it received it.
export type SubagentReturn = {
  readonly childID: string;
  readonly description: string;
  readonly text: string;
};

type FileEvent = "capture" | "read";

const fileEvents = new Map<string, FileEvent>([
  ["write", "capture"],
  ["edit", "capture"],
  ["patch", "capture"],
  ["read", "read"]
]);

function sessionKey(sessionID: string): string {
  return `opencode:${sessionID}`;
}

// write reports an absolute target; edit and patch report files relative to the session's directory.
function touchedPaths(tool: CompletedTool, directory: string): string[] {
  const target = writeOutput.safeParse(tool.output);

  if (target.success) {
    return [resolve(directory, target.data.target)];
  }

  const files = filesOutput.safeParse(tool.output);

  if (files.success) {
    return files.data.files.map((entry) => resolve(directory, entry.file));
  }

  const input = pathInput.safeParse(tool.input);

  return input.success ? [resolve(directory, input.data.path)] : [];
}

const textOutput = z.string();

const contentParts = z
  .array(
    z.union([
      z.object({ type: z.literal("text"), text: z.string() }),
      z.object({ type: z.literal("file"), uri: z.string(), mime: z.string(), name: z.string().optional() })
    ])
  )
  .min(1);

// Rebuilds the content the way OpenCode normalizes a tool result, so the note is added after it rather than replacing it.
function baseContent(tool: CompletedTool): Content[] {
  const text = textOutput.safeParse(tool.content);

  if (text.success) {
    return [{ type: "text", text: text.data }];
  }

  const parts = contentParts.safeParse(tool.content);

  if (parts.success) {
    return parts.data;
  }

  const output = textOutput.safeParse(tool.output);

  return [{ type: "text", text: output.success ? output.data : (JSON.stringify(tool.output) ?? String(tool.output)) }];
}

function captureNote(key: string, paths: readonly string[]): string {
  const files = paths.length === 1 ? `this file: ${paths[0]}` : `these files:\n${paths.map((path) => `- ${path}`).join("\n")}`;

  return (
    `Cairn recorded ${files}\nfor session ${key}. ${paths.length === 1 ? "It has" : "They have"} no front matter, so Cairn ` +
    "lists them as undescribed; front matter at the top with a title and a one-sentence description describes a file."
  );
}

export function createCairn(options: CairnPluginOptions) {
  const registered = new Map<string, Promise<Registered>>();
  const noted = new Set<string>();
  const compacted = new Set<string>();
  const notes = new Map<string, string>();
  const responses = new Map<string, string>();
  const lastReturned = new Map<string, string>();
  const owned = new Map<string, Promise<boolean>>();
  // The note for each background result, keyed by subagent and text, and the note each request carries: the first
  // request decides, so later ones repeat it and the request's cached prefix holds.
  const savedNotes = new Map<string, Promise<string | null>>();
  const decidedNotes = new Map<string, string | null>();

  // OpenCode runs a plugin instance per location but sends every location's events to each one, so only the instance
  // whose location holds a session acts on its events.
  function owns(sessionID: string): Promise<boolean> {
    const known = owned.get(sessionID);

    if (known !== undefined) {
      return known;
    }

    const found = options.session(sessionID).then(
      (info) => info.directory === options.directory,
      () => {
        owned.delete(sessionID);

        return false;
      }
    );

    owned.set(sessionID, found);

    return found;
  }

  // Registers a session on first sight and learns its folder. Registration is an upsert, so a repeat after a plugin
  // reload is harmless.
  function register(sessionID: string): Promise<Registered> {
    const known = registered.get(sessionID);

    if (known !== undefined) {
      return known;
    }

    const facts = options.session(sessionID).then((info) => {
      const args = ["session", "start", sessionKey(sessionID), "--cwd", info.directory, "--json"];

      if (info.parentID !== undefined) {
        args.push("--parent", sessionKey(info.parentID));
      }

      if (info.agent !== undefined) {
        args.push("--agent", info.agent);
      }

      // A root session started by opencode run is a CLI run, linked to the session whose shell ran the command.
      if (info.parentID === undefined) {
        const client = options.runClient({ id: sessionID, directory: info.directory, created: info.created });

        args.push("--origin", client === null ? "interactive" : "cli");

        if (client?.spawnedBy !== undefined) {
          args.push("--spawned-by", formatSessionKey(client.spawnedBy));
        }
      }

      // A root session's title is a placeholder until OpenCode generates one; a child's is its task description.
      if (info.parentID !== undefined && info.title !== undefined) {
        args.push("--title", info.title);
      }

      // The folder depends on the session's place in its tree, so the request waits for the catalog to say.
      return options.cli.output(args).then((printed) => ({ ...info, ...registeredSession.parse(JSON.parse(printed)) }));
    });

    registered.set(sessionID, facts);
    facts.catch(() => registered.delete(sessionID));

    return facts;
  }

  async function refreshNote(sessionID: string): Promise<void> {
    compacted.delete(sessionID);

    try {
      const printed = await options.cli.output(["session", "context", sessionKey(sessionID), "--json"]);

      notes.set(sessionID, compactionNote.parse(JSON.parse(printed)).note);
    } catch (error) {
      options.log("unable to read the compaction note", error instanceof Error ? error : new Error(String(error)));
    }
  }

  // What a model request is told about its session: its catalog ID and folder, where content lives, and after a
  // compaction, the compaction note, which restates the ID and folder with the session's efforts. The note stays in
  // every later request, because this text isn't kept in the session's history.
  async function context(sessionID: string): Promise<string> {
    if (compacted.has(sessionID)) {
      await refreshNote(sessionID);
    }

    const note = notes.get(sessionID);

    if (note !== undefined) {
      return `${note}\n\n${contentNote(options.layout)}`;
    }

    try {
      return `${sessionIntro(await register(sessionID))}\n\n${contentNote(options.layout)}`;
    } catch (error) {
      options.log("unable to register the session", error instanceof Error ? error : new Error(String(error)));

      return `This session's catalog ID is ${sessionKey(sessionID)}.\n\n${contentNote(options.layout)}`;
    }
  }

  // Saves what a subagent returned as result.md in its own folder. A result that doesn't describe itself gets front
  // matter titled from the task. A follow-up to the same subagent is appended, because its reply often covers only
  // what was asked next. Returns null when there was nothing to save or saving failed.
  async function subagentReturned(result: SubagentReturn): Promise<SavedReturn | null> {
    if (result.text.trim() === "" || result.text === noText) {
      return null;
    }

    const saved = responses.get(result.childID);

    // The same completion can arrive by more than one route.
    if (saved !== undefined && lastReturned.get(result.childID) === result.text) {
      return { response: saved, learnings: null };
    }

    let path: string;
    let learnings: string | null;

    try {
      const { folder } = await register(result.childID);

      path = join(folder, "result.md");
      responses.set(result.childID, path);

      const earlier = await options.files.read(path);

      const file =
        earlier === null
          ? `${hasFrontMatter(result.text) ? "" : frontMatterBlock({ title: result.description, category: "evidence" })}${result.text}`
          : `${earlier.trimEnd()}\n\n---\n\n## Follow-up\n\n${result.text}`;

      await options.files.write(path, `${file}\n`);
      lastReturned.set(result.childID, result.text);
      learnings = (await options.files.read(join(folder, "learnings.md"))) === null ? null : join(folder, "learnings.md");
    } catch (error) {
      options.log("unable to save a subagent's response", error instanceof Error ? error : new Error(String(error)));

      return null;
    }

    options.cli.fire(["capture", path, "--session", sessionKey(result.childID)]);

    if (learnings !== null) {
      options.cli.fire(["capture", learnings, "--session", sessionKey(result.childID)]);
    }

    return { response: path, learnings };
  }

  // Saves a background result once, however many routes it arrives by, and gives the note on where it went.
  function backgroundSaved(result: SubagentReturn): Promise<string | null> {
    const key = `${result.childID}\n${result.text}`;
    const known = savedNotes.get(key);

    if (known !== undefined) {
      return known;
    }

    const note = subagentReturned(result).then((saved) => (saved === null ? null : savedNote(`the result of "${result.description}"`, saved)));

    savedNotes.set(key, note);

    return note;
  }

  // The text to give each background result in a request, after its <subagent> element, so the parent learns where
  // the result was saved from the result itself. A separate message would arrive while the parent answers the
  // result and make it answer again. A result the model has already answered gets its note only if this instance
  // saved it; after a reload it stays as it is.
  async function noteResults(sessionID: string, messages: readonly RequestMessage[]): Promise<Map<number, string>> {
    const notes = new Map<number, string>();
    const answered = messages.findLastIndex((message) => message.role === "assistant");

    if (!(await owns(sessionID))) {
      return notes;
    }

    for (const [index, message] of messages.entries()) {
      const part = message.role === "user" && message.content.length === 1 ? textPart.safeParse(message.content[0]) : undefined;
      const match = part?.success === true ? completedResult.exec(part.data.text) : null;

      if (part?.success !== true || match === null) {
        continue;
      }

      const [, childID = "", description = "", text = ""] = match;
      const key = `${childID}\n${text}`;

      if (!decidedNotes.has(key) && (index > answered || savedNotes.has(key))) {
        const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), noteWait).unref());

        decidedNotes.set(key, await Promise.race([backgroundSaved({ childID, description, text }), timeout]));
      }

      const note = decidedNotes.get(key);

      if (note !== undefined && note !== null) {
        notes.set(index, `${part.data.text}\n\n${note}`);
      }
    }

    return notes;
  }

  // Records files the session wrote or read under the root. Returns new content for the tool result when a
  // written file should carry the capture note, or null to leave the result alone.
  async function afterTool(tool: CompletedTool): Promise<Content[] | null> {
    if (tool.tool === "subagent") {
      return afterSubagent(tool);
    }

    const verb = fileEvents.get(tool.tool);

    if (verb === undefined) {
      return null;
    }

    let facts: Registered;

    try {
      facts = await register(tool.sessionID);
    } catch (error) {
      options.log("unable to register the session", error instanceof Error ? error : new Error(String(error)));

      return null;
    }

    const key = sessionKey(tool.sessionID);
    const fresh: string[] = [];

    for (const path of touchedPaths(tool, facts.directory)) {
      const inside = relativeInsideRoot(options.layout, path);

      if (inside === null || isCairnOwned(inside)) {
        continue;
      }

      options.cli.fire([verb, path, "--session", key]);

      const seen = `${tool.sessionID}\n${path}`;

      // A Markdown file that doesn't describe itself is noted once. Files filed by their folder need no front matter.
      if (verb === "capture" && path.endsWith(".md") && folderCategory(inside) === null && !noted.has(seen)) {
        noted.add(seen);

        const text = await options.files.read(path);

        if (text !== null && !hasFrontMatter(text)) {
          fresh.push(path);
        }
      }
    }

    return fresh.length === 0 ? null : [...baseContent(tool), { type: "text", text: captureNote(key, fresh) }];
  }

  // A foreground subagent's response arrives as the tool's result. The parent learns where it was saved.
  async function afterSubagent(tool: CompletedTool): Promise<Content[] | null> {
    const output = subagentOutput.safeParse(tool.output);
    const input = subagentInput.safeParse(tool.input);

    if (!output.success || !input.success) {
      return null;
    }

    const saved = await subagentReturned({ childID: output.data.sessionID, description: input.data.description, text: output.data.output });

    if (saved === null) {
      return null;
    }

    return [...baseContent(tool), { type: "text", text: savedNote("this response", saved) }];
  }

  // Updates a root session's conversation export after each completed turn. Child sessions get none.
  async function turnCompleted(sessionID: string): Promise<void> {
    try {
      const facts = await register(sessionID);

      if (facts.parentID === undefined) {
        options.cli.fire(["session", "index", sessionKey(sessionID)]);
      }
    } catch (error) {
      options.log("unable to register the session", error instanceof Error ? error : new Error(String(error)));
    }
  }

  return {
    context,
    afterTool,
    owns,
    subagentReturned,
    backgroundSaved,
    noteResults,
    turnCompleted,
    compactionEnded: (sessionID: string) => {
      compacted.add(sessionID);
    }
  };
}

function nodeCli(cliPath: string): CairnCli {
  const env = { ...process.env, NODE_COMPILE_CACHE: process.env.NODE_COMPILE_CACHE ?? join(tmpdir(), "cairn-compile-cache") };

  return {
    fire: (args) => {
      const child = spawn("node", [cliPath, ...args], { detached: true, stdio: "ignore", env });

      child.on("error", (error) => console.error("[cairn] unable to run the CLI", error));
      child.unref();
    },
    output: (args) =>
      new Promise((done, fail) => {
        execFile("node", [cliPath, ...args], { env, timeout: 5000 }, (error, stdout) => {
          if (error === null) {
            done(stdout);
          } else {
            fail(error);
          }
        });
      })
  };
}

async function readText(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

// Tells the parent where a subagent's result was saved, so it can point later work at the file.
export function savedNote(subject: string, saved: SavedReturn): string {
  const response = `Cairn saved ${subject} to ${saved.response}.`;

  return saved.learnings === null ? response : `${response} The subagent also wrote learnings to ${saved.learnings}.`;
}

// The session an event Cairn acts on belongs to, or null for events Cairn ignores.
function sessionOf(event: OpenCodeEvent): string | null {
  switch (event.type) {
    case "session.compaction.ended":
    case "session.execution.succeeded":
    case "session.inbox.enqueued":
    case "session.synthetic":
      return event.data.sessionID;
    default:
      return null;
  }
}

export async function setupCairnPlugin(ctx: Plugin.Context) {
  const cairn = createCairn({
    layout: resolveLayout(process.env),
    // The build puts the plugin in dist/opencode/ and the CLI beside it in dist/.
    cli: nodeCli(fileURLToPath(new URL("../cli.js", import.meta.url))),
    files: {
      // A subagent's folder exists only once something is written there.
      write: async (path, text) => {
        await mkdir(dirname(path), { recursive: true });
        await writeFile(path, text, "utf8");
      },
      read: readText
    },
    directory: ctx.location.directory,
    session: async (sessionID) => {
      const session = await ctx.session.get({ sessionID });

      return {
        parentID: session.parentID,
        agent: session.agent,
        title: session.title,
        directory: session.location.directory,
        created: session.time.created
      };
    },
    runClient: (session) => findRunClient("/proc", session),
    log: (message, error) => console.error(`[cairn] ${message}`, error)
  });

  const events = ctx.event.subscribe()[Symbol.asyncIterator]();
  let stopped = false;

  void (async () => {
    for (;;) {
      const next = await events.next();

      if (next.done === true || stopped) {
        return;
      }

      const sessionID = sessionOf(next.value);

      if (sessionID === null || !(await cairn.owns(sessionID))) {
        continue;
      }

      if (next.value.type === "session.compaction.ended") {
        cairn.compactionEnded(next.value.data.sessionID);
      }

      if (next.value.type === "session.execution.succeeded") {
        await cairn.turnCompleted(next.value.data.sessionID);
      }

      // A background subagent's response reaches the parent through its inbox. Older releases emitted it directly.
      const message =
        next.value.type === "session.inbox.enqueued" && next.value.data.item.type === "synthetic"
          ? next.value.data.item.payload
          : next.value.type === "session.synthetic"
            ? next.value.data
            : null;

      const returned = message === null ? null : backgroundReturn(message);

      // Saving starts as soon as the result arrives; the parent's next request waits for it and carries the note.
      if (returned !== null) {
        void cairn.backgroundSaved(returned);
      }
    }
  })().catch((error) => console.error("[cairn] event stream failed", error));

  const toolHook = await ctx.tool.hook("execute.after", async (event) => {
    if (event.status !== "completed") {
      return;
    }

    const content = await cairn.afterTool({
      tool: event.tool,
      sessionID: event.sessionID,
      input: event.input,
      output: event.result.output,
      content: event.result.content
    });

    if (content !== null) {
      event.result = { ...event.result, content };
    }
  });

  const contextHook = await ctx.session.hook("context", async (event) => {
    for (const [index, text] of await cairn.noteResults(event.sessionID, event.messages)) {
      const message = event.messages[index];

      if (message !== undefined) {
        event.messages[index] = { ...message, content: message.content.map((part) => (part.type === "text" ? { ...part, text } : part)) };
      }
    }

    // The conventions are the same in every session, so they join the system text, which a compaction keeps. The
    // session's own context opens the conversation instead: its catalog ID and folder differ in every session, and in
    // the system text they made each session's prompt differ from its first request on, so subagents started together
    // couldn't share a cache entry.
    event.system.push({ type: "text", text: conventions });
    event.messages.unshift({ role: "user", content: [{ type: "text", text: await cairn.context(event.sessionID) }] });
  });

  // A shell inherits CAIRN_SESSION from the command that started an opencode run, which names a session further
  // up. Removing it leaves OPENCODE_SESSION_ID, which OpenCode sets afterward, to name this session to any
  // claude -p or opencode run the shell starts.
  const shellHook = await ctx.shell.hook("create.before", (shell) => {
    delete shell.env.CAIRN_SESSION;
  });

  // OpenCode waits for this cleanup before a reload finishes, and the stream's pending next() may wait for another
  // event to arrive. So the loop is told to stop rather than awaited; it exits at its next event.
  return async () => {
    stopped = true;
    await shellHook.dispose();
    await contextHook.dispose();
    await toolHook.dispose();
    void events.return?.();
  };
}

// Plugin.define only returns its argument. Checking the type instead keeps @opencode/plugin, and the schema
// modules its entry imports, out of the bundle.
export default {
  id: "cairn",
  setup: setupCairnPlugin
} satisfies Plugin.Plugin;
