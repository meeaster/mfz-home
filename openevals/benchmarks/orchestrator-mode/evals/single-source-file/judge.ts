import { z } from "zod";
import type { JudgeContext, RecordedFile, ToolCall } from "@hona/openeval";

const subagentInput = z.object({ agent: z.string() });

function fileDigests(files: readonly RecordedFile[]): Map<string, string> {
  const digests = new Map<string, string>();

  for (const file of files) digests.set(file.path, file.sha256 ?? file.symlink ?? "");

  return digests;
}

export function gradeSourceFacts(
  tools: readonly ToolCall[],
  sessions: readonly { parentID?: string }[],
  initial: readonly RecordedFile[],
  final: readonly RecordedFile[],
) {
  const explore = tools.some((tool) =>
    tool.name === "subagent" &&
    tool.status === "succeeded" &&
    subagentInput.safeParse(tool.input).data?.agent === "explore"
  );

  const before = fileDigests(initial);

  const after = fileDigests(final);

  const unchanged = [...new Set([...before.keys(), ...after.keys()])].every((path) => before.get(path) === after.get(path));

  return {
    scores: {
      explore_dispatched: explore && sessions.some((session) => session.parentID !== undefined),
      workspace_unchanged: unchanged,
    },
  };
}

export default async ({ recording, workspace }: JudgeContext) => gradeSourceFacts(
  recording.tools(),
  await recording.sessions(),
  workspace.files("initial"),
  workspace.files("final"),
);
