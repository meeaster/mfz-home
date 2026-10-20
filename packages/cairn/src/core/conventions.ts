import type { SessionSummary } from "./find.ts";

// What a session is told about itself: its catalog ID and the folder its working files go in. It differs per session,
// so the harness integration puts it in the conversation rather than the system text.
export function sessionIntro(session: Pick<SessionSummary, "key" | "folder">): string {
  return `This session's catalog ID is ${session.key}. Its folder is ${session.folder}.`;
}

// How sessions keep Cairn informed without calling a tool. It is the same text for every session, so it can join the
// system text without costing subagents a shared cache entry, and it is phrased as facts because Claude Code treats
// imperative hook context as a possible prompt injection.
export const conventions = [
  "Cairn records the files sessions write. Working files (evidence, notes, drafts, exports, and anything else kept for " +
    "later) go in the session's own folder, named for their content; the folder's path is given with the session's " +
    "catalog ID, and the folder exists once something is written there. A Markdown file there describes itself with " +
    "front matter at its top, which Cairn reads whenever the file is written, whether by a file tool or the shell:",
  "",
  "---",
  "title: <a few words>",
  "description: <one sentence on what it establishes>",
  "category: <evidence, synthesis, source, deliverable, learning, or other; evidence when left out>",
  "---",
  "",
  "No tool call is needed to record or describe a file. A subagent's final message is its result: Cairn saves it in the " +
    "subagent's folder as result.md, and a final message that starts with the same front matter describes itself. A " +
    "large result, or one the parent only passes on, goes in a file in that folder instead, with the final message " +
    "giving a short summary and the path. Reusable lessons about tools, commands, or the code go in learnings.md in " +
    "the session's folder, with category learning in its front matter."
].join("\n");
