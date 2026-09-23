#!/usr/bin/env python3
"""Estimate OpenCode session costs and summarize recorded context deliveries."""

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
    result.add_argument("--summary", action="store_true", help="Omit repeated per-cycle and per-window delivery summaries")
    result.add_argument("--delivery-details", action="store_true", help="Include named delivery entries at every reported level")
    result.add_argument("--request-ledger", action="store_true", help="Include priced model-step records with applied rates")
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


def scope_sql(select_sql: str, session_table: str = "session_v2") -> str:
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


def validate_schema(connection: sqlite3.Connection, root_id: str) -> None:
    try:
        tables = {
            row["name"]
            for row in connection.execute(
                "SELECT name FROM sqlite_schema WHERE type = 'table'"
            )
        }
        for table, required in V2_REQUIRED_COLUMNS.items():
            if table not in tables:
                raise CalculatorError(
                    f"unsupported OpenCode source: required table is missing: {table}"
                )
            columns = {
                row["name"] for row in connection.execute(f"PRAGMA table_info({table})")
            }
            missing = required - columns
            if missing:
                raise CalculatorError(
                    f"required columns missing from {table}: {', '.join(sorted(missing))}"
                )
        if not connection.execute(
            "SELECT 1 FROM session_v2 WHERE id = ?", (root_id,)
        ).fetchone():
            raise CalculatorError(f"session not found: {root_id}")
        connection.execute("SELECT json_valid('{}'), json_extract('{}', '$.type')").fetchone()
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

def read_v2_database(
    connection: sqlite3.Connection, root_id: str
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
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
            FROM scope
            CROSS JOIN session_message AS m
            WHERE m.session_id = scope.id
              AND COALESCE(json_valid(m.data), 0) <> 1
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
                    m.session_id, m.seq, m.type AS record_type,
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
            FROM scope
            CROSS JOIN session_message AS m
            WHERE m.session_id = scope.id
               AND (m.type = 'assistant' OR
                    (m.type = 'compaction' AND json_extract(m.data, '$.status') = 'completed'))
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
                "message_id": message_id,
                "seq": row["seq"],
                "record_type": row["record_type"],
                "provider_id": row["provider_id"],
                "model_id": row["model_id"],
                "variant": row["variant"],
                "tokens": tokens,
            }
        )
    # Project only user-visible text and selected tool results. In particular,
    # json_each excludes reasoning items before their content is selected.
    event_rows = connection.execute(
        scope_sql(
            """
            SELECT m.session_id, m.seq, m.id, m.type,
                   json_extract(m.data, '$.time.created') AS created,
                   CASE WHEN m.type IN ('user', 'synthetic', 'system', 'skill')
                        THEN json_extract(m.data, '$.text') END AS text,
                   CASE WHEN m.type = 'synthetic'
                        THEN json_extract(m.data, '$.metadata.childID') END AS child_id,
                   json_extract(m.data, '$.status') AS status
            FROM scope
            JOIN session_message AS m ON m.session_id = scope.id
            ORDER BY scope.order_key, m.seq
            """,
        ),
        (root_id,),
    ).fetchall()
    tool_rows = connection.execute(
        scope_sql(
            """
            SELECT m.session_id, m.seq, m.id AS message_id,
                   json_extract(item.value, '$.id') AS tool_id,
                   json_extract(item.value, '$.name') AS name,
                   json_extract(item.value, '$.state.status') AS status,
                   json_extract(item.value, '$.state.input.path') AS path,
                   json_extract(item.value, '$.state.input.id') AS skill_id,
                   json_extract(item.value, '$.state.input.prompt') AS prompt,
                   json_extract(item.value, '$.state.input.sessionID') AS input_child_id,
                   json_extract(item.value, '$.state.metadata.sessionID') AS result_child_id,
                   json_extract(item.value, '$.state.metadata.directory') AS skill_directory,
                   json_extract(item.value, '$.state.metadata.truncated') AS truncated,
                   json_extract(item.value, '$.state.content') AS content
            FROM scope
            JOIN session_message AS m ON m.session_id = scope.id AND m.type = 'assistant'
            JOIN json_each(m.data, '$.content') AS item
            WHERE json_extract(item.value, '$.type') = 'tool'
              AND json_extract(item.value, '$.name') IN ('read', 'skill', 'subagent')
            ORDER BY scope.order_key, m.seq, CAST(item.key AS INTEGER)
            """,
        ),
        (root_id,),
    ).fetchall()
    tools_by_message: dict[str, list[dict[str, Any]]] = {}
    for row in tool_rows:
        # Parse only projected tool output; never retain it in the report.
        content = json.loads(row["content"]) if row["content"] is not None else []
        text = "".join(
            item.get("text", "") for item in content
            if isinstance(item, dict) and item.get("type") == "text"
            and isinstance(item.get("text"), str)
        ) if isinstance(content, list) else ""
        tools_by_message.setdefault(row["message_id"], []).append({
            "name": row["name"], "status": row["status"],
            "path": row["path"], "skill_id": row["skill_id"],
            "prompt": row["prompt"],
            "child_id": row["input_child_id"] or row["result_child_id"],
            "skill_directory": row["skill_directory"],
            "truncated": bool(row["truncated"]), "characters": len(text),
        })
    events = [
        {"session_id": row["session_id"], "seq": row["seq"], "id": row["id"],
         "type": row["type"], "created": row["created"],
         "characters": len(row["text"]) if isinstance(row["text"], str) else 0,
         "child_id": row["child_id"], "status": row["status"],
         "tools": tools_by_message.get(row["id"], [])}
        for row in event_rows
    ]
    return sessions, turns, events


