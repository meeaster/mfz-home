#!/usr/bin/env python3
"""Emit bounded, read-only structural evidence from an OpenCode SQLite store."""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
import sqlite3
import sys
from pathlib import Path
from typing import Any, Callable


REQUIRED_COLUMNS = {
    "session": {
        "id",
        "parent_id",
        "title",
        "directory",
        "agent",
        "model",
        "time_created",
        "time_updated",
    },
    "message": {"id", "session_id", "time_created", "time_updated", "data"},
    "part": {
        "id",
        "message_id",
        "session_id",
        "time_created",
        "time_updated",
        "data",
    },
}
MAX_CURSOR = (9_223_372_036_854_775_807, "~")
BUNDLE_STATE_VERSION = 1
BUNDLE_STREAMS = (
    "message_created",
    "message_updated",
    "part_created",
    "part_updated",
)
BUNDLE_STREAM_SOURCES = {
    "message_created": ("message", "time_created"),
    "message_updated": ("message", "time_updated"),
    "part_created": ("part", "time_created"),
    "part_updated": ("part", "time_updated"),
}
BUNDLE_PREFIX_STREAMS = ("message_created", "part_created")
SESSION_PREFERRED_COLUMNS = (
    "id",
    "project_id",
    "parent_id",
    "directory",
    "title",
    "agent",
    "model",
    "version",
    "cost",
    "tokens_input",
    "tokens_output",
    "tokens_reasoning",
    "time_created",
    "time_updated",
    "time_archived",
)


def parse_cursor(value: str) -> tuple[int, str]:
    try:
        timestamp, record_id = value.split(":", 1)
        parsed_timestamp = int(timestamp)
        if parsed_timestamp < 0:
            raise ValueError
        return parsed_timestamp, record_id
    except (ValueError, TypeError) as error:
        raise argparse.ArgumentTypeError(
            "cursor must be <nonnegative-epoch-ms>:<record-id>"
        ) from error


def bounded_int(minimum: int, maximum: int) -> Callable[[str], int]:
    def parse(value: str) -> int:
        try:
            result = int(value)
        except ValueError as error:
            raise argparse.ArgumentTypeError("value must be an integer") from error
        if not minimum <= result <= maximum:
            raise argparse.ArgumentTypeError(
                f"value must be between {minimum} and {maximum}"
            )
        return result

    return parse


def cursor_object(value: tuple[int, str]) -> dict[str, Any]:
    return {"time": value[0], "id": value[1]}


def parse_state_cursor(value: Any, label: str) -> tuple[int, str]:
    if not isinstance(value, dict) or set(value) != {"time", "id"}:
        raise SystemExit(f"{label} must contain exactly time and id")
    timestamp = value["time"]
    record_id = value["id"]
    if (
        isinstance(timestamp, bool)
        or not isinstance(timestamp, int)
        or timestamp < 0
        or not isinstance(record_id, str)
    ):
        raise SystemExit(f"{label} must contain a nonnegative integer time and string id")
    return timestamp, record_id


def parse_prefix_fingerprint(value: Any, label: str) -> str:
    if not isinstance(value, str) or not value.startswith("sha256:"):
        raise SystemExit(f"{label} must be a sha256:<64-hex> fingerprint")
    digest = value[7:]
    if len(digest) != 64 or any(character not in "0123456789abcdef" for character in digest):
        raise SystemExit(f"{label} must be a sha256:<64-hex> fingerprint")
    return value


def compact_record(record: dict[str, Any]) -> dict[str, Any]:
    return {key: value for key, value in record.items() if value is not None}


def enforce_record_ceiling(
    record: dict[str, Any], label: str, max_record_bytes: int
) -> dict[str, Any]:
    compacted = compact_record(record)
    size = len(json.dumps(compacted, separators=(",", ":")).encode("utf-8"))
    if size > max_record_bytes:
        raise SystemExit(
            f"bundle record {label} would be {size} bytes; raise "
            "--max-record-bytes or narrow the requested extraction"
        )
    return compacted


def connect_read_only(path: str) -> sqlite3.Connection:
    database = Path(path).expanduser().resolve()
    if not database.is_file():
        raise SystemExit(f"database does not exist: {database}")
    connection = sqlite3.connect(f"{database.as_uri()}?mode=ro", uri=True)
    connection.row_factory = sqlite3.Row
    connection.execute("BEGIN")
    return connection


def rows(
    connection: sqlite3.Connection,
    sql: str,
    parameters: tuple[Any, ...] = (),
) -> list[dict[str, Any]]:
    return [dict(row) for row in connection.execute(sql, parameters)]


def one(
    connection: sqlite3.Connection,
    sql: str,
    parameters: tuple[Any, ...] = (),
) -> dict[str, Any] | None:
    row = connection.execute(sql, parameters).fetchone()
    return dict(row) if row else None


def page(items: list[dict[str, Any]], limit: int) -> tuple[list[dict[str, Any]], bool]:
    return items[:limit], len(items) > limit


def validate_schema(connection: sqlite3.Connection) -> list[str]:
    tables = {
        row["name"]
        for row in connection.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table'"
        )
    }
    for table, required in REQUIRED_COLUMNS.items():
        if table not in tables:
            raise SystemExit(f"required table is missing: {table}")
        columns = {
            row["name"] for row in connection.execute(f"PRAGMA table_info({table})")
        }
        missing = required - columns
        if missing:
            raise SystemExit(
                f"required columns missing from {table}: {', '.join(sorted(missing))}"
            )
    if "session_message" in tables:
        columns = {
            row["name"]
            for row in connection.execute("PRAGMA table_info(session_message)")
        }
        if "session_id" not in columns:
            raise SystemExit("required column missing from session_message: session_id")
    try:
        connection.execute("SELECT json_extract('{}', '$.type')").fetchone()
    except sqlite3.DatabaseError as error:
        raise SystemExit("SQLite JSON functions are unavailable") from error
    return sorted(tables & {"session", "message", "part", "session_message"})


def session_columns(connection: sqlite3.Connection) -> list[str]:
    available = {
        row["name"] for row in connection.execute("PRAGMA table_info(session)")
    }
    return [column for column in SESSION_PREFERRED_COLUMNS if column in available]


def epoch_milliseconds_iso(value: int) -> str:
    seconds, milliseconds = divmod(int(value), 1000)
    timestamp = datetime.fromtimestamp(seconds, tz=timezone.utc)
    return f"{timestamp:%Y-%m-%dT%H:%M:%S}.{milliseconds:03d}Z"


def metadata_with_iso_timestamps(metadata: dict[str, Any]) -> dict[str, Any]:
    enriched: dict[str, Any] = {}
    for key, value in metadata.items():
        enriched[key] = value
        if key in {"time_created", "time_updated", "time_archived"} and value is not None:
            enriched[f"{key}_iso"] = epoch_milliseconds_iso(value)
    return enriched


def session_metadata(
    connection: sqlite3.Connection, session_id: str
) -> dict[str, Any] | None:
    selected = session_columns(connection)
    metadata = one(
        connection,
        f"SELECT {', '.join(selected)} FROM session WHERE id = ?",
        (session_id,),
    )
    return metadata_with_iso_timestamps(metadata) if metadata is not None else None


def table_count(connection: sqlite3.Connection, table: str, session_id: str) -> int:
    if table not in {"message", "part", "session_message"}:
        raise ValueError(f"unsupported count table: {table}")
    result = connection.execute(
        f"SELECT COUNT(*) FROM {table} WHERE session_id = ?", (session_id,)
    ).fetchone()
    return int(result[0])


def cursor(
    connection: sqlite3.Connection,
    table: str,
    field: str,
    session_id: str,
) -> dict[str, Any] | None:
    if table not in {"message", "part"} or field not in {
        "time_created",
        "time_updated",
    }:
        raise ValueError("unsupported cursor table or field")
    return one(
        connection,
        f"SELECT id, {field} AS time FROM {table} WHERE session_id = ? "
        f"ORDER BY {field} DESC, id DESC LIMIT 1",
        (session_id,),
    )


def source(database: str) -> dict[str, Any]:
    resolved = Path(database).resolve()
    stat = resolved.stat()
    return {
        "harness": "opencode",
        "database": str(resolved),
        "mode": "read-only",
        "identity": f"{stat.st_dev}:{stat.st_ino}",
    }


