import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { z } from "zod";
import { formatSessionKey, type SessionKey } from "../schemas.ts";
import { capture, read } from "../core/artifacts.ts";
import { conventions, sessionIntro } from "../core/conventions.ts";
import type { Cairn } from "../core/db.ts";
import { loadSession } from "../core/find.ts";
import { frontMatterBlock, hasFrontMatter } from "../core/front-matter.ts";
import { contentNote, folderCategory, relativeInsideRoot, subagentFolder } from "../core/root.ts";
import { ensureSession, sessionContext } from "../core/sessions.ts";
import { claudeCodeProcessOrigin, spawnerFromEnvironment, type Environment } from "./spawner.ts";

// Starts `cairn session index` in a process that outlives the hook. lastMessage goes to its stdin.
export type IndexLauncher = (session: string, transcript: string, lastMessage: string | null) => void;

export type HookOutput = {
  readonly hookSpecificOutput: { readonly hookEventName: string; readonly additionalContext: string };
};

const common = z.object({
  session_id: z.string(),
  transcript_path: z.string(),
  cwd: z.string(),
  agent_id: z.string().optional(),
  agent_type: z.string().optional()
});

const hookInput = z.discriminatedUnion("hook_event_name", [
  common.extend({ hook_event_name: z.literal("SessionStart"), source: z.string(), session_title: z.string().optional() }),
  common.extend({ hook_event_name: z.literal("SubagentStart"), agent_id: z.string(), agent_type: z.string() }),
  common.extend({
    hook_event_name: z.literal("SubagentStop"),
    agent_id: z.string(),
    agent_type: z.string(),
    last_assistant_message: z.string().nullable().optional()
  }),
  common.extend({
    hook_event_name: z.literal("PostToolUse"),
    tool_name: z.string(),
    tool_input: z.object({ file_path: z.string().optional(), notebook_path: z.string().optional() })
  }),
  common.extend({ hook_event_name: z.literal("Stop"), last_assistant_message: z.string().nullable().optional() })
]);

const eventName = z.object({ hook_event_name: z.string() });

const subagentMeta = z.object({ description: z.string().optional(), parentAgentId: z.string().optional() });

type HookInput = z.infer<typeof hookInput>;

type FileVerb = "capture" | "read";

const fileTools = new Map<string, FileVerb>([
  ["Write", "capture"],
  ["Edit", "capture"],
  ["MultiEdit", "capture"],
  ["NotebookEdit", "capture"],
  ["Read", "read"]
]);

const handledEvents = new Set(["SessionStart", "SubagentStart", "SubagentStop", "PostToolUse", "Stop"]);

function claudeKey(nativeId: string): SessionKey {
  return { harness: "claude-code", nativeId };
}

function context(hookEventName: string, additionalContext: string): HookOutput {
  return { hookSpecificOutput: { hookEventName, additionalContext } };
}

type SubagentFacts = {
  readonly title: string | undefined;
  readonly parent: SessionKey;
};

// The Agent tool's description and, for a nested subagent, the subagent that spawned it, from the metadata
// Claude Code keeps beside the subagent's transcript. Only Agent tool subagents get this file; Claude Code
// also fires subagent events with an agent_id for internal work that has none, so null means not a subagent.
function subagentFacts(input: HookInput, agentId: string): SubagentFacts | null {
  const meta = join(dirname(input.transcript_path), input.session_id, "subagents", `agent-${agentId}.meta.json`);
  const root = claudeKey(input.session_id);

  if (!existsSync(meta)) {
    return null;
  }

  const parsed = subagentMeta.safeParse(JSON.parse(readFileSync(meta, "utf8")));

  if (!parsed.success) {
    return { title: undefined, parent: root };
  }

  const { description, parentAgentId } = parsed.data;

  return { title: description, parent: parentAgentId === undefined ? root : claudeKey(parentAgentId) };
}

function mainSession(cairn: Cairn, input: HookInput): SessionKey {
  const key = claudeKey(input.session_id);

  ensureSession(cairn, key, { cwd: input.cwd });

  return key;
}

// A subagent shares its parent's session_id; the catalog records it as a child session keyed by agent_id.
// The metadata file appears just after SubagentStart, so a subagent is registered by its first event that
// finds the file. Events from internal work without the file belong to the main session.
function actingSession(cairn: Cairn, input: HookInput): SessionKey {
  if (input.agent_id === undefined) {
    return mainSession(cairn, input);
  }

  const facts = subagentFacts(input, input.agent_id);

  if (facts === null) {
    return mainSession(cairn, input);
  }

  const key = claudeKey(input.agent_id);

  ensureSession(cairn, key, { parent: facts.parent, cwd: input.cwd, agent: input.agent_type, title: facts.title });

  return key;
}

function captureNote(key: string, path: string): string {
  return (
    `Cairn recorded this file: ${path}\nfor session ${key}. It has no front matter, so Cairn lists it as undescribed; ` +
    "front matter at its top with a title and a one-sentence description describes it."
  );
}

// A Markdown file that doesn't describe itself. Other files have no front matter to add.
function undescribedMarkdown(path: string): boolean {
  return path.endsWith(".md") && existsSync(path) && !hasFrontMatter(readFileSync(path, "utf8"));
}

