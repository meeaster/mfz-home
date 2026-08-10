#!/usr/bin/env python3
"""Inject the exact compact Bundle next_state into a Session Brief."""

from __future__ import annotations

import json
import os
import stat
import sys
import tempfile
from pathlib import Path
from typing import Any


MARKER = b"  adapter_state_json: |-"
INDENT = b"    "
DELIMITER = b"---"
CONTROLLED_KEYS = (b"extraction", b"adapter_state_json")


class InjectionError(ValueError):
    """An input or controlled-block error that is safe to report to a user."""


def _reject_json_constant(value: str) -> None:
    raise ValueError(f"nonstandard JSON constant {value}")


def _object_without_duplicates(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f"duplicate JSON object key {key!r}")
        result[key] = value
    return result


def _read_bundle_state(path: Path) -> str:
    try:
        raw = path.read_bytes()
    except OSError as error:
        raise InjectionError(f"unable to read Bundle output {path}: {error}") from error
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError as error:
        raise InjectionError(f"Bundle output {path} is not valid UTF-8: {error}") from error

    try:
        bundle = json.loads(
            text,
            parse_constant=_reject_json_constant,
            object_pairs_hook=_object_without_duplicates,
        )
    except json.JSONDecodeError as error:
        raise InjectionError(
            f"Bundle output {path} is not valid JSON: {error.msg} "
            f"at line {error.lineno}, column {error.colno}"
        ) from error
    except ValueError as error:
        raise InjectionError(f"Bundle output {path} is not valid standard JSON: {error}") from error

    if not isinstance(bundle, dict):
        raise InjectionError(
            f"Bundle output {path} must be a JSON object containing top-level next_state"
        )
    if "next_state" not in bundle:
        raise InjectionError(f'Bundle output {path} is missing top-level "next_state"')
    next_state = bundle["next_state"]
    if not isinstance(next_state, dict):
        raise InjectionError(f'Bundle output {path} top-level "next_state" must be a JSON object')

    try:
        return json.dumps(next_state, separators=(",", ":"))
    except (TypeError, ValueError) as error:
        raise InjectionError(f'Bundle output {path} "next_state" cannot be serialized: {error}') from error


def _line_content(line: bytes) -> bytes:
    if line.endswith(b"\n"):
        line = line[:-1]
        if line.endswith(b"\r"):
            line = line[:-1]
    elif line.endswith(b"\r"):
        line = line[:-1]
    return line


def _syntactic_key_declaration(content: bytes) -> tuple[bytes, bytes] | None:
    stripped = content.lstrip(b" \t")
    if not stripped or stripped.startswith(b"#"):
        return None
    indentation = content[: len(content) - len(stripped)]
    for key in CONTROLLED_KEYS:
        if not stripped.startswith(key):
            continue
        suffix = stripped[len(key) :]
        if suffix.lstrip(b" \t").startswith(b":"):
            return key, indentation
    return None


def _is_frontmatter_mapping_line(content: bytes) -> bool:
    if not content.startswith(b"  ") or len(content) <= 2:
        return False
    if content[2:3] in {b" ", b"\t"}:
        return False
    mapping = content[2:]
    if mapping.startswith(b"#"):
        return False
    key, separator, _ = mapping.partition(b":")
    return bool(separator and key.strip())