def read_database(path: Path, root_id: str) -> tuple[dict[str, Any], list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    connection = connect_read_only(path)
    try:
        validate_schema(connection, root_id)
        sessions, turns, events = read_v2_database(connection, root_id)
        connection.commit()
        source = {
            "harness": "opencode",
            "schema": "v2",
            "database": str(path),
            "mode": "read-only",
            "identity": f"{path.stat().st_dev}:{path.stat().st_ino}",
        }
        return source, sessions, turns, events
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
    request = Request(url, headers={"User-Agent": "opencode-session-cost/1"})
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


def select_cost_rates(definition: dict[str, Any], context_tokens: Decimal) -> tuple[dict[str, Decimal], dict[str, Any]]:
    selected = definition["base"]
    tier = {"kind": "base", "threshold_tokens": None}
    selected_size: Decimal | None = None
    for size in sorted(definition["tiers"]):
        if context_tokens > size and (selected_size is None or size > selected_size):
            selected = definition["tiers"][size]
            selected_size = size
            tier = {"kind": "context_tier", "threshold_tokens": present_number(size)}
    if selected_size is None and context_tokens > CONTEXT_OVER_200K:
        if definition["has_context_over"]:
            selected = definition["context_over"]
            tier = {"kind": "context_over_200k", "threshold_tokens": 200000}
    return selected, tier


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
) -> tuple[dict[str, Decimal], dict[str, Any]]:
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
    rates, tier = select_cost_rates(base, context_tokens)
    return rates, {"catalog_model_id": resolved_model_id, "mode": mode, "tier": tier}


def empty_tokens() -> dict[str, Decimal]:
    return {category: Decimal(0) for category in CATEGORIES}


def add_tokens(target: dict[str, Decimal], values: dict[str, Decimal]) -> None:
    for category in CATEGORIES:
        target[category] += values[category]


def context_tokens(values: dict[str, Decimal]) -> Decimal:
    return values["input"] + values["cache_read"] + values["cache_write"]


def applied_rates(rates: dict[str, Decimal]) -> dict[str, Decimal]:
    return {**rates, "reasoning": rates.get("reasoning", rates["output"])}


def turn_cost_components(tokens: dict[str, Decimal], rates: dict[str, Decimal], label: str) -> dict[str, Decimal]:
    applied = applied_rates(rates)
    components = {}
    for category in CATEGORIES:
        if tokens[category] and category not in applied:
            raise CalculatorError(f"pricing rate missing for nonzero {category} tokens: {label}")
        components[category] = tokens[category] * applied.get(category, Decimal(0)) / MILLION
    return components


def present_components(values: dict[str, Decimal]) -> dict[str, int | float]:
    return {category: present_number(values[category], cost=True) for category in CATEGORIES}


