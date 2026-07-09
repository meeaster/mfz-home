# Claude Code Sessions

Claude Code session archaeology reads JSONL files under a store root. There is no database or query CLI. Use `jq`, not raw file reads, because transcripts routinely exceed tool size caps.

## Locate The Store

Default to `~/.claude`. When the user names a different store root, read that path instead. The layout shifts between Claude Code versions; confirm files exist before relying on them.

The project-dir encoding is lossy: `/`, `.`, and `_` in the real path collapse to `-`. Never reconstruct the encoded name by hand. Glob the projects dir and confirm against `cwd` inside files:

```bash
ls ~/.claude/projects/
jq -rc 'select(.cwd) | .cwd' ~/.claude/projects/<encoded>/*.jsonl | head -1
```

## Storage Map

Confirm against live files before relying on this map:

| Path | Holds | Notes |
| ---- | ----- | ----- |
| `~/.claude/history.jsonl` | interactively typed prompts | Fast label cache, not the session index. Non-interactive sessions can have transcripts without history lines. |
| `~/.claude.json` | global metadata | Peer of the store root. |
| `~/.claude/projects/<encoded>/<session-id>.jsonl` | one session transcript | Main artifact. Records can include `user`, `assistant`, `system`, `ai-title`, `last-prompt`, `mode`, `permission-mode`, `attachment`, `file-history-snapshot`, and queue operations. |
| `.../<session-id>/subagents/agent-*.jsonl` | subagent transcripts | Each has a sibling `.meta.json` with `agentType`, `description`, and `toolUseId` linking back to the parent `Agent` tool call. |
| `~/.claude/transcripts/` | noisier global store | Late fallback only; not keyed cleanly by project/session. |

Inside a session JSONL, metadata (`cwd`, `gitBranch`, `version`, `sessionId`) rides on records that carry it. The AI-generated title is in `ai-title.aiTitle`. Tool calls are `tool_use` blocks in assistant `message.content`; tool output is in the next user record's `toolUseResult`.

## Find A Session

The transcript glob is the authoritative session set. `history.jsonl` is only a label cache and misses non-interactive sessions. List transcripts newest-first and label each by `ai-title`:

```bash
ls -t ~/.claude/projects/<encoded>/*.jsonl | head -20 | while read -r f; do
  printf '%s\t%s\n' "$(basename "$f" .jsonl)" \
    "$(jq -rc 'select(.type=="ai-title") | .aiTitle' "$f" | tail -1)"
done
```

Match by `ai-title` plus recency. An explicit `sessionId` beats everything; `gitBranch` or edited files break ties. A first typed prompt of `.`, a slash command like `/model`, `/resume`, or `/compact`, or a `<command-message>` skill header means look past it to `ai-title` or a later prompt.

When a session contains `/compact`, treat the next substantive queued/user message as a fresh opening prompt for a new phase:

```bash
jq -r 'select(.type=="queue-operation" and .operation=="enqueue") | [.timestamp, (.content|gsub("\n";" ")|.[0:220])] | @tsv' ~/.claude/projects/<encoded>/<sid>.jsonl
```

Prefer structural keys over phrase regexes. Scan the newest-first list by eye, use recency and `/clear` boundaries first, and use phrase matching only as a tiebreaker.

Find sessions that loaded a skill by scanning `Skill` tool calls in main transcripts and subagent transcripts:

```bash
grep -rl '"skill":"<name>"' ~/.claude/projects/*/*.jsonl ~/.claude/projects/*/*/subagents/*.jsonl
```

A `~/.claude/projects/<encoded>/<sid>/subagents/agent-*.jsonl` hit belongs to parent session `<sid>`. Also check user-typed slash invocations (`/<name>`) in `history.jsonl` when "used a skill" includes manual invocation.

Identify a session file without reading the body:

```bash
jq -rc 'select(.type=="ai-title") | .aiTitle' ~/.claude/projects/<encoded>/<sid>.jsonl | head -1
jq -rc 'select(.gitBranch or .version) | {cwd, gitBranch, version}' ~/.claude/projects/<encoded>/<sid>.jsonl | head -1
```

## Drill Down

Outline the turn sequence:

```bash
jq -rc 'select(.type=="user" or .type=="assistant") | {t:.type, c:(.message.content | if type=="string" then .[0:80] else (map(.type)|join(",")) end)}' ~/.claude/projects/<encoded>/<session-id>.jsonl
```

Summarize tool usage before reading inputs:

```bash
jq -rc 'select(.type=="assistant") | .message.content[]? | select(.type=="tool_use") | .name' ~/.claude/projects/<encoded>/<session-id>.jsonl | sort | uniq -c | sort -rn
jq -rc 'select(.type=="assistant") | .message.content[]? | select(.type=="tool_use" and .name=="Bash") | .input.command' ~/.claude/projects/<encoded>/<session-id>.jsonl
```

Find failures and classify them; Claude Code's `is_error` flag covers three cases:

```bash
jq -rc 'select(.type=="user") | .message.content[]? | select(.type=="tool_result" and .is_error==true) | (.content|tostring|.[0:160])' ~/.claude/projects/<encoded>/<session-id>.jsonl
```

- **User rejection**: "The user doesn't want to proceed with this tool use" or "The user rejected permission". Boundary signal, not a failure.
- **Permission denial**: "Permission to use ... has been denied" or "Added deny rule". Policy enforcement.
- **Runtime/tool error**: file not found, validation error, non-2xx, and everything else.

Interruption markers like `[Request interrupted by user for tool use]` arrive as plain user text records; treat them as boundaries, not failures.

Trace subagents from the parent transcript first:

```bash
jq -rc 'select(.type=="assistant") | .message.content[]? | select(.type=="tool_use" and .name=="Agent") | {id, desc:.input.description, prompt:.input.prompt}' ~/.claude/projects/<encoded>/<session-id>.jsonl
jq -rc 'select(.type=="user") | .message.content[]? | select(.type=="tool_result") | {id:.tool_use_id, result:(.content|tostring)}' ~/.claude/projects/<encoded>/<session-id>.jsonl
```

Read nested subagent transcripts only when the question is about how the subagent worked. Read `.meta.json` first:

```bash
for m in ~/.claude/projects/<encoded>/<session-id>/subagents/*.meta.json; do jq -rc '{agentType, description, toolUseId}' "$m"; done
```

High-signal patterns worth surfacing: `Skill` tool calls, `mcp__*` tool names, `file-history-snapshot` records, and retry loops. For large `toolUseResult` values, prefer structured summary fields over raw embedded text.
