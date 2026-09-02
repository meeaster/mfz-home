#!/usr/bin/env python3
"""Validate the controlled Markdown shape of a Session Brief v2 artifact."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any


OPENCODE_ADAPTER_VERSION = 2
OPENCODE_CHECKPOINT_FIELDS = {
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
OPENCODE_SESSION_FIELDS = {
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
OPENCODE_PARENT_LOCATOR = re.compile(
    r"\[source: parent/session=[A-Za-z0-9][A-Za-z0-9._:-]*;seq=[0-9]+;message=[A-Za-z0-9][A-Za-z0-9._:-]*(?:;content=(?:[A-Za-z0-9][A-Za-z0-9._:-]*)|;content-index=[0-9]+)?\]"
)
GENERIC_PARENT_LOCATOR = re.compile(r"\[source: parent/[^]\r\n]+\]")
KEY_PATTERN = re.compile(r"^[A-Za-z_][A-Za-z0-9_.-]*$")
HEADING_PATTERN = re.compile(r"^\s{0,3}(#{1,6})\s+(.+?)\s*$")
FENCE_PATTERN = re.compile(r"^\s{0,3}(`{3,}|~{3,})(.*)$")
LIST_ITEM_PATTERN = re.compile(
    r"^(?P<indent> {0,3})(?P<marker>(?:[-*+]\s+|[0-9]+[.)]\s+))(?P<text>.*)$"
)
INTEGER_PATTERN = re.compile(r"^-?[0-9]+$")
FINGERPRINT_PATTERN = re.compile(r"^sha256:[0-9a-f]{64}$")

TOP_KEYS = {"kind", "state_version", "title", "source", "brief", "coverage", "extraction"}
SOURCE_KEYS = {
    "harness",
    "session_id",
    "kind",
    "locator",
    "fingerprint",
    "adapter_version",
    "session_created_at",
    "project",
    "directory",
}
BRIEF_KEYS = {
    "created_at",
    "updated_at",
    "source_activity_at_pin",
    "evidence_state_at_pin",
    "post_pin_movement",
}
COVERAGE_KEYS = {"mode", "complete_through", "complete", "gaps", "exclusions"}
EXTRACTION_KEYS = {
    "adapter_state_json",
    "guards",
    "compactions",
    "children",
    "nonterminal",
    "final_message",
    "final_part",
}
GUARD_KEYS = {"overall", "reason", "locator", "sessions"}
SESSION_GUARD_KEYS = {"status", "reason", "locator"}
DESCRIPTIVE_RECORD_KEYS = {
    "id",
    "session_id",
    "record_id",
    "locator",
    "timestamp",
    "time",
    "type",
    "status",
    "state",
    "title",
    "updated_at",
    "tail_start_id",
}
GAP_KEYS = {"kind", "reason", "locator", "message", "type", "stream", "session_id", "action"}


class FrontmatterError(ValueError):
    """A controlled-frontmatter parse error with a source line."""

    def __init__(self, line: int, message: str) -> None:
        super().__init__(f"line {line}: {message}")
        self.line = line
        self.message = message


def _split_document(text: str) -> tuple[list[tuple[int, str]], list[tuple[int, str]]]:
    lines = text.splitlines()
    if not lines or lines[0] != "---":
        raise FrontmatterError(1, "expected opening frontmatter delimiter ---")
    closing = next((index for index in range(1, len(lines)) if lines[index] == "---"), None)
    if closing is None:
        raise FrontmatterError(1, "missing closing frontmatter delimiter ---")
    frontmatter = [(index + 1, lines[index]) for index in range(1, closing)]
    body = [(index + 1, lines[index]) for index in range(closing + 1, len(lines))]
    return frontmatter, body


class FrontmatterParser:
    def __init__(self, lines: list[tuple[int, str]]) -> None:
        self.lines = lines
        self.scalar_styles: dict[str, str] = {}

    def parse(self) -> dict[str, Any]:
        index = self._skip(0)
        if index == len(self.lines):
            raise FrontmatterError(1, "frontmatter must contain a mapping")
        indent = self._indent(index)
        value, index = self._block(index, indent, "")
        if index != len(self.lines):
            line, _ = self.lines[index]
            raise FrontmatterError(line, "unexpected content after frontmatter mapping")
        if not isinstance(value, dict):
            line, _ = self.lines[0]
            raise FrontmatterError(line, "frontmatter root must be a mapping")
        return value

    def _skip(self, index: int) -> int:
        while index < len(self.lines):
            _, raw = self.lines[index]
            if raw.strip() and not raw.lstrip().startswith("#"):
                break
            index += 1
        return index

    def _indent(self, index: int) -> int:
        line, raw = self.lines[index]
        prefix = raw[: len(raw) - len(raw.lstrip(" \t"))]
        if "\t" in prefix:
            raise FrontmatterError(line, "tabs are not supported for indentation")
        return len(prefix)

    def _block(self, index: int, indent: int, path: str) -> tuple[Any, int]:
        index = self._skip(index)
        if index == len(self.lines):
            return None, index
        actual_indent = self._indent(index)
        if actual_indent != indent:
            line, _ = self.lines[index]
            raise FrontmatterError(line, f"expected indentation {indent}, found {actual_indent}")
        _, raw = self.lines[index]
        content = raw[indent:]
        if content == "-" or content.startswith("- "):
            return self._list(index, indent, path)
        return self._mapping(index, indent, path)

    def _mapping(self, index: int, indent: int, path: str) -> tuple[dict[str, Any], int]:
        result: dict[str, Any] = {}
        while True:
            index = self._skip(index)
            if index == len(self.lines):
                return result, index
            line, raw = self.lines[index]
            actual_indent = self._indent(index)
            if actual_indent < indent:
                return result, index
            if actual_indent > indent:
                raise FrontmatterError(line, f"unexpected indentation {actual_indent}")
            content = raw[indent:]
            if content == "-" or content.startswith("- "):
                raise FrontmatterError(line, "list item is not valid inside a mapping")
            key, value_text = self._pair(line, content)
            if key in result:
                raise FrontmatterError(line, f"duplicate key {key}")
            if value_text.strip() == "":
                next_index = self._skip(index + 1)
                if next_index < len(self.lines) and self._indent(next_index) > indent:
                    value, index = self._block(
                        next_index,
                        self._indent(next_index),
                        f"{path}.{key}" if path else key,
                    )
                else:
                    value, index = None, index + 1
            elif value_text.strip() in {"|", "|-", "|+"}:
                value, index = self._block_scalar(
                    index,
                    indent,
                    value_text.strip(),
                    f"{path}.{key}" if path else key,
                )
            else:
                value = self._scalar(value_text.strip(), line)
                index += 1
            result[key] = value

    def _list(self, index: int, indent: int, path: str) -> tuple[list[Any], int]:
        result: list[Any] = []
        while True:
            index = self._skip(index)
            if index == len(self.lines):
                return result, index
            line, raw = self.lines[index]
            actual_indent = self._indent(index)
            if actual_indent < indent:
                return result, index
            if actual_indent > indent:
                raise FrontmatterError(line, f"unexpected indentation {actual_indent}")
            content = raw[indent:]
            if content == "-":
                item_text = ""
            elif content.startswith("- "):
                item_text = content[2:].strip()
            else:
                return result, index
            if not item_text:
                next_index = self._skip(index + 1)
                if next_index < len(self.lines) and self._indent(next_index) > indent:
                    item_value, index = self._block(
                        next_index,
                        self._indent(next_index),
                        f"{path}[{len(result)}]",
                    )
                else:
                    item_value, index = None, index + 1
                result.append(item_value)
                continue

            if ":" in item_text:
                key, value_text = self._pair(line, item_text)
                item: dict[str, Any] = {}
                if value_text.strip() == "":
                    next_index = self._skip(index + 1)
                    if next_index < len(self.lines) and self._indent(next_index) > indent:
                        value, index = self._block(
                            next_index,
                            self._indent(next_index),
                            f"{path}[{len(result)}].{key}",
                        )
                    else:
                        value, index = None, index + 1
                elif value_text.strip() in {"|", "|-", "|+"}:
                    value, index = self._block_scalar(
                        index,
                        indent,
                        value_text.strip(),
                        f"{path}[{len(result)}].{key}",
                    )
                else:
                    value = self._scalar(value_text.strip(), line)
                    index += 1
                item[key] = value
                continuation = self._skip(index)
                if continuation < len(self.lines) and self._indent(continuation) > indent:
                    extra, index = self._block(
                        continuation,
                        self._indent(continuation),
                        f"{path}[{len(result)}]",
                    )
                    if not isinstance(extra, dict):
                        extra_line, _ = self.lines[continuation]
                        raise FrontmatterError(extra_line, "list item continuation must be a mapping")
                    for extra_key, extra_value in extra.items():
                        if extra_key in item:
                            extra_line, _ = self.lines[continuation]
                            raise FrontmatterError(extra_line, f"duplicate key {extra_key}")
                        item[extra_key] = extra_value
                result.append(item)
                continue

            item = self._scalar(item_text, line)
            result.append(item)
            index += 1

    def _pair(self, line: int, content: str) -> tuple[str, str]:
        if ":" not in content:
            raise FrontmatterError(line, "expected key: value")
        key, value = content.split(":", 1)
        key = key.strip()
        if not KEY_PATTERN.fullmatch(key):
            raise FrontmatterError(line, f"invalid key {key!r}")
        return key, value

    def _block_scalar(
        self, index: int, parent_indent: int, marker: str, path: str
    ) -> tuple[str, int]:
        self.scalar_styles[path] = marker
        content: list[str] = []
        index += 1
        content_indent: int | None = None
        while index < len(self.lines):
            line, raw = self.lines[index]
            if not raw.strip():
                content.append("")
                index += 1
                continue
            actual_indent = self._indent(index)
            if actual_indent <= parent_indent:
                break
            if content_indent is None:
                content_indent = actual_indent
            if actual_indent < content_indent:
                raise FrontmatterError(line, "block scalar indentation decreased")
            content.append(raw[content_indent:])
            index += 1
        if marker == "|-":
            while content and content[-1] == "":
                content.pop()
            return "\n".join(content), index
        value = "\n".join(content)
        return value + "\n", index

    def _scalar(self, value: str, line: int) -> Any:
        if value == "[]":
            return []
        if value == "{}":
            return {}
        if value in {"null", "~"}:
            return None
        if value == "true":
            return True
        if value == "false":
            return False
        if INTEGER_PATTERN.fullmatch(value):
            return int(value)
        if value.startswith('"'):
            try:
                parsed = json.loads(value)
            except json.JSONDecodeError as error:
                raise FrontmatterError(line, f"invalid double-quoted scalar: {error.msg}") from error
            return parsed
        if value.startswith("'") and value.endswith("'") and len(value) >= 2:
            return value[1:-1].replace("''", "'")
        if value.startswith(("[", "{")):
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                pass
        return value


def _mapping(value: Any, path: str, errors: list[str]) -> dict[str, Any] | None:
    if not isinstance(value, dict):
        errors.append(f"{path} must be a mapping")
        return None
    return value


def _allowed_keys(
    mapping: dict[str, Any], path: str, allowed: set[str], errors: list[str]
) -> None:
    unknown = set(mapping) - allowed
    if unknown:
        errors.append(
            f"{path} contains unsupported keys: {', '.join(sorted(unknown))}"
        )


def _required(mapping: dict[str, Any], key: str, path: str, errors: list[str]) -> Any:
    if key not in mapping:
        errors.append(f"{path}.{key} is required")
        return None
    return mapping[key]


def _string(value: Any, path: str, errors: list[str], nonempty: bool = False) -> bool:
    if not isinstance(value, str) or (nonempty and not value.strip()):
        qualifier = "non-empty " if nonempty else ""
        errors.append(f"{path} must be a {qualifier}string")
        return False
    return True


def _scalar_or_null(value: Any) -> bool:
    return value is None or isinstance(value, (str, int, float, bool))


def _validate_scalar_fields(
    mapping: dict[str, Any], path: str, errors: list[str]
) -> None:
    for key, value in mapping.items():
        if not _scalar_or_null(value):
            errors.append(f"{path}.{key} must be a scalar or null")


def _validate_guard_reason_and_locator(
    mapping: dict[str, Any], path: str, errors: list[str]
) -> None:
    for key in ("reason", "locator"):
        if key in mapping and mapping[key] is not None and not isinstance(mapping[key], str):
            errors.append(f"{path}.{key} must be a string or null")


def _visible_text(value: Any) -> bool:
    return isinstance(value, str) and bool(value.strip())


def _visible_gap(gaps: Any) -> bool:
    if not isinstance(gaps, list):
        return False
    for gap in gaps:
        if _visible_text(gap):
            return True
        if isinstance(gap, dict) and any(
            _visible_text(gap.get(key))
            for key in ("reason", "kind", "locator", "message", "type", "stream", "session_id")
        ):
            return True
    return False


def _guard_reason(guard: Any) -> bool:
    return isinstance(guard, dict) and any(
        _visible_text(guard.get(key)) for key in ("reason", "rejection_reason", "locator")
    )


def _validate_descriptive_list(
    value: Any, path: str, errors: list[str], required_item_keys: set[str] | None = None
) -> None:
    if not isinstance(value, list):
        errors.append(f"{path} must be a list")
        return
    allowed = required_item_keys or DESCRIPTIVE_RECORD_KEYS
    for index, item in enumerate(value):
        item_path = f"{path}[{index}]"
        if isinstance(item, dict):
            _allowed_keys(item, item_path, allowed, errors)
            _validate_scalar_fields(item, item_path, errors)
        elif not isinstance(item, str):
            errors.append(f"{item_path} must be a string or mapping")


def _validate_descriptive_value(value: Any, path: str, errors: list[str]) -> None:
    if value is None or isinstance(value, str):
        return
    if isinstance(value, dict):
        _allowed_keys(value, path, DESCRIPTIVE_RECORD_KEYS, errors)
        _validate_scalar_fields(value, path, errors)
        return
    errors.append(f"{path} must be null, a string, or a mapping")


def _reject_json_constant(value: str) -> None:
    raise ValueError(f"nonstandard JSON constant {value}")


def _json_object_without_duplicates(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f"duplicate JSON object key {key}")
        result[key] = value
    return result


def _json_whitespace_outside_string(value: str) -> int | None:
    in_string = False
    escaped = False
    for index, character in enumerate(value):
        if in_string:
            if escaped:
                escaped = False
            elif character == "\\":
                escaped = True
            elif character == '"':
                in_string = False
        elif character == '"':
            in_string = True
        elif character.isspace():
            return index
    return None


def _validate_guards(
    extraction: dict[str, Any],
    source_session_id: str,
    errors: list[str],
) -> dict[str, Any] | None:
    guards = _mapping(extraction.get("guards"), "extraction.guards", errors)
    if guards is None:
        return None
    _allowed_keys(guards, "extraction.guards", GUARD_KEYS, errors)
    _validate_guard_reason_and_locator(guards, "extraction.guards", errors)
    overall = _required(guards, "overall", "extraction.guards", errors)
    if not isinstance(overall, str) or overall not in {"accepted", "rejected"}:
        errors.append("extraction.guards.overall must be accepted or rejected")
        overall = None
    sessions = _mapping(guards.get("sessions"), "extraction.guards.sessions", errors)
    if sessions is None or not sessions:
        errors.append("extraction.guards.sessions must contain per-session guard results")
        sessions = None
    statuses: dict[str, str] = {}
    if sessions is not None:
        for session_id, guard in sessions.items():
            if not isinstance(session_id, str) or not session_id.strip():
                errors.append("extraction.guards.sessions keys must be non-empty strings")
            guard_map = _mapping(guard, f"extraction.guards.sessions.{session_id}", errors)
            if guard_map is None:
                continue
            _allowed_keys(
                guard_map,
                f"extraction.guards.sessions.{session_id}",
                SESSION_GUARD_KEYS,
                errors,
            )
            _validate_guard_reason_and_locator(
                guard_map,
                f"extraction.guards.sessions.{session_id}",
                errors,
            )
            status = _required(
                guard_map,
                "status",
                f"extraction.guards.sessions.{session_id}",
                errors,
            )
            if not isinstance(status, str) or status not in {"accepted", "rejected"}:
                errors.append(
                    f"extraction.guards.sessions.{session_id}.status must be accepted or rejected"
                )
            elif status == "rejected":
                if not _guard_reason(guard_map):
                    errors.append(
                        f"extraction.guards.sessions.{session_id} rejected guard needs reason or locator"
                    )
            if isinstance(session_id, str) and status in {"accepted", "rejected"}:
                statuses[session_id] = status
    if statuses:
        expected_overall = "rejected" if "rejected" in statuses.values() else "accepted"
        if overall != expected_overall:
            errors.append(
                "extraction.guards.overall must be accepted iff every per-session guard is accepted"
            )
    if source_session_id not in (sessions or {}):
        errors.append(
            f"extraction.guards.sessions must include source session {source_session_id}"
        )
    return {
        "overall": overall,
        "sessions": sessions,
        "statuses": statuses,
        "all_accepted": bool(statuses) and all(status == "accepted" for status in statuses.values()),
        "any_rejected": any(status == "rejected" for status in statuses.values()),
        "has_rejection_reason": any(
            _guard_reason(guard)
            for guard in (sessions or {}).values()
            if isinstance(guard, dict) and guard.get("status") == "rejected"
        ) or _guard_reason(guards),
    }


def _validate_truth_table(
    activity: str | None,
    evidence_state: str | None,
    movement: str | None,
    complete: bool | None,
    gaps: Any,
    source_session_id: str,
    guard_facts: dict[str, Any] | None,
    errors: list[str],
) -> None:
    visible_gap = _visible_gap(gaps)
    any_rejected = bool(guard_facts and guard_facts["any_rejected"])
    all_accepted = bool(guard_facts and guard_facts["all_accepted"])
    overall = guard_facts.get("overall") if guard_facts else None
    has_rejection_reason = bool(guard_facts and guard_facts["has_rejection_reason"])
    statuses = guard_facts.get("statuses", {}) if guard_facts else {}

    if any_rejected:
        if evidence_state == "accepted":
            errors.append("accepted evidence requires every per-session guard to be accepted")
        if complete is True:
            errors.append("a rejected session guard requires coverage.complete to be false")
        if not visible_gap and not has_rejection_reason:
            errors.append("a rejected session guard requires a visible coverage gap or rejection reason")

    if evidence_state == "accepted" and not all_accepted:
        errors.append("evidence_state_at_pin accepted requires all pin guards to be accepted")

    if evidence_state == "partially-accepted":
        mixed = bool(statuses) and any_rejected and any(
            status == "accepted" for status in statuses.values()
        )
        if not mixed:
            errors.append("partially-accepted evidence requires a mix of accepted and rejected sessions")
        if overall != "rejected":
            errors.append("partially-accepted evidence requires an overall rejected guard")
        if not visible_gap:
            errors.append("partially-accepted evidence requires a visible coverage gap")
        if complete is True:
            errors.append("partially-accepted evidence requires coverage.complete to be false")

    if evidence_state == "rejected":
        if overall != "rejected" or not any_rejected:
            errors.append("rejected evidence requires at least one rejected session guard and overall rejection")
        if not visible_gap and not has_rejection_reason:
            errors.append("rejected evidence requires a visible coverage gap or rejection reason")
        if complete is True:
            errors.append("rejected evidence requires coverage.complete to be false")

    if complete is True:
        if evidence_state != "accepted":
            errors.append("coverage.complete true requires accepted evidence")
        if overall != "accepted" or not all_accepted:
            errors.append("coverage.complete true requires accepted guards")
        if movement != "not-observed":
            errors.append("coverage.complete true requires post_pin_movement not-observed")
        if visible_gap:
            errors.append("coverage.complete true cannot have visible coverage gaps")

    if movement in {"detected", "unknown"} and not visible_gap:
        errors.append("post-pin movement detected or unknown requires a visible coverage gap")

    if visible_gap or movement in {"detected", "unknown"}:
        if complete is True:
            errors.append("a visible gap or post-pin movement requires coverage.complete to be false")

    if activity == "missing":
        parent_status = statuses.get(source_session_id)
        if parent_status != "rejected":
            errors.append("source_activity_at_pin missing requires the parent session guard to be rejected")
        if overall != "rejected" or evidence_state != "rejected":
            errors.append("missing source activity requires rejected evidence and overall guard")
        if not visible_gap:
            errors.append("missing source activity requires a visible coverage gap")
        if complete is True:
            errors.append("missing source activity requires coverage.complete to be false")


def _sha256(value: Any) -> bool:
    return isinstance(value, str) and bool(FINGERPRINT_PATTERN.fullmatch(value))


def _validate_opencode_state(
    state: dict[str, Any],
    source_session_id: str,
    adapter_version: Any,
    guard_facts: dict[str, Any] | None,
    errors: list[str],
) -> None:
    if adapter_version != OPENCODE_ADAPTER_VERSION:
        errors.append(
            "source.adapter_version must be 2 for OpenCode incremental refresh; full rebuild required"
        )
    if set(state) != OPENCODE_CHECKPOINT_FIELDS:
        errors.append(
            "extraction.adapter_state_json OpenCode V2 checkpoint has an unsupported shape; full rebuild required"
        )
    if state.get("adapter") != "opencode-session-evidence":
        errors.append("extraction.adapter_state_json.adapter must be opencode-session-evidence")
    version = state.get("version")
    if isinstance(version, bool) or not isinstance(version, int) or version != OPENCODE_ADAPTER_VERSION:
        errors.append(
            "extraction.adapter_state_json OpenCode adapter version must be 2; full rebuild required"
        )
    source = state.get("source")
    if not isinstance(source, dict) or set(source) != {"identity", "database", "schema"}:
        errors.append(
            "extraction.adapter_state_json.source must contain identity, database, and schema"
        )
    else:
        _string(source.get("identity"), "extraction.adapter_state_json.source.identity", errors, True)
        _string(source.get("database"), "extraction.adapter_state_json.source.database", errors, True)
        if source.get("schema") != "v2":
            errors.append("extraction.adapter_state_json.source.schema must be v2")
    if state.get("parent_session_id") != source_session_id:
        errors.append(
            "extraction.adapter_state_json.parent_session_id must match source.session_id"
        )
    known_children = state.get("known_child_ids")
    if not isinstance(known_children, list) or any(
        not isinstance(child, str) or not child.strip() for child in known_children
    ):
        errors.append(
            "extraction.adapter_state_json.known_child_ids must be a list of non-empty strings"
        )
        known_children = []
    elif len(set(known_children)) != len(known_children):
        errors.append("extraction.adapter_state_json.known_child_ids must be unique")
    if source_session_id in known_children:
        errors.append(
            "extraction.adapter_state_json.known_child_ids must not contain the parent session"
        )
    if not _sha256(state.get("topology_guard")):
        errors.append("extraction.adapter_state_json.topology_guard must use sha256:<64-hex>")
    for field in ("event_watermarks", "inbox_watermarks"):
        watermarks = state.get(field)
        if not isinstance(watermarks, dict):
            errors.append(f"extraction.adapter_state_json.{field} must be a mapping")
        elif any(
            value is not None
            and (isinstance(value, bool) or not isinstance(value, int) or value < 0)
            for value in watermarks.values()
        ):
            errors.append(
                f"extraction.adapter_state_json.{field} values must be nonnegative integers or null"
            )

    state_sessions = state.get("sessions")
    if not isinstance(state_sessions, dict):
        errors.append("extraction.adapter_state_json.sessions must be a mapping")
        state_sessions = None
    expected_sessions = {source_session_id, *known_children}
    if state_sessions is not None and set(state_sessions) != expected_sessions:
        errors.append(
            "extraction.adapter_state_json.sessions must exactly match the parent and known child IDs"
        )
    guard_sessions = guard_facts.get("sessions") if guard_facts else None
    if guard_sessions is not None and state_sessions is not None and set(guard_sessions) != set(state_sessions):
        errors.append(
            "extraction.guards.sessions must exactly match OpenCode adapter state sessions"
        )
    if state_sessions is None:
        return

    for session_id, entry in state_sessions.items():
        entry_path = f"extraction.adapter_state_json.sessions.{session_id}"
        if not isinstance(entry, dict):
            errors.append(f"{entry_path} must be a mapping")
            continue
        if set(entry) != OPENCODE_SESSION_FIELDS:
            errors.append(f"{entry_path} has an unsupported OpenCode V2 checkpoint shape")
        for field in (
            "terminal_seq",
            "message_count",
            "max_message_updated",
            "session_updated",
        ):
            value = entry.get(field)
            minimum = -1 if field == "terminal_seq" else 0
            if isinstance(value, bool) or not isinstance(value, int) or value < minimum:
                errors.append(f"{entry_path}.{field} must be an integer >= {minimum}")
        for field in ("latest_completed_compaction_seq", "active_context_start_seq"):
            value = entry.get(field)
            if value is not None and (
                isinstance(value, bool) or not isinstance(value, int) or value < 0
            ):
                errors.append(f"{entry_path}.{field} must be a nonnegative integer or null")
        if entry.get("latest_completed_compaction_seq") != entry.get("active_context_start_seq"):
            errors.append(
                f"{entry_path}.active_context_start_seq must match latest_completed_compaction_seq"
            )
        for field in ("prefix_guard", "metadata_guard"):
            if not _sha256(entry.get(field)):
                errors.append(f"{entry_path}.{field} must use sha256:<64-hex>")
        fork = entry.get("fork_provenance")
        if fork is not None:
            if not isinstance(fork, dict) or set(fork) != {"session_id", "boundary"}:
                errors.append(
                    f"{entry_path}.fork_provenance must be null or contain session_id and boundary"
                )
            elif not isinstance(fork.get("session_id"), str) or not fork["session_id"]:
                errors.append(f"{entry_path}.fork_provenance.session_id must be non-empty")


def _fenced_indices(body: list[tuple[int, str]], errors: list[str]) -> set[int]:
    fenced: set[int] = set()
    fence_character: str | None = None
    fence_length = 0
    opening_line: int | None = None
    for index, (line, raw) in enumerate(body):
        match = FENCE_PATTERN.match(raw)
        if fence_character is None:
            if match:
                fence_character = match.group(1)[0]
                fence_length = len(match.group(1))
                opening_line = line
                fenced.add(index)
        else:
            fenced.add(index)
            if (
                match
                and match.group(1)[0] == fence_character
                and len(match.group(1)) >= fence_length
                and not match.group(2).strip()
            ):
                fence_character = None
                fence_length = 0
                opening_line = None
    if fence_character is not None:
        errors.append(f"unclosed fenced code block starting on line {opening_line}")
    return fenced


def _section_ranges(
    body: list[tuple[int, str]], fenced: set[int]
) -> list[tuple[str, int, int, int, int]]:
    headings: list[tuple[str, int, int, int]] = []
    for index, (line, raw) in enumerate(body):
        if index in fenced:
            continue
        match = HEADING_PATTERN.match(raw)
        if match:
            headings.append((match.group(2).strip(), index, line, len(match.group(1))))
    ranges: list[tuple[str, int, int, int, int]] = []
    for position, (name, start, line, level) in enumerate(headings):
        end = len(body)
        for _, next_start, _, next_level in headings[position + 1 :]:
            if next_level <= level:
                end = next_start
                break
        ranges.append((name, start + 1, end, line, level))
    return ranges


def _validate_narrative(body: list[tuple[int, str]], harness: str | None, errors: list[str]) -> None:
    fenced = _fenced_indices(body, errors)
    ranges = _section_ranges(body, fenced)
    for required in ("Purpose And Context", "Current State", "Extraction History"):
        matching = [item for item in ranges if item[0] == required and item[4] == 2]
        if not matching:
            errors.append(f"narrative section exact level-2 ## {required} is required")
            continue
        for name, start, end, line, _ in matching:
            if not any(
                index not in fenced and body[index][1].strip()
                for index in range(start, end)
            ):
                errors.append(f"narrative section ## {name} on line {line} must not be empty")
    for section in ("Decisions", "Corrections And Preferences"):
        matching = [item for item in ranges if item[0] == section and item[4] == 2]
        for _, start, end, _, _ in matching:
            items: list[tuple[int, list[str]]] = []
            current: tuple[int, list[str], int] | None = None
            blank_after_current = False
            for index in range(start, end):
                if index in fenced:
                    continue
                line, raw = body[index]
                if not raw.strip():
                    if current is not None:
                        blank_after_current = True
                    continue
                list_match = LIST_ITEM_PATTERN.match(raw)
                if list_match:
                    text = list_match.group("text").strip()
                    if not text:
                        errors.append(f"{section} list item on line {line} must not be empty")
                        current = None
                        blank_after_current = False
                        continue
                    current = (
                        line,
                        [text],
                        len(list_match.group("indent")) + len(list_match.group("marker")),
                    )
                    items.append((line, current[1]))
                    blank_after_current = False
                elif HEADING_PATTERN.match(raw):
                    errors.append(
                        f"{section} content on line {line} must be a logical list item"
                    )
                    current = None
                    blank_after_current = False
                elif current is None:
                    errors.append(
                        f"{section} content on line {line} must be an unordered or numbered list item"
                    )
                elif blank_after_current and len(raw) - len(raw.lstrip(" ")) < current[2]:
                    errors.append(
                        f"{section} content on line {line} must be an appropriately indented continuation after a blank"
                    )
                    current = None
                    blank_after_current = False
                else:
                    current[1].append(raw.strip())
                    blank_after_current = False
            for line, item_lines in items:
                item_text = " ".join(item_lines)
                locator_pattern = (
                    OPENCODE_PARENT_LOCATOR if harness == "opencode" else GENERIC_PARENT_LOCATOR
                )
                if not locator_pattern.search(item_text):
                    example = (
                        "[source: parent/session=ses_x;seq=1;message=msg_x]"
                        if harness == "opencode"
                        else "[source: parent/<adapter-locator>]"
                    )
                    errors.append(
                        f"{section} list item on line {line} needs direct parent evidence like {example}"
                    )


def validate_text(text: str) -> list[str]:
    """Return actionable validation errors for one Session Brief document."""

    try:
        frontmatter_lines, body = _split_document(text)
        frontmatter_parser = FrontmatterParser(frontmatter_lines)
        frontmatter = frontmatter_parser.parse()
    except FrontmatterError as error:
        return [f"frontmatter {error}"]

    errors: list[str] = []
    _allowed_keys(frontmatter, "frontmatter", TOP_KEYS, errors)
    if frontmatter.get("kind") != "session-brief":
        errors.append("kind must be session-brief")
    state_version = frontmatter.get("state_version")
    if isinstance(state_version, bool) or not isinstance(state_version, int) or state_version != 2:
        errors.append("state_version must be 2")
    if "title" in frontmatter:
        _string(frontmatter["title"], "title", errors)

    source = _mapping(frontmatter.get("source"), "source", errors)
    source_session_id: str | None = None
    harness: str | None = None
    if source is not None:
        _allowed_keys(source, "source", SOURCE_KEYS, errors)
        harness_value = _required(source, "harness", "source", errors)
        if _string(harness_value, "source.harness", errors, True):
            harness = harness_value.lower()
        session_id = _required(source, "session_id", "source", errors)
        if _string(session_id, "source.session_id", errors, True):
            source_session_id = session_id
        for key in SOURCE_KEYS - {"harness", "session_id"}:
            value = source.get(key)
            valid_adapter_version = key == "adapter_version" and (
                isinstance(value, int) and not isinstance(value, bool)
            )
            if key in source and value is not None and not isinstance(value, str) and not valid_adapter_version:
                expected = "a string, integer, or null" if key == "adapter_version" else "a string or null"
                errors.append(f"source.{key} must be {expected}")

    brief = _mapping(frontmatter.get("brief"), "brief", errors)
    activity: str | None = None
    evidence_state: str | None = None
    movement: str | None = None
    if brief is not None:
        _allowed_keys(brief, "brief", BRIEF_KEYS, errors)
        for key in ("created_at", "updated_at"):
            value = _required(brief, key, "brief", errors)
            _string(value, f"brief.{key}", errors, True)
        activity = brief.get("source_activity_at_pin")
        evidence_state = brief.get("evidence_state_at_pin")
        movement = brief.get("post_pin_movement")
        if activity not in {"active", "quiescent", "missing"}:
            errors.append("brief.source_activity_at_pin must be active, quiescent, or missing")
        if evidence_state not in {"accepted", "partially-accepted", "rejected"}:
            errors.append("brief.evidence_state_at_pin must be accepted, partially-accepted, or rejected")
        if movement not in {"not-observed", "detected", "unknown"}:
            errors.append("brief.post_pin_movement must be not-observed, detected, or unknown")

    coverage = _mapping(frontmatter.get("coverage"), "coverage", errors)
    gaps: Any = None
    complete: bool | None = None
    if coverage is not None:
        _allowed_keys(coverage, "coverage", COVERAGE_KEYS, errors)
        mode = _required(coverage, "mode", "coverage", errors)
        if mode not in {"reconstruct", "delta", "full-rebuild"}:
            errors.append("coverage.mode must be reconstruct, delta, or full-rebuild")
        complete = _required(coverage, "complete", "coverage", errors)
        if not isinstance(complete, bool):
            errors.append("coverage.complete must be boolean")
            complete = None
        gaps = _required(coverage, "gaps", "coverage", errors)
        if not isinstance(gaps, list):
            errors.append("coverage.gaps must be a list")
            gaps = None
        else:
            for index, gap in enumerate(gaps):
                if isinstance(gap, dict):
                    _allowed_keys(gap, f"coverage.gaps[{index}]", GAP_KEYS, errors)
                    _validate_scalar_fields(gap, f"coverage.gaps[{index}]", errors)
                    if not _visible_gap([gap]):
                        errors.append(f"coverage.gaps[{index}] must be visibly described")
                elif not isinstance(gap, str):
                    errors.append(f"coverage.gaps[{index}] must be a string or mapping")
                elif not gap.strip():
                    errors.append(f"coverage.gaps[{index}] must be visibly described")
        complete_through = coverage.get("complete_through")
        if complete_through is not None and not isinstance(complete_through, str):
            errors.append("coverage.complete_through must be a string or null")
        if "exclusions" in coverage:
            exclusions = coverage["exclusions"]
            if not isinstance(exclusions, list) or any(
                not isinstance(item, str) for item in exclusions
            ):
                errors.append("coverage.exclusions must be a list of strings")

    extraction = _mapping(frontmatter.get("extraction"), "extraction", errors)
    adapter_state: dict[str, Any] | None = None
    adapter_version: Any = source.get("adapter_version") if source is not None else None
    guard_facts: dict[str, Any] | None = None
    if extraction is not None:
        _allowed_keys(extraction, "extraction", EXTRACTION_KEYS, errors)
        raw_state = _required(extraction, "adapter_state_json", "extraction", errors)
        if frontmatter_parser.scalar_styles.get("extraction.adapter_state_json") != "|-":
            errors.append("extraction.adapter_state_json must use an actual YAML |- block scalar")
        if not isinstance(raw_state, str) or not raw_state:
            errors.append("extraction.adapter_state_json must be a non-empty JSON string")
        else:
            whitespace_index = _json_whitespace_outside_string(raw_state)
            if whitespace_index is not None:
                errors.append(
                    "extraction.adapter_state_json must not contain whitespace outside JSON strings "
                    f"(character {whitespace_index})"
                )
            try:
                parsed_state = json.loads(
                    raw_state,
                    parse_constant=_reject_json_constant,
                    object_pairs_hook=_json_object_without_duplicates,
                )
            except json.JSONDecodeError as error:
                errors.append(
                    f"extraction.adapter_state_json is not valid JSON at character {error.pos}: {error.msg}"
                )
            except ValueError as error:
                errors.append(f"extraction.adapter_state_json is not valid standard JSON: {error}")
            else:
                if not isinstance(parsed_state, dict):
                    errors.append("extraction.adapter_state_json must contain a JSON object")
                else:
                    adapter_state = parsed_state
        for key in ("compactions", "children", "nonterminal"):
            if key in extraction:
                _validate_descriptive_list(extraction[key], f"extraction.{key}", errors)
        for key in ("final_message", "final_part"):
            if key in extraction:
                _validate_descriptive_value(extraction[key], f"extraction.{key}", errors)
        if source_session_id is not None:
            guard_facts = _validate_guards(
                extraction,
                source_session_id,
                errors,
            )

    if harness == "opencode" and source_session_id is not None and adapter_state is not None:
        _validate_opencode_state(adapter_state, source_session_id, adapter_version, guard_facts, errors)
    elif harness != "opencode" and source_session_id is not None and guard_facts is not None:
        if source_session_id not in (guard_facts["sessions"] or {}):
            errors.append(
                f"extraction.guards.sessions must include source session {source_session_id}"
            )

    if source_session_id is not None and guard_facts is not None:
        _validate_truth_table(
            activity,
            evidence_state,
            movement,
            complete,
            gaps,
            source_session_id,
            guard_facts,
            errors,
        )

    _validate_narrative(body, harness, errors)
    return errors


def validate_path(path: str | Path) -> list[str]:
    """Return validation errors for a Markdown path."""

    document = Path(path)
    try:
        text = document.read_text(encoding="utf-8")
    except OSError as error:
        return [f"unable to read {document}: {error}"]
    except UnicodeError as error:
        return [f"unable to decode {document} as UTF-8: {error}"]
    return validate_text(text)


def main(argv: list[str] | None = None) -> int:
    if argv is None:
        argv = sys.argv[1:]
    if len(argv) != 1:
        print(f"usage: {Path(sys.argv[0]).name} PATH", file=sys.stderr)
        return 2
    path = Path(argv[0])
    errors = validate_path(path)
    if errors:
        for error in errors:
            print(f"{path}: error: {error}", file=sys.stderr)
        return 1
    print(f"{path}: valid")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
