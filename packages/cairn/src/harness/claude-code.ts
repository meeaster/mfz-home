import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { z } from "zod";
import { formatSessionKey, type SessionKey } from "../schemas.ts";
import { capture, read } from "../core/artifacts.ts";
import type { Cairn } from "../core/db.ts";
import { isEffortRecord, relativeInsideRoot } from "../core/root.ts";
import { ensureSession, sessionContext } from "../core/sessions.ts";

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
  common.extend({ hook_event_name: z.literal("SubagentStop"), agent_id: z.string(), agent_type: z.string() }),
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
// Claude Code keeps beside the subagent's transcript. The file can appear after SubagentStart, so every
// subagent event reads it; registration fills a missing title and moves the session under its real parent.
function subagentFacts(input: HookInput, agentId: string): SubagentFacts {
  const meta = join(dirname(input.transcript_path), input.session_id, "subagents", `agent-${agentId}.meta.json`);
  const root = claudeKey(input.session_id);

  if (!existsSync(meta)) {
    return { title: undefined, parent: root };
  }

  const parsed = subagentMeta.safeParse(JSON.parse(readFileSync(meta, "utf8")));

  if (!parsed.success) {
    return { title: undefined, parent: root };
  }

  const { description, parentAgentId } = parsed.data;

  return { title: description, parent: parentAgentId === undefined ? root : claudeKey(parentAgentId) };
}

// A subagent shares its parent's session_id; the catalog records it as a child session keyed by agent_id.
function actingSession(cairn: Cairn, input: HookInput): SessionKey {
  if (input.agent_id === undefined) {
    ensureSession(cairn, claudeKey(input.session_id), { cwd: input.cwd });

    return claudeKey(input.session_id);
  }

  const key = claudeKey(input.agent_id);
  const { title, parent } = subagentFacts(input, input.agent_id);

  ensureSession(cairn, key, { parent, cwd: input.cwd, agent: input.agent_type, title });

  return key;
}

function captureNote(key: string, path: string): string {
  return (
    `The catalog (Cairn) recorded this file: ${path}\nfor session ${key}. ` +
    "A file without a category and a title or description is listed as undescribed. " +
    "catalog_describe records what it is: category, title, and a one-sentence description."
  );
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
  const inside = relativeInsideRoot(cairn.root, path);

  // The first capture of a file reminds its writer to describe it. Effort records need no description.
  if (!result.recorded || !result.created || inside === null || isEffortRecord(inside)) {
    return null;
  }

  return context("PostToolUse", captureNote(formatSessionKey(session), path));
}

// Handles one Claude Code hook event and returns the context to add, if any.
export function claudeCodeHook(cairn: Cairn, stdin: string, launchIndex: IndexLauncher): HookOutput | null {
  const raw: unknown = JSON.parse(stdin);
  const name = eventName.parse(raw).hook_event_name;

  if (!handledEvents.has(name)) {
    return null;
  }

  const input = hookInput.parse(raw);

  switch (input.hook_event_name) {
    case "SessionStart": {
      const key = claudeKey(input.session_id);

      ensureSession(cairn, key, { cwd: input.cwd, agent: input.agent_type, title: input.session_title });

      // A resumed session may have turns the last export missed.
      if (input.source === "resume") {
        launchIndex(formatSessionKey(key), input.transcript_path, null);
      }

      // After a compaction, the note restates the session's efforts and records.
      if (input.source === "compact") {
        return context("SessionStart", sessionContext(cairn, { session: key }).note);
      }

      return context("SessionStart", `This session's catalog ID is ${formatSessionKey(key)}.`);
    }

    case "SubagentStart":
      return context("SubagentStart", `This session's catalog ID is ${formatSessionKey(actingSession(cairn, input))}.`);
    case "SubagentStop":
      actingSession(cairn, input);

      return null;

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
