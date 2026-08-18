#!/usr/bin/env python3
"""Estimate OpenCode session costs without reading transcript bodies."""

from __future__ import annotations

import argparse
import hashlib
import json
import sqlite3
import sys
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


DEFAULT_MODELS_URL = "https://models.dev/api.json"
DEFAULT_TIMEOUT_SECONDS = 10
DEFAULT_MAX_CATALOG_BYTES = 10_000_000
MAX_TIMEOUT_SECONDS = 300
MAX_CATALOG_BYTES = 100_000_000
MILLION = Decimal("1000000")
CONTEXT_OVER_200K = Decimal("200000")
COST_QUANTUM = Decimal("0.000000000001")
CATEGORIES = ("input", "output", "cache_read", "cache_write", "reasoning")

V1_REQUIRED_COLUMNS = {
    "session": {"id", "parent_id", "title", "agent", "cost"},
    "message": {"id", "session_id", "data"},
    "part": {"id", "message_id", "session_id", "data"},
}
V2_REQUIRED_COLUMNS = {
    "session_v2": {"id", "parent_id", "title", "agent", "cost"},
    "session_message": {"id", "session_id", "type", "seq", "data"},
}


class CalculatorError(Exception):
    """An actionable input, source, or calculation failure."""


def bounded_int(minimum: int, maximum: int, label: str):
    def parse(value: str) -> int:
        try:
            parsed = int(value)
        except ValueError as error:
            raise argparse.ArgumentTypeError(f"{label} must be an integer") from error
        if not minimum <= parsed <= maximum:
            raise argparse.ArgumentTypeError(
                f"{label} must be between {minimum} and {maximum}"
            )
        return parsed

    return parse


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(
        description="Estimate OpenCode session API cost from a read-only SQLite store."
    )
    result.add_argument("--db", required=True, metavar="PATH")
    catalog = result.add_mutually_exclusive_group()
    catalog.add_argument("--models-file", metavar="PATH")
    catalog.add_argument("--models-url", metavar="URL")
    result.add_argument(
        "--timeout-seconds",
        type=bounded_int(1, MAX_TIMEOUT_SECONDS, "--timeout-seconds"),
        default=DEFAULT_TIMEOUT_SECONDS,
    )
    result.add_argument(
        "--max-catalog-bytes",
        type=bounded_int(1, MAX_CATALOG_BYTES, "--max-catalog-bytes"),
        default=DEFAULT_MAX_CATALOG_BYTES,
    )
    result.add_argument("--pretty", action="store_true")
    result.add_argument("session_id", metavar="SESSION_ID")
    return result


def database_path(value: str) -> Path:
    path = Path(value).expanduser().resolve()
    if not path.is_file():
        raise CalculatorError(f"database does not exist: {path}")
    return path


def connect_read_only(path: Path) -> sqlite3.Connection:
    try:
        connection = sqlite3.connect(f"{path.as_uri()}?mode=ro", uri=True)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA query_only = ON")
        connection.execute("BEGIN")
        return connection
    except (OSError, sqlite3.DatabaseError) as error:
        raise CalculatorError(f"unable to open database read-only: {path}: {error}") from error


def scope_sql(select_sql: str, session_table: str) -> str:
    return f"""
        WITH RECURSIVE scope(id, parent_id, depth, seen, order_key) AS (
            SELECT id, parent_id, 0, '|' || id || '|', id
            FROM {session_table}
            WHERE id = ?
            UNION ALL
            SELECT child.id,
                   child.parent_id,
                   scope.depth + 1,
                   scope.seen || child.id || '|',
                   scope.order_key || '/' || child.id
            FROM {session_table} AS child
            JOIN scope ON child.parent_id = scope.id
            WHERE instr(scope.seen, '|' || child.id || '|') = 0
        )
        {select_sql}
    """


