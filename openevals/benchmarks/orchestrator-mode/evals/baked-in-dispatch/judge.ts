import { z } from "zod";
import type { JudgeContext, RecordedFile, ToolCall } from "@hona/openeval";

/** Tools that change the workspace or run arbitrary commands. */
const mutatingTools: ReadonlySet<string> = new Set([
  "bash",
  "edit",
  "multiedit",
  "patch",
  "shell",
  "write",
]);

/** Tools that create a child session. */
const dispatchTools: ReadonlySet<string> = new Set(["subagent", "task"]);

const skillCall = z.object({ id: z.string() });

export type RestraintFacts = {
  tools: readonly ToolCall[];
  sessions: readonly { parentID?: string }[];
  initial: readonly RecordedFile[];
  final: readonly RecordedFile[];
};

function matchingTools(tools: readonly ToolCall[], names: ReadonlySet<string>): string[] {
  const found: string[] = [];

  for (const tool of tools) if (names.has(tool.name)) found.push(tool.name);

  return found;
}

/** The skill the candidate loaded first through a successful `skill` call. */
export function loadedSkill(tools: readonly ToolCall[]): string | null {
  for (const tool of tools) {
    if (tool.name !== "skill" || tool.status !== "succeeded") continue;

    const parsed = skillCall.safeParse(tool.input);

    if (parsed.success) return parsed.data.id;
  }

  return null;
}

function signatures(files: readonly RecordedFile[]): Map<string, string> {
  const values = new Map<string, string>();

  for (const file of files) values.set(file.path, file.sha256 ?? file.symlink ?? "");

  return values;
}

/** Paths whose content or link target differs between two revisions. */
export function changedPaths(
  initial: readonly RecordedFile[],
  final: readonly RecordedFile[],
): string[] {
  const before = signatures(initial);

  const after = signatures(final);

  const paths = new Set([...before.keys(), ...after.keys()]);

  return [...paths].filter((path) => before.get(path) !== after.get(path));
}

/**
 * Grade the archive facts. The response is graded separately by `judge.md`;
 * these criteria must be decidable without reading the response.
 */
export function gradeFacts(facts: RestraintFacts) {
  const skillId = loadedSkill(facts.tools);

  const mutations = matchingTools(facts.tools, mutatingTools);

  const dispatches = matchingTools(facts.tools, dispatchTools);

  const children = facts.sessions.filter((session) => session.parentID !== undefined);

  const changed = changedPaths(facts.initial, facts.final);

  return {
    scores: {
      guidance_loaded: skillId === "orchestrator-mode",
      restraint_observed:
        mutations.length === 0 &&
        changed.length === 0 &&
        children.length === 0 &&
        dispatches.length === 0,
    },
    observations: {
      skill: skillId,
      mutatingTools: mutations,
      dispatchTools: dispatches,
      childSessions: children.length,
      changedPaths: changed,
    },
  };
}

export default async ({ recording, workspace }: JudgeContext) => {
  return gradeFacts({
    tools: recording.tools(),
    sessions: await recording.sessions(),
    initial: workspace.files("initial"),
    final: workspace.files("final"),
  });
};