def parse_bundle_state(raw_state: str | None, parent_id: str) -> dict[str, Any] | None:
    if raw_state is None:
        return None
    try:
        state = json.loads(raw_state)
    except json.JSONDecodeError as error:
        raise SystemExit(f"bundle state is not valid JSON: {error.msg}") from error
    if not isinstance(state, dict):
        raise SystemExit("bundle state must be a JSON object")

    allowed = {
        "version",
        "source_identity",
        "parent_session_id",
        "known_child_ids",
        "sessions",
    }
    unknown = set(state) - allowed
    missing = {"version", "source_identity", "parent_session_id", "known_child_ids", "sessions"} - set(state)
    if unknown:
        raise SystemExit(
            "bundle state contains unsupported fields: " + ", ".join(sorted(unknown))
        )
    if missing:
        raise SystemExit(
            "bundle state is missing required fields: " + ", ".join(sorted(missing))
        )
    if (
        isinstance(state["version"], bool)
        or not isinstance(state["version"], int)
        or state["version"] != BUNDLE_STATE_VERSION
    ):
        raise SystemExit(
            f"unsupported bundle state version: {state['version']}; "
            f"expected {BUNDLE_STATE_VERSION}"
        )
    if state["parent_session_id"] != parent_id:
        raise SystemExit("bundle state parent_session_id does not match the requested parent")
    if not isinstance(state["source_identity"], str) or not state["source_identity"]:
        raise SystemExit("bundle state source_identity must be a nonempty string")

    known_child_ids = state["known_child_ids"]
    if not isinstance(known_child_ids, list) or any(
        not isinstance(child_id, str) or not child_id for child_id in known_child_ids
    ):
        raise SystemExit("bundle state known_child_ids must be a list of nonempty strings")
    if len(set(known_child_ids)) != len(known_child_ids):
        raise SystemExit("bundle state known_child_ids must not contain duplicates")
    if parent_id in known_child_ids:
        raise SystemExit("bundle state known_child_ids must not contain the parent session")

    sessions = state["sessions"]
    if not isinstance(sessions, dict):
        raise SystemExit("bundle state sessions must be an object keyed by session ID")
    required_session_ids = {parent_id, *known_child_ids}
    missing_sessions = required_session_ids - set(sessions)
    extra_sessions = set(sessions) - required_session_ids
    if missing_sessions:
        raise SystemExit(
            "bundle state is missing session entries: "
            + ", ".join(sorted(missing_sessions))
        )
    if extra_sessions:
        raise SystemExit(
            "bundle state has session entries not listed in known_child_ids: "
            + ", ".join(sorted(extra_sessions))
        )

    normalized_sessions: dict[str, dict[str, Any]] = {}
    session_fields = {
        "cursors",
        "counts",
        "terminal_identities",
        "prefix_fingerprints",
    }
    for session_id, entry in sessions.items():
        if not isinstance(entry, dict):
            raise SystemExit(f"bundle state session entry is not an object: {session_id}")
        unsupported = set(entry) - session_fields
        if unsupported:
            raise SystemExit(
                f"bundle state session {session_id} contains unsupported fields: "
                + ", ".join(sorted(unsupported))
            )
        if "cursors" not in entry or not isinstance(entry["cursors"], dict):
            raise SystemExit(f"bundle state session {session_id} must contain cursors")
        if set(entry["cursors"]) != set(BUNDLE_STREAMS):
            raise SystemExit(
                f"bundle state session {session_id} must contain all four stream cursors"
            )
        cursors = {
            stream: cursor_object(
                parse_state_cursor(entry["cursors"][stream], f"{session_id}.{stream}")
            )
            for stream in BUNDLE_STREAMS
        }

        normalized: dict[str, Any] = {"cursors": cursors}
        if "counts" not in entry:
            raise SystemExit(f"bundle state session {session_id} must contain counts")
        counts = entry["counts"]
        if not isinstance(counts, dict) or set(counts) != {"messages", "parts"}:
            raise SystemExit(
                f"bundle state session {session_id} counts must contain messages and parts"
            )
        if any(
            isinstance(counts[name], bool)
            or not isinstance(counts[name], int)
            or counts[name] < 0
            for name in ("messages", "parts")
        ):
            raise SystemExit(
                f"bundle state session {session_id} counts must be nonnegative integers"
            )
        normalized["counts"] = {
            "messages": counts["messages"],
            "parts": counts["parts"],
        }
        if "terminal_identities" not in entry:
            raise SystemExit(
                f"bundle state session {session_id} must contain terminal_identities"
            )
        identities = entry["terminal_identities"]
        if not isinstance(identities, dict) or set(identities) != set(BUNDLE_STREAMS):
            raise SystemExit(
                f"bundle state session {session_id} terminal_identities must contain all four streams"
            )
        if any(
            identity is not None and (not isinstance(identity, str) or not identity)
            for identity in identities.values()
        ):
            raise SystemExit(
                f"bundle state session {session_id} terminal identities must be strings or null"
            )
        normalized["terminal_identities"] = dict(identities)
        for stream in BUNDLE_STREAMS:
            cursor_id = cursors[stream]["id"]
            identity = identities[stream]
            if cursor_id and identity is None:
                raise SystemExit(
                    f"bundle state session {session_id} {stream} terminal identity "
                    "must be non-null when cursor id is nonempty"
                )
            if not cursor_id and identity is not None:
                raise SystemExit(
                    f"bundle state session {session_id} {stream} terminal identity "
                    "must be null when cursor id is empty"
                )
            if cursor_id and identity != cursor_id:
                raise SystemExit(
                    f"bundle state session {session_id} {stream} terminal identity "
                    "must match cursor id"
                )
        if "prefix_fingerprints" not in entry:
            raise SystemExit(
                f"bundle state session {session_id} must contain prefix_fingerprints"
            )
        prefix_fingerprints = entry["prefix_fingerprints"]
        if not isinstance(prefix_fingerprints, dict) or set(prefix_fingerprints) != set(
            BUNDLE_PREFIX_STREAMS
        ):
            raise SystemExit(
                f"bundle state session {session_id} prefix_fingerprints must contain "
                "message_created and part_created"
            )
        normalized["prefix_fingerprints"] = {
            stream: parse_prefix_fingerprint(
                prefix_fingerprints[stream], f"{session_id}.{stream}"
            )
            for stream in BUNDLE_PREFIX_STREAMS
        }
        normalized_sessions[session_id] = normalized

    return {
        "version": BUNDLE_STATE_VERSION,
        "source_identity": state["source_identity"],
        "parent_session_id": parent_id,
        "known_child_ids": list(known_child_ids),
        "sessions": normalized_sessions,
    }


def cursor_tuples(cursors: dict[str, Any]) -> dict[str, tuple[int, str]]:
    return {
        stream: parse_state_cursor(cursors[stream], stream) for stream in BUNDLE_STREAMS
    }


def current_terminal_cursors(
    connection: sqlite3.Connection, session_id: str
) -> dict[str, tuple[int, str]]:
    return {
        "message_created": _cursor_or_zero(
            cursor(connection, "message", "time_created", session_id)
        ),
        "message_updated": _cursor_or_zero(
            cursor(connection, "message", "time_updated", session_id)
        ),
        "part_created": _cursor_or_zero(
            cursor(connection, "part", "time_created", session_id)
        ),
        "part_updated": _cursor_or_zero(
            cursor(connection, "part", "time_updated", session_id)
        ),
    }


def _cursor_or_zero(value: dict[str, Any] | None) -> tuple[int, str]:
    if value is None:
        return (0, "")
    return int(value["time"]), str(value["id"])


def terminal_identities(cursors: dict[str, tuple[int, str]]) -> dict[str, str | None]:
    return {
        stream: value[1] or None for stream, value in cursors.items()
    }


def cursor_after(left: tuple[int, str], right: tuple[int, str]) -> bool:
    return left[0] > right[0] or (left[0] == right[0] and left[1] > right[1])


def prefix_fingerprint(
    connection: sqlite3.Connection,
    session_id: str,
    stream: str,
    through: tuple[int, str],
) -> str:
    if stream not in BUNDLE_PREFIX_STREAMS:
        raise ValueError(f"unsupported prefix stream: {stream}")
    table, field = BUNDLE_STREAM_SOURCES[stream]
    digest = hashlib.sha256(b"opencode-bundle-prefix-v1\0")
    for row in connection.execute(
        f"""
        SELECT id, {field} AS time
        FROM {table}
        WHERE session_id = ?
          AND ({field} < ? OR ({field} = ? AND id <= ?))
        ORDER BY {field}, id
        """,
        (session_id, through[0], through[0], through[1]),
    ):
        time_bytes = str(int(row["time"])).encode("ascii")
        id_bytes = str(row["id"]).encode("utf-8")
        for value in (time_bytes, id_bytes):
            digest.update(len(value).to_bytes(8, "big"))
            digest.update(value)
    return f"sha256:{digest.hexdigest()}"


def bundle_record_exists(
    connection: sqlite3.Connection,
    session_id: str,
    stream: str,
    record_id: str,
) -> bool:
    table, _ = BUNDLE_STREAM_SOURCES[stream]
    return (
        one(
            connection,
            f"SELECT 1 AS present FROM {table} "
            "WHERE session_id = ? AND id = ? LIMIT 1",
            (session_id, record_id),
        )
        is not None
    )


def historical_state_gaps(
    connection: sqlite3.Connection,
    session_id: str,
    starting: dict[str, tuple[int, str]],
    prior_entry: dict[str, Any],
    current_prefix_fingerprints: dict[str, str],
) -> list[dict[str, Any]]:
    gaps: list[dict[str, Any]] = []
    previous_counts = prior_entry.get("counts")
    if previous_counts is None:
        return [
            {
                "kind": "missing-history-count-guard",
                "action": "rebuild-required",
            }
        ]
    for name, stream in (
        ("messages", "message_created"),
        ("parts", "part_created"),
    ):
        current_prefix_count = bounded_count(
            connection,
            BUNDLE_STREAM_SOURCES[stream][0],
            session_id,
            starting[stream],
        )
        if current_prefix_count != previous_counts[name]:
            gaps.append(
                {
                    "kind": "historical-count-mismatch",
                    "stream": stream,
                    "previous": previous_counts[name],
                    "current": current_prefix_count,
                    "action": "rebuild-required",
                }
            )

        if current_prefix_fingerprints[stream] != prior_entry["prefix_fingerprints"][stream]:
            gaps.append(
                {
                    "kind": "historical-prefix-fingerprint-mismatch",
                    "stream": stream,
                    "previous": prior_entry["prefix_fingerprints"][stream],
                    "current": current_prefix_fingerprints[stream],
                    "action": "rebuild-required",
                }
            )

    identities = prior_entry.get("terminal_identities")
    if identities is not None:
        for stream in BUNDLE_STREAMS:
            identity = identities[stream]
            if identity is not None and not bundle_record_exists(
                connection, session_id, stream, identity
            ):
                gaps.append(
                    {
                        "kind": "terminal-identity-missing",
                        "stream": stream,
                        "record_id": identity,
                        "action": "rebuild-required",
                    }
                )
    return gaps


def bounded_collection(
    connection: sqlite3.Connection,
    sql: str,
    parameters: tuple[Any, ...],
    label: str,
    max_records: int,
    max_record_bytes: int,
) -> list[dict[str, Any]]:
    result = rows(connection, f"{sql}\nLIMIT ?", parameters + (max_records + 1,))
    if len(result) > max_records:
        raise SystemExit(
            f"bundle {label} exceeded the per-collection ceiling of {max_records} "
            "records; no complete bundle was returned"
        )
    return [
        enforce_record_ceiling(record, f"{label}[{index}]", max_record_bytes)
        for index, record in enumerate(result)
    ]


def bounded_count(
    connection: sqlite3.Connection,
    table: str,
    session_id: str,
    through: tuple[int, str],
) -> int:
    if table not in {"message", "part"}:
        raise ValueError(f"unsupported bounded count table: {table}")
    result = connection.execute(
        f"""
        SELECT COUNT(*) FROM {table}
        WHERE session_id = ?
          AND (time_created < ? OR (time_created = ? AND id <= ?))
        """,
        (session_id, through[0], through[0], through[1]),
    ).fetchone()
    return int(result[0])


def locate(
    connection: sqlite3.Connection,
    database: str,
    query: str,
    limit: int,
    before: tuple[int, str],
) -> dict[str, Any]:
    validate_schema(connection)
    candidates, has_more = page(
        rows(
            connection,
            """
            SELECT id, title, parent_id, directory, agent, model,
                   time_created, time_updated
            FROM session
            WHERE (id = ? OR title LIKE ?)
              AND (time_updated < ? OR (time_updated = ? AND id < ?))
            ORDER BY time_updated DESC, id DESC
            LIMIT ?
            """,
            (
                query,
                f"%{query}%",
                before[0],
                before[0],
                before[1],
                limit + 1,
            ),
        ),
        limit,
    )
    candidates = [metadata_with_iso_timestamps(candidate) for candidate in candidates]
    return {
        "source": source(database),
        "query": query,
        "candidates": candidates,
        "has_more": has_more,
        "continuation": record_cursor(candidates, "time_updated", before),
    }


def classify_invocation(invocation: dict[str, Any]) -> str:
    requested = invocation.get("requested_task_id")
    child = invocation.get("child_session_id")
    if not child:
        return "unresolved"
    if not requested:
        return "new"
    if requested == child:
        return "resume"
    return "fallback-new"


