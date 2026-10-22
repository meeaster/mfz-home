// Reads OpenCode's compaction checkpoint. After a compaction OpenCode replaces earlier history with one user message:
// a summary plus `<recent-context>`, the newest messages serialized as `[User]: …`, `[Assistant]: …` entries joined by
// blank lines.

export const CHECKPOINT_TAG = "<conversation-checkpoint>";

const USER_ENTRY = "[User]: ";

export function isCheckpoint(text: string) {
  return text.startsWith(CHECKPOINT_TAG);
}

// The prompts Claude has not seen yet. Claude Code's session already holds every exchange up to its last reply, and
// an automatic compaction runs before a new prompt is sent, so only user entries after the last assistant entry are new.
export function unseenPrompts(checkpoint: string) {
  const recent = /<recent-context>\n([\s\S]*)\n<\/recent-context>/.exec(checkpoint)?.[1] ?? "";
  const tail = recent.slice(Math.max(recent.lastIndexOf("[Assistant"), 0));

  return tail.split(/\n\n(?=\[User\]: )/).flatMap((entry) => (entry.startsWith(USER_ENTRY) ? [entry.slice(USER_ENTRY.length)] : []));
}
