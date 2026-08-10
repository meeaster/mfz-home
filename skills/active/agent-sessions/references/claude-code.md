# Claude Code Sessions

Claude Code session archaeology reads JSONL under a store root. Use `jq` for
structured selection because transcripts routinely exceed tool output limits.

## Locate The Store

Default to `~/.claude` unless the user names another root. The layout varies by
version, so confirm live files before relying on this map:

| Path | Role |
| --- | --- |
| `history.jsonl` | Typed-prompt label cache; not an authoritative session index. |
| `projects/<encoded>/<session-id>.jsonl` | Main session transcript. |
| `projects/<encoded>/<session-id>/subagents/agent-*.jsonl` | Child transcripts. |
| sibling `*.meta.json` | Child type, description, and parent tool-use link. |
| `transcripts/` | Noisier fallback store. |

Project directory encoding is lossy. Enumerate project directories and confirm
the real `cwd` from transcript records rather than constructing the encoded name.
The transcript glob is the authoritative session set; use `history.jsonl` only as
a label aid.

Keep discovery bounded, for example:

```bash
ls -t ~/.claude/projects/<encoded>/*.jsonl | head -20
jq -rc 'select(.type == "ai-title") | .aiTitle' <session.jsonl> | head -1
```

## Outline First

Identify candidate files from session ID, `ai-title`, recency, `cwd`, branch, and
edited-file evidence. Count record types and summarize tool names before reading
content. Look past slash commands and skill headers when identifying the
substantive opening prompt.

Compaction, `/clear`, queued messages, and interruption markers divide phases.
Preserve their record positions and timestamps in the coverage ledger.

## Targeted Reads

Use `jq` to select only needed record classes and fields. Tool calls are
`tool_use` blocks in assistant content; their results appear in subsequent user
records. Classify `is_error` results as user rejection, permission denial, or
runtime failure rather than treating every error flag as an execution failure.

Trace subagents from parent `Agent` tool calls and results before reading child
files. Read each child's `.meta.json` first and open its transcript only when the
child's result or behavior matters to the request.

Prefer structural summaries for large tool results. Count and locate reasoning or
hidden records when the format exposes them without reading or surfacing their
content.

## Incremental Reads

JSONL record order is the primary append cursor. Preserve the file identity,
byte offset or last stable record identity, size, and modification time supplied
by the live artifact. On refresh, detect replacement or truncation before reading
from a prior offset. Re-enumerate child metadata because new child files can
appear independently of the parent transcript tail.