def cache_read_percent(tokens: dict[str, Decimal]) -> int | float | None:
    context = context_tokens(tokens)
    return (present_number((tokens["cache_read"] * 100 / context).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP)) if context else None)


def step_record(turn: dict[str, Any], event: dict[str, Any]) -> dict[str, Any]:
    return {
        "message_id": event["id"], "seq": event["seq"],
        "timestamp_ms": event["created"], "record_type": turn["record_type"],
        "providerID": turn["provider_id"], "modelID": turn["model_id"],
        "variant": turn["variant"], "pricing": turn["pricing_selection"],
        "tokens": present_tokens(turn["tokens"]),
        "cache_read_percent": cache_read_percent(turn["tokens"]),
        "applied_rates_usd_per_million": {key: present_number(value) for key, value in
                                          applied_rates(turn["rates"]).items()},
        "reasoning_rate_source": ("explicit" if "reasoning" in turn["rates"] else "output_fallback"),
        "cost_components_usd": present_components(turn["components"]),
        "estimated_cost_usd": present_number(turn["estimated_cost"], cost=True),
    }


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


def measured(usage: dict[str, Any]) -> dict[str, Any]:
    return {
        "turn_count": usage["turns"],
        "tokens": present_tokens(usage["tokens"]),
        "estimated_cost_usd": present_number(usage["cost"], cost=True),
        "cost_components_usd": present_components(usage["components"]),
    }


def empty_usage() -> dict[str, Any]:
    return {"turns": 0, "tokens": empty_tokens(), "cost": Decimal(0),
            "components": empty_tokens()}


def add_usage(target: dict[str, Any], source: dict[str, Any]) -> None:
    target["turns"] += source["turns"]
    add_tokens(target["tokens"], source["tokens"])
    target["cost"] += source["cost"]
    add_tokens(target["components"], source["components"])


def delivery(target: dict[str, Any], category: str, name: str, characters: int,
             truncated: bool = False) -> None:
    key = (category, name)
    item = target.setdefault(key, {"deliveries": 0, "characters": 0, "truncated": 0})
    item["deliveries"] += 1
    item["characters"] += characters
    item["truncated"] += int(truncated)