function toolUsed(cairn: Cairn, input: Extract<HookInput, { hook_event_name: "PostToolUse" }>): HookOutput | null {
  const verb = fileTools.get(input.tool_name);
  const path = input.tool_input.file_path ?? input.tool_input.notebook_path;

  if (verb === undefined || path === undefined) {
    return null;
  }

  const session = actingSession(cairn, input);

  if (verb === "read") {
    read(cairn, { path, session });

    return null;
  }

  const result = capture(cairn, { path, session });
  const inside = relativeInsideRoot(cairn, path);

  // The first capture of a Markdown file without front matter reminds its writer. Files filed by their folder need none.
  if (!result.recorded || !result.created || inside === null || folderCategory(inside) !== null || !undescribedMarkdown(path)) {
    return null;
  }

  return context("PostToolUse", captureNote(formatSessionKey(session), path));
}

// Saves a subagent's final message as result.md in its folder, where the parent and later sessions find it. A message
// that doesn't describe itself gets front matter titled from the Agent tool's description. A later message from the
// same subagent, after the parent sent it more work, is appended, because it usually answers only what was asked next.
function saveResult(cairn: Cairn, session: SessionKey, message: string, title: string): void {
  const folder = loadSession(cairn, ensureSession(cairn, session, {})).folder;
  const path = join(folder, "result.md");

  mkdirSync(folder, { recursive: true });

  const text = existsSync(path)
    ? `${readFileSync(path, "utf8").trimEnd()}\n\n---\n\n## Follow-up\n\n${message}\n`
    : `${hasFrontMatter(message) ? "" : frontMatterBlock({ title, category: "evidence" })}${message}\n`;

  writeFileSync(path, text, "utf8");
  capture(cairn, { path, session });
}

// What a subagent is told when it starts: its catalog ID and folder, how Cairn expects files, and where content lives.
// It may not be registered yet, so its folder is worked out from the main session's.
function subagentContext(cairn: Cairn, input: HookInput, agentId: string): string {
  const main = loadSession(cairn, ensureSession(cairn, claudeKey(input.session_id), { cwd: input.cwd }));
  const intro = sessionIntro({ key: formatSessionKey(claudeKey(agentId)), folder: subagentFolder(main.folder, agentId) });

  return `${intro}\n\n${conventions}\n\n${contentNote(cairn)}`;
}

// Exports the session's catalog ID to every shell command the session runs, so a claude -p or opencode run it
// starts can name it as its spawner. Claude Code sources CLAUDE_ENV_FILE before each Bash command.
function exportToShells(env: Environment, key: SessionKey): void {
  if (env.CLAUDE_ENV_FILE !== undefined && env.CLAUDE_ENV_FILE !== "") {
    appendFileSync(env.CLAUDE_ENV_FILE, `export CAIRN_SESSION='${formatSessionKey(key)}'\n`);
  }
}

// Handles one Claude Code hook event and returns the context to add, if any. env is the hook's environment,
// which Claude Code passes on from the process that started it.
export function claudeCodeHook(cairn: Cairn, stdin: string, launchIndex: IndexLauncher, env: Environment): HookOutput | null {
  const raw: unknown = JSON.parse(stdin);
  const name = eventName.parse(raw).hook_event_name;

  if (!handledEvents.has(name)) {
    return null;
  }

  const input = hookInput.parse(raw);

  switch (input.hook_event_name) {
    case "SessionStart": {
      const key = claudeKey(input.session_id);

      ensureSession(cairn, key, {
        cwd: input.cwd,
        agent: input.agent_type,
        title: input.session_title,
        spawnedBy: spawnerFromEnvironment(env),
        origin: claudeCodeProcessOrigin(env)
      });
      exportToShells(env, key);

      // A resumed session may have turns the last export missed.
      if (input.source === "resume") {
        launchIndex(formatSessionKey(key), input.transcript_path, null);
      }

      // After a compaction, the note restates the session's efforts and records along with the conventions.
      const opening =
        input.source === "compact" ? sessionContext(cairn, { session: key }).note : sessionIntro(loadSession(cairn, ensureSession(cairn, key, {})));

      return context("SessionStart", `${opening}\n\n${conventions}\n\n${contentNote(cairn)}`);
    }

    // The subagent's ID is its catalog ID even before its metadata file lets it be registered.
    case "SubagentStart":
      actingSession(cairn, input);

      return context("SubagentStart", subagentContext(cairn, input, input.agent_id));
    case "SubagentStop": {
      const session = actingSession(cairn, input);
      const message = input.last_assistant_message ?? "";

      // Internal agents without metadata act as the main session, and their messages aren't results.
      if (session.nativeId === input.agent_id && message.trim() !== "") {
        saveResult(cairn, session, message, subagentFacts(input, input.agent_id)?.title ?? (input.agent_type === "" ? "Subagent result" : input.agent_type));
      }

      return null;
    }

    case "PostToolUse":
      return toolUsed(cairn, input);
    case "Stop": {
      // Stop is the main agent's; a subagent's turn ends with SubagentStop, which Cairn doesn't handle.
      if (input.agent_id === undefined) {
        const key = actingSession(cairn, input);

        launchIndex(formatSessionKey(key), input.transcript_path, input.last_assistant_message ?? null);
      }

      return null;
    }
  }
}
