#!/usr/bin/env python3
"""Export one OpenCode V2 main session's user and assistant text to Markdown.

Uses Python's standard library and a read-only SQLite snapshot. It queries the
durable message projection, including messages before compaction, not the active
context or event log. It does not export reasoning, tool payloads, synthetic
messages, attachments, system instructions, or child sessions.

Usage:
    python3 export-session.py SESSION_ID --output conversation.md
    python3 export-session.py SESSION_ID --db /path/to/opencode.db \
        --output conversation.md --overwrite

Without --db, resolves the source with `opencode debug paths db`. The source is
never migrated or modified. Output is a full snapshot, not an incremental index.
The JSON report on stdout describes the read boundary and exclusions. Text is
copied verbatim; this is not a redaction tool. Choose the session accordingly.
"""

import argparse
from collections import Counter
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import sqlite3
import subprocess
import sys


def utc(milliseconds):
    if milliseconds is None:
        return "unknown"
    return datetime.fromtimestamp(milliseconds / 1000, timezone.utc).isoformat()


def require_columns(connection, table, required):
    actual = {row[1] for row in connection.execute(f"PRAGMA table_info({table})")}
    missing = required - actual
    if missing:
        raise ValueError(f"Unsupported OpenCode schema: {table} lacks {sorted(missing)}")


def snapshot(database, session_id):
    connection = sqlite3.connect(database.resolve().as_uri() + "?mode=ro", uri=True)
    connection.row_factory = sqlite3.Row
    try:
        connection.execute("PRAGMA query_only = ON")
        connection.execute("BEGIN")
        require_columns(connection, "session_v2", {"id", "title", "parent_id"})
        require_columns(connection, "session_message", {
            "id", "session_id", "type", "seq", "time_created", "time_updated", "data",
        })
        session = connection.execute(
            "SELECT id, title, parent_id FROM session_v2 WHERE id = ?", (session_id,),
        ).fetchone()
        if session is None:
            raise ValueError(f"Session not found: {session_id}")
        if session["parent_id"] is not None:
            raise ValueError("This exporter is scoped to main sessions, not subagents")

        classes = [dict(row) for row in connection.execute(
            "SELECT type, count(*) AS count, min(seq) AS first_seq, "
            "max(seq) AS last_seq FROM session_message "
            "WHERE session_id = ? GROUP BY type ORDER BY type", (session_id,),
        )]
        boundary = dict(connection.execute(
            "SELECT count(*) AS message_count, max(seq) AS terminal_seq, "
            "max(time_updated) AS latest_message_update FROM session_message "
            "WHERE session_id = ?", (session_id,),
        ).fetchone())
        compactions = [dict(row) for row in connection.execute(
            "SELECT seq, json_extract(data, '$.status') AS status "
            "FROM session_message WHERE session_id = ? AND type = 'compaction' "
            "ORDER BY seq", (session_id,),
        )]
        content_types = dict(connection.execute(
            "SELECT json_extract(item.value, '$.type'), count(*) "
            "FROM session_message AS message, "
            "json_each(message.data, '$.content') AS item "
            "WHERE message.session_id = ? AND message.type = 'assistant' GROUP BY 1",
            (session_id,),
        ))
        # Project only conversational text. Reasoning and tool bodies never leave SQLite.
        users = [dict(row) for row in connection.execute(
            "SELECT seq, id, type AS role, time_created, time_updated, "
            "json_extract(data, '$.text') AS text, "
            "coalesce(json_array_length(data, '$.files'), 0) AS attachments "
            "FROM session_message WHERE session_id = ? AND type = 'user' ORDER BY seq",
            (session_id,),
        )]
        parts = [dict(row) for row in connection.execute(
            "SELECT message.seq, message.id, message.type AS role, "
            "message.time_created, message.time_updated, "
            "CAST(item.key AS INTEGER) AS content_index, "
            "json_extract(item.value, '$.text') AS text, "
            "json_extract(item.value, '$.state.phase') AS phase "
            "FROM session_message AS message, "
            "json_each(message.data, '$.content') AS item "
            "WHERE message.session_id = ? AND message.type = 'assistant' "
            "AND json_extract(item.value, '$.type') = 'text' "
            "ORDER BY message.seq, CAST(item.key AS INTEGER)", (session_id,),
        )]
        for record in users + parts:
            if not isinstance(record["text"], str):
                raise ValueError(f"Unsupported text shape at seq {record['seq']}")
        records = sorted(users + parts, key=lambda row: (row["seq"], row.get("content_index", -1)))
        assistant_messages = len({row["id"] for row in parts})
        assistant_total = sum(row["count"] for row in classes if row["type"] == "assistant")
        report = {
            "session_id": session_id,
            "boundary": boundary,
            "message_classes": classes,
            "compactions": compactions,
            "assistant_content_types": content_types,
            "exported_user_messages": len(users),
            "exported_assistant_messages": assistant_messages,
            "exported_assistant_text_parts": len(parts),
            "assistant_messages_without_text": assistant_total - assistant_messages,
            "excluded_user_attachments": sum(row["attachments"] for row in users),
            "assistant_text_phases": dict(Counter(row["phase"] or "unspecified" for row in parts)),
            "coverage": "All durable user text and assistant text parts in one read transaction",
            "limits": "Main session only; live records may change after the snapshot; no tool, reasoning, synthetic, system, attachment, or child-session content",
        }
        return dict(session), records, report
    finally:
        connection.rollback()
        connection.close()


