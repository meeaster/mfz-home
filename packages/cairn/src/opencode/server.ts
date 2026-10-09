import { execFile, spawn } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "@opencode/plugin";
import type { Result } from "@opencode/plugin/promise/tool";
import { z } from "zod";
import { isCairnOwned, isEffortRecord, relativeInsideRoot, resolveRoot } from "../core/root.ts";
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
  readonly root: string;
  readonly cli: CairnCli;
  readonly files: CairnFiles;
  // Asks a small model for text. Used to title and describe what subagents return.
  readonly generate: (prompt: string) => Promise<string>;
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

const grantedPath = z.object({ path: z.string() });

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

const generatedDescription = z.object({ title: z.string().min(1), description: z.string().min(1) });

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
    `The catalog (Cairn) recorded ${files}\nfor session ${key}. ` +
    "A file without a category and a title or description is listed as undescribed. " +
    "catalog_describe records what it is: category, title, and a one-sentence description."
  );
}

function childGuidance(folder: string, learnings: string): string {
  return (
    "You are working for another session. Your final message is returned to it as your complete result and " +
    `saved in ${folder}, so make it complete on its own. If you learn something reusable about tools, commands, ` +
    `or this codebase, write it to ${learnings}.`
  );
}

// Enough of a document to title it; the rest only costs tokens.
const describedLength = 40_000;

function describePrompt(kind: "response" | "learnings", text: string): string {
  const subject =
    kind === "response" ? "a subagent's final response to the session that dispatched it" : "a subagent's notes on lessons it learned while working";

  return (
    `Below is ${subject}. Write a catalog entry that lets a later reader decide whether to open it.\n` +
    'Reply with only JSON: {"title": "<at most 8 words>", "description": "<one sentence on what it establishes>"}.\n\n' +
    `<document>\n${text.length > describedLength ? `${text.slice(0, describedLength)}\n[truncated]` : text}\n</document>`
  );
}

// Models sometimes wrap JSON in a code fence.
function parseGenerated(text: string): z.infer<typeof generatedDescription> {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  return generatedDescription.parse(JSON.parse(text.slice(start, end + 1)));
}