def outline(
    connection: sqlite3.Connection,
    database: str,
    session_id: str,
    limit: int,
    children_after: tuple[int, str],
    tasks_after: tuple[int, str],
    compactions_after: tuple[int, str],
    running_after: tuple[int, str],
    nonterminal_after: tuple[int, str],
) -> dict[str, Any]:
    tables = validate_schema(connection)
    session = session_metadata(connection, session_id)
    if session is None:
        raise SystemExit(f"session not found: {session_id}")

    counts: dict[str, int | None] = {
        table: table_count(connection, table, session_id)
        for table in ("message", "part")
    }
    counts["session_message"] = (
        table_count(connection, "session_message", session_id)
        if "session_message" in tables
        else None
    )

    children, children_more = page(
        rows(
            connection,
            """
            SELECT s.id, s.parent_id, s.title, s.agent, s.model,
                   s.time_created, s.time_updated,
                   (SELECT COUNT(*) FROM message m WHERE m.session_id = s.id) AS message_count,
                   (SELECT COUNT(*) FROM part p WHERE p.session_id = s.id) AS part_count
            FROM session s
            WHERE s.parent_id = ?
              AND (s.time_created > ? OR (s.time_created = ? AND s.id > ?))
            ORDER BY s.time_created, s.id
            LIMIT ?
            """,
            (
                session_id,
                children_after[0],
                children_after[0],
                children_after[1],
                limit + 1,
            ),
        ),
        limit,
    )

    task_invocations, tasks_more = page(
        rows(
            connection,
            """
            SELECT p.id AS part_id, p.message_id, p.time_created, p.time_updated,
                   json_extract(p.data, '$.callID') AS call_id,
                   json_extract(p.data, '$.state.status') AS status,
                   json_extract(p.data, '$.state.title') AS title,
                   json_extract(p.data, '$.state.input.task_id') AS requested_task_id,
                   json_extract(p.data, '$.state.metadata.sessionId') AS child_session_id,
                   (SELECT c.parent_id FROM session c
                    WHERE c.id = json_extract(p.data, '$.state.metadata.sessionId'))
                    AS child_parent_id
            FROM part p
            WHERE p.session_id = ?
              AND json_extract(p.data, '$.type') = 'tool'
              AND json_extract(p.data, '$.tool') = 'task'
              AND (p.time_created > ? OR (p.time_created = ? AND p.id > ?))
            ORDER BY p.time_created, p.id
            LIMIT ?
            """,
            (
                session_id,
                tasks_after[0],
                tasks_after[0],
                tasks_after[1],
                limit + 1,
            ),
        ),
        limit,
    )
    for invocation in task_invocations:
        invocation["kind"] = classify_invocation(invocation)

    compactions, compactions_more = page(
        rows(
            connection,
            """
            SELECT id AS part_id, message_id, time_created, time_updated,
                   json_extract(data, '$.auto') AS auto,
                   json_extract(data, '$.overflow') AS overflow,
                   json_extract(data, '$.tail_start_id') AS tail_start_id
            FROM part
            WHERE session_id = ? AND json_extract(data, '$.type') = 'compaction'
              AND (time_created > ? OR (time_created = ? AND id > ?))
            ORDER BY time_created, id
            LIMIT ?
            """,
            (
                session_id,
                compactions_after[0],
                compactions_after[0],
                compactions_after[1],
                limit + 1,
            ),
        ),
        limit,
    )

    running_tools, running_more = page(
        rows(
            connection,
            """
            SELECT id AS part_id, message_id, time_created, time_updated,
                   json_extract(data, '$.tool') AS tool,
                   json_extract(data, '$.callID') AS call_id,
                   json_extract(data, '$.state.status') AS status
            FROM part
            WHERE session_id = ? AND json_extract(data, '$.type') = 'tool'
              AND json_extract(data, '$.state.status') IN ('pending', 'running')
              AND (time_created > ? OR (time_created = ? AND id > ?))
            ORDER BY time_created, id
            LIMIT ?
            """,
            (
                session_id,
                running_after[0],
                running_after[0],
                running_after[1],
                limit + 1,
            ),
        ),
        limit,
    )

    nonterminal_messages, nonterminal_more = page(
        rows(
            connection,
            """
            SELECT id AS message_id, time_created, time_updated,
                   json_extract(data, '$.role') AS role,
                   json_extract(data, '$.finish') AS finish
            FROM message
            WHERE session_id = ? AND json_extract(data, '$.role') = 'assistant'
              AND json_extract(data, '$.finish') IS NULL
              AND (time_created > ? OR (time_created = ? AND id > ?))
            ORDER BY time_created, id
            LIMIT ?
            """,
            (
                session_id,
                nonterminal_after[0],
                nonterminal_after[0],
                nonterminal_after[1],
                limit + 1,
            ),
        ),
        limit,
    )

    message_roles = rows(
        connection,
        """
        SELECT COALESCE(json_extract(data, '$.role'), '<unknown>') AS role,
               COUNT(*) AS count
        FROM message WHERE session_id = ? GROUP BY role ORDER BY count DESC, role
        """,
        (session_id,),
    )
    message_finishes = rows(
        connection,
        """
        SELECT COALESCE(json_extract(data, '$.finish'), '<unset>') AS finish,
               COUNT(*) AS count
        FROM message WHERE session_id = ? GROUP BY finish ORDER BY count DESC, finish
        """,
        (session_id,),
    )
    part_types = rows(
        connection,
        """
        SELECT COALESCE(json_extract(data, '$.type'), '<unknown>') AS type,
               COUNT(*) AS count
        FROM part WHERE session_id = ? GROUP BY type ORDER BY count DESC, type
        """,
        (session_id,),
    )
    tools = rows(
        connection,
        """
        SELECT json_extract(data, '$.tool') AS tool,
               json_extract(data, '$.state.status') AS status,
               COUNT(*) AS count
        FROM part
        WHERE session_id = ? AND json_extract(data, '$.type') = 'tool'
        GROUP BY tool, status ORDER BY count DESC, tool, status
        """,
        (session_id,),
    )

    return {
        "source": source(database),
        "schema": {"tables": tables},
        "session": session,
        "counts": counts,
        "message_roles": message_roles,
        "message_finishes": message_finishes,
        "part_types": part_types,
        "tools": tools,
        "compactions": compactions,
        "children": children,
        "task_invocations": task_invocations,
        "running_tools": running_tools,
        "nonterminal_messages": nonterminal_messages,
        "has_more": {
            "compactions": compactions_more,
            "children": children_more,
            "task_invocations": tasks_more,
            "running_tools": running_more,
            "nonterminal_messages": nonterminal_more,
        },
        "continuation": {
            "children": record_cursor(children, "time_created", children_after),
            "task_invocations": record_cursor(
                task_invocations, "time_created", tasks_after, "part_id"
            ),
            "compactions": record_cursor(
                compactions, "time_created", compactions_after, "part_id"
            ),
            "running_tools": record_cursor(
                running_tools, "time_created", running_after, "part_id"
            ),
            "nonterminal_messages": record_cursor(
                nonterminal_messages,
                "time_created",
                nonterminal_after,
                "message_id",
            ),
        },
        "cursors": {
            "message_created": cursor(
                connection, "message", "time_created", session_id
            ),
            "message_updated": cursor(
                connection, "message", "time_updated", session_id
            ),
            "part_created": cursor(connection, "part", "time_created", session_id),
            "part_updated": cursor(connection, "part", "time_updated", session_id),
        },
    }


def record_cursor(
    records: list[dict[str, Any]],
    field: str,
    fallback: tuple[int, str],
    id_field: str = "id",
) -> dict[str, Any]:
    if not records:
        return {"time": fallback[0], "id": fallback[1]}
    record = records[-1]
    return {"time": record[field], "id": record[id_field]}


def part_projection(
    include_content: bool, max_text_chars: int, max_tool_chars: int
) -> str:
    fields = [
        "id",
        "message_id",
        "time_created",
        "time_updated",
        "json_extract(data, '$.type') AS type",
        "json_extract(data, '$.tool') AS tool",
        "json_extract(data, '$.callID') AS call_id",
        "json_extract(data, '$.state.status') AS status",
        "json_extract(data, '$.auto') AS auto",
        "json_extract(data, '$.overflow') AS overflow",
        "json_extract(data, '$.tail_start_id') AS tail_start_id",
    ]
    if include_content:
        fields.extend(
            [
                f"CASE WHEN json_extract(data, '$.type') = 'text' THEN substr(json_extract(data, '$.text'), 1, {max_text_chars}) END AS text_preview",
                f"CASE WHEN json_extract(data, '$.type') = 'tool' THEN substr(json_extract(data, '$.state.input'), 1, {max_tool_chars}) END AS input_preview",
                f"CASE WHEN json_extract(data, '$.type') = 'tool' THEN substr(json_extract(data, '$.state.output'), 1, {max_tool_chars}) END AS output_preview",
                f"CASE WHEN json_extract(data, '$.type') = 'tool' THEN substr(json_extract(data, '$.state.error'), 1, {max_tool_chars}) END AS error_preview",
            ]
        )
    return ", ".join(fields)


def bundle_part_projection(
    include_tool_content: bool, max_text_chars: int, max_tool_chars: int
) -> str:
    fields = [
        "id",
        "message_id",
        "time_created",
        "time_updated",
        "json_extract(data, '$.type') AS type",
        "json_extract(data, '$.tool') AS tool",
        "json_extract(data, '$.callID') AS call_id",
        "CASE WHEN json_extract(data, '$.type') = 'text' THEN "
        "(SELECT json_extract(m.data, '$.role') FROM message AS m "
        "WHERE m.id = part.message_id AND m.session_id = part.session_id) "
        "END AS message_role",
        "json_extract(data, '$.state.status') AS status",
        "json_extract(data, '$.state.title') AS task_title",
        "json_extract(data, '$.state.input.task_id') AS requested_task_id",
        "json_extract(data, '$.state.metadata.sessionId') AS child_session_id",
        "(SELECT c.parent_id FROM session c "
        "WHERE c.id = json_extract(data, '$.state.metadata.sessionId')) "
        "AS child_parent_id",
        "json_extract(data, '$.auto') AS auto",
        "json_extract(data, '$.overflow') AS overflow",
        "json_extract(data, '$.tail_start_id') AS tail_start_id",
        f"CASE WHEN json_extract(data, '$.type') = 'text' "
        f"THEN substr(json_extract(data, '$.text'), 1, {max_text_chars}) "
        "END AS text_preview",
        f"CASE WHEN json_extract(data, '$.type') = 'text' "
        f"THEN length(COALESCE(json_extract(data, '$.text'), '')) > {max_text_chars} "
        "END AS text_truncated",
    ]
    if include_tool_content:
        fields.extend(
            [
                f"CASE WHEN json_extract(data, '$.type') = 'tool' "
                f"THEN substr(json_extract(data, '$.state.input'), 1, {max_tool_chars}) "
                "END AS input_preview",
                f"CASE WHEN json_extract(data, '$.type') = 'tool' "
                f"THEN substr(json_extract(data, '$.state.output'), 1, {max_tool_chars}) "
                "END AS output_preview",
                f"CASE WHEN json_extract(data, '$.type') = 'tool' "
                f"THEN substr(json_extract(data, '$.state.error'), 1, {max_tool_chars}) "
                "END AS error_preview",
            ]
        )
    return ", ".join(fields)


