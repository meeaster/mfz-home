import { execFile, spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isCairnOwned, isEffortRecord, relativeInsideRoot, resolveRoot } from "@mfz/cairn/root";
import { Plugin } from "@opencode/plugin";
import type { Result } from "@opencode/plugin/promise/tool";
import { z } from "zod";

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
};

export type CairnPluginOptions = {
  readonly root: string;
  readonly cli: CairnCli;
  readonly session: (sessionID: string) => Promise<SessionFacts>;
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

export function createCairn(options: CairnPluginOptions) {
  const registered = new Map<string, Promise<SessionFacts>>();
  const noted = new Set<string>();
  const compacted = new Set<string>();
  const notes = new Map<string, string>();

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

      // A root session's title is a placeholder until OpenCode generates one; a child's is its task description.
      if (info.parentID !== undefined && info.title !== undefined) {
        args.push("--title", info.title);
      }

      options.cli.fire(args);

      return info;
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
  async function context(sessionID: string): Promise<string> {
    try {
      await register(sessionID);
    } catch (error) {
      options.log("unable to register the session", error instanceof Error ? error : new Error(String(error)));
    }

    if (compacted.has(sessionID)) {
      await refreshNote(sessionID);
    }

    const note = notes.get(sessionID);
    const line = `This session's catalog ID is ${sessionKey(sessionID)}.`;

    return note === undefined ? line : `${line}\n\n${note}`;
  }

  // Records files the session wrote or read under the root. Returns new content for the tool result when a
  // written file should carry the capture note, or null to leave the result alone.
  async function afterTool(tool: CompletedTool): Promise<Content[] | null> {
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

    for (const path of touchedPaths(tool, facts.directory)) {
      const inside = relativeInsideRoot(options.root, path);

      if (inside === null || isCairnOwned(inside)) {
        continue;
      }

      options.cli.fire([verb, path, "--session", key]);

      const seen = `${tool.sessionID}\n${path}`;

      if (verb === "capture" && !isEffortRecord(inside) && !noted.has(seen)) {
        noted.add(seen);
        fresh.push(path);
      }
    }

    return fresh.length === 0 ? null : [...baseContent(tool), { type: "text", text: captureNote(key, fresh) }];
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

export async function setupCairnPlugin(ctx: Plugin.Context) {
  const cairn = createCairn({
    root: resolveRoot(process.env.CAIRN_ROOT),
    cli: nodeCli(fileURLToPath(import.meta.resolve("@mfz/cairn/cli"))),
    session: async (sessionID) => {
      const session = await ctx.session.get({ sessionID });

      return { parentID: session.parentID, agent: session.agent, title: session.title, directory: session.location.directory };
    },
    log: (message, error) => console.error(`[cairn] ${message}`, error)
  });

  const events = ctx.event.subscribe()[Symbol.asyncIterator]();

  const consume = (async () => {
    for (;;) {
      const next = await events.next();

      if (next.done === true) {
        return;
      }

      if (next.value.type === "session.compaction.ended") {
        cairn.compactionEnded(next.value.data.sessionID);
      }

      if (next.value.type === "session.execution.succeeded") {
        await cairn.turnCompleted(next.value.data.sessionID);
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

  return async () => {
    await contextHook.dispose();
    await toolHook.dispose();
    await events.return?.();
    await consume;
  };
}

export default Plugin.define({
  id: "cairn",
  setup: setupCairnPlugin
});
