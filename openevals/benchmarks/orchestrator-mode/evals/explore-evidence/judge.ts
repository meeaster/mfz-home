import { z } from "zod";
import type { JudgeContext, RecordedFile, ToolCall } from "@hona/openeval";

const subagentCall = z.object({ agent: z.string() });

/** VCS metadata and dependency directories are not task content. */
const ignoredSegments: ReadonlySet<string> = new Set([".git", "node_modules", "upstream.git"]);

export type RoutingFacts = {
  tools: readonly ToolCall[];
  sessions: readonly { parentID?: string }[];
  initial: readonly RecordedFile[];
  final: readonly RecordedFile[];
};

/** Agent names requested through successful `subagent` calls. */
export function subagentTargets(tools: readonly ToolCall[]): string[] {
  const targets: string[] = [];

  for (const tool of tools) {
    if (tool.name !== "subagent" || tool.status !== "succeeded") continue;

    const parsed = subagentCall.safeParse(tool.input);

    if (parsed.success) targets.push(parsed.data.agent);
  }

  return targets;
}

function signatures(files: readonly RecordedFile[]): Map<string, string> {
  const values = new Map<string, string>();

  for (const file of files) {
    if (file.path.split("/").some((segment) => ignoredSegments.has(segment))) continue;

    values.set(file.path, file.sha256 ?? file.symlink ?? "");
  }

  return values;
}

/** Repository paths whose content or link target differs between two revisions. */
export function changedPaths(
  initial: readonly RecordedFile[],
  final: readonly RecordedFile[],
): string[] {
  const before = signatures(initial);

  const after = signatures(final);

  const paths = new Set([...before.keys(), ...after.keys()]);

  const changed: string[] = [];

  for (const path of paths) if (before.get(path) !== after.get(path)) changed.push(path);

  return changed;
}

/**
 * Grade the archive facts. The response is graded separately by `judge.md`;
 * these criteria must be decidable without reading the response.
 */
export function gradeFacts(facts: RoutingFacts) {
  const targets = subagentTargets(facts.tools);

  const children = facts.sessions.filter((session) => session.parentID !== undefined);

  const changed = changedPaths(facts.initial, facts.final);

  return {
    scores: {
      explore_dispatched: targets.includes("explore") && children.length > 0,
      repository_unchanged: changed.length === 0,
    },
    observations: {
      subagentTargets: targets,
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