def _state_line_index(document: bytes, path: Path) -> tuple[list[bytes], int]:
    lines = document.splitlines(keepends=True)
    if not lines or _line_content(lines[0]) != DELIMITER:
        raise InjectionError(f"brief {path} must start with a frontmatter delimiter ---")

    closing_index = next(
        (index for index, line in enumerate(lines[1:], start=1) if _line_content(line) == DELIMITER),
        None,
    )
    if closing_index is None:
        raise InjectionError(f"brief {path} has no closing frontmatter delimiter ---")

    declarations: list[tuple[int, bytes, bytes]] = []
    for index, line in enumerate(lines[1:closing_index], start=1):
        declaration = _syntactic_key_declaration(_line_content(line))
        if declaration is not None:
            key, indentation = declaration
            declarations.append((index, key, indentation))

    extraction_declarations = [
        declaration for declaration in declarations if declaration[1] == b"extraction"
    ]
    if len(extraction_declarations) != 1:
        raise InjectionError(
            f"brief {path} must contain exactly one frontmatter extraction declaration; "
            f"found {len(extraction_declarations)}"
        )
    extraction_index, _, extraction_indentation = extraction_declarations[0]
    extraction_content = _line_content(lines[extraction_index])
    if extraction_indentation != b"" or extraction_content != b"extraction:":
        raise InjectionError(
            f"brief {path} extraction declaration must be exactly top-level `extraction:`"
        )

    adapter_declarations = [
        declaration for declaration in declarations if declaration[1] == b"adapter_state_json"
    ]
    if len(adapter_declarations) != 1:
        raise InjectionError(
            f"brief {path} must contain exactly one frontmatter adapter_state_json declaration; "
            f"found {len(adapter_declarations)}"
        )
    marker_index, _, marker_indentation = adapter_declarations[0]
    marker_content = _line_content(lines[marker_index])
    if marker_indentation != b"  " or marker_content != MARKER:
        raise InjectionError(
            f"brief {path} adapter_state_json declaration must be exactly `  adapter_state_json: |-`"
        )
    if marker_index != extraction_index + 1:
        raise InjectionError(
            f"brief {path} has ambiguous frontmatter around the controlled adapter-state marker"
        )

    exact_marker_indices = [
        index for index, line in enumerate(lines) if _line_content(line) == MARKER
    ]
    if len(exact_marker_indices) != 1 or exact_marker_indices[0] != marker_index:
        raise InjectionError(
            f"brief {path} must contain exactly one controlled {MARKER.decode()} marker; "
            f"found {len(exact_marker_indices)}"
        )

    state_index = marker_index + 1
    if state_index >= closing_index:
        raise InjectionError(
            f"brief {path} adapter_state_json must have exactly one indented content line"
        )
    state_content = _line_content(lines[state_index])
    if not state_content.startswith(INDENT) or state_content[4:5] in {b" ", b"\t"}:
        raise InjectionError(
            f"brief {path} adapter_state_json must have exactly one content line indented by four spaces"
        )

    following_index = state_index + 1
    if following_index < closing_index:
        following_content = _line_content(lines[following_index])
        if not _is_frontmatter_mapping_line(following_content):
            raise InjectionError(
                f"brief {path} adapter_state_json must be a one-line block; "
                "found a blank, continuation, or unexpected frontmatter line after it"
            )

    return lines, state_index


def _replace_state(document: bytes, path: Path, compact_state: str) -> bytes:
    lines, state_index = _state_line_index(document, path)
    old_line = lines[state_index]
    old_content = _line_content(old_line)
    line_ending = old_line[len(old_content) :]
    new_line = INDENT + compact_state.encode("ascii") + line_ending
    lines[state_index] = new_line
    return b"".join(lines)


def _atomic_write(path: Path, document: bytes) -> None:
    try:
        mode = stat.S_IMODE(path.stat().st_mode)
    except OSError as error:
        raise InjectionError(f"unable to inspect brief {path} before writing: {error}") from error

    temporary_path: str | None = None
    try:
        descriptor, temporary_path = tempfile.mkstemp(
            dir=str(path.parent), prefix=f".{path.name}.", suffix=".tmp"
        )
        with os.fdopen(descriptor, "wb") as handle:
            handle.write(document)
            handle.flush()
            os.fsync(handle.fileno())
        os.chmod(temporary_path, mode)
        os.replace(temporary_path, path)
        temporary_path = None
    except OSError as error:
        raise InjectionError(f"unable to atomically update brief {path}: {error}") from error
    finally:
        if temporary_path is not None:
            try:
                os.unlink(temporary_path)
            except OSError:
                pass


def main(argv: list[str] | None = None) -> int:
    if argv is None:
        argv = sys.argv[1:]
    if len(argv) != 2:
        print(f"usage: {Path(sys.argv[0]).name} BRIEF_PATH BUNDLE_OUTPUT_PATH", file=sys.stderr)
        return 2

    brief_path = Path(argv[0])
    bundle_path = Path(argv[1])
    try:
        if brief_path.is_symlink():
            raise InjectionError(
                f"brief {brief_path} is a symlink; refusing to follow or replace it"
            )
        compact_state = _read_bundle_state(bundle_path)
        try:
            brief_document = brief_path.read_bytes()
        except OSError as error:
            raise InjectionError(f"unable to read brief {brief_path}: {error}") from error
        try:
            brief_document.decode("utf-8")
        except UnicodeDecodeError as error:
            raise InjectionError(f"brief {brief_path} is not valid UTF-8: {error}") from error
        updated_document = _replace_state(brief_document, brief_path, compact_state)
        if updated_document == brief_document:
            print(f"{brief_path}: unchanged (adapter state already matches Bundle next_state)")
            return 0
        _atomic_write(brief_path, updated_document)
    except InjectionError as error:
        print(f"error: {error}", file=sys.stderr)
        return 1

    print(f"{brief_path}: updated adapter state from Bundle next_state")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
