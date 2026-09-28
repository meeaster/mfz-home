import { dispatchesWithoutFile, loadedSkills, outputRoot, pathsWrittenBy, returnedFilesUnread, subagentTargets, type RunFacts } from "./facts.js";

/** Human-only workflow entries and the procedures they select; a default session selects none of them. */
export const workflowSkills: ReadonlySet<string> = new Set(["orchestrate", "orchestrate-chief", "orchestration", "design-partner", "skill-authoring"]);

/** The root session's own calls, from a view where the agent under test is the root. */
export function rootCalls(view: Pick<RunFacts, "tools" | "sessions">) {
  const root = view.sessions.find((session) => session.parentID === undefined)?.id;

  return { root, tools: view.tools.filter((tool) => tool.sessionID === root) };
}

/** Output files the root session wrote itself under Cairn's root. */
export function rootOutputFiles(view: Pick<RunFacts, "tools" | "sessions">): string[] {
  const { root } = rootCalls(view);

  return root === undefined ? [] : pathsWrittenBy(view, new Set([root])).filter((path) => path.includes(outputRoot));
}

/**
 * Whether every subagent the root dispatched wrote its response under Cairn's root and the root read it.
 * Null when nothing was dispatched: the delegation contract did not arise.
 */
export function delegatedOutputs(view: Pick<RunFacts, "tools" | "sessions">) {
  const dispatched = subagentTargets(rootCalls(view).tools);

  const withoutFile = dispatchesWithoutFile(view);

  const unread = returnedFilesUnread(view);

  return {
    read: dispatched.length === 0 ? null : withoutFile.length === 0 && unread.length === 0,
    observations: { dispatched, dispatchesWithoutFile: withoutFile, returnedFilesUnread: unread },
  };
}

/**
 * Output behavior of a default session that was not asked to save anything. A session answers its own work
 * in its reply: it loads no `task-output`, writes no output file, and loads `effort-context` only to assign
 * a path to a subagent it dispatched. Each dispatched subagent writes its response under Cairn's root, and
 * the session reads it.
 */
export function defaultSessionOutput(view: RunFacts) {
  const rootSkills = loadedSkills(rootCalls(view).tools);

  const delegated = delegatedOutputs(view);

  const outputSkills = rootSkills.filter((skill) => skill === "task-output" || (skill === "effort-context" && delegated.observations.dispatched.length === 0));

  const outputFiles = rootOutputFiles(view);

  return {
    scores: {
      session_output_skills: outputSkills.length === 0,
      no_session_output_file: outputFiles.length === 0,
      delegated_outputs_read: delegated.read,
    },
    observations: { rootSkills, outputSkills, outputFiles, ...delegated.observations },
  };
}