def present_deliveries(sources: dict[str, Any]) -> list[dict[str, Any]]:
    return [
        {"category": category, "name": name, **item,
         "rough_tokens": (item["characters"] + 3) // 4}
        for (category, name), item in sorted(sources.items())
    ]


def source_summary(sources: dict[str, Any], details: bool = False) -> dict[str, Any]:
    categories: dict[str, dict[str, int]] = {}
    skills: dict[str, dict[str, int]] = {}
    for (category, name), values in sources.items():
        target = categories.setdefault(category, {"deliveries": 0, "characters": 0})
        target["deliveries"] += values["deliveries"]
        target["characters"] += values["characters"]
        if category in ("skill_document", "skill_supporting_file"):
            skill = name if category == "skill_document" else name.split(":", 1)[0]
            target = skills.setdefault(skill, {"document_characters": 0, "supporting_file_characters": 0})
            target["document_characters" if category == "skill_document"
                   else "supporting_file_characters"] += values["characters"]
    for values in categories.values():
        values["rough_tokens"] = (values["characters"] + 3) // 4
    for values in skills.values():
        values["rough_tokens"] = (values["document_characters"]
                                  + values["supporting_file_characters"] + 3) // 4
    result = {"category_totals": categories, "skills": skills}
    if details:
        result["details"] = present_deliveries(sources)
    return result


def merge_sources(target: dict[str, Any], sources: dict[str, Any]) -> None:
    for key, item in sources.items():
        value = target.setdefault(key, {"deliveries": 0, "characters": 0, "truncated": 0})
        for field in value:
            value[field] += item[field]


def report_history(sessions: list[dict[str, Any]], events: list[dict[str, Any]],
                   priced_turns: list[dict[str, Any]], summary: bool,
                   delivery_details: bool, request_ledger: bool
                   ) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any], list[dict[str, Any]]]:
    """Partition measured turns by cycle and window; describe text deliveries separately."""
    by_session: dict[str, list[dict[str, Any]]] = {session["id"]: [] for session in sessions}
    for event in events:
        by_session[event["session_id"]].append(event)
    turns_by_message = {turn["message_id"]: turn for turn in priced_turns}
    skill_directories = [
        (tool["skill_directory"].rstrip("/"), tool["skill_id"] or "unknown")
        for event in events for tool in event["tools"]
        if tool["name"] == "skill" and isinstance(tool["skill_directory"], str)
    ]
    reports: dict[str, Any] = {}
    links: dict[str, list[tuple[str, str]]] = {}
    ledger: list[dict[str, Any]] = []
    for session in sessions:
        sid = session["id"]
        cycles: list[dict[str, Any]] = []
        windows: list[dict[str, Any]] = []
        calls: list[dict[str, Any]] = []
        current_cycle: dict[str, Any] | None = None
        current_window: dict[str, Any] | None = None
        idle = True
        last_idle_time: int | None = None
        cumulative = Decimal(0)

        def new_window(start: int) -> dict[str, Any]:
            window = {"index": len(windows) + 1, "start_seq": start, "end_seq": None,
                      "compaction_message_id": None, "usage": empty_usage(),
                      "sources": {}, "checkpoints": [], "last_context": None,
                      "next_threshold": 25000, "cumulative_at_start": cumulative,
                      "checkpoint_cost": Decimal(0), "cycles": {}, "cycle_sources": {}}
            windows.append(window)
            return window

        if by_session[sid]:
            current_window = new_window(by_session[sid][0]["seq"])
        for event in by_session[sid]:
            seq, typ = event["seq"], event["type"]
            if typ == "idle":
                idle = True
                last_idle_time = event["created"]
            if typ in ("user", "synthetic") and (idle or current_cycle is None):
                current_cycle = {
                    "index": len(cycles) + 1, "kind": "request" if typ == "user" else "continuation",
                    "first_message_id": event["id"], "start_seq": seq, "end_seq": None,
                    "trigger_characters": event["characters"], "messages_while_active": 0,
                    "usage": empty_usage(), "sources": {}, "starting_context_tokens": None,
                    "compaction_windows": set(), "descendants": empty_usage(),
                    "ending_context_tokens": None, "maximum_context_tokens": None,
                    "first_model_request": None,
                    "idle_gap_ms": (event["created"] - last_idle_time
                                    if isinstance(event["created"], int)
                                    and isinstance(last_idle_time, int) else None),
                }
                cycles.append(current_cycle)
                idle = False
            elif typ in ("user", "synthetic") and current_cycle is not None:
                current_cycle["messages_while_active"] += 1
            if (current_cycle is None or idle) and event["id"] in turns_by_message:
                current_cycle = {
                    "index": len(cycles) + 1, "kind": "unprompted", "first_message_id": event["id"],
                    "start_seq": seq, "end_seq": None, "trigger_characters": 0,
                    "messages_while_active": 0, "usage": empty_usage(), "sources": {},
                    "starting_context_tokens": None, "compaction_windows": set(),
                    "descendants": empty_usage(),
                    "ending_context_tokens": None, "maximum_context_tokens": None,
                    "first_model_request": None, "idle_gap_ms": None,
                }
                cycles.append(current_cycle)
                idle = False
            if current_cycle is not None and (not idle or typ == "idle"):
                current_cycle["end_seq"] = seq
            if current_window is None:
                continue
            current_window["end_seq"] = seq
            if typ in ("user", "synthetic", "system", "skill"):
                category = {"user": "request_message", "synthetic": "session_notification",
                            "system": "recorded_system_message", "skill": "recorded_skill_message"}[typ]
                name = event["child_id"] if typ == "synthetic" and event["child_id"] else typ
                delivery(current_window["sources"], category, name, event["characters"])
                if current_cycle is not None:
                    delivery(current_cycle["sources"], category, name, event["characters"])
                    delivery(current_window["cycle_sources"].setdefault(
                        current_cycle["index"], {}), category, name, event["characters"])
            for tool in event["tools"]:
                name = tool["name"]
                if name == "subagent":
                    child_id = tool["child_id"]
                    if child_id and current_cycle is not None and tool["status"] == "completed":
                        calls.append({"child_id": child_id, "cycle_index": current_cycle["index"],
                                      "seq": seq})
                    prompt = tool["prompt"]
                    # A subagent call can have both a prompt and a result.
                    if isinstance(prompt, str):
                        for target in (current_window, current_cycle):
                            if target is not None:
                                delivery(target["sources"], "delegation_prompt",
                                         child_id or "unresolved", len(prompt))
                        if current_cycle is not None:
                            delivery(current_window["cycle_sources"].setdefault(
                                current_cycle["index"], {}), "delegation_prompt",
                                child_id or "unresolved", len(prompt))
                    category, label, size = "subagent_result", child_id or "unresolved", tool["characters"]
                elif name == "skill":
                    category, label, size = "skill_document", tool["skill_id"] or "unknown", tool["characters"]
                elif name == "read":
                    path = tool["path"] or "unknown"
                    skill_owner = next((skill_name for directory, skill_name in skill_directories
                                        if path.startswith(directory + "/")), None)
                    if skill_owner:
                        category, label = (("skill_document", skill_owner)
                                           if Path(path).name == "SKILL.md" else
                                           ("skill_supporting_file", skill_owner + ":" + path))
                    elif Path(path).name == "AGENTS.md":
                        category, label = ("global_instruction_read" if path.startswith(
                            str(Path.home() / ".mindframe-z") + "/") else "project_instruction_read"), path
                    else:
                        category, label = "file_read", path
                    size = tool["characters"]
                else:
                    continue
                if tool["status"] == "completed":
                    for target in (current_window, current_cycle):
                        if target is not None:
                            delivery(target["sources"], category, label, size, tool["truncated"])
                    if current_cycle is not None:
                        delivery(current_window["cycle_sources"].setdefault(
                            current_cycle["index"], {}), category, label, size, tool["truncated"])
            turn = turns_by_message.get(event["id"])
            if turn is not None:
                amount = {"turns": 1, "tokens": turn["tokens"],
                          "cost": turn["estimated_cost"], "components": turn["components"]}
                add_usage(current_window["usage"], amount)
                if request_ledger:
                    ledger.append({"session_id": sid,
                                   "cycle_index": current_cycle["index"] if current_cycle else None,
                                   "compaction_window_index": current_window["index"],
                                   **step_record(turn, event)})
                if current_cycle is not None:
                    add_usage(current_cycle["usage"], amount)
                    current_cycle["compaction_windows"].add(current_window["index"])
                    if current_cycle["starting_context_tokens"] is None:
                        current_cycle["starting_context_tokens"] = present_number(context_tokens(turn["tokens"]))
                    portion = current_window["cycles"].setdefault(current_cycle["index"], empty_usage())
                    add_usage(portion, amount)
                cumulative += turn["estimated_cost"]
                if typ == "assistant":
                    context = context_tokens(turn["tokens"])
                    current_window["last_context"] = present_number(context)
                    if current_cycle is not None:
                        current_cycle["ending_context_tokens"] = present_number(context)
                        current_cycle["maximum_context_tokens"] = present_number(max(
                            context, Decimal(current_cycle["maximum_context_tokens"] or 0)))
                        if current_cycle["first_model_request"] is None:
                            current_cycle["first_model_request"] = step_record(turn, event)
                    while context >= current_window["next_threshold"]:
                        current_window["checkpoints"].append({
                            "threshold": current_window["next_threshold"],
                            "observed_context_tokens": present_number(context),
                            "message_id": event["id"], "seq": seq,
                            "window_cost_usd": present_number(current_window["usage"]["cost"], cost=True),
                            "session_cost_usd": present_number(cumulative, cost=True),
                            "since_previous_checkpoint_usd": present_number(
                                current_window["usage"]["cost"] - current_window["checkpoint_cost"],
                                cost=True),
                        })
                        current_window["checkpoint_cost"] = current_window["usage"]["cost"]
                        current_window["next_threshold"] += 25000
            if typ == "compaction" and event["status"] == "completed":
                current_window["compaction_message_id"] = event["id"]
                current_window = new_window(seq + 1)

        if windows and windows[-1]["end_seq"] is None:
            windows.pop()
        reports[sid] = {"cycles": cycles, "windows": windows, "calls": calls}

    # Match child assignments to the parent's persisted subagent calls, in
    # call order. Only matched cycles receive a descendant cost subtotal.
    for session in sessions:
        parent_id = session["parent_id"]
        if parent_id not in reports:
            continue
        calls = [call for call in reports[parent_id]["calls"] if call["child_id"] == session["id"]]
        matched = iter(calls)
        assignment = None
        for child in reports[session["id"]]["cycles"]:
            if child["kind"] == "request":
                assignment = next(matched, None)
            if assignment is not None:
                links.setdefault(parent_id, []).append((session["id"], str(child["index"])))
                child["parent_call_seq"] = assignment["seq"]
                child["parent_cycle_index"] = assignment["cycle_index"]
                child["parent_attribution"] = ("call" if child["kind"] == "request"
                                               else "inherited_continuation")

    subtree: dict[str, dict[str, Any]] = {}
    for session in sorted(sessions, key=lambda item: item["depth"], reverse=True):
        sid = session["id"]
        subtotal = empty_usage()
        for cycle in reports[sid]["cycles"]:
            add_usage(subtotal, cycle["usage"])
        for child in (item for item in sessions if item["parent_id"] == sid):
            add_usage(subtotal, subtree[child["id"]])
        subtree[sid] = subtotal
        for child_id, child_index in links.get(sid, []):
            child_cycle = reports[child_id]["cycles"][int(child_index) - 1]
            parent_cycle = reports[sid]["cycles"][child_cycle["parent_cycle_index"] - 1]
            add_usage(parent_cycle["descendants"], child_cycle["usage"])
            add_usage(parent_cycle["descendants"], child_cycle["descendants"])

    output: dict[str, Any] = {}
    all_sources: dict[str, Any] = {}
    for session in sessions:
        sid = session["id"]
        history = reports[sid]
        session_sources: dict[str, Any] = {}
        for window in history["windows"]:
            merge_sources(session_sources, window["sources"])
        merge_sources(all_sources, session_sources)
        output[sid] = {
            "subtree": measured(subtree[sid]),
            "children_ids": [child["id"] for child in sessions if child["parent_id"] == sid],
            "context_deliveries": source_summary(session_sources, delivery_details),
            "request_cycles": [{
                "index": cycle["index"], "kind": cycle["kind"],
                "first_message_id": cycle["first_message_id"],
                "start_seq": cycle["start_seq"], "end_seq": cycle["end_seq"],
                "trigger_characters": cycle["trigger_characters"],
                "messages_while_active": cycle["messages_while_active"],
                "starting_context_tokens": cycle["starting_context_tokens"],
                "ending_context_tokens": cycle["ending_context_tokens"],
                "maximum_context_tokens": cycle["maximum_context_tokens"],
                "idle_gap_ms": cycle["idle_gap_ms"],
                "first_model_request": cycle["first_model_request"],
                "compaction_windows": sorted(cycle["compaction_windows"]),
                "own": measured(cycle["usage"]),
                "descendants": measured(cycle["descendants"]),
                "combined": measured({
                    "turns": cycle["usage"]["turns"] + cycle["descendants"]["turns"],
                    "tokens": {key: cycle["usage"]["tokens"][key] + cycle["descendants"]["tokens"][key]
                               for key in CATEGORIES},
                    "cost": cycle["usage"]["cost"] + cycle["descendants"]["cost"],
                    "components": {key: cycle["usage"]["components"][key]
                                   + cycle["descendants"]["components"][key] for key in CATEGORIES},
                }),
                **({} if summary else {"context_deliveries": source_summary(
                    cycle["sources"], delivery_details)}),
                **({"parent_call_seq": cycle["parent_call_seq"],
                    "parent_cycle_index": cycle["parent_cycle_index"],
                    "parent_attribution": cycle["parent_attribution"]}
                   if "parent_call_seq" in cycle else {}),
            } for cycle in history["cycles"]],
            "compaction_windows": [{
                "index": window["index"], "start_seq": window["start_seq"],
                "end_seq": window["end_seq"],
                "compaction_message_id": window["compaction_message_id"],
                "own": measured(window["usage"]),
                "request_cycles": [{"index": index, **measured(value),
                                    **({} if summary else {"context_deliveries": source_summary(
                                        window["cycle_sources"].get(index, {}), delivery_details)})}
                                   for index, value in sorted(window["cycles"].items())],
                **({} if summary else {"context_deliveries": source_summary(
                    window["sources"], delivery_details)}),
                "checkpoints": window["checkpoints"],
                "final_observed_context_tokens": window["last_context"],
                "since_last_checkpoint_usd": present_number(
                    window["usage"]["cost"] - window["checkpoint_cost"], cost=True),
                "ending_session_cost_usd": present_number(
                    window["cumulative_at_start"] + window["usage"]["cost"], cost=True),
            } for window in history["windows"]],
        }
    return output, {"matched_child_requests": sum(
                        1 for session in sessions if session["parent_id"] in reports
                        for cycle in reports[session["id"]]["cycles"]
                        if cycle.get("parent_attribution") == "call"),
                    "unmatched_child_cycles": [
                        {"session_id": session["id"], "cycle_index": cycle["index"]}
                        for session in sessions if session["parent_id"] in reports
                        for cycle in reports[session["id"]]["cycles"]
                        if "parent_call_seq" not in cycle]}, source_summary(all_sources, delivery_details), ledger