def tool_context_part_projection(
    include_tool_content: bool, max_tool_chars: int
) -> str:
    fields = [
        "p.id AS id",
        "p.message_id AS message_id",
        "p.time_created AS time_created",
        "p.time_updated AS time_updated",
        "json_extract(p.data, '$.type') AS type",
        "json_extract(p.data, '$.tool') AS tool",
        "json_extract(p.data, '$.callID') AS call_id",
        "json_extract(p.data, '$.state.status') AS status",
        "json_extract(p.data, '$.state.title') AS task_title",
        "json_extract(p.data, '$.state.input.task_id') AS requested_task_id",
        "json_extract(p.data, '$.state.metadata.sessionId') AS child_session_id",
        "(SELECT c.parent_id FROM session AS c "
        "WHERE c.id = json_extract(p.data, '$.state.metadata.sessionId')) "
        "AS child_parent_id",
        "json_extract(p.data, '$.auto') AS auto",
        "json_extract(p.data, '$.overflow') AS overflow",
        "json_extract(p.data, '$.tail_start_id') AS tail_start_id",
    ]
    if include_tool_content:
        fields.extend(
            [
                f"CASE WHEN json_extract(p.data, '$.type') = 'tool' "
                f"THEN substr(json_extract(p.data, '$.state.input'), 1, {max_tool_chars}) "
                "END AS input_preview",
                f"CASE WHEN json_extract(p.data, '$.type') = 'tool' "
                f"THEN length(COALESCE(json_extract(p.data, '$.state.input'), '')) > {max_tool_chars} "
                "END AS input_truncated",
                f"CASE WHEN json_extract(p.data, '$.type') = 'tool' "
                f"THEN substr(json_extract(p.data, '$.state.output'), 1, {max_tool_chars}) "
                "END AS output_preview",
                f"CASE WHEN json_extract(p.data, '$.type') = 'tool' "
                f"THEN length(COALESCE(json_extract(p.data, '$.state.output'), '')) > {max_tool_chars} "
                "END AS output_truncated",
                f"CASE WHEN json_extract(p.data, '$.type') = 'tool' "
                f"THEN substr(json_extract(p.data, '$.state.error'), 1, {max_tool_chars}) "
                "END AS error_preview",
                f"CASE WHEN json_extract(p.data, '$.type') = 'tool' "
                f"THEN length(COALESCE(json_extract(p.data, '$.state.error'), '')) > {max_tool_chars} "
                "END AS error_truncated",
            ]
        )
    return ", ".join(fields)


def delta_page_stream(
    connection: sqlite3.Connection,
    table: str,
    order_field: str,
    fields: str,
    session_id: str,
    after: tuple[int, str],
    through: tuple[int, str],
    limit: int,
    label: str,
    max_records: int,
    max_record_bytes: int,
) -> tuple[list[dict[str, Any]], int]:
    records: list[dict[str, Any]] = []
    pages = 0
    current_after = after
    while True:
        raw_page = rows(
            connection,
            f"""
            SELECT {fields}
            FROM {table}
            WHERE session_id = ?
              AND ({order_field} > ? OR ({order_field} = ? AND id > ?))
              AND ({order_field} < ? OR ({order_field} = ? AND id <= ?))
            ORDER BY {order_field}, id LIMIT ?
            """,
            (
                session_id,
                current_after[0],
                current_after[0],
                current_after[1],
                through[0],
                through[0],
                through[1],
                limit + 1,
            ),
        )
        current_page, has_more = page(raw_page, limit)
        pages += 1
        for record in current_page:
            if len(records) >= max_records:
                raise SystemExit(
                    f"bundle {label} exceeded the per-stream ceiling of {max_records} "
                    "records; no complete bundle was returned"
                )
            if record.get("text_truncated") is not None:
                record["text_truncated"] = bool(record["text_truncated"])
            records.append(
                enforce_record_ceiling(
                    record, f"{label}[{len(records)}]", max_record_bytes
                )
            )
        if not has_more:
            return records, pages
        if not current_page:
            raise SystemExit(f"bundle {label} could not advance its Delta cursor")
        last = current_page[-1]
        next_after = (int(last[order_field]), str(last["id"]))
        if next_after == current_after:
            raise SystemExit(f"bundle {label} returned a non-advancing Delta cursor")
        current_after = next_after


def merge_bundle_observations(
    created: list[dict[str, Any]], updated: list[dict[str, Any]]
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], int]:
    created_by_id: dict[str, dict[str, Any]] = {}
    created_order: list[str] = []
    updated_by_id: dict[str, dict[str, Any]] = {}
    updated_order: list[str] = []
    for record in created:
        record_id = str(record["id"])
        if record_id not in created_by_id:
            created_order.append(record_id)
            created_by_id[record_id] = record
        elif int(record["time_updated"]) >= int(
            created_by_id[record_id]["time_updated"]
        ):
            created_by_id[record_id] = record
    for record in updated:
        record_id = str(record["id"])
        if record_id not in updated_by_id:
            updated_order.append(record_id)
            updated_by_id[record_id] = record
        elif int(record["time_updated"]) >= int(
            updated_by_id[record_id]["time_updated"]
        ):
            updated_by_id[record_id] = record

    merged_created: list[dict[str, Any]] = []
    for record_id in created_order:
        created_record = created_by_id[record_id]
        updated_record = updated_by_id.get(record_id)
        if updated_record is not None and int(updated_record["time_updated"]) >= int(
            created_record["time_updated"]
        ):
            merged_created.append(updated_record)
        else:
            merged_created.append(created_record)
    merged_updated = [
        updated_by_id[record_id]
        for record_id in updated_order
        if record_id not in created_by_id
    ]
    reasoning_ids = {
        str(record["id"])
        for record in created + updated
        if record.get("type") == "reasoning"
    }
    merged_created = [
        record for record in merged_created if record.get("type") != "reasoning"
    ]
    merged_updated = [
        record for record in merged_updated if record.get("type") != "reasoning"
    ]
    return merged_created, merged_updated, len(reasoning_ids)


def bundle_outline_data(
    connection: sqlite3.Connection,
    session_id: str,
    max_records: int,
    max_record_bytes: int,
) -> dict[str, Any]:
    task_invocations = bounded_collection(
        connection,
        """
        SELECT p.id AS part_id, p.message_id, p.time_created, p.time_updated,
               json_extract(p.data, '$.callID') AS call_id,
               json_extract(p.data, '$.state.status') AS status,
               json_extract(p.data, '$.state.title') AS title,
               json_extract(p.data, '$.state.input.task_id') AS requested_task_id,
               json_extract(p.data, '$.state.metadata.sessionId') AS child_session_id,
               (SELECT c.parent_id FROM session c
                WHERE c.id = json_extract(p.data, '$.state.metadata.sessionId'))
                AS child_parent_id
        FROM part p
        WHERE p.session_id = ?
          AND json_extract(p.data, '$.type') = 'tool'
          AND json_extract(p.data, '$.tool') = 'task'
        ORDER BY p.time_created, p.id
        """,
        (session_id,),
        f"{session_id}.task_invocations",
        max_records,
        max_record_bytes,
    )
    for invocation in task_invocations:
        invocation["kind"] = classify_invocation(invocation)

    compactions = bounded_collection(
        connection,
        """
        SELECT id AS part_id, message_id, time_created, time_updated,
               json_extract(data, '$.auto') AS auto,
               json_extract(data, '$.overflow') AS overflow,
               json_extract(data, '$.tail_start_id') AS tail_start_id
        FROM part
        WHERE session_id = ? AND json_extract(data, '$.type') = 'compaction'
        ORDER BY time_created, id
        """,
        (session_id,),
        f"{session_id}.compactions",
        max_records,
        max_record_bytes,
    )
    running_tools = bounded_collection(
        connection,
        """
        SELECT id AS part_id, message_id, time_created, time_updated,
               json_extract(data, '$.tool') AS tool,
               json_extract(data, '$.callID') AS call_id,
               json_extract(data, '$.state.status') AS status
        FROM part
        WHERE session_id = ? AND json_extract(data, '$.type') = 'tool'
          AND json_extract(data, '$.state.status') IN ('pending', 'running')
        ORDER BY time_created, id
        """,
        (session_id,),
        f"{session_id}.running_tools",
        max_records,
        max_record_bytes,
    )
    nonterminal_messages = bounded_collection(
        connection,
        """
        SELECT id AS message_id, time_created, time_updated,
               json_extract(data, '$.role') AS role,
               json_extract(data, '$.finish') AS finish
        FROM message
        WHERE session_id = ? AND json_extract(data, '$.role') = 'assistant'
          AND json_extract(data, '$.finish') IS NULL
        ORDER BY time_created, id
        """,
        (session_id,),
        f"{session_id}.nonterminal_messages",
        max_records,
        max_record_bytes,
    )

    aggregates = {
        "message_roles": bounded_collection(
            connection,
            """
            SELECT COALESCE(json_extract(data, '$.role'), '<unknown>') AS role,
                   COUNT(*) AS count
            FROM message WHERE session_id = ?
            GROUP BY role ORDER BY count DESC, role
            """,
            (session_id,),
            f"{session_id}.message_roles",
            max_records,
            max_record_bytes,
        ),
        "message_finishes": bounded_collection(
            connection,
            """
            SELECT COALESCE(json_extract(data, '$.finish'), '<unset>') AS finish,
                   COUNT(*) AS count
            FROM message WHERE session_id = ?
            GROUP BY finish ORDER BY count DESC, finish
            """,
            (session_id,),
            f"{session_id}.message_finishes",
            max_records,
            max_record_bytes,
        ),
        "part_types": bounded_collection(
            connection,
            """
            SELECT COALESCE(json_extract(data, '$.type'), '<unknown>') AS type,
                   COUNT(*) AS count
            FROM part WHERE session_id = ?
            GROUP BY type ORDER BY count DESC, type
            """,
            (session_id,),
            f"{session_id}.part_types",
            max_records,
            max_record_bytes,
        ),
        "tools": bounded_collection(
            connection,
            """
            SELECT json_extract(data, '$.tool') AS tool,
                   json_extract(data, '$.state.status') AS status,
                   COUNT(*) AS count
            FROM part
            WHERE session_id = ? AND json_extract(data, '$.type') = 'tool'
            GROUP BY tool, status ORDER BY count DESC, tool, status
            """,
            (session_id,),
            f"{session_id}.tools",
            max_records,
            max_record_bytes,
        ),
    }
    reasoning_total = int(
        connection.execute(
            """
            SELECT COUNT(*) FROM part
            WHERE session_id = ? AND json_extract(data, '$.type') = 'reasoning'
            """,
            (session_id,),
        ).fetchone()[0]
    )
    return {
        "compactions": compactions,
        "task_invocations": task_invocations,
        "running_tools": running_tools,
        "nonterminal_messages": nonterminal_messages,
        "reasoning_records_total": reasoning_total,
        **aggregates,
    }


