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
 * requires `task-evidence` of producers rather than loading it, and reads design collaboration directly
 * rather than invoking the human-only `design-partner` entry. Standalone design partnership may load
 * `evidence-gathering` when an investigation could change the decision.
 */
export const roleSkills = {
  directCoordinator: new Set(["orchestrate", "orchestration", "effort-context", "evidence-gathering"]),
  evidenceProducer: new Set(["evidence-gathering", "task-evidence", "effort-context"]),
  designPartner: new Set(["design-partner", "evidence-gathering"]),
} satisfies Record<string, ReadonlySet<string>>;

/** VCS metadata and dependency directories are not task content. */
const ignoredSegments: ReadonlySet<string> = new Set([".git", "node_modules", "upstream.git"]);

const skillInput = z.object({ id: z.string() });

const subagentInput = z.object({ agent: z.string() });

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