def render(session, records, report):
    boundary = report["boundary"]
    chunks = [
        "# Conversation transcript\n\n",
        f"Session: `{session['id']}`\n\n",
        f"Title: {session['title']}\n\n",
        f"Database snapshot through sequence **{boundary['terminal_seq']}**. "
        f"The snapshot contains {boundary['message_count']} projected message records.\n\n",
        f"Exported {report['exported_user_messages']} user messages and "
        f"{report['exported_assistant_text_parts']} assistant text parts from "
        f"{report['exported_assistant_messages']} assistant messages. "
        "Assistant commentary and final answers are included. Message bodies below "
        "are copied without rewriting. SHA-256 values identify their exact UTF-8 text.\n\n",
        "Only the named main session is included. Tool calls and results, reasoning, "
        "synthetic messages, system and skill messages, compaction summaries, and "
        "attachment bodies are excluded. Earlier conversational messages remain "
        "included across compaction boundaries when present in the durable projection.\n\n",
        f"Excluded user attachments: {report['excluded_user_attachments']}. "
        f"Assistant messages without text: {report['assistant_messages_without_text']}.\n\n",
        "This is a snapshot of an active conversation, not a promise to include later "
        "messages or subsequent edits. Rerun the exporter to refresh it.\n",
    ]
    for record in records:
        label = record["role"].capitalize()
        suffix = f" · {record['phase']}" if record.get("phase") else ""
        digest = hashlib.sha256(record["text"].encode("utf-8")).hexdigest()
        locator = f"seq={record['seq']} message={record['id']}"
        if "content_index" in record:
            locator += f" content_index={record['content_index']}"
        chunks.extend([
            f"\n---\n\n## {label} · sequence {record['seq']}{suffix}\n\n",
            f"Created: {utc(record['time_created'])}  \n",
            f"Updated: {utc(record['time_updated'])}  \n",
            f"Locator: `{locator}`\n\n",
            f"<!-- body-start sha256={digest} -->\n",
            record["text"],
            "\n<!-- body-end -->\n",
        ])
    return "".join(chunks)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("session_id")
    parser.add_argument("--db", type=Path, help="Source SQLite path; otherwise use OpenCode's path resolver")
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--overwrite", action="store_true", help="Replace an existing export")
    args = parser.parse_args()
    try:
        database = args.db
        if database is None:
            result = subprocess.run(
                ["opencode", "debug", "paths", "db"], check=True, capture_output=True, text=True,
            )
            database = Path(result.stdout.strip())
        if not database.is_file():
            raise ValueError(f"Database is not a file: {database}")
        if args.output.resolve() in {
            database.resolve(), Path(str(database.resolve()) + "-wal"),
            Path(str(database.resolve()) + "-shm"),
        }:
            raise ValueError("Output cannot replace the source database or its sidecars")
        if args.output.exists() and not args.overwrite:
            raise ValueError("Output already exists; use --overwrite to refresh it")
        session, records, report = snapshot(database, args.session_id)
        text = render(session, records, report)
        args.output.parent.mkdir(parents=True, exist_ok=True)
        with args.output.open("w" if args.overwrite else "x", encoding="utf-8", newline="") as stream:
            stream.write(text)
        report["output"] = str(args.output.resolve())
        print(json.dumps(report, indent=2))
    except (OSError, ValueError, sqlite3.Error, subprocess.CalledProcessError) as error:
        print(f"Export failed: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