def bundle_delta_data(
    connection: sqlite3.Connection,
    session_id: str,
    starting: dict[str, tuple[int, str]],
    terminal: dict[str, tuple[int, str]],
    limit: int,
    max_records: int,
    max_record_bytes: int,
    include_tool_content: bool,
    max_text_chars: int,
    max_tool_chars: int,
) -> dict[str, Any]:
    message_fields = """
        id, time_created, time_updated,
        json_extract(data, '$.role') AS role,
        json_extract(data, '$.finish') AS finish,
        CASE WHEN json_extract(data, '$.error') IS NULL THEN 0 ELSE 1 END AS has_error
    """
    projected_parts = bundle_part_projection(
        include_tool_content, max_text_chars, max_tool_chars
    )
    messages_created_raw, messages_created_pages = delta_page_stream(
        connection,
        "message",
        "time_created",
        message_fields,
        session_id,
        starting["message_created"],
        terminal["message_created"],
        limit,
        f"{session_id}.messages_created",
        max_records,
        max_record_bytes,
    )
    messages_updated_raw, messages_updated_pages = delta_page_stream(
        connection,
        "message",
        "time_updated",
        message_fields,
        session_id,
        starting["message_updated"],
        terminal["message_updated"],
        limit,
        f"{session_id}.messages_updated",
        max_records,
        max_record_bytes,
    )
    parts_created_raw, parts_created_pages = delta_page_stream(
        connection,
        "part",
        "time_created",
        projected_parts,
        session_id,
        starting["part_created"],
        terminal["part_created"],
        limit,
        f"{session_id}.parts_created",
        max_records,
        max_record_bytes,
    )
    parts_updated_raw, parts_updated_pages = delta_page_stream(
        connection,
        "part",
        "time_updated",
        projected_parts,
        session_id,
        starting["part_updated"],
        terminal["part_updated"],
        limit,
        f"{session_id}.parts_updated",
        max_records,
        max_record_bytes,
    )
    messages_created, messages_updated, message_reasoning = merge_bundle_observations(
        messages_created_raw, messages_updated_raw
    )
    parts_created, parts_updated, part_reasoning = merge_bundle_observations(
        parts_created_raw, parts_updated_raw
    )
    mutation_messages = bounded_collection(
        connection,
        """
        SELECT id, time_created, time_updated
        FROM message
        WHERE session_id = ?
          AND (time_created < ? OR (time_created = ? AND id <= ?))
          AND (time_updated > ? OR (time_updated = ? AND id > ?))
        ORDER BY time_updated, id
        """,
        (
            session_id,
            terminal["message_created"][0],
            terminal["message_created"][0],
            terminal["message_created"][1],
            terminal["message_updated"][0],
            terminal["message_updated"][0],
            terminal["message_updated"][1],
        ),
        f"{session_id}.post_pin_messages",
        max_records,
        max_record_bytes,
    )
    mutation_parts = bounded_collection(
        connection,
        """
        SELECT id, message_id, time_created, time_updated
        FROM part
        WHERE session_id = ?
          AND (time_created < ? OR (time_created = ? AND id <= ?))
          AND (time_updated > ? OR (time_updated = ? AND id > ?))
        ORDER BY time_updated, id
        """,
        (
            session_id,
            terminal["part_created"][0],
            terminal["part_created"][0],
            terminal["part_created"][1],
            terminal["part_updated"][0],
            terminal["part_updated"][0],
            terminal["part_updated"][1],
        ),
        f"{session_id}.post_pin_parts",
        max_records,
        max_record_bytes,
    )
    return {
        "observations": {
            "messages_created": messages_created,
            "messages_updated": messages_updated,
            "parts_created": parts_created,
            "parts_updated": parts_updated,
        },
        "reasoning_records_excluded": message_reasoning + part_reasoning,
        "pages": {
            "messages_created": messages_created_pages,
            "messages_updated": messages_updated_pages,
            "parts_created": parts_created_pages,
            "parts_updated": parts_updated_pages,
        },
        "post_pin_mutations": {
            "messages": mutation_messages,
            "parts": mutation_parts,
        },
    }


def reconstruction_records(
    observations: dict[str, list[dict[str, Any]]]
) -> list[dict[str, Any]]:
    latest_by_id: dict[str, dict[str, Any]] = {}
    for stream in ("parts_created", "parts_updated"):
        for record in observations[stream]:
            record_id = str(record["id"])
            previous = latest_by_id.get(record_id)
            if previous is None or int(record["time_updated"]) >= int(
                previous["time_updated"]
            ):
                latest_by_id[record_id] = record
    return sorted(
        latest_by_id.values(),
        key=lambda record: (int(record["time_created"]), str(record["id"])),
    )


def reconstruction_evidence(
    observations: dict[str, list[dict[str, Any]]],
    session_id: str,
    max_record_bytes: int,
) -> dict[str, Any]:
    records = reconstruction_records(observations)
    text_records = [record for record in records if record.get("type") == "text"]
    tool_observations = [record for record in records if record.get("type") == "tool"]
    completed_non_task_tools = [
        record
        for record in tool_observations
        if record.get("tool") != "task" and record.get("status") == "completed"
    ]
    tool_records = [
        record
        for record in tool_observations
        if record not in completed_non_task_tools
    ]
    completed_by_tool: dict[str, list[str]] = {}
    for record in completed_non_task_tools:
        tool_name = record.get("tool") or "<unknown-tool>"
        completed_by_tool.setdefault(str(tool_name), []).append(str(record["id"]))
    completed_tool_locators = [
        enforce_record_ceiling(
            {"tool": tool_name, "part_ids": part_ids},
            f"{session_id}.completed_tool_locators[{index}]",
            max_record_bytes,
        )
        for index, (tool_name, part_ids) in enumerate(sorted(completed_by_tool.items()))
    ]
    completed_locator_count = sum(
        len(locator["part_ids"]) for locator in completed_tool_locators
    )
    return {
        "text_records": text_records,
        "tool_records": tool_records,
        "completed_tool_locators": completed_tool_locators,
        "selection": {
            "text_observations_total": len(text_records),
            "tool_observations_total": len(tool_observations),
            "tool_records_returned": len(tool_records),
            "completed_non_task_tool_observations_omitted": len(
                completed_non_task_tools
            ),
            "completed_tool_locators_returned": completed_locator_count,
            "message_observations_omitted": True,
        },
    }


def reconstruction_session(result: dict[str, Any], max_record_bytes: int) -> dict[str, Any]:
    reconstructed = dict(result)
    reconstructed["evidence"] = reconstruction_evidence(
        reconstructed.pop("observations"),
        reconstructed["session_id"],
        max_record_bytes,
    )
    return reconstructed


def bundle_session(
    connection: sqlite3.Connection,
    session_id: str,
    metadata: dict[str, Any],
    tables: list[str],
    prior_entry: dict[str, Any] | None,
    mode: str,
    limit: int,
    max_records: int,
    max_record_bytes: int,
    include_tool_content: bool,
    max_text_chars: int,
    max_tool_chars: int,
) -> dict[str, Any]:
    starting = (
        cursor_tuples(prior_entry["cursors"])
        if prior_entry is not None
        else {stream: (0, "") for stream in BUNDLE_STREAMS}
    )
    terminal = current_terminal_cursors(connection, session_id)
    terminal_prefix_fingerprints = {
        stream: prefix_fingerprint(connection, session_id, stream, terminal[stream])
        for stream in BUNDLE_PREFIX_STREAMS
    }
    starting_prefix_fingerprints = {
        stream: prefix_fingerprint(connection, session_id, stream, starting[stream])
        for stream in BUNDLE_PREFIX_STREAMS
    }
    counts = {
        "messages": bounded_count(
            connection, "message", session_id, terminal["message_created"]
        ),
        "parts": bounded_count(
            connection, "part", session_id, terminal["part_created"]
        ),
        "session_messages": (
            table_count(connection, "session_message", session_id)
            if "session_message" in tables
            else None
        ),
    }
    terminal_objects = {
        stream: cursor_object(value) for stream, value in terminal.items()
    }
    starting_objects = {
        stream: cursor_object(value) for stream, value in starting.items()
    }
    gaps: list[dict[str, Any]] = []
    if prior_entry is not None:
        gaps.extend(
            historical_state_gaps(
                connection,
                session_id,
                starting,
                prior_entry,
                starting_prefix_fingerprints,
            )
        )
    if prior_entry is not None and prior_entry.get("counts") is not None:
        previous_counts = prior_entry["counts"]
        for name in ("messages", "parts"):
            if counts[name] < previous_counts[name]:
                gaps.append(
                    {
                        "kind": "count-regression",
                        "stream": name,
                        "previous": previous_counts[name],
                        "current": counts[name],
                        "action": "rebuild-required",
                    }
                )
    for stream in BUNDLE_STREAMS:
        if cursor_after(starting[stream], terminal[stream]):
            gaps.append(
                {
                    "kind": "cursor-beyond-terminal",
                    "stream": stream,
                    "starting": starting_objects[stream],
                    "terminal": terminal_objects[stream],
                    "action": "rebuild-required",
                }
            )

    if gaps:
        state = (
            "rebuild_required"
            if any(gap.get("action") == "rebuild-required" for gap in gaps)
            else "requires_repin"
        )
        return {
            "session_id": session_id,
            "status": "present",
            "metadata": metadata,
            "state": state,
            "counts": counts,
            "prefix_fingerprints": starting_prefix_fingerprints,
            "coverage": {
                "complete": False,
                "starting_cursors": starting_objects,
                "ending_cursors": starting_objects,
                "terminal_identities": terminal_identities(terminal),
                "pages": {},
            },
            "compactions": [],
            "task_invocations": [],
            "running_tools": [],
            "nonterminal_messages": [],
            "message_roles": [],
            "message_finishes": [],
            "part_types": [],
            "tools": [],
            "observations": {
                "messages_created": [],
                "messages_updated": [],
                "parts_created": [],
                "parts_updated": [],
            },
            "reasoning_records_excluded": 0,
            "reasoning_records_total": None,
            "gaps": gaps,
        }

    outline = bundle_outline_data(
        connection, session_id, max_records, max_record_bytes
    )
    delta_result = bundle_delta_data(
        connection,
        session_id,
        starting,
        terminal,
        limit,
        max_records,
        max_record_bytes,
        include_tool_content,
        max_text_chars,
        max_tool_chars,
    )
    if delta_result["post_pin_mutations"]["messages"] or delta_result["post_pin_mutations"]["parts"]:
        gaps = [
            {
                "kind": "post-pin-mutation",
                "messages": delta_result["post_pin_mutations"]["messages"],
                "parts": delta_result["post_pin_mutations"]["parts"],
            }
        ]
        state = "requires_repin"
        complete = False
        ending_objects = starting_objects
        state_prefix_fingerprints = starting_prefix_fingerprints
        observations = {
            "messages_created": [],
            "messages_updated": [],
            "parts_created": [],
            "parts_updated": [],
        }
        reasoning_excluded = 0
        pages = delta_result["pages"]
    else:
        gaps = []
        state = mode
        complete = True
        ending_objects = terminal_objects
        state_prefix_fingerprints = terminal_prefix_fingerprints
        observations = delta_result["observations"]
        reasoning_excluded = delta_result["reasoning_records_excluded"]
        pages = delta_result["pages"]

    return {
        "session_id": session_id,
        "status": "present",
        "metadata": metadata,
        "state": state,
        "counts": counts,
        "prefix_fingerprints": state_prefix_fingerprints,
        "coverage": {
            "complete": complete,
            "starting_cursors": starting_objects,
            "ending_cursors": ending_objects,
            "terminal_identities": terminal_identities(terminal),
            "pages": pages,
        },
        "compactions": outline["compactions"],
        "task_invocations": outline["task_invocations"],
        "running_tools": outline["running_tools"],
        "nonterminal_messages": outline["nonterminal_messages"],
        "message_roles": outline["message_roles"],
        "message_finishes": outline["message_finishes"],
        "part_types": outline["part_types"],
        "tools": outline["tools"],
        "observations": observations,
        "reasoning_records_excluded": reasoning_excluded,
        "reasoning_records_total": outline["reasoning_records_total"],
        "gaps": gaps,
    }