def detect_schema(connection: sqlite3.Connection, root_id: str) -> str:
    try:
        tables = {
            row["name"]
            for row in connection.execute(
                "SELECT name FROM sqlite_master WHERE type = 'table'"
            )
        }
        candidates: list[tuple[str, str, dict[str, set[str]]]] = []
        for schema, session_table, required_tables in (
            ("v1", "session", V1_REQUIRED_COLUMNS),
            ("v2", "session_v2", V2_REQUIRED_COLUMNS),
        ):
            if not required_tables.keys() <= tables:
                continue
            candidates.append((schema, session_table, required_tables))
        if not candidates:
            raise CalculatorError(
                "database is neither a recognized OpenCode V1 nor V2 session store"
            )

        matching: list[str] = []
        for schema, session_table, required_tables in candidates:
            for table, required in required_tables.items():
                columns = {
                    row["name"] for row in connection.execute(f"PRAGMA table_info({table})")
                }
                missing = required - columns
                if missing:
                    raise CalculatorError(
                        f"required columns missing from {table}: {', '.join(sorted(missing))}"
                    )
            if connection.execute(
                f"SELECT 1 FROM {session_table} WHERE id = ?", (root_id,)
            ).fetchone():
                matching.append(schema)

        if not matching:
            raise CalculatorError(f"session not found: {root_id}")
        if len(matching) > 1:
            raise CalculatorError(
                f"session {root_id} exists in both OpenCode V1 and V2 schemas"
            )
        connection.execute("SELECT json_valid('{}'), json_extract('{}', '$.type')").fetchone()
        return matching[0]
    except CalculatorError:
        raise
    except sqlite3.DatabaseError as error:
        raise CalculatorError(f"database schema validation failed: {error}") from error


def decimal_value(value: Any, label: str, allow_text: bool = False) -> Decimal:
    if isinstance(value, bool) or not isinstance(value, (int, float, Decimal, str)):
        raise CalculatorError(f"{label} is not numeric")
    if isinstance(value, str) and not allow_text:
        raise CalculatorError(f"{label} is not numeric")
    try:
        parsed = Decimal(str(value))
    except (InvalidOperation, ValueError) as error:
        raise CalculatorError(f"{label} is not numeric") from error
    if not parsed.is_finite():
        raise CalculatorError(f"{label} is not finite")
    if parsed < 0:
        raise CalculatorError(f"{label} is negative")
    return parsed


def database_number(row: sqlite3.Row, value_key: str, type_key: str, label: str) -> Decimal:
    if row[type_key] not in {"integer", "real"}:
        raise CalculatorError(f"{label} is missing or not numeric")
    return decimal_value(row[value_key], label)


def validate_v1_json_documents(connection: sqlite3.Connection, root_id: str) -> None:
    invalid = connection.execute(
        scope_sql(
            """
            SELECT 'message' AS table_name, m.id AS record_id
            FROM message AS m
            JOIN scope ON scope.id = m.session_id
            WHERE COALESCE(json_valid(m.data), 0) <> 1
            UNION ALL
            SELECT 'part' AS table_name, p.id AS record_id
            FROM part AS p
            JOIN scope ON scope.id = p.session_id
            WHERE COALESCE(json_valid(p.data), 0) <> 1
            LIMIT 1
            """,
            "session",
        ),
        (root_id,),
    ).fetchone()
    if invalid is not None:
        raise CalculatorError(
            f"{invalid['table_name']} {invalid['record_id']} contains malformed JSON"
        )