def calculate(
    source: dict[str, Any],
    root_id: str,
    sessions: list[dict[str, Any]],
    turns: list[dict[str, Any]],
    events: list[dict[str, Any]],
    catalog: dict[str, Any],
    pricing_metadata: dict[str, Any],
    summary: bool = False,
    delivery_details: bool = False,
    request_ledger: bool = False,
) -> dict[str, Any]:
    aggregates: dict[str, dict[str, Any]] = {
        session["id"]: {
            "turns": 0,
            "tokens": empty_tokens(),
            "cost": Decimal(0),
            "components": empty_tokens(),
            "breakdowns": {},
        }
        for session in sessions
    }
    total_tokens = empty_tokens()
    total_cost = Decimal(0)
    total_components = empty_tokens()

    for turn in turns:
        tokens = turn["tokens"]
        context = context_tokens(tokens)
        rates, selection = pricing_for(
            catalog,
            turn["provider_id"],
            turn["model_id"],
            context,
        )
        components = turn_cost_components(
            tokens,
            rates,
            f"{turn['provider_id']}/{turn['model_id']} in session {turn['session_id']}",
        )
        cost = sum(components.values(), Decimal(0))
        turn["estimated_cost"] = cost
        turn["components"] = components
        turn["rates"] = rates
        turn["pricing_selection"] = selection
        aggregate = aggregates.get(turn["session_id"])
        if aggregate is None:
            raise CalculatorError(f"usage record belongs to unknown session: {turn['session_id']}")
        aggregate["turns"] += 1
        add_tokens(aggregate["tokens"], tokens)
        aggregate["cost"] += cost
        add_tokens(aggregate["components"], components)
        add_tokens(total_tokens, tokens)
        total_cost += cost
        add_tokens(total_components, components)
        key = (turn["provider_id"], turn["model_id"], turn["variant"])
        breakdowns = aggregate["breakdowns"]
        if key not in breakdowns:
            breakdowns[key] = empty_usage()
        breakdowns[key]["turns"] += 1
        add_tokens(breakdowns[key]["tokens"], tokens)
        breakdowns[key]["cost"] += cost
        add_tokens(breakdowns[key]["components"], components)

    total_stored_cost = sum((session["stored_cost"] for session in sessions), Decimal(0))
    histories, attribution, total_sources, ledger = report_history(
        sessions, events, turns, summary, delivery_details, request_ledger)
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
                    "cost_components_usd": present_components(values["components"]),
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
                "cost_components_usd": present_components(aggregate["components"]),
                "stored_cost_usd": present_number(session["stored_cost"], cost=True),
                "breakdown": breakdown,
                **histories[session["id"]],
            }
        )

    by_id = {session["id"]: session for session in output_sessions}

    def tree_node(session_id: str) -> dict[str, Any]:
        session = by_id[session_id]
        parent = by_id.get(session["parent_id"])
        return {
            "id": session_id, "title": session["title"], "agent": session["agent"],
            "parent_id": session["parent_id"],
            "owner_agent": parent["agent"] if parent is not None else None,
            "depth": session["depth"],
            "own": {"turn_count": session["turn_count"], "tokens": session["tokens"],
                    "estimated_cost_usd": session["estimated_cost_usd"],
                    "cost_components_usd": session["cost_components_usd"]},
            "subtree": session["subtree"],
            "children": [tree_node(child_id) for child_id in session["children_ids"]],
        }

    return {
        "source": source,
        "root_session_id": root_id,
        "scope": "root session and all recursive descendants (cycle-guarded)",
        "pricing": pricing_metadata,
        "attribution": {
            "usage": "Recorded per-message token counts, including completed compactions; prices use the selected current catalog.",
            "context_deliveries": "Character lengths of persisted delivered text; rough_tokens is ceil(characters / 4), not provider tokenization. Deliveries are not extra charges and are not assigned input/cache costs. Opaque tool calls and startup-injected global instructions cannot be measured from these records.",
            "request_cycles": "An idle followed by a user message starts a request; an idle followed by a synthetic notification starts a continuation. Messages during an active cycle remain in that cycle. Child requests match persisted subagent calls in call order; unmatched child costs remain in session and tree totals.",
            "compaction_windows": "A completed compaction's recorded usage is charged to the closing window. Each 25k checkpoint uses the first actual assistant context observation at or above the threshold; crossed thresholds can share one observation.",
            **attribution,
        },
        "calculation": {
            "currency": "USD",
            "rate_unit": "USD per 1M tokens",
            "method": "Current-catalog estimate from complete assistant and completed-compaction usage; stored providerID/modelID determine pricing, variant is attribution only. Exact model IDs win; otherwise an explicit <base-model>-<mode> ID resolves experimental.modes[mode].cost. The highest merged explicit tier with context > tier.size wins, then context_over_200k when applicable.",
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
            "cost_components_usd": present_components(total_components),
            "stored_cost_usd": present_number(total_stored_cost, cost=True),
            "context_deliveries": total_sources,
        },
        "session_tree": tree_node(root_id),
        "sessions": output_sessions,
        **({"request_ledger": ledger} if request_ledger else {}),
    }