def bundle_next_state(
    source_identity: str,
    parent_id: str,
    known_child_ids: list[str],
    session_results: dict[str, dict[str, Any]],
    prior_state: dict[str, Any] | None,
) -> dict[str, Any]:
    sessions: dict[str, dict[str, Any]] = {}
    prior_sessions = prior_state["sessions"] if prior_state is not None else {}
    for session_id, result in session_results.items():
        if result["state"] in {"initial", "incremental"} and result["coverage"]["complete"]:
            sessions[session_id] = {
                "cursors": result["coverage"]["ending_cursors"],
                "counts": {
                    "messages": result["counts"]["messages"],
                    "parts": result["counts"]["parts"],
                },
                "terminal_identities": result["coverage"]["terminal_identities"],
                "prefix_fingerprints": result["prefix_fingerprints"],
            }
        elif session_id in prior_sessions:
            sessions[session_id] = prior_sessions[session_id]
        else:
            sessions[session_id] = {
                "cursors": result["coverage"]["starting_cursors"],
                "counts": {"messages": 0, "parts": 0},
                "terminal_identities": {
                    stream: None for stream in BUNDLE_STREAMS
                },
                "prefix_fingerprints": result["prefix_fingerprints"],
            }
    for session_id in known_child_ids:
        if session_id not in sessions and session_id in prior_sessions:
            sessions[session_id] = prior_sessions[session_id]
    return {
        "version": BUNDLE_STATE_VERSION,
        "source_identity": source_identity,
        "parent_session_id": parent_id,
        "known_child_ids": known_child_ids,
        "sessions": sessions,
    }


def bundle(
    connection: sqlite3.Connection,
    database: str,
    parent_id: str,
    raw_state: str | None,
    limit: int,
    max_records: int,
    max_record_bytes: int,
    include_tool_content: bool,
    max_text_chars: int,
    max_tool_chars: int,
    view: str = "full",
) -> dict[str, Any]:
    tables = validate_schema(connection)
    current_source = source(database)
    prior_state = parse_bundle_state(raw_state, parent_id)
    if (
        prior_state is not None
        and prior_state["source_identity"] != current_source["identity"]
    ):
        raise SystemExit(
            "bundle state source_identity does not match the current read-only source"
        )

    parent_metadata = session_metadata(connection, parent_id)
    if parent_metadata is None:
        raise SystemExit(f"session not found: {parent_id}")
    selected_session_columns = ", ".join(session_columns(connection))
    child_rows = rows(
        connection,
        f"""
        SELECT {selected_session_columns}
        FROM session
        WHERE parent_id = ?
        ORDER BY time_created, id
        LIMIT ?
        """,
        (parent_id, max_records + 1),
    )
    current_child_ids = [item["id"] for item in child_rows]
    if len(current_child_ids) > max_records:
        raise SystemExit(
            f"bundle direct-child topology exceeded the per-collection ceiling of "
            f"{max_records} records; no complete bundle was returned"
        )
    prior_child_ids = prior_state["known_child_ids"] if prior_state else []
    known_child_ids = list(dict.fromkeys(prior_child_ids + current_child_ids))
    if len(known_child_ids) > max_records:
        raise SystemExit(
            f"bundle known-child topology exceeded the per-collection ceiling of "
            f"{max_records} records; no complete bundle was returned"
        )
    metadata_by_id = {
        session_id: enforce_record_ceiling(
            metadata_with_iso_timestamps(metadata),
            f"{session_id}.metadata",
            max_record_bytes,
        )
        for session_id, metadata in {
            parent_id: parent_metadata,
            **{item["id"]: item for item in child_rows},
        }.items()
    }
    parent_metadata = metadata_by_id[parent_id]

    session_results: dict[str, dict[str, Any]] = {}
    session_results[parent_id] = bundle_session(
        connection,
        parent_id,
        parent_metadata,
        tables,
        prior_state["sessions"].get(parent_id) if prior_state else None,
        "incremental" if prior_state else "initial",
        limit,
        max_records,
        max_record_bytes,
        include_tool_content,
        max_text_chars,
        max_tool_chars,
    )
    for child_id in current_child_ids:
        session_results[child_id] = bundle_session(
            connection,
            child_id,
            metadata_by_id[child_id],
            tables,
            prior_state["sessions"].get(child_id) if prior_state else None,
            "incremental" if prior_state and child_id in prior_child_ids else "initial",
            limit,
            max_records,
            max_record_bytes,
            include_tool_content,
            max_text_chars,
            max_tool_chars,
        )

    missing_child_ids = [
        child_id for child_id in prior_child_ids if child_id not in current_child_ids
    ]
    prior_sessions = prior_state["sessions"] if prior_state else {}
    for child_id in missing_child_ids:
        prior_entry = prior_sessions[child_id]
        starting = prior_entry["cursors"]
        session_results[child_id] = {
            "session_id": child_id,
            "status": "missing",
            "metadata": None,
            "state": "missing",
            "counts": None,
            "prefix_fingerprints": prior_entry["prefix_fingerprints"],
            "coverage": {
                "complete": False,
                "starting_cursors": starting,
                "ending_cursors": starting,
                "terminal_identities": prior_entry.get(
                    "terminal_identities",
                    {stream: None for stream in BUNDLE_STREAMS},
                ),
                "pages": {},
            },
            "compactions": [],
            "task_invocations": [],
            "running_tools": [],
            "nonterminal_messages": [],
            "message_roles": [],
            "message_finishes": [],
            "part_types": [],
            "tools": [],
            "observations": {
                "messages_created": [],
                "messages_updated": [],
                "parts_created": [],
                "parts_updated": [],
            },
            "reasoning_records_excluded": 0,
            "reasoning_records_total": None,
            "gaps": [{"kind": "missing-child", "session_id": child_id}],
        }

    topology_children = [
        enforce_record_ceiling(
            {
                "session_id": child_id,
                "status": session_results[child_id]["status"],
                "state": session_results[child_id]["state"],
            },
            f"{child_id}.topology",
            max_record_bytes,
        )
        for child_id in current_child_ids
    ]
    topology = {
        "parent_session_id": parent_id,
        "current_child_ids": current_child_ids,
        "known_child_ids": known_child_ids,
        "added_child_ids": [
            child_id for child_id in current_child_ids if child_id not in prior_child_ids
        ],
        "removed_child_ids": missing_child_ids,
        "missing_child_ids": missing_child_ids,
        "children": topology_children,
    }
    gaps: list[dict[str, Any]] = []
    for result in session_results.values():
        gaps.extend(result["gaps"])

    result = {
        "mode": "bundle",
        "view": view,
        "source": current_source,
        "parent_session_id": parent_id,
        "topology": topology,
        "sessions": session_results,
        "content": {
            "text_previews": True,
            "tool_content": include_tool_content,
            "max_text_chars": max_text_chars,
            "max_tool_chars": max_tool_chars if include_tool_content else None,
        },
        "gaps": gaps,
        "next_state": bundle_next_state(
            current_source["identity"],
            parent_id,
            known_child_ids,
            session_results,
            prior_state,
        ),
    }
    if view == "full":
        return result
    if view == "reconstruction":
        result["sessions"] = {
            session_id: reconstruction_session(session_result, max_record_bytes)
            for session_id, session_result in session_results.items()
        }
        return result
    raise ValueError(f"unsupported bundle view: {view}")


