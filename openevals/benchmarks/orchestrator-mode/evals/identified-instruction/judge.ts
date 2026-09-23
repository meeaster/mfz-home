import { z } from "zod";
import type { JudgeContext, RecordedFile, ToolCall } from "@hona/openeval";

const skillInput = z.object({ id: z.string() });

function fileDigests(files: readonly RecordedFile[]): Map<string, string> {
  const digests = new Map<string, string>();

  for (const file of files) digests.set(file.path, file.sha256 ?? file.symlink ?? "");

  return digests;
}

export function gradeInstructionFacts(
  tools: readonly ToolCall[],
  sessions: readonly { parentID?: string }[],
  initial: readonly RecordedFile[],
  final: readonly RecordedFile[],
) {
  const loaded = tools.some((tool) =>
    tool.name === "skill" &&
    tool.status === "succeeded" &&
    skillInput.safeParse(tool.input).data?.id === "orchestrator-mode"
  );

  const dispatched = tools.some((tool) =>
    (tool.name === "subagent" || tool.name === "task") && tool.status === "succeeded"
  );

  const before = fileDigests(initial);

  const after = fileDigests(final);

  const unchanged = [...new Set([...before.keys(), ...after.keys()])].every((path) => before.get(path) === after.get(path));

  return {
    scores: {
      guidance_loaded: loaded,
      no_child_dispatch: !dispatched && sessions.every((session) => session.parentID === undefined),
      workspace_unchanged: unchanged,
    },
  };
}

export default async ({ recording, workspace }: JudgeContext) => gradeInstructionFacts(
  recording.tools(),
  await recording.sessions(),
  workspace.files("initial"),
  workspace.files("final"),
);
