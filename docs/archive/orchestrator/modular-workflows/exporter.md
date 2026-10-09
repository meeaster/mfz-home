# Export an OpenCode conversation to Markdown

`export-session.py` exports one main session's user messages and assistant text from an OpenCode V2 SQLite database. It uses Python's standard library and opens the database with `mode=ro`. The script does not start the service, migrate the database, or change session records.

## Export this session

Run this command from the repository root:

```sh
python3 docs/orchestrator/modular-workflows/export-session.py \
  ses_f2b89474effegUqNBZS9NymYdT \
  --output docs/orchestrator/modular-workflows/conversation.md
```

If the export already exists, add `--overwrite` to refresh it. The script otherwise refuses to replace an existing output.

Without `--db`, the script resolves the database path with `opencode debug paths db`. To use a specific database, pass its filesystem path:

```sh
python3 export-session.py ses_example \
  --db /absolute/path/opencode.db \
  --output /absolute/path/conversation.md
```

Keep live SQLite WAL and SHM sidecars beside the database. The exporter does not use immutable mode or copy a potentially inconsistent live database.

## What the export contains

The source is the durable `session_message` projection, ordered by `seq`, with assistant text parts ordered by content index. The script validates the required table columns and rejects a child session.

The output includes every stored user text body and every assistant content item of type `text` for the selected session. Commentary and final answers are included. Each body is copied verbatim and has a native message locator and SHA-256 digest. Repeated statements, corrections, Markdown formatting, and spelling remain as stored.

The script excludes tool calls and results, reasoning, synthetic messages, system and skill records, compaction-summary bodies, attachment bodies, and child-session content. It queries only the selected text fields. Reasoning and tool bodies are not loaded into Python.

User attachment counts appear in the report. An export with attachments is a text transcript, not a complete copy of the attached material. The script does not redact user or assistant text, so select only conversations appropriate for the destination.

Assistant messages containing only reasoning or tool items have no conversational text to export. Their count appears in the report rather than as empty transcript entries.

## Read boundary and verification

All source queries run in one SQLite read transaction. The transcript header and JSON report identify the terminal sequence and source record count at that boundary. The report also lists message classes, compaction boundaries, assistant content classes, exported counts, and exclusions.

Earlier conversational messages are included across compaction boundaries when the durable projection retains them. The exporter does not reconstruct deleted messages, inspect event history, or import child or fork-source sessions.

The current session can continue changing after the snapshot. Later messages, including the response announcing an export's completion, cannot be present in that earlier snapshot. Rerun the script to refresh the file. Streaming text is exported as observed at the snapshot boundary, not guaranteed to be a completed answer.

Each body is delimited by an HTML comment containing its hash and a closing comment. The original text between those generated delimiters is unchanged. Those markers support verification, but they are not an escaping protocol for arbitrary hostile text containing identical delimiters.

## Scope of this reference implementation

The script performs a complete export on each run. It does not register artifacts, assign efforts, maintain a database cursor, resolve a managed storage root, or invoke MCP. It does not install a hook or plugin.

The later service can reuse the read-only projection, role filtering, chronological ordering, source identities, and snapshot-boundary handling. It will need separate decisions for incremental updates, atomic output replacement, concurrent writers, source revisions, managed paths, registration retries, and Claude Code extraction.

The current `--overwrite` path writes the output directly. Keep one exporter writer per destination. A failed output write may leave a partial output file, while the source database remains read-only. The later shared service should use atomic replacement and per-session coordination.