export function createCairn(options: CairnPluginOptions) {
  const registered = new Map<string, Promise<SessionFacts>>();
  const noted = new Set<string>();
  const compacted = new Set<string>();
  const notes = new Map<string, string>();
  // A subagent's folder guidance, and where its responses and learnings go.
  const workspaces = new Map<string, Promise<{ guidance: string; learnings: string }>>();
  const responses = new Map<string, string>();
  const lastReturned = new Map<string, string>();
  const owned = new Map<string, Promise<boolean>>();

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

  // Registers a session on first sight. Registration is an upsert, so a repeat after a plugin reload is harmless.
  function register(sessionID: string): Promise<SessionFacts> {
    const known = registered.get(sessionID);

    if (known !== undefined) {
      return known;
    }

    const facts = options.session(sessionID).then((info) => {
      const args = ["session", "start", sessionKey(sessionID), "--cwd", info.directory];

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

      // A subagent asks for a path right after, which needs its parent recorded first.
      if (info.parentID === undefined) {
        options.cli.fire(args);

        return info;
      }

      return options.cli.output(args).then(() => info);
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

  // The system text for a model request: the session's catalog ID, and after a compaction, the compaction note.
  // The note stays in every later request, because system text isn't kept in the session's history.
  // Gives a path in the session tree's folder, granted to the session.
  async function grant(sessionID: string, topic: string): Promise<string> {
    const printed = await options.cli.output(["location", "--session", sessionKey(sessionID), "--topic", topic, "--json"]);

    return grantedPath.parse(JSON.parse(printed)).path;
  }

  function workspace(sessionID: string): Promise<{ guidance: string; learnings: string }> {
    const known = workspaces.get(sessionID);

    if (known !== undefined) {
      return known;
    }

    const found = grant(sessionID, `learnings ${sessionID}`).then((learnings) => ({
      guidance: childGuidance(dirname(learnings), learnings),
      learnings
    }));

    workspaces.set(sessionID, found);
    found.catch(() => workspaces.delete(sessionID));

    return found;
  }

  async function context(sessionID: string): Promise<string> {
    const parts = [`This session's catalog ID is ${sessionKey(sessionID)}.`];

    try {
      const facts = await register(sessionID);

      if (facts.parentID !== undefined) {
        parts.push((await workspace(sessionID)).guidance);
      }
    } catch (error) {
      options.log("unable to register the session", error instanceof Error ? error : new Error(String(error)));
    }

    if (compacted.has(sessionID)) {
      await refreshNote(sessionID);
    }

    const note = notes.get(sessionID);

    if (note !== undefined) {
      parts.push(note);
    }

    return parts.join("\n\n");
  }

  async function describeInBackground(path: string, childID: string, category: "evidence" | "learning", text: string): Promise<void> {
    try {
      const entry = parseGenerated(await options.generate(describePrompt(category === "evidence" ? "response" : "learnings", text)));

      options.cli.fire([
        "describe",
        path,
        "--category",
        category,
        "--title",
        entry.title,
        "--description",
        entry.description,
        "--session",
        sessionKey(childID)
      ]);
    } catch (error) {
      options.log("unable to describe a subagent's file", error instanceof Error ? error : new Error(String(error)));
    }
  }

  // Saves what a subagent returned in its session tree's folder, credited to the subagent, and describes it and
  // any learnings in the background. A follow-up to the same subagent is appended, because its reply often covers
  // only what was asked next. Returns null when there was nothing to save or saving failed.
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
    let file: string;

    try {
      await register(result.childID);
      path = saved ?? (await grant(result.childID, result.description));
      responses.set(result.childID, path);

      const earlier = saved === undefined ? null : await options.files.read(path);

      file = earlier === null ? result.text : `${earlier}\n---\n\n## Follow-up\n\n${result.text}`;
      await options.files.write(path, `${file}\n`);
      lastReturned.set(result.childID, result.text);
    } catch (error) {
      options.log("unable to save a subagent's response", error instanceof Error ? error : new Error(String(error)));

      return null;
    }

    options.cli.fire(["capture", path, "--session", sessionKey(result.childID)]);

    void describeInBackground(path, result.childID, "evidence", file);

    const learnings = await readLearnings(result.childID);

    if (learnings !== null) {
      void describeInBackground(learnings.path, result.childID, "learning", learnings.text);
    }

    return { response: path, learnings: learnings?.path ?? null };
  }

  // The learnings path granted to a subagent, or null when none was.
  async function learningsPath(sessionID: string): Promise<string | null> {
    try {
      return (await workspaces.get(sessionID))?.learnings ?? null;
    } catch {
      return null;
    }
  }

  async function readLearnings(childID: string): Promise<{ path: string; text: string } | null> {
    const known = workspaces.get(childID);

    if (known === undefined) {
      return null;
    }

    try {
      const { learnings } = await known;
      const text = await options.files.read(learnings);

      return text === null ? null : { path: learnings, text };
    } catch (error) {
      options.log("unable to read a subagent's learnings", error instanceof Error ? error : new Error(String(error)));

      return null;
    }
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

    let facts: SessionFacts;

    try {
      facts = await register(tool.sessionID);
    } catch (error) {
      options.log("unable to register the session", error instanceof Error ? error : new Error(String(error)));

      return null;
    }

    const key = sessionKey(tool.sessionID);
    const fresh: string[] = [];
    const learnings = await learningsPath(tool.sessionID);

    for (const path of touchedPaths(tool, facts.directory)) {
      const inside = relativeInsideRoot(options.root, path);

      if (inside === null || isCairnOwned(inside)) {
        continue;
      }

      options.cli.fire([verb, path, "--session", key]);

      const seen = `${tool.sessionID}\n${path}`;

      // A subagent's learnings are described for it when it returns.
      if (verb === "capture" && path !== learnings && !isEffortRecord(inside) && !noted.has(seen)) {
        noted.add(seen);
        fresh.push(path);
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

// A small model is enough to title and describe a finished response. The describeModel option overrides it.
const pluginOptions = z.object({
  describeModel: z
    .string()
    .regex(/^[^/#]+\/[^#]+(#.+)?$/, "Use provider/model or provider/model#variant")
    .default("openai/gpt-6-luna#high")
});

function modelRef(text: string): { providerID: string; id: string; variant?: string } {
  const [model = "", variant] = text.split("#");
  const slash = model.indexOf("/");
  const ref = { providerID: model.slice(0, slash), id: model.slice(slash + 1) };

  return variant === undefined ? ref : { ...ref, variant };
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
  const describeModel = modelRef(pluginOptions.parse(ctx.options).describeModel);

  const cairn = createCairn({
    root: resolveRoot(process.env.CAIRN_ROOT),
    // The build puts the plugin in dist/opencode/ and the CLI beside it in dist/.
    cli: nodeCli(fileURLToPath(new URL("../cli.js", import.meta.url))),
    files: { write: (path, text) => writeFile(path, text, "utf8"), read: readText },
    generate: async (prompt) => (await ctx.generate.text({ prompt, model: describeModel })).text,
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

      const saved = returned === null ? null : await cairn.subagentReturned(returned);

      // A background result reaches the parent through its inbox, where Cairn can't add its note the way it does to a
      // foreground result, so the note follows as its own message, without waking the parent.
      if (returned !== null && saved !== null) {
        try {
          await ctx.session.synthetic({
            sessionID,
            resume: false,
            description: `Cairn saved: ${returned.description}`,
            text: savedNote(`the result of "${returned.description}"`, saved),
            metadata: { source: "cairn" }
          });
        } catch (error) {
          console.error("[cairn] unable to tell the parent where a result was saved", error);
        }
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
    event.system.push({ type: "text", text: await cairn.context(event.sessionID) });
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
