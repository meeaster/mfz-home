import { z } from "zod";
import type { JudgeContext, RecordedFile, ToolCall } from "@hona/openeval";

/**
 * Archive facts shared by the code judges. Code judges grade only what the
 * recording establishes; response meaning belongs in each eval's `judge.md`.
 */
export type RunFacts = {
  tools: readonly ToolCall[];
  sessions: readonly { id: string; parentID?: string }[];
  initial: readonly RecordedFile[];
  final: readonly RecordedFile[];
};

/** Tools that change files or run arbitrary commands. */
export const mutatingTools: ReadonlySet<string> = new Set(["bash", "edit", "multiedit", "patch", "shell", "write"]);

/** Tools that create a child session. */
export const dispatchTools: ReadonlySet<string> = new Set(["subagent", "task"]);

/**
 * Skills each role's guidance has it load; any other load takes on guidance its work does not own.
 * Direct coordination loads `effort-context` for storage and `evidence-gathering` to bound investigations,
 * requires `task-output` of producers rather than loading it, and reads design collaboration directly
 * rather than invoking the human-only `design-partner` entry. Standalone design partnership may load
 * `evidence-gathering` when an investigation could change the decision.
 */
export const roleSkills = {
  directCoordinator: new Set(["orchestrate", "orchestration", "effort-context", "evidence-gathering"]),
  evidenceProducer: new Set(["evidence-gathering", "task-output", "effort-context"]),
  designPartner: new Set(["design-partner", "evidence-gathering"]),
} satisfies Record<string, ReadonlySet<string>>;

/** VCS metadata and dependency directories are not task content. */
const ignoredSegments: ReadonlySet<string> = new Set([".git", "node_modules", "upstream.git"]);

const skillInput = z.object({ id: z.string() });

const subagentInput = z.object({ agent: z.string() });

/** Tools that write a file by path. */
const fileWriteTools: ReadonlySet<string> = new Set(["edit", "multiedit", "patch", "write"]);

const fileWriteInput = z.object({ filePath: z.string().optional(), path: z.string().optional(), patchText: z.string().optional() });

/** File headers in an `apply_patch` body. */
const patchedFile = /^\*\*\* (?:Add|Update) File: (.+)$/gmu;

export async function runFacts({ recording, workspace }: JudgeContext): Promise<RunFacts> {
  return {
    tools: recording.tools(),
    sessions: await recording.sessions(),
    initial: workspace.files("initial"),
    final: workspace.files("final"),
  };
}

/** Skill IDs from successful `skill` calls, in call order. */
export function loadedSkills(tools: readonly ToolCall[]): string[] {
  const skills: string[] = [];

  for (const tool of tools) {
    if (tool.name !== "skill" || tool.status !== "succeeded") continue;

    const input = skillInput.safeParse(tool.input);

    if (input.success) skills.push(input.data.id);
  }

  return skills;
}

/** Skills loaded by the root session and by its child sessions, each in call order. */
export function sessionSkills(facts: Pick<RunFacts, "tools" | "sessions">) {
  const childIDs = new Set<string>();

  for (const session of facts.sessions) if (session.parentID !== undefined) childIDs.add(session.id);

  const rootTools: ToolCall[] = [];

  const childTools: ToolCall[] = [];

  for (const tool of facts.tools) {
    if (tool.sessionID !== undefined && childIDs.has(tool.sessionID)) childTools.push(tool);
    else rootTools.push(tool);
  }

  return { root: loadedSkills(rootTools), children: loadedSkills(childTools) };
}

/** Distinct loaded skills outside a role's set, in first-load order. */
export function skillsOutsideRole(skills: readonly string[], role: ReadonlySet<string>): string[] {
  const outside = new Set<string>();

  for (const skill of skills) if (!role.has(skill)) outside.add(skill);

  return [...outside];
}

/** Whether the reusable `orchestration` procedures were loaded after the given entry skill, as each entry requires. */
export function loadedRoleProcedures(skills: readonly string[], entry: string): boolean {
  const entered = skills.indexOf(entry);

  return entered !== -1 && skills.indexOf("orchestration", entered + 1) !== -1;
}

/** Agent names requested through successful `subagent` calls. */
export function subagentTargets(tools: readonly ToolCall[]): string[] {
  const targets: string[] = [];

  for (const tool of tools) {
    if (tool.name !== "subagent" || tool.status !== "succeeded") continue;

    const input = subagentInput.safeParse(tool.input);

    if (input.success) targets.push(input.data.agent);
  }

  return targets;
}

/** Names of attempted calls to the given tools, whatever their outcome. */
export function attemptedTools(tools: readonly ToolCall[], names: ReadonlySet<string>): string[] {
  const attempted: string[] = [];

  for (const tool of tools) if (names.has(tool.name)) attempted.push(tool.name);

  return attempted;
}

export function childSessionCount(sessions: RunFacts["sessions"]): number {
  let count = 0;

  for (const session of sessions) if (session.parentID !== undefined) count += 1;

  return count;
}

function signatures(files: readonly RecordedFile[]): Map<string, string> {
  const values = new Map<string, string>();

  for (const file of files) {
    if (file.path.split("/").some((segment) => ignoredSegments.has(segment))) continue;

    values.set(file.path, file.sha256 ?? file.symlink ?? "");
  }

  return values;
}