def read_v1_database(
    connection: sqlite3.Connection, root_id: str
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    session_rows = connection.execute(
        scope_sql(
            """
            SELECT s.id, s.parent_id, s.title, s.agent, s.cost,
                   scope.depth, scope.order_key
            FROM session AS s
            JOIN scope ON scope.id = s.id
            ORDER BY scope.order_key
            """,
            "session",
        ),
        (root_id,),
    ).fetchall()
    validate_v1_json_documents(connection, root_id)

    sessions: list[dict[str, Any]] = []
    session_ids: set[str] = set()
    for row in session_rows:
        session_id = row["id"]
        if not isinstance(session_id, str) or not session_id:
            raise CalculatorError("session contains a missing or invalid id")
        if session_id in session_ids:
            raise CalculatorError(f"session scope contains duplicate id: {session_id}")
        session_ids.add(session_id)
        parent_id = row["parent_id"]
        if parent_id is not None and not isinstance(parent_id, str):
            raise CalculatorError(f"session {session_id} has an invalid parent_id")
        if not isinstance(row["title"], str) or (
            row["agent"] is not None and not isinstance(row["agent"], str)
        ):
            raise CalculatorError(f"session {session_id} has invalid title or agent metadata")
        sessions.append(
            {
                "id": session_id,
                "parent_id": parent_id,
                "title": row["title"],
                "agent": row["agent"],
                "depth": int(row["depth"]),
                "stored_cost": decimal_value(
                    row["cost"], f"session {session_id} stored cost", allow_text=True
                ),
            }
        )

    turn_rows = connection.execute(
        scope_sql(
            """
                SELECT p.id AS part_id,
                       p.session_id,
                       p.message_id,
                       json_extract(p.data, '$.cost') AS part_cost,
                       json_type(p.data, '$.cost') AS part_cost_type,
                       json_extract(p.data, '$.tokens.input') AS input_tokens,
                       json_type(p.data, '$.tokens.input') AS input_type,
                       json_extract(p.data, '$.tokens.output') AS output_tokens,
                       json_type(p.data, '$.tokens.output') AS output_type,
                       json_extract(p.data, '$.tokens.reasoning') AS reasoning_tokens,
                       json_type(p.data, '$.tokens.reasoning') AS reasoning_type,
                       json_extract(p.data, '$.tokens.cache.read') AS cache_read_tokens,
                       json_type(p.data, '$.tokens.cache.read') AS cache_read_type,
                       json_extract(p.data, '$.tokens.cache.write') AS cache_write_tokens,
                       json_type(p.data, '$.tokens.cache.write') AS cache_write_type,
                       m.id AS assistant_message_id,
                       json_extract(m.data, '$.role') AS role,
                       json_type(m.data, '$.role') AS role_type,
                       json_extract(m.data, '$.providerID') AS provider_id,
                       json_type(m.data, '$.providerID') AS provider_type,
                       json_extract(m.data, '$.modelID') AS model_id,
                       json_type(m.data, '$.modelID') AS model_type,
                       json_extract(m.data, '$.variant') AS variant,
                       json_type(m.data, '$.variant') AS variant_type
                FROM part AS p
                JOIN scope ON scope.id = p.session_id
                LEFT JOIN message AS m ON m.id = p.message_id
                WHERE json_extract(p.data, '$.type') = 'step-finish'
                ORDER BY scope.order_key, p.id
            """,
            "session",
        ),
        (root_id,),
    ).fetchall()

    turns: list[dict[str, Any]] = []
    for row in turn_rows:
        part_id = row["part_id"]
        if row["assistant_message_id"] is None:
            raise CalculatorError(f"step-finish part {part_id} has no assistant message")
        if row["role_type"] != "text" or row["role"] != "assistant":
            raise CalculatorError(
                f"step-finish part {part_id} is not joined to an assistant message"
            )
        if row["provider_type"] != "text" or not isinstance(row["provider_id"], str) or not row["provider_id"]:
            raise CalculatorError(f"assistant message for part {part_id} has no providerID")
        if row["model_type"] != "text" or not isinstance(row["model_id"], str) or not row["model_id"]:
            raise CalculatorError(f"assistant message for part {part_id} has no modelID")
        if row["variant"] is not None and row["variant_type"] != "text":
            raise CalculatorError(f"assistant message for part {part_id} has an invalid variant")

        # Validate the stored turn shape without selecting any body field.
        database_number(row, "part_cost", "part_cost_type", f"step-finish part {part_id} cost")
        tokens = {
            "input": database_number(
                row, "input_tokens", "input_type", f"step-finish part {part_id} input tokens"
            ),
            "output": database_number(
                row, "output_tokens", "output_type", f"step-finish part {part_id} output tokens"
            ),
            "cache_read": database_number(
                row,
                "cache_read_tokens",
                "cache_read_type",
                f"step-finish part {part_id} cache_read tokens",
            ),
            "cache_write": database_number(
                row,
                "cache_write_tokens",
                "cache_write_type",
                f"step-finish part {part_id} cache_write tokens",
            ),
            "reasoning": database_number(
                row,
                "reasoning_tokens",
                "reasoning_type",
                f"step-finish part {part_id} reasoning tokens",
            ),
        }
        turns.append(
            {
                "session_id": row["session_id"],
                "provider_id": row["provider_id"],
                "model_id": row["model_id"],
                "variant": row["variant"],
                "tokens": tokens,
            }
        )

    return sessions, turns


def read_v2_database(
    connection: sqlite3.Connection, root_id: str
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    session_rows = connection.execute(
        scope_sql(
            """
            SELECT s.id, s.parent_id, s.title, s.agent, s.cost,
                   scope.depth, scope.order_key
            FROM session_v2 AS s
            JOIN scope ON scope.id = s.id
            ORDER BY scope.order_key
            """,
            "session_v2",
        ),
        (root_id,),
    ).fetchall()

    invalid = connection.execute(
        scope_sql(
            """
            SELECT m.id AS record_id
            FROM session_message AS m
            JOIN scope ON scope.id = m.session_id
            WHERE COALESCE(json_valid(m.data), 0) <> 1
            LIMIT 1
            """,
            "session_v2",
        ),
        (root_id,),
    ).fetchone()
    if invalid is not None:
        raise CalculatorError(
            f"session_message {invalid['record_id']} contains malformed JSON"
        )

    sessions: list[dict[str, Any]] = []
    session_ids: set[str] = set()
    for row in session_rows:
        session_id = row["id"]
        if not isinstance(session_id, str) or not session_id:
            raise CalculatorError("session contains a missing or invalid id")
        if session_id in session_ids:
            raise CalculatorError(f"session scope contains duplicate id: {session_id}")
        session_ids.add(session_id)
        parent_id = row["parent_id"]
        if parent_id is not None and not isinstance(parent_id, str):
            raise CalculatorError(f"session {session_id} has an invalid parent_id")
        if row["title"] is not None and not isinstance(row["title"], str):
            raise CalculatorError(f"session {session_id} has invalid title metadata")
        if row["agent"] is not None and not isinstance(row["agent"], str):
            raise CalculatorError(f"session {session_id} has invalid agent metadata")
        sessions.append(
            {
                "id": session_id,
                "parent_id": parent_id,
                "title": row["title"] or "",
                "agent": row["agent"],
                "depth": int(row["depth"]),
                "stored_cost": decimal_value(
                    row["cost"], f"session {session_id} stored cost", allow_text=True
                ),
            }
        )

    turn_rows = connection.execute(
        scope_sql(
            """
            SELECT m.id AS message_id,
                   m.session_id,
                   json_extract(m.data, '$.cost') AS message_cost,
                   json_type(m.data, '$.cost') AS message_cost_type,
                   json_extract(m.data, '$.tokens.input') AS input_tokens,
                   json_type(m.data, '$.tokens.input') AS input_type,
                   json_extract(m.data, '$.tokens.output') AS output_tokens,
                   json_type(m.data, '$.tokens.output') AS output_type,
                   json_extract(m.data, '$.tokens.reasoning') AS reasoning_tokens,
                   json_type(m.data, '$.tokens.reasoning') AS reasoning_type,
                   json_extract(m.data, '$.tokens.cache.read') AS cache_read_tokens,
                   json_type(m.data, '$.tokens.cache.read') AS cache_read_type,
                   json_extract(m.data, '$.tokens.cache.write') AS cache_write_tokens,
                   json_type(m.data, '$.tokens.cache.write') AS cache_write_type,
                   json_extract(m.data, '$.model.providerID') AS provider_id,
                   json_type(m.data, '$.model.providerID') AS provider_type,
                   json_extract(m.data, '$.model.id') AS model_id,
                   json_type(m.data, '$.model.id') AS model_type,
                   json_extract(m.data, '$.model.variant') AS variant,
                   json_type(m.data, '$.model.variant') AS variant_type
            FROM session_message AS m
            JOIN scope ON scope.id = m.session_id
            WHERE m.type = 'assistant'
              AND (json_type(m.data, '$.cost') IS NOT NULL
                   OR json_type(m.data, '$.tokens') IS NOT NULL)
            ORDER BY scope.order_key, m.seq, m.id
            """,
            "session_v2",
        ),
        (root_id,),
    ).fetchall()

    turns: list[dict[str, Any]] = []
    for row in turn_rows:
        message_id = row["message_id"]
        if row["provider_type"] != "text" or not row["provider_id"]:
            raise CalculatorError(f"assistant message {message_id} has no model providerID")
        if row["model_type"] != "text" or not row["model_id"]:
            raise CalculatorError(f"assistant message {message_id} has no model id")
        if row["variant"] is not None and row["variant_type"] != "text":
            raise CalculatorError(f"assistant message {message_id} has an invalid model variant")
        database_number(
            row, "message_cost", "message_cost_type", f"assistant message {message_id} cost"
        )
        tokens = {
            category: database_number(
                row,
                value_key,
                type_key,
                f"assistant message {message_id} {category} tokens",
            )
            for category, value_key, type_key in (
                ("input", "input_tokens", "input_type"),
                ("output", "output_tokens", "output_type"),
                ("cache_read", "cache_read_tokens", "cache_read_type"),
                ("cache_write", "cache_write_tokens", "cache_write_type"),
                ("reasoning", "reasoning_tokens", "reasoning_type"),
            )
        }
        turns.append(
            {
                "session_id": row["session_id"],
                "provider_id": row["provider_id"],
                "model_id": row["model_id"],
                "variant": row["variant"],
                "tokens": tokens,
            }
        )
    return sessions, turns


def read_database(path: Path, root_id: str) -> tuple[dict[str, Any], list[dict[str, Any]], list[dict[str, Any]]]:
    connection = connect_read_only(path)
    try:
        schema = detect_schema(connection, root_id)
        sessions, turns = (
            read_v1_database(connection, root_id)
            if schema == "v1"
            else read_v2_database(connection, root_id)
        )
        connection.commit()
        source = {
            "harness": "opencode",
            "schema": schema,
            "database": str(path),
            "mode": "read-only",
            "identity": f"{path.stat().st_dev}:{path.stat().st_ino}",
        }
        return source, sessions, turns
    except CalculatorError:
        connection.rollback()
        raise
    except sqlite3.DatabaseError as error:
        connection.rollback()
        raise CalculatorError(f"database query failed: {error}") from error
    finally:
        connection.close()


def read_bounded_file(path: Path, maximum: int) -> bytes:
    try:
        with path.open("rb") as handle:
            content = handle.read(maximum + 1)
    except OSError as error:
        raise CalculatorError(f"unable to read models catalog file {path}: {error}") from error
    if len(content) > maximum:
        raise CalculatorError(
            f"models catalog file exceeds --max-catalog-bytes ({maximum} bytes): {path}"
        )
    return content


def read_bounded_url(url: str, timeout: int, maximum: int) -> tuple[bytes, str]:
    request = Request(url, headers={"User-Agent": "mfz-opencode-session-cost/1"})
    try:
        with urlopen(request, timeout=timeout) as response:
            status = getattr(response, "status", None)
            if status is not None and status >= 400:
                raise CalculatorError(f"models catalog HTTP error: status {status}")
            content_length = response.headers.get("Content-Length")
            if content_length is not None:
                try:
                    if int(content_length) > maximum:
                        raise CalculatorError(
                            f"models catalog HTTP response exceeds --max-catalog-bytes ({maximum} bytes)"
                        )
                except ValueError as error:
                    raise CalculatorError("models catalog HTTP response has invalid Content-Length") from error
            content = response.read(maximum + 1)
    except CalculatorError:
        raise
    except HTTPError as error:
        raise CalculatorError(f"models catalog HTTP error {error.code}: {error.reason}") from error
    except (URLError, OSError, TimeoutError, ValueError) as error:
        raise CalculatorError(f"unable to fetch models catalog URL {url}: {error}") from error
    if len(content) > maximum:
        raise CalculatorError(
            f"models catalog HTTP response exceeds --max-catalog-bytes ({maximum} bytes)"
        )
    return content, datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def parse_catalog(content: bytes, source: str) -> dict[str, Any]:
    try:
        text = content.decode("utf-8")
    except UnicodeDecodeError as error:
        raise CalculatorError(f"models catalog is not valid UTF-8 ({source})") from error

    def reject_constant(value: str) -> None:
        raise ValueError(f"invalid JSON constant: {value}")

    try:
        catalog = json.loads(
            text,
            parse_int=Decimal,
            parse_float=Decimal,
            parse_constant=reject_constant,
        )
    except (json.JSONDecodeError, ValueError, TypeError) as error:
        raise CalculatorError(f"models catalog is not valid JSON ({source}): {error}") from error
    if not isinstance(catalog, dict):
        raise CalculatorError("invalid models catalog shape: top level must be an object")
    return catalog


def load_catalog(arguments: argparse.Namespace) -> tuple[dict[str, Any], dict[str, Any]]:
    if arguments.models_file is not None:
        path = Path(arguments.models_file).expanduser().resolve()
        content = read_bounded_file(path, arguments.max_catalog_bytes)
        source = str(path)
        metadata: dict[str, Any] = {
            "source": source,
            "source_kind": "file",
            "sha256": hashlib.sha256(content).hexdigest(),
            "caveat": "models.dev pricing is unversioned/current catalog data, not a billing record.",
        }
    else:
        url = arguments.models_url or DEFAULT_MODELS_URL
        content, retrieved_at = read_bounded_url(
            url, arguments.timeout_seconds, arguments.max_catalog_bytes
        )
        source = url
        metadata = {
            "source": source,
            "source_kind": "url",
            "retrieved_at": retrieved_at,
            "sha256": hashlib.sha256(content).hexdigest(),
            "caveat": "models.dev pricing is unversioned/current catalog data, not a billing record.",
        }
    return parse_catalog(content, source), metadata


def catalog_rate(value: Any, label: str) -> Decimal:
    if not isinstance(value, Decimal):
        raise CalculatorError(f"{label} is not numeric")
    if not value.is_finite():
        raise CalculatorError(f"{label} is not finite")
    if value < 0:
        raise CalculatorError(f"{label} is negative")
    return value


def normalized_cost(cost: Any, label: str) -> dict[str, Decimal]:
    if not isinstance(cost, dict):
        raise CalculatorError(f"invalid catalog shape: {label} must be an object")
    rates: dict[str, Decimal] = {}
    for field in ("input", "output"):
        if field not in cost:
            raise CalculatorError(f"{label} {field} rate is missing")
        rates[field] = catalog_rate(cost[field], f"{label} {field} rate")
    for field in ("cache_read", "cache_write"):
        rates[field] = (
            catalog_rate(cost[field], f"{label} {field} rate")
            if field in cost
            else Decimal(0)
        )
    if "reasoning" in cost:
        rates["reasoning"] = catalog_rate(cost["reasoning"], f"{label} reasoning rate")
    return rates


def normalized_definition(cost: Any, label: str) -> dict[str, Any]:
    if not isinstance(cost, dict):
        raise CalculatorError(f"invalid catalog shape: {label} must be an object")
    tiers = cost.get("tiers", [])
    if not isinstance(tiers, list):
        raise CalculatorError(f"invalid catalog shape: {label} tiers must be an array")
    normalized_tiers: dict[Decimal, dict[str, Decimal]] = {}
    for index, item in enumerate(tiers):
        if not isinstance(item, dict):
            raise CalculatorError(
                f"invalid catalog shape: {label} tier {index} must be an object"
            )
        tier_info = item.get("tier")
        if tier_info is None and "size" in item:
            tier_info = item
        if not isinstance(tier_info, dict):
            raise CalculatorError(
                f"invalid catalog shape: {label} tier {index} lacks tier metadata"
            )
        if tier_info.get("type", "context") != "context":
            raise CalculatorError(
                f"invalid catalog shape: {label} tier {index} is not a context tier"
            )
        if "size" not in tier_info:
            raise CalculatorError(f"invalid catalog shape: {label} tier {index} lacks size")
        size = catalog_rate(tier_info["size"], f"{label} tier {index} size")
        if size in normalized_tiers:
            raise CalculatorError(f"invalid catalog shape: {label} has duplicate tier size {size}")
        normalized_tiers[size] = normalized_cost(item, f"{label} tier {index} cost")

    has_context_over = "context_over_200k" in cost
    context_over = cost.get("context_over_200k")
    if has_context_over and not isinstance(context_over, dict):
        raise CalculatorError(
            f"invalid catalog shape: {label} context_over_200k must be an object"
        )
    return {
        "base": normalized_cost(cost, f"{label} base cost"),
        "tiers": normalized_tiers,
        "context_over": (
            normalized_cost(context_over, f"{label} context_over_200k cost")
            if has_context_over
            else None
        ),
        "has_context_over": has_context_over,
    }


def merge_definitions(base: dict[str, Any], override: dict[str, Any]) -> dict[str, Any]:
    tiers = dict(base["tiers"])
    tiers.update(override["tiers"])
    return {
        "base": override["base"],
        "tiers": tiers,
        "context_over": (
            override["context_over"]
            if override["has_context_over"]
            else base["context_over"]
        ),
        "has_context_over": override["has_context_over"] or base["has_context_over"],
    }


def select_cost_rates(definition: dict[str, Any], label: str, context_tokens: Decimal) -> dict[str, Decimal]:
    selected = definition["base"]
    selected_size: Decimal | None = None
    for size in sorted(definition["tiers"]):
        if context_tokens > size and (selected_size is None or size > selected_size):
            selected = definition["tiers"][size]
            selected_size = size
    if selected_size is None and context_tokens > CONTEXT_OVER_200K:
        if definition["has_context_over"]:
            selected = definition["context_over"]
    return selected


def mode_cost(model: dict[str, Any], mode: str, label: str) -> dict[str, Any] | None:
    experimental = model.get("experimental")
    if experimental is None:
        return None
    if not isinstance(experimental, dict):
        raise CalculatorError(f"invalid catalog shape: {label} experimental must be an object")
    modes = experimental.get("modes")
    if modes is None:
        return None
    if not isinstance(modes, dict):
        raise CalculatorError(f"invalid catalog shape: {label} experimental.modes must be an object")
    options = modes[mode]
    if not isinstance(options, dict):
        raise CalculatorError(f"invalid catalog shape: {label} mode {mode} must be an object")
    override = options.get("cost")
    if override is None:
        return None
    if not isinstance(override, dict):
        raise CalculatorError(f"invalid catalog shape: {label} mode {mode} cost must be an object")
    return override


def pricing_for(
    catalog: dict[str, Any],
    provider_id: str,
    model_id: str,
    context_tokens: Decimal,
) -> dict[str, Decimal]:
    if provider_id not in catalog:
        raise CalculatorError(f"pricing provider missing from catalog: {provider_id}")
    provider = catalog[provider_id]
    if not isinstance(provider, dict):
        raise CalculatorError(f"invalid catalog shape for provider: {provider_id}")
    models = provider.get("models")
    if not isinstance(models, dict):
        raise CalculatorError(f"invalid catalog shape: provider {provider_id} has no models object")
    mode: str | None = None
    resolved_model_id = model_id
    if model_id not in models:
        matches: list[tuple[str, str]] = []
        for candidate_id, candidate in models.items():
            if not isinstance(candidate, dict):
                continue
            experimental = candidate.get("experimental")
            if not isinstance(experimental, dict):
                continue
            modes = experimental.get("modes")
            if not isinstance(modes, dict):
                continue
            catalog_id = candidate.get("id", candidate_id)
            if not isinstance(catalog_id, str):
                continue
            matches.extend(
                (candidate_id, candidate_mode)
                for candidate_mode in modes
                if model_id == f"{catalog_id}-{candidate_mode}"
            )
        if len(matches) > 1:
            raise CalculatorError(
                f"pricing model mode is ambiguous in catalog: {provider_id}/{model_id}"
            )
        if matches:
            resolved_model_id, mode = matches[0]
    if resolved_model_id not in models:
        raise CalculatorError(f"pricing model missing from catalog: {provider_id}/{model_id}")
    model = models[resolved_model_id]
    if not isinstance(model, dict):
        raise CalculatorError(f"invalid catalog shape for model: {provider_id}/{model_id}")
    if "cost" not in model or not isinstance(model["cost"], dict):
        raise CalculatorError(f"pricing cost missing from catalog: {provider_id}/{model_id}")
    cost = model["cost"]
    if not cost:
        raise CalculatorError(f"pricing cost missing from catalog: {provider_id}/{model_id}")
    label = f"{provider_id}/{resolved_model_id}"
    base = normalized_definition(cost, label)
    if mode is not None:
        override = mode_cost(model, mode, label)
        if override is not None:
            base = merge_definitions(base, normalized_definition(override, f"{label} mode {mode}"))
    return select_cost_rates(base, label, context_tokens)


def empty_tokens() -> dict[str, Decimal]:
    return {category: Decimal(0) for category in CATEGORIES}


def add_tokens(target: dict[str, Decimal], values: dict[str, Decimal]) -> None:
    for category in CATEGORIES:
        target[category] += values[category]


def context_tokens(values: dict[str, Decimal]) -> Decimal:
    return values["input"] + values["cache_read"] + values["cache_write"]


def turn_cost(tokens: dict[str, Decimal], rates: dict[str, Decimal], label: str) -> Decimal:
    total = Decimal(0)
    for category in ("input", "output", "cache_read", "cache_write"):
        if tokens[category] == 0:
            continue
        if category not in rates:
            raise CalculatorError(f"pricing rate missing for nonzero {category} tokens: {label}")
        total += tokens[category] * rates[category]
    if tokens["reasoning"] != 0:
        reasoning_rate = rates.get("reasoning", rates.get("output"))
        if reasoning_rate is None:
            raise CalculatorError(f"pricing rate missing for nonzero reasoning tokens: {label}")
        total += tokens["reasoning"] * reasoning_rate
    return total / MILLION


def present_number(value: Decimal, cost: bool = False) -> int | float:
    if cost:
        value = value.quantize(COST_QUANTUM, rounding=ROUND_HALF_UP)
    if value == value.to_integral_value():
        return int(value)
    return float(value)


def present_tokens(values: dict[str, Decimal]) -> dict[str, int | float]:
    result = {category: present_number(values[category]) for category in CATEGORIES}
    result["context"] = present_number(context_tokens(values))
    return result


def calculate(
    source: dict[str, Any],
    root_id: str,
    sessions: list[dict[str, Any]],
    turns: list[dict[str, Any]],
    catalog: dict[str, Any],
    pricing_metadata: dict[str, Any],
) -> dict[str, Any]:
    aggregates: dict[str, dict[str, Any]] = {
        session["id"]: {
            "turns": 0,
            "tokens": empty_tokens(),
            "cost": Decimal(0),
            "breakdowns": {},
        }
        for session in sessions
    }
    total_tokens = empty_tokens()
    total_cost = Decimal(0)

    for turn in turns:
        tokens = turn["tokens"]
        context = context_tokens(tokens)
        rates = pricing_for(
            catalog,
            turn["provider_id"],
            turn["model_id"],
            context,
        )
        cost = turn_cost(
            tokens,
            rates,
            f"{turn['provider_id']}/{turn['model_id']} in session {turn['session_id']}",
        )
        aggregate = aggregates.get(turn["session_id"])
        if aggregate is None:
            raise CalculatorError(f"usage record belongs to unknown session: {turn['session_id']}")
        aggregate["turns"] += 1
        add_tokens(aggregate["tokens"], tokens)
        aggregate["cost"] += cost
        add_tokens(total_tokens, tokens)
        total_cost += cost
        key = (turn["provider_id"], turn["model_id"], turn["variant"])
        breakdowns = aggregate["breakdowns"]
        if key not in breakdowns:
            breakdowns[key] = {"turns": 0, "tokens": empty_tokens(), "cost": Decimal(0)}
        breakdowns[key]["turns"] += 1
        add_tokens(breakdowns[key]["tokens"], tokens)
        breakdowns[key]["cost"] += cost

    total_stored_cost = sum((session["stored_cost"] for session in sessions), Decimal(0))
    output_sessions: list[dict[str, Any]] = []
    for session in sessions:
        aggregate = aggregates[session["id"]]
        breakdown = []
        for key in sorted(
            aggregate["breakdowns"],
            key=lambda value: (value[0], value[1], "" if value[2] is None else value[2]),
        ):
            values = aggregate["breakdowns"][key]
            breakdown.append(
                {
                    "providerID": key[0],
                    "modelID": key[1],
                    "variant": key[2],
                    "turns": values["turns"],
                    "tokens": present_tokens(values["tokens"]),
                    "estimated_cost_usd": present_number(values["cost"], cost=True),
                }
            )
        output_sessions.append(
            {
                "kind": "main" if session["id"] == root_id else "subagent",
                "depth": session["depth"],
                "id": session["id"],
                "parent_id": session["parent_id"],
                "title": session["title"],
                "agent": session["agent"],
                "turn_count": aggregate["turns"],
                "tokens": present_tokens(aggregate["tokens"]),
                "estimated_cost_usd": present_number(aggregate["cost"], cost=True),
                "stored_cost_usd": present_number(session["stored_cost"], cost=True),
                "breakdown": breakdown,
            }
        )

    return {
        "source": source,
        "root_session_id": root_id,
        "scope": "root session and all recursive descendants (cycle-guarded)",
        "pricing": pricing_metadata,
        "calculation": {
            "currency": "USD",
            "rate_unit": "USD per 1M tokens",
            "method": "Models.dev-first current-catalog estimate: each persisted model step uses its assistant message providerID/modelID, while variant is retained for attribution; V1 reads step-finish parts and V2 reads assistant messages with complete usage; an exact catalog model wins, otherwise an explicit <base-model>-<mode> ID resolves experimental.modes[mode].cost, which replaces mode base rates, replaces same-size tiers, adds new tiers, and replaces context_over_200k when supplied; the highest merged explicit tier with context > tier.size wins, then merged context_over_200k only when context > 200000, otherwise merged mode base rates.",
            "cache_method": "Missing optional cache_read and cache_write rates are normalized to zero in the selected cost object.",
            "reasoning_method": "Use selected cost.reasoning when present; fall back to selected output pricing only when reasoning is absent.",
            "rounding": "Decimal arithmetic is aggregated before cost values are rounded to 12 decimal places for JSON presentation.",
            "caveat": "This estimates current models.dev pricing from stored token counts and is not a reproduction of OpenCode's stored cost or a provider invoice.",
        },
        "total": {
            "session_count": len(sessions),
            "turn_count": len(turns),
            "tokens": present_tokens(total_tokens),
            "estimated_cost_usd": present_number(total_cost, cost=True),
            "stored_cost_usd": present_number(total_stored_cost, cost=True),
        },
        "sessions": output_sessions,
    }


def main(argv: list[str] | None = None) -> int:
    arguments = parser().parse_args(argv)
    try:
        path = database_path(arguments.db)
        source, sessions, turns = read_database(path, arguments.session_id)
        catalog, pricing_metadata = load_catalog(arguments)
        result = calculate(
            source,
            arguments.session_id,
            sessions,
            turns,
            catalog,
            pricing_metadata,
        )
        if arguments.pretty:
            rendered = json.dumps(result, ensure_ascii=True, indent=2, allow_nan=False)
        else:
            rendered = json.dumps(result, ensure_ascii=True, separators=(",", ":"), allow_nan=False)
        print(rendered)
        return 0
    except CalculatorError as error:
        print(f"error: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