def compact_report(report: dict[str, Any]) -> dict[str, Any]:
    """Keep assignment economics and boundaries; leave exhaustive partitions to full mode."""
    def compact_tree(node: dict[str, Any]) -> dict[str, Any]:
        return {"id": node["id"], "title": node["title"], "agent": node["agent"],
                "parent_id": node["parent_id"], "owner_agent": node["owner_agent"],
                "own_cost_usd": node["own"]["estimated_cost_usd"],
                "subtree_cost_usd": node["subtree"]["estimated_cost_usd"],
                "children": [compact_tree(child) for child in node["children"]]}

    report["session_tree"] = compact_tree(report["session_tree"])
    for session in report["sessions"]:
        session["subtree"] = {
            "turn_count": session["subtree"]["turn_count"],
            "estimated_cost_usd": session["subtree"]["estimated_cost_usd"],
        }
        for cycle in session["request_cycles"]:
            first = cycle["first_model_request"]
            if first is not None:
                cycle["first_model_request"] = {
                    key: first[key] for key in
                    ("message_id", "seq", "timestamp_ms", "tokens", "cache_read_percent",
                     "estimated_cost_usd")
                }
            cycle["descendants"] = {
                "turn_count": cycle["descendants"]["turn_count"],
                "estimated_cost_usd": cycle["descendants"]["estimated_cost_usd"],
            }
            cycle["combined"] = {
                "turn_count": cycle["combined"]["turn_count"],
                "estimated_cost_usd": cycle["combined"]["estimated_cost_usd"],
            }
        for window in session["compaction_windows"]:
            window.pop("request_cycles")
            window["checkpoints"] = [
                {key: checkpoint[key] for key in
                 ("threshold", "observed_context_tokens", "window_cost_usd")}
                for checkpoint in window["checkpoints"]
            ]
    report["format"] = "summary"
    return report


def main(argv: list[str] | None = None) -> int:
    arguments = parser().parse_args(argv)
    try:
        path = database_path(arguments.db)
        source, sessions, turns, events = read_database(path, arguments.session_id)
        catalog, pricing_metadata = load_catalog(arguments)
        result = calculate(
            source,
            arguments.session_id,
            sessions,
            turns,
            events,
            catalog,
            pricing_metadata,
            summary=arguments.summary,
            delivery_details=arguments.delivery_details,
            request_ledger=arguments.request_ledger,
        )
        if arguments.summary:
            result = compact_report(result)
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