/** Task paths whose content or link target differs between two snapshots. */
export function changedPaths(initial: readonly RecordedFile[], final: readonly RecordedFile[]): string[] {
  const before = signatures(initial);

  const after = signatures(final);

  const changed: string[] = [];

  for (const path of new Set([...before.keys(), ...after.keys()])) {
    if (before.get(path) !== after.get(path)) changed.push(path);
  }

  return changed;
}

const commandInput = z.object({ command: z.string() });

/** Tools that run shell commands, which can write files through redirection. */
const shellTools: ReadonlySet<string> = new Set(["bash", "shell"]);

/** Targets of `>`, `>>`, or `tee` in a shell command. */
const redirectTarget = /(?:\d?>>?|\btee(?:\s+-a)?)\s*["']?([^\s"';|&<>()]+)/gu;

function redirectedPaths(command: string): string[] {
  const paths: string[] = [];

  for (const [, path] of command.matchAll(redirectTarget)) if (path !== undefined) paths.push(path);

  return paths;
}

/** Paths a successful call wrote, through a file tool or a shell redirect. */
function writtenPaths(tool: ToolCall): string[] {
  if (tool.status !== "succeeded") return [];

  if (shellTools.has(tool.name)) {
    const command = commandInput.safeParse(tool.input);

    return command.success ? redirectedPaths(command.data.command) : [];
  }

  if (!fileWriteTools.has(tool.name)) return [];

  const input = fileWriteInput.safeParse(tool.input);

  if (!input.success) return [];

  const paths: string[] = [];

  const direct = input.data.filePath ?? input.data.path;

  if (direct !== undefined) paths.push(direct);

  for (const [, path] of (input.data.patchText ?? "").matchAll(patchedFile)) if (path !== undefined) paths.push(path);

  return paths;
}

const readInput = z.object({ path: z.string(), offset: z.number().optional(), limit: z.number().optional() });

/** Whether a successful call read `path`, whole or in a line window. A shell redirect into `path` is not a read. */
function readsPath(tool: ToolCall, path: string): { whole: boolean } | undefined {
  if (tool.status !== "succeeded") return undefined;

  if (tool.name === "read") {
    const input = readInput.safeParse(tool.input);

    if (!input.success || input.data.path !== path) return undefined;

    return { whole: (input.data.offset ?? 1) <= 1 && input.data.limit === undefined };
  }

  const input = commandInput.safeParse(tool.input);

  if (!input.success || !input.data.command.includes(path) || redirectedPaths(input.data.command).includes(path)) return undefined;

  return /(?:^|[\s;&|(])cat\s/u.test(input.data.command) ? { whole: true } : undefined;
}

/**
 * Files under `directory` that a root-dispatched session wrote and its root session did not read.
 * The root reads each returned file whole once it first exists; after a follow-up changes the file, reading
 * the changed part is enough, so any read after the last write counts.
 */
export function returnedFilesUnread(facts: Pick<RunFacts, "tools" | "sessions">, directory: string): string[] {
  const parents = new Map<string, string>();

  for (const session of facts.sessions) if (session.parentID !== undefined) parents.set(session.id, session.parentID);

  const roots = new Set<string>();

  for (const session of facts.sessions) if (session.parentID === undefined) roots.add(session.id);

  const writes = new Map<string, { first: number; last: number; root: string }>();

  for (const [index, tool] of facts.tools.entries()) {
    const root = tool.sessionID === undefined ? undefined : parents.get(tool.sessionID);

    if (root === undefined || !roots.has(root)) continue;

    for (const path of writtenPaths(tool)) {
      if (!path.includes(directory)) continue;

      const known = writes.get(path);

      writes.set(path, { first: known?.first ?? index, last: index, root });
    }
  }

  const unread: string[] = [];

  for (const [path, write] of writes) {
    let wholeRead = false;

    let readSinceLastWrite = false;

    for (const [index, tool] of facts.tools.entries()) {
      if (index <= write.first || tool.sessionID !== write.root) continue;

      const read = readsPath(tool, path);

      if (read === undefined) continue;

      if (read.whole) wholeRead = true;

      if (index > write.last) readSinceLastWrite = true;
    }

    if (!wholeRead || !readSinceLastWrite) unread.push(path);
  }

  return unread;
}

/**
 * Sessions a root session dispatched that wrote no file under `directory`.
 * Helpers nested inside a dispatched session return to it and are not counted.
 */
export function dispatchesWithoutFile(facts: Pick<RunFacts, "tools" | "sessions">, directory: string): string[] {
  const roots = new Set<string>();

  for (const session of facts.sessions) if (session.parentID === undefined) roots.add(session.id);

  const wrote = new Set<string>();

  for (const tool of facts.tools) {
    if (tool.sessionID === undefined) continue;

    if (writtenPaths(tool).some((path) => path.includes(directory))) wrote.add(tool.sessionID);
  }

  const missing: string[] = [];

  for (const session of facts.sessions) {
    if (session.parentID !== undefined && roots.has(session.parentID) && !wrote.has(session.id)) missing.push(session.id);
  }

  return missing;
}