def tool_context(
    connection: sqlite3.Connection,
    database: str,
    session_id: str,
    part_id: str,
    max_records: int,
    max_record_bytes: int,
    include_tool_content: bool,
    max_text_chars: int,
    max_tool_chars: int,
) -> dict[str, Any]:
    validate_schema(connection)
    current_source = source(database)
    session = session_metadata(connection, session_id)
    if session is None:
        raise SystemExit(f"session not found: {session_id}")
    session = enforce_record_ceiling(
        session, f"{session_id}.metadata", max_record_bytes
    )

    terminal = current_terminal_cursors(connection, session_id)
    pin = {stream: cursor_object(value) for stream, value in terminal.items()}
    counts = {
        "messages": bounded_count(
            connection, "message", session_id, terminal["message_created"]
        ),
        "parts": bounded_count(
            connection, "part", session_id, terminal["part_created"]
        ),
    }

    target_projection = tool_context_part_projection(
        include_tool_content, max_tool_chars
    )
    target = one(
        connection,
        f"""
        SELECT {target_projection}
        FROM part AS p
        WHERE p.id = ? AND p.session_id = ?
          AND (p.time_created < ? OR
               (p.time_created = ? AND p.id <= ?))
          AND (p.time_updated < ? OR
               (p.time_updated = ? AND p.id <= ?))
        """,
        (
            part_id,
            session_id,
            terminal["part_created"][0],
            terminal["part_created"][0],
            terminal["part_created"][1],
            terminal["part_updated"][0],
            terminal["part_updated"][0],
            terminal["part_updated"][1],
        ),
    )
    if target is None:
        raise SystemExit(f"part not found in session: {part_id}")
    if target["type"] != "tool":
        raise SystemExit(f"part is not a tool: {part_id}")
    for field in ("input_truncated", "output_truncated", "error_truncated"):
        if target.get(field) is not None:
            target[field] = bool(target[field])
    target = enforce_record_ceiling(target, f"{session_id}.{part_id}.tool", max_record_bytes)

    assistant_message = one(
        connection,
        """
        SELECT id,
               json_extract(data, '$.role') AS role,
               json_extract(data, '$.finish') AS finish,
               CASE WHEN json_extract(data, '$.error') IS NULL THEN 0 ELSE 1 END
                   AS has_error,
               time_created,
               time_updated
        FROM message
        WHERE session_id = ? AND id = ?
          AND (time_created < ? OR
               (time_created = ? AND id <= ?))
          AND (time_updated < ? OR
               (time_updated = ? AND id <= ?))
        """,
        (
            session_id,
            target["message_id"],
            terminal["message_created"][0],
            terminal["message_created"][0],
            terminal["message_created"][1],
            terminal["message_updated"][0],
            terminal["message_updated"][0],
            terminal["message_updated"][1],
        ),
    )
    if assistant_message is None:
        raise SystemExit(f"owning message not found: {target['message_id']}")
    if assistant_message["role"] != "assistant":
        raise SystemExit(f"owning message is not assistant: {target['message_id']}")
    assistant_message["has_error"] = bool(assistant_message["has_error"])
    assistant_message = enforce_record_ceiling(
        assistant_message,
        f"{session_id}.{target['message_id']}.message",
        max_record_bytes,
    )

    request_rows = rows(
        connection,
        f"""
        WITH candidate_parts AS (
            SELECT m.id AS message_id,
                   p.id AS part_id,
                   p.time_created
            FROM message AS m
            JOIN part AS p
              ON p.message_id = m.id AND p.session_id = m.session_id
            WHERE m.session_id = ?
              AND json_extract(m.data, '$.role') = 'user'
              AND json_extract(p.data, '$.type') = 'text'
              AND (p.time_created < ? OR
                   (p.time_created = ? AND p.id < ?))
              AND (p.time_created < ? OR
                   (p.time_created = ? AND p.id <= ?))
              AND (p.time_updated < ? OR
                   (p.time_updated = ? AND p.id <= ?))
        ),
        request_message AS (
            SELECT c.message_id
            FROM candidate_parts AS c
            WHERE NOT EXISTS (
                SELECT 1
                FROM candidate_parts AS newer
                WHERE newer.time_created > c.time_created
                   OR (newer.time_created = c.time_created
                       AND newer.part_id > c.part_id)
            )
            ORDER BY c.time_created DESC, c.part_id DESC
            LIMIT 1
        )
        SELECT r.message_id AS request_message_id,
               p.id,
               p.message_id,
               p.time_created,
               p.time_updated,
               json_extract(m.data, '$.role') AS message_role,
               substr(json_extract(p.data, '$.text'), 1, {max_text_chars})
                   AS text_preview,
               length(COALESCE(json_extract(p.data, '$.text'), '')) > {max_text_chars}
                   AS text_truncated
        FROM request_message AS r
        JOIN message AS m
          ON m.id = r.message_id AND m.session_id = ?
        JOIN part AS p
          ON p.message_id = r.message_id AND p.session_id = m.session_id
        WHERE json_extract(m.data, '$.role') = 'user'
          AND json_extract(p.data, '$.type') = 'text'
          AND (p.time_created < ? OR
               (p.time_created = ? AND p.id < ?))
          AND (p.time_created < ? OR
               (p.time_created = ? AND p.id <= ?))
          AND (p.time_updated < ? OR
               (p.time_updated = ? AND p.id <= ?))
        ORDER BY p.time_created, p.id
        LIMIT ?
        """,
        (
            session_id,
            target["time_created"],
            target["time_created"],
            part_id,
            terminal["part_created"][0],
            terminal["part_created"][0],
            terminal["part_created"][1],
            terminal["part_updated"][0],
            terminal["part_updated"][0],
            terminal["part_updated"][1],
            session_id,
            target["time_created"],
            target["time_created"],
            part_id,
            terminal["part_created"][0],
            terminal["part_created"][0],
            terminal["part_created"][1],
            terminal["part_updated"][0],
            terminal["part_updated"][0],
            terminal["part_updated"][1],
            max_records + 1,
        ),
    )
    if len(request_rows) > max_records:
        raise SystemExit(
            f"tool-context request exceeded the per-collection ceiling of "
            f"{max_records} records; no complete context was returned"
        )
    request = None
    if request_rows:
        request_message_id = request_rows[0]["request_message_id"]
        request_parts: list[dict[str, Any]] = []
        for index, record in enumerate(request_rows):
            record.pop("request_message_id", None)
            if record.get("text_truncated") is not None:
                record["text_truncated"] = bool(record["text_truncated"])
            request_parts.append(
                enforce_record_ceiling(
                    record,
                    f"{session_id}.{request_message_id}.request_parts[{index}]",
                    max_record_bytes,
                )
            )
        request = {
            "message_id": request_message_id,
            "message_role": "user",
            "parts": request_parts,
        }

    return {
        "source": current_source,
        "mode": "tool-context",
        "session": session,
        "pin": pin,
        "counts": counts,
        "tool": target,
        "message": assistant_message,
        "request": request,
    }


def delta(
    connection: sqlite3.Connection,
    database: str,
    session_id: str,
    message_after: tuple[int, str],
    message_updated_after: tuple[int, str],
    part_after: tuple[int, str],
    part_updated_after: tuple[int, str],
    message_through: tuple[int, str],
    message_updated_through: tuple[int, str],
    part_through: tuple[int, str],
    part_updated_through: tuple[int, str],
    expected_source_identity: str | None,
    expected_message_count: int | None,
    expected_part_count: int | None,
    limit: int,
    include_content: bool,
    max_text_chars: int,
    max_tool_chars: int,
) -> dict[str, Any]:
    validate_schema(connection)
    if session_metadata(connection, session_id) is None:
        raise SystemExit(f"session not found: {session_id}")

    message_mutations, message_mutations_more = page(
        rows(
            connection,
            """
            SELECT id, time_created, time_updated
            FROM message
            WHERE session_id = ?
              AND (time_created < ? OR (time_created = ? AND id <= ?))
              AND (time_updated > ? OR (time_updated = ? AND id > ?))
            ORDER BY time_updated, id LIMIT ?
            """,
            (
                session_id,
                message_through[0],
                message_through[0],
                message_through[1],
                message_updated_through[0],
                message_updated_through[0],
                message_updated_through[1],
                limit + 1,
            ),
        ),
        limit,
    )
    part_mutations, part_mutations_more = page(
        rows(
            connection,
            """
            SELECT id, message_id, time_created, time_updated
            FROM part
            WHERE session_id = ?
              AND (time_created < ? OR (time_created = ? AND id <= ?))
              AND (time_updated > ? OR (time_updated = ? AND id > ?))
            ORDER BY time_updated, id LIMIT ?
            """,
            (
                session_id,
                part_through[0],
                part_through[0],
                part_through[1],
                part_updated_through[0],
                part_updated_through[0],
                part_updated_through[1],
                limit + 1,
            ),
        ),
        limit,
    )
    through = {
        "message_created": {
            "time": message_through[0],
            "id": message_through[1],
        },
        "message_updated": {
            "time": message_updated_through[0],
            "id": message_updated_through[1],
        },
        "part_created": {"time": part_through[0], "id": part_through[1]},
        "part_updated": {
            "time": part_updated_through[0],
            "id": part_updated_through[1],
        },
    }
    current_source = source(database)
    pin_counts = {
        "messages": bounded_count(
            connection, "message", session_id, message_through
        ),
        "parts": bounded_count(connection, "part", session_id, part_through),
    }
    guard_mismatch = []
    if (
        expected_source_identity is not None
        and current_source["identity"] != expected_source_identity
    ):
        guard_mismatch.append("source_identity")
    if (
        expected_message_count is not None
        and pin_counts["messages"] != expected_message_count
    ):
        guard_mismatch.append("message_count")
    if expected_part_count is not None and pin_counts["parts"] != expected_part_count:
        guard_mismatch.append("part_count")
    if guard_mismatch:
        return {
            "source": current_source,
            "session_id": session_id,
            "pin_consistent": False,
            "requires_repin": True,
            "through": through,
            "pin_counts": pin_counts,
            "guard_mismatch": guard_mismatch,
            "cursors": {
                "message_created": {
                    "time": message_after[0],
                    "id": message_after[1],
                },
                "message_updated": {
                    "time": message_updated_after[0],
                    "id": message_updated_after[1],
                },
                "part_created": {"time": part_after[0], "id": part_after[1]},
                "part_updated": {
                    "time": part_updated_after[0],
                    "id": part_updated_after[1],
                },
            },
        }
    if message_mutations or part_mutations:
        return {
            "source": current_source,
            "session_id": session_id,
            "pin_consistent": False,
            "requires_repin": True,
            "through": through,
            "pin_counts": pin_counts,
            "post_pin_mutations": {
                "messages": message_mutations,
                "parts": part_mutations,
                "has_more_messages": message_mutations_more,
                "has_more_parts": part_mutations_more,
            },
            "cursors": {
                "message_created": {
                    "time": message_after[0],
                    "id": message_after[1],
                },
                "message_updated": {
                    "time": message_updated_after[0],
                    "id": message_updated_after[1],
                },
                "part_created": {"time": part_after[0], "id": part_after[1]},
                "part_updated": {
                    "time": part_updated_after[0],
                    "id": part_updated_after[1],
                },
            },
        }

    message_fields = """
        id, time_created, time_updated,
        json_extract(data, '$.role') AS role,
        json_extract(data, '$.finish') AS finish,
        CASE WHEN json_extract(data, '$.error') IS NULL THEN 0 ELSE 1 END AS has_error
    """
    created_messages_raw, created_messages_more = page(
        rows(
            connection,
            f"""
            SELECT {message_fields}
            FROM message
            WHERE session_id = ?
              AND (time_created > ? OR (time_created = ? AND id > ?))
              AND (time_created < ? OR (time_created = ? AND id <= ?))
            ORDER BY time_created, id LIMIT ?
            """,
            (
                session_id,
                message_after[0],
                message_after[0],
                message_after[1],
                message_through[0],
                message_through[0],
                message_through[1],
                limit + 1,
            ),
        ),
        limit,
    )
    updated_messages_raw, updated_messages_more = page(
        rows(
            connection,
            f"""
            SELECT {message_fields}
            FROM message
            WHERE session_id = ?
              AND (time_updated > ? OR (time_updated = ? AND id > ?))
              AND (time_updated < ? OR (time_updated = ? AND id <= ?))
            ORDER BY time_updated, id LIMIT ?
            """,
            (
                session_id,
                message_updated_after[0],
                message_updated_after[0],
                message_updated_after[1],
                message_updated_through[0],
                message_updated_through[0],
                message_updated_through[1],
                limit + 1,
            ),
        ),
        limit,
    )
    projected_parts = part_projection(
        include_content, max_text_chars, max_tool_chars
    )
    created_parts_raw, created_parts_more = page(
        rows(
            connection,
            f"""
            SELECT {projected_parts}
            FROM part
            WHERE session_id = ?
              AND (time_created > ? OR (time_created = ? AND id > ?))
              AND (time_created < ? OR (time_created = ? AND id <= ?))
            ORDER BY time_created, id LIMIT ?
            """,
            (
                session_id,
                part_after[0],
                part_after[0],
                part_after[1],
                part_through[0],
                part_through[0],
                part_through[1],
                limit + 1,
            ),
        ),
        limit,
    )
    updated_parts_raw, updated_parts_more = page(
        rows(
            connection,
            f"""
            SELECT {projected_parts}
            FROM part
            WHERE session_id = ?
              AND (time_updated > ? OR (time_updated = ? AND id > ?))
              AND (time_updated < ? OR (time_updated = ? AND id <= ?))
            ORDER BY time_updated, id LIMIT ?
            """,
            (
                session_id,
                part_updated_after[0],
                part_updated_after[0],
                part_updated_after[1],
                part_updated_through[0],
                part_updated_through[0],
                part_updated_through[1],
                limit + 1,
            ),
        ),
        limit,
    )

    created_messages_cursor = record_cursor(
        created_messages_raw, "time_created", message_after
    )
    created_parts_cursor = record_cursor(
        created_parts_raw, "time_created", part_after
    )
    updated_parts_cursor = record_cursor(
        updated_parts_raw, "time_updated", part_updated_after
    )
    reasoning_excluded = len(
        {
            part["id"]
            for part in created_parts_raw + updated_parts_raw
            if part.get("type") == "reasoning"
        }
    )
    created_parts_raw = [
        part
        for part in created_parts_raw
        if part.get("type") != "reasoning"
    ]
    updated_parts_raw = [
        part
        for part in updated_parts_raw
        if part.get("type") != "reasoning"
    ]

    created_message_ids = {message["id"] for message in created_messages_raw}
    created_part_ids = {part["id"] for part in created_parts_raw}
    presented_updated_messages = [
        message
        for message in updated_messages_raw
        if message["id"] not in created_message_ids
    ]
    presented_updated_parts = [
        part
        for part in updated_parts_raw
        if part["id"] not in created_part_ids
    ]

    cursors = {
        "message_created": created_messages_cursor,
        "message_updated": record_cursor(
            updated_messages_raw, "time_updated", message_updated_after
        ),
        "part_created": created_parts_cursor,
        "part_updated": updated_parts_cursor,
    }

    return {
        "source": current_source,
        "session_id": session_id,
        "pin_consistent": True,
        "requires_repin": False,
        "from": {
            "message_created": {"time": message_after[0], "id": message_after[1]},
            "message_updated": {
                "time": message_updated_after[0],
                "id": message_updated_after[1],
            },
            "part_created": {"time": part_after[0], "id": part_after[1]},
            "part_updated": {
                "time": part_updated_after[0],
                "id": part_updated_after[1],
            },
        },
        "through": through,
        "pin_counts": pin_counts,
        "messages_created": created_messages_raw,
        "messages_updated": presented_updated_messages,
        "parts_created": created_parts_raw,
        "parts_updated": presented_updated_parts,
        "reasoning_records_excluded": reasoning_excluded,
        "content_included": include_content,
        "has_more": {
            "messages_created": created_messages_more,
            "messages_updated": updated_messages_more,
            "parts_created": created_parts_more,
            "parts_updated": updated_parts_more,
        },
        "cursors": cursors,
    }


