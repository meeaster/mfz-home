#!/usr/bin/env python3
"""Emit deterministic, body-bounded evidence from an OpenCode V2 SQLite store."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sqlite3
import sys
from pathlib import Path
from typing import Any


ADAPTER = "opencode-session-evidence"
ADAPTER_VERSION = 2
REQUIRED_COLUMNS = {
    "session_v2": {
        "id",
        "parent_id",
        "fork_session_id",
        "fork_boundary",
        "title",
        "directory",
        "time_created",
        "time_updated",
        "time_compacting",
        "time_archived",
        "time_suspended",
        "idle_outcome",
    },
    "session_message": {
        "id",
        "session_id",
        "type",
        "seq",
        "time_created",
        "time_updated",
        "data",
    },
}
CHECKPOINT_FIELDS = {
    "adapter",
    "version",
    "source",
    "parent_session_id",
    "known_child_ids",
    "topology_guard",
    "sessions",
    "event_watermarks",
    "inbox_watermarks",
}
SESSION_CHECKPOINT_FIELDS = {
    "terminal_seq",
    "message_count",
    "max_message_updated",
    "session_updated",
    "latest_completed_compaction_seq",
    "active_context_start_seq",
    "prefix_guard",
    "metadata_guard",
    "fork_provenance",
}
MAX_OUTPUT_BYTES = 2_000_000
MAX_MESSAGES = 10_000
MAX_CONTENT_CHARS = 2_000


class EvidenceError(ValueError):
    """An actionable source or checkpoint failure."""


def bounded_int(minimum: int, maximum: int, label: str):
    def parse(value: str) -> int:
        try:
            result = int(value)
        except ValueError as error:
            raise argparse.ArgumentTypeError(f"{label} must be an integer") from error
        if not minimum <= result <= maximum:
            raise argparse.ArgumentTypeError(
                f"{label} must be between {minimum} and {maximum}"
            )
        return result

    return parse


def default_database_path() -> Path:
    explicit = os.environ.get("OPENCODE_DB")
    if explicit:
        return Path(explicit).expanduser().resolve()
    channel = os.environ.get("OPENCODE_CHANNEL", "latest")
    disabled = os.environ.get("OPENCODE_DISABLE_CHANNEL_DB") in {"1", "true"}
    filename = (
        "opencode.db"
        if channel in {"latest", "dev", "beta", "next", "prod"} or disabled
        else "opencode-" + "".join(
            character if character.isalnum() or character in "._-" else "-"
            for character in channel
        ) + ".db"
    )
    data_root = Path(
        os.environ.get("XDG_DATA_HOME", str(Path.home() / ".local" / "share"))
    )
    return (data_root / "opencode" / filename).resolve()


def database_path(value: str | None) -> Path:
    path = Path(value).expanduser().resolve() if value else default_database_path()
    if not path.is_file():
        raise EvidenceError(
            f"OpenCode V2 database does not exist: {path}; supply --db, set OPENCODE_DB, "
            "or use the authenticated V2 API when the backend path is unknown"
        )
    return path


def connect_read_only(path: Path) -> sqlite3.Connection:
    try:
        connection = sqlite3.connect(f"{path.as_uri()}?mode=ro", uri=True)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA query_only = ON")
        connection.execute("BEGIN")
        return connection
    except sqlite3.DatabaseError as error:
        raise EvidenceError(f"unable to open database read-only: {path}: {error}") from error


def tables(connection: sqlite3.Connection) -> set[str]:
    return {
        str(row[0])
        for row in connection.execute(
            "SELECT name FROM sqlite_schema WHERE type = 'table'"
        )
    }


def validate_schema(connection: sqlite3.Connection) -> set[str]:
    available = tables(connection)
    for table, required in REQUIRED_COLUMNS.items():
        if table not in available:
            raise EvidenceError(f"unsupported OpenCode V2 source: required table is missing: {table}")
        columns = {
            str(row[1]) for row in connection.execute(f"PRAGMA table_info({table})")
        }
        missing = required - columns
        if missing:
            raise EvidenceError(
                f"unsupported OpenCode V2 source: required columns missing from {table}: "
                + ", ".join(sorted(missing))
            )
    try:
        connection.execute("SELECT json_extract('{}', '$.type')").fetchone()
    except sqlite3.DatabaseError as error:
        raise EvidenceError("SQLite JSON functions are unavailable") from error
    return available


def source(path: Path) -> dict[str, Any]:
    stat = path.stat()
    return {
        "harness": "opencode",
        "schema": "v2",
        "kind": "sqlite",
        "database": str(path),
        "mode": "read-only",
        "identity": f"{stat.st_dev}:{stat.st_ino}",
    }


def canonical_hash(domain: str, value: Any) -> str:
    encoded = json.dumps(
        value, ensure_ascii=True, sort_keys=True, separators=(",", ":"), allow_nan=False
    ).encode("utf-8")
    return "sha256:" + hashlib.sha256(domain.encode("ascii") + b"\0" + encoded).hexdigest()


def parse_json(raw: str, label: str) -> Any:
    try:
        return json.loads(raw, parse_constant=lambda value: (_ for _ in ()).throw(ValueError(value)))
    except (json.JSONDecodeError, ValueError) as error:
        raise EvidenceError(f"{label} contains malformed JSON") from error


def preview(value: Any, ceiling: int) -> tuple[str | None, bool]:
    if not isinstance(value, str):
        return None, False
    return value[:ceiling], len(value) > ceiling


def safe_content_item(
    item: Any, session_id: str, seq: int, message_id: str, index: int, ceiling: int
) -> tuple[dict[str, Any], dict[str, Any]]:
    if not isinstance(item, dict):
        raise EvidenceError(f"assistant message {message_id} content[{index}] must be an object")
    content_type = item.get("type")
    if not isinstance(content_type, str) or not content_type:
        raise EvidenceError(f"assistant message {message_id} content[{index}] has no type")
    content_id = item.get("id") if isinstance(item.get("id"), str) else None
    locator: dict[str, Any] = {
        "session_id": session_id,
        "seq": seq,
        "message_id": message_id,
        "content_index": index,
    }
    if content_id is not None:
        locator["content_id"] = content_id
    projected: dict[str, Any] = {"type": content_type, "locator": locator}
    guard: dict[str, Any] = {
        "type": content_type,
        "id": content_id,
        "index": index,
    }
    if content_type == "reasoning":
        guard["state"] = item.get("state")
        return projected, guard
    if content_type == "text":
        text, truncated = preview(item.get("text"), ceiling)
        if text is not None:
            projected["text_preview"] = text
            projected["text_truncated"] = truncated
        guard["text"] = item.get("text")
        return projected, guard
    if content_type == "tool":
        state = item.get("state") if isinstance(item.get("state"), dict) else {}
        projected["tool"] = item.get("name") or item.get("tool")
        projected["status"] = state.get("status")
        projected["call_id"] = item.get("callID") or item.get("callId")
        guard.update(
            {
                "tool": projected["tool"],
                "call_id": projected["call_id"],
                "state": state,
            }
        )
        return {key: value for key, value in projected.items() if value is not None}, guard
    guard["value"] = item
    return projected, guard


def project_message(row: sqlite3.Row, ceiling: int) -> tuple[dict[str, Any], dict[str, Any], int]:
    message_id = str(row["id"])
    session_id = str(row["session_id"])
    seq = int(row["seq"])
    message_type = str(row["type"])
    data = parse_json(str(row["data"]), f"session_message {message_id}")
    if not isinstance(data, dict):
        raise EvidenceError(f"session_message {message_id} data must be a JSON object")
    locator = {"session_id": session_id, "seq": seq, "message_id": message_id}
    projected: dict[str, Any] = {
        "seq": seq,
        "id": message_id,
        "type": message_type,
        "time_created": int(row["time_created"]),
        "time_updated": int(row["time_updated"]),
        "locator": locator,
    }
    guard: dict[str, Any] = {
        "seq": seq,
        "id": message_id,
        "type": message_type,
        "time_created": int(row["time_created"]),
        "time_updated": int(row["time_updated"]),
    }
    reasoning_count = 0
    if message_type in {"user", "synthetic", "system", "skill"}:
        text, truncated = preview(data.get("text"), ceiling)
        if text is not None:
            projected["text_preview"] = text
            projected["text_truncated"] = truncated
        guard["text"] = data.get("text")
    elif message_type == "assistant":
        content = data.get("content", [])
        if not isinstance(content, list):
            raise EvidenceError(f"assistant message {message_id} content must be a list")
        projected_content: list[dict[str, Any]] = []
        guard_content: list[dict[str, Any]] = []
        for index, item in enumerate(content):
            safe, item_guard = safe_content_item(
                item, session_id, seq, message_id, index, ceiling
            )
            projected_content.append(safe)
            guard_content.append(item_guard)
            reasoning_count += int(safe["type"] == "reasoning")
        projected["content"] = projected_content
        projected["completed"] = (
            isinstance(data.get("time"), dict)
            and data["time"].get("completed") is not None
        )
        guard.update(
            {
                "content": guard_content,
                "completed": projected["completed"],
                "error": data.get("error"),
                "cost": data.get("cost"),
                "tokens": data.get("tokens"),
                "model": data.get("model"),
            }
        )
    elif message_type == "compaction":
        projected["status"] = data.get("status")
        guard["status"] = data.get("status")
    elif message_type == "shell":
        projected["status"] = data.get("status")
        projected["title"] = data.get("title")
        guard.update({"status": data.get("status"), "title": data.get("title")})
    else:
        guard["data"] = data
    return projected, guard, reasoning_count


def session_rows(connection: sqlite3.Connection, parent_id: str) -> list[sqlite3.Row]:
    parent = connection.execute(
        """
        SELECT id, parent_id, fork_session_id, fork_boundary, title, directory,
               time_created, time_updated, time_compacting, time_archived,
               time_suspended, idle_outcome
        FROM session_v2 WHERE id = ?
        """,
        (parent_id,),
    ).fetchone()
    if parent is None:
        raise EvidenceError(f"session not found in OpenCode V2 source: {parent_id}")
    children = connection.execute(
        """
        SELECT id, parent_id, fork_session_id, fork_boundary, title, directory,
               time_created, time_updated, time_compacting, time_archived,
               time_suspended, idle_outcome
        FROM session_v2 WHERE parent_id = ? ORDER BY time_created, id
        """,
        (parent_id,),
    ).fetchall()
    return [parent, *children]


def message_rows(
    connection: sqlite3.Connection, session_id: str, through_seq: int | None = None
) -> list[sqlite3.Row]:
    predicate = "" if through_seq is None else " AND seq <= ?"
    parameters: tuple[Any, ...] = (session_id,) if through_seq is None else (session_id, through_seq)
    return connection.execute(
        """
        SELECT id, session_id, type, seq, time_created, time_updated, data
        FROM session_message WHERE session_id = ?"""
        + predicate
        + " ORDER BY seq",
        parameters,
    ).fetchall()


def fork_provenance(row: sqlite3.Row) -> dict[str, Any] | None:
    if row["fork_session_id"] is None:
        return None
    boundary = (
        parse_json(str(row["fork_boundary"]), f"session {row['id']} fork_boundary")
        if row["fork_boundary"] is not None
        else None
    )
    return {"session_id": row["fork_session_id"], "boundary": boundary}


def metadata(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "parent_id": row["parent_id"],
        "fork": fork_provenance(row),
        "title": row["title"],
        "directory": row["directory"],
        "time_created": row["time_created"],
        "time_updated": row["time_updated"],
        "time_compacting": row["time_compacting"],
        "time_archived": row["time_archived"],
        "time_suspended": row["time_suspended"],
        "idle_outcome": row["idle_outcome"],
    }


def projected_session(
    connection: sqlite3.Connection,
    row: sqlite3.Row,
    max_messages: int,
    max_content_chars: int,
) -> tuple[dict[str, Any], dict[str, Any]]:
    session_id = str(row["id"])
    records = message_rows(connection, session_id)
    if len(records) > max_messages:
        raise EvidenceError(
            f"session {session_id} has {len(records)} messages; raise --max-messages above {max_messages}"
        )
    projected: list[dict[str, Any]] = []
    guards: list[dict[str, Any]] = []
    reasoning_count = 0
    for record in records:
        message, guard, excluded = project_message(record, max_content_chars)
        projected.append(message)
        guards.append(guard)
        reasoning_count += excluded
    completed_compactions = [
        message["seq"]
        for message in projected
        if message["type"] == "compaction" and message.get("status") == "completed"
    ]
    latest_compaction = max(completed_compactions, default=None)
    terminal_seq = projected[-1]["seq"] if projected else -1
    max_updated = max((message["time_updated"] for message in projected), default=0)
    fork = fork_provenance(row)
    metadata_guard = canonical_hash(
        "opencode-v2-session-metadata",
        {
            "id": session_id,
            "parent_id": row["parent_id"],
            "fork": fork,
            "time_created": row["time_created"],
        },
    )
    checkpoint = {
        "terminal_seq": terminal_seq,
        "message_count": len(projected),
        "max_message_updated": max_updated,
        "session_updated": int(row["time_updated"]),
        "latest_completed_compaction_seq": latest_compaction,
        "active_context_start_seq": latest_compaction,
        "prefix_guard": canonical_hash("opencode-v2-projected-prefix", guards),
        "metadata_guard": metadata_guard,
        "fork_provenance": fork,
    }
    nonterminal = [
        message["locator"]
        for message in projected
        if (message["type"] == "assistant" and not message.get("completed"))
        or (message["type"] in {"compaction", "shell"} and message.get("status") == "running")
        or any(
            content.get("type") == "tool"
            and content.get("status") in {"pending", "streaming", "running"}
            for content in message.get("content", [])
        )
    ]
    return (
        {
            "metadata": metadata(row),
            "all_history": projected,
            "active_context_start_seq": latest_compaction,
            "latest_completed_compaction_seq": latest_compaction,
            "nonterminal": nonterminal,
            "reasoning_records_excluded": reasoning_count,
        },
        checkpoint,
    )


def optional_watermarks(
    connection: sqlite3.Connection, available: set[str], session_ids: list[str]
) -> tuple[dict[str, Any], dict[str, Any], dict[str, list[dict[str, Any]]]]:
    event_watermarks: dict[str, Any] = {}
    inbox_watermarks: dict[str, Any] = {}
    inbox: dict[str, list[dict[str, Any]]] = {session_id: [] for session_id in session_ids}
    if "event_sequence" in available:
        for session_id in session_ids:
            row = connection.execute(
                "SELECT seq FROM event_sequence WHERE aggregate_id = ?", (session_id,)
            ).fetchone()
            event_watermarks[session_id] = int(row[0]) if row else None
    table = "session_inbox" if "session_inbox" in available else (
        "session_pending" if "session_pending" in available else None
    )
    if table:
        sequence = "enqueued_seq" if table == "session_inbox" else "admitted_seq"
        for session_id in session_ids:
            records = connection.execute(
                f"SELECT id, type, delivery, {sequence} AS seq, time_created "
                f"FROM {table} WHERE session_id = ? ORDER BY {sequence}, id",
                (session_id,),
            ).fetchall()
            inbox[session_id] = [dict(record) for record in records]
            inbox_watermarks[session_id] = max((int(record["seq"]) for record in records), default=None)
    return event_watermarks, inbox_watermarks, inbox


def build_snapshot(
    connection: sqlite3.Connection,
    path: Path,
    parent_id: str,
    max_messages: int,
    max_content_chars: int,
) -> dict[str, Any]:
    available = validate_schema(connection)
    scope_rows = session_rows(connection, parent_id)
    child_ids = [str(row["id"]) for row in scope_rows[1:]]
    projected: dict[str, Any] = {}
    checkpoints: dict[str, Any] = {}
    for row in scope_rows:
        session, checkpoint = projected_session(
            connection, row, max_messages, max_content_chars
        )
        projected[str(row["id"])] = session
        checkpoints[str(row["id"])] = checkpoint
    topology = {
        "parent_session_id": parent_id,
        "direct_child_ids": child_ids,
        "children": [metadata(row) for row in scope_rows[1:]],
        "forks": [
            metadata(row)
            for row in connection.execute(
                """
                SELECT id, parent_id, fork_session_id, fork_boundary, title, directory,
                       time_created, time_updated, time_compacting, time_archived,
                       time_suspended, idle_outcome
                FROM session_v2 WHERE fork_session_id = ? ORDER BY time_created, id
                """,
                (parent_id,),
            )
        ],
    }
    event_watermarks, inbox_watermarks, inbox = optional_watermarks(
        connection, available, [parent_id, *child_ids]
    )
    checkpoint = {
        "adapter": ADAPTER,
        "version": ADAPTER_VERSION,
        "source": {
            "identity": source(path)["identity"],
            "database": str(path),
            "schema": "v2",
        },
        "parent_session_id": parent_id,
        "known_child_ids": child_ids,
        "topology_guard": canonical_hash(
            "opencode-v2-topology",
            {
                "parent_session_id": parent_id,
                "children": [
                    {
                        "id": row["id"],
                        "parent_id": row["parent_id"],
                        "fork": fork_provenance(row),
                    }
                    for row in scope_rows[1:]
                ],
            },
        ),
        "sessions": checkpoints,
        "event_watermarks": event_watermarks,
        "inbox_watermarks": inbox_watermarks,
    }
    return {
        "adapter": {"name": ADAPTER, "version": ADAPTER_VERSION},
        "mode": "snapshot",
        "source": source(path),
        "scope": {"parent_session_id": parent_id, "direct_child_ids": child_ids},
        "topology": topology,
        "sessions": projected,
        "inbox": inbox,
        "coverage": {
            "complete": True,
            "ordering": "session_message.seq",
            "history": "all projected history",
            "active_context": "starts at latest completed compaction sequence",
            "event_payloads_complete": False,
            "gaps": [],
        },
        "checkpoint": checkpoint,
    }


def parse_checkpoint(raw: str, parent_id: str) -> dict[str, Any]:
    state = parse_json(raw, "checkpoint")
    if not isinstance(state, dict):
        raise EvidenceError("checkpoint must be a JSON object")
    if set(state) != CHECKPOINT_FIELDS:
        raise EvidenceError("checkpoint has an unsupported V2 shape; full snapshot rebuild required")
    if state.get("adapter") != ADAPTER or state.get("version") != ADAPTER_VERSION:
        raise EvidenceError("checkpoint adapter version is unsupported; full snapshot rebuild required")
    if state.get("parent_session_id") != parent_id:
        raise EvidenceError("checkpoint parent_session_id does not match the requested parent")
    if not isinstance(state.get("source"), dict) or set(state["source"]) != {
        "identity", "database", "schema"
    }:
        raise EvidenceError("checkpoint source must contain identity, database, and schema")
    children = state.get("known_child_ids")
    sessions = state.get("sessions")
    if (
        not isinstance(children, list)
        or any(not isinstance(child, str) or not child for child in children)
        or len(children) != len(set(children))
        or parent_id in children
    ):
        raise EvidenceError("checkpoint known_child_ids is invalid")
    if not isinstance(sessions, dict) or set(sessions) != {parent_id, *children}:
        raise EvidenceError("checkpoint sessions must exactly match parent and known children")
    for session_id, entry in sessions.items():
        if not isinstance(entry, dict) or set(entry) != SESSION_CHECKPOINT_FIELDS:
            raise EvidenceError(f"checkpoint session {session_id} has an unsupported shape")
        for field in ("terminal_seq", "message_count", "max_message_updated", "session_updated"):
            if isinstance(entry[field], bool) or not isinstance(entry[field], int):
                raise EvidenceError(f"checkpoint session {session_id} {field} must be an integer")
        for field in ("prefix_guard", "metadata_guard"):
            value = entry[field]
            if not isinstance(value, str) or not value.startswith("sha256:") or len(value) != 71:
                raise EvidenceError(f"checkpoint session {session_id} {field} is invalid")
    return state


def rebuild(reason: str, snapshot: dict[str, Any]) -> dict[str, Any]:
    return {
        "adapter": snapshot["adapter"],
        "mode": "rebuild_required",
        "source": snapshot["source"],
        "scope": snapshot["scope"],
        "reason": reason,
        "coverage": {
            "complete": False,
            "gaps": [{"kind": reason, "action": "full-snapshot-rebuild"}],
        },
        "checkpoint": snapshot["checkpoint"],
    }


def build_delta(
    connection: sqlite3.Connection,
    path: Path,
    parent_id: str,
    prior: dict[str, Any],
    max_messages: int,
    max_content_chars: int,
) -> dict[str, Any]:
    current = build_snapshot(
        connection, path, parent_id, max_messages, max_content_chars
    )
    checkpoint = current["checkpoint"]
    if prior["source"] != checkpoint["source"]:
        return rebuild("source-changed", current)
    if prior["known_child_ids"] != checkpoint["known_child_ids"]:
        return rebuild("topology-changed", current)
    if prior["topology_guard"] != checkpoint["topology_guard"]:
        return rebuild("topology-changed", current)
    appended: dict[str, list[dict[str, Any]]] = {}
    for session_id, previous in prior["sessions"].items():
        present = checkpoint["sessions"].get(session_id)
        if present is None:
            return rebuild("topology-changed", current)
        if present["metadata_guard"] != previous["metadata_guard"]:
            return rebuild("session-metadata-changed", current)
        if (
            present["latest_completed_compaction_seq"]
            != previous["latest_completed_compaction_seq"]
            or present["active_context_start_seq"] != previous["active_context_start_seq"]
        ):
            return rebuild("active-context-moved", current)
        if (
            present["terminal_seq"] < previous["terminal_seq"]
            or present["message_count"] < previous["message_count"]
        ):
            return rebuild("projected-history-deleted", current)
        rows = message_rows(connection, session_id, previous["terminal_seq"])
        guards = [project_message(row, max_content_chars)[1] for row in rows]
        if len(rows) != previous["message_count"]:
            return rebuild("projected-prefix-count-changed", current)
        if canonical_hash("opencode-v2-projected-prefix", guards) != previous["prefix_guard"]:
            return rebuild("projected-prefix-changed", current)
        if max((int(row["time_updated"]) for row in rows), default=0) != previous[
            "max_message_updated"
        ]:
            return rebuild("projected-prefix-updated", current)
        new_messages = [
            message
            for message in current["sessions"][session_id]["all_history"]
            if message["seq"] > previous["terminal_seq"]
        ]
        appended[session_id] = new_messages
    return {
        "adapter": current["adapter"],
        "mode": "delta",
        "source": current["source"],
        "scope": current["scope"],
        "topology": current["topology"],
        "sessions": {
            session_id: {
                "appended": messages,
                "nonterminal": current["sessions"][session_id]["nonterminal"],
                "reasoning_records_excluded": sum(
                    1
                    for message in messages
                    for content in message.get("content", [])
                    if content.get("type") == "reasoning"
                ),
            }
            for session_id, messages in appended.items()
        },
        "inbox": current["inbox"],
        "coverage": {
            "complete": True,
            "append_only": True,
            "event_payloads_complete": False,
            "gaps": [],
        },
        "checkpoint": checkpoint,
    }


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(
        description="Emit deterministic OpenCode V2 snapshot or append-only delta evidence."
    )
    result.add_argument("--db", metavar="PATH")
    result.add_argument("--pretty", action="store_true")
    result.add_argument(
        "--max-output-bytes",
        type=bounded_int(1_000, 100_000_000, "--max-output-bytes"),
        default=MAX_OUTPUT_BYTES,
    )
    result.add_argument(
        "--max-messages",
        type=bounded_int(1, 1_000_000, "--max-messages"),
        default=MAX_MESSAGES,
    )
    result.add_argument(
        "--max-content-chars",
        type=bounded_int(0, 20_000, "--max-content-chars"),
        default=MAX_CONTENT_CHARS,
    )
    commands = result.add_subparsers(dest="command", required=True)
    snapshot = commands.add_parser("snapshot", help="create a parent and direct-child snapshot")
    snapshot.add_argument("parent_session_id")
    delta = commands.add_parser("delta", help="validate a checkpoint and return pure appends")
    delta.add_argument("parent_session_id")
    state = delta.add_mutually_exclusive_group(required=True)
    state.add_argument("--checkpoint-json")
    state.add_argument("--checkpoint-file", type=Path)
    return result


def render(result: dict[str, Any], pretty: bool, ceiling: int) -> str:
    rendered = json.dumps(
        result,
        ensure_ascii=True,
        indent=2 if pretty else None,
        separators=None if pretty else (",", ":"),
        allow_nan=False,
    )
    size = len(rendered.encode("utf-8"))
    if size > ceiling:
        raise EvidenceError(
            f"output would be {size} bytes; raise --max-output-bytes above {ceiling} or narrow the source"
        )
    return rendered


def main(argv: list[str] | None = None) -> int:
    arguments = parser().parse_args(argv)
    connection: sqlite3.Connection | None = None
    try:
        path = database_path(arguments.db)
        connection = connect_read_only(path)
        if arguments.command == "snapshot":
            result = build_snapshot(
                connection,
                path,
                arguments.parent_session_id,
                arguments.max_messages,
                arguments.max_content_chars,
            )
        else:
            raw_checkpoint = arguments.checkpoint_json
            if arguments.checkpoint_file is not None:
                try:
                    raw_checkpoint = arguments.checkpoint_file.read_text(encoding="utf-8")
                except (OSError, UnicodeError) as error:
                    raise EvidenceError(
                        f"unable to read checkpoint file {arguments.checkpoint_file}: {error}"
                    ) from error
            prior = parse_checkpoint(raw_checkpoint, arguments.parent_session_id)
            result = build_delta(
                connection,
                path,
                arguments.parent_session_id,
                prior,
                arguments.max_messages,
                arguments.max_content_chars,
            )
        connection.commit()
        print(render(result, arguments.pretty, arguments.max_output_bytes))
        return 0
    except (EvidenceError, sqlite3.DatabaseError) as error:
        if connection is not None:
            connection.rollback()
        print(f"error: {error}", file=sys.stderr)
        return 1
    finally:
        if connection is not None:
            connection.close()


if __name__ == "__main__":
    raise SystemExit(main())