def add_root_options(
    argument_parser: argparse.ArgumentParser, suppress_defaults: bool
) -> None:
    default = argparse.SUPPRESS if suppress_defaults else None
    argument_parser.add_argument("--db", default=default, help="path to opencode.db")
    argument_parser.add_argument(
        "--pretty",
        action="store_true",
        default=argparse.SUPPRESS if suppress_defaults else False,
        help="indent JSON output",
    )
    argument_parser.add_argument(
        "--max-output-bytes",
        type=bounded_int(1000, 1_000_000),
        default=argparse.SUPPRESS if suppress_defaults else 200_000,
    )


def parser() -> argparse.ArgumentParser:
    argument_parser = argparse.ArgumentParser(description=__doc__)
    add_root_options(argument_parser, suppress_defaults=False)
    subparsers = argument_parser.add_subparsers(dest="command", required=True)

    locate_parser = subparsers.add_parser(
        "locate", help="find bounded session candidates without transcript bodies"
    )
    add_root_options(locate_parser, suppress_defaults=True)
    locate_parser.add_argument("query")
    locate_parser.add_argument("--limit", type=bounded_int(1, 200), default=20)
    locate_parser.add_argument(
        "--before",
        type=parse_cursor,
        default=(9_223_372_036_854_775_807, "~"),
        help="descending time_updated:id continuation cursor",
    )

    outline_parser = subparsers.add_parser(
        "outline", help="emit structural session evidence"
    )
    add_root_options(outline_parser, suppress_defaults=True)
    outline_parser.add_argument("session_id")
    outline_parser.add_argument("--limit", type=bounded_int(1, 500), default=200)
    outline_parser.add_argument("--children-after", type=parse_cursor, default=(0, ""))
    outline_parser.add_argument("--tasks-after", type=parse_cursor, default=(0, ""))
    outline_parser.add_argument(
        "--compactions-after", type=parse_cursor, default=(0, "")
    )
    outline_parser.add_argument("--running-after", type=parse_cursor, default=(0, ""))
    outline_parser.add_argument(
        "--nonterminal-after", type=parse_cursor, default=(0, "")
    )

    tool_context_parser = subparsers.add_parser(
        "tool-context",
        help="emit one bounded tool and nearest preceding user request context",
    )
    add_root_options(tool_context_parser, suppress_defaults=True)
    tool_context_parser.add_argument("session_id")
    tool_context_parser.add_argument("part_id")
    tool_context_parser.add_argument(
        "--max-records",
        type=bounded_int(1, 100_000),
        default=10_000,
        help="fail if the selected request exceeds this record ceiling",
    )
    tool_context_parser.add_argument(
        "--max-record-bytes",
        type=bounded_int(64, 1_000_000),
        default=16_000,
        help="fail rather than truncate an individual returned record",
    )
    tool_context_parser.add_argument(
        "--include-tool-content",
        "--include-content",
        dest="include_tool_content",
        action="store_true",
        help="include bounded tool input, output, and error previews",
    )
    tool_context_parser.add_argument(
        "--max-text-chars", type=bounded_int(1, 4000), default=2000
    )
    tool_context_parser.add_argument(
        "--max-tool-chars", type=bounded_int(1, 1000), default=500
    )

    delta_parser = subparsers.add_parser(
        "delta", help="emit bounded structural records after stable cursors"
    )
    add_root_options(delta_parser, suppress_defaults=True)
    delta_parser.add_argument("session_id")
    delta_parser.add_argument("--message-after", required=True, type=parse_cursor)
    delta_parser.add_argument(
        "--message-updated-after", required=True, type=parse_cursor
    )
    delta_parser.add_argument("--part-after", required=True, type=parse_cursor)
    delta_parser.add_argument("--updated-after", required=True, type=parse_cursor)
    delta_parser.add_argument(
        "--message-through", type=parse_cursor, default=MAX_CURSOR
    )
    delta_parser.add_argument(
        "--message-updated-through", type=parse_cursor, default=MAX_CURSOR
    )
    delta_parser.add_argument("--part-through", type=parse_cursor, default=MAX_CURSOR)
    delta_parser.add_argument(
        "--updated-through", type=parse_cursor, default=MAX_CURSOR
    )
    delta_parser.add_argument("--expected-source-identity")
    delta_parser.add_argument(
        "--expected-message-count", type=bounded_int(0, 2_147_483_647)
    )
    delta_parser.add_argument(
        "--expected-part-count", type=bounded_int(0, 2_147_483_647)
    )
    delta_parser.add_argument("--limit", type=bounded_int(1, 200), default=100)
    delta_parser.add_argument("--include-content", action="store_true")
    delta_parser.add_argument(
        "--max-text-chars", type=bounded_int(1, 4000), default=2000
    )
    delta_parser.add_argument(
        "--max-tool-chars", type=bounded_int(1, 1000), default=500
    )

    bundle_parser = subparsers.add_parser(
        "bundle",
        help="emit one pinned multi-session evidence bundle",
    )
    add_root_options(bundle_parser, suppress_defaults=True)
    bundle_parser.add_argument("parent_session_id")
    bundle_parser.add_argument(
        "--state",
        "--state-json",
        dest="state_json",
        help="compact JSON state returned by a previous Bundle call",
    )
    bundle_parser.add_argument("--limit", type=bounded_int(1, 200), default=100)
    bundle_parser.add_argument(
        "--max-records-per-stream",
        "--max-records",
        dest="max_records",
        type=bounded_int(1, 100_000),
        default=10_000,
        help="fail if any collection or Delta stream exceeds this record ceiling",
    )
    bundle_parser.add_argument(
        "--max-record-bytes",
        type=bounded_int(64, 1_000_000),
        default=16_000,
        help="fail rather than truncate an individual returned record",
    )
    bundle_parser.add_argument(
        "--view",
        choices=("full", "reconstruction"),
        default="full",
        help="select the full compatibility shape or compact reconstruction evidence",
    )
    bundle_parser.add_argument(
        "--max-text-chars", type=bounded_int(1, 4000), default=2000
    )
    bundle_parser.add_argument(
        "--include-tool-content",
        "--include-content",
        dest="include_tool_content",
        action="store_true",
        help="include bounded tool input, output, and error previews",
    )
    bundle_parser.add_argument(
        "--max-tool-chars", type=bounded_int(1, 1000), default=500
    )
    return argument_parser


def main() -> None:
    argument_parser = parser()
    arguments = argument_parser.parse_args()
    if not arguments.db:
        argument_parser.error("the following arguments are required: --db")
    try:
        with connect_read_only(arguments.db) as connection:
            if arguments.command == "locate":
                result = locate(
                    connection,
                    arguments.db,
                    arguments.query,
                    arguments.limit,
                    arguments.before,
                )
            elif arguments.command == "outline":
                result = outline(
                    connection,
                    arguments.db,
                    arguments.session_id,
                    arguments.limit,
                    arguments.children_after,
                    arguments.tasks_after,
                    arguments.compactions_after,
                    arguments.running_after,
                    arguments.nonterminal_after,
                )
            elif arguments.command == "tool-context":
                result = tool_context(
                    connection,
                    arguments.db,
                    arguments.session_id,
                    arguments.part_id,
                    arguments.max_records,
                    arguments.max_record_bytes,
                    arguments.include_tool_content,
                    arguments.max_text_chars,
                    arguments.max_tool_chars,
                )
            elif arguments.command == "bundle":
                result = bundle(
                    connection,
                    arguments.db,
                    arguments.parent_session_id,
                    arguments.state_json,
                    arguments.limit,
                    arguments.max_records,
                    arguments.max_record_bytes,
                    arguments.include_tool_content,
                    arguments.max_text_chars,
                    arguments.max_tool_chars,
                    arguments.view,
                )
            else:
                result = delta(
                    connection,
                    arguments.db,
                    arguments.session_id,
                    arguments.message_after,
                    arguments.message_updated_after,
                    arguments.part_after,
                    arguments.updated_after,
                    arguments.message_through,
                    arguments.message_updated_through,
                    arguments.part_through,
                    arguments.updated_through,
                    arguments.expected_source_identity,
                    arguments.expected_message_count,
                    arguments.expected_part_count,
                    arguments.limit,
                    arguments.include_content,
                    arguments.max_text_chars,
                    arguments.max_tool_chars,
                )
    except sqlite3.DatabaseError as error:
        raise SystemExit(f"incompatible or unreadable OpenCode database: {error}") from error

    encoded = json.dumps(
        result,
        indent=2 if arguments.pretty else None,
        separators=None if arguments.pretty else (",", ":"),
    )
    output_bytes = len(encoded.encode("utf-8")) + 1
    if output_bytes > arguments.max_output_bytes:
        raise SystemExit(
            f"output would be {output_bytes} bytes; lower --limit, omit "
            "--include-content, or raise --max-output-bytes within its hard cap"
        )
    sys.stdout.write(f"{encoded}\n")


if __name__ == "__main__":
    main()
