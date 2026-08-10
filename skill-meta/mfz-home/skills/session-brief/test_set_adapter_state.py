from __future__ import annotations

import contextlib
import importlib.util
import io
import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).parents[4] / "skills/active/session-brief/scripts/set-adapter-state.py"
SCRIPT_SPEC = importlib.util.spec_from_file_location("set_adapter_state", SCRIPT)
if SCRIPT_SPEC is None or SCRIPT_SPEC.loader is None:
    raise RuntimeError("unable to load Session Brief adapter-state helper")
HELPER = importlib.util.module_from_spec(SCRIPT_SPEC)
SCRIPT_SPEC.loader.exec_module(HELPER)

VALIDATOR_SCRIPT = Path(__file__).parents[4] / "skills/active/session-brief/scripts/validate-session-brief.py"
VALIDATOR_SPEC = importlib.util.spec_from_file_location("validate_session_brief", VALIDATOR_SCRIPT)
if VALIDATOR_SPEC is None or VALIDATOR_SPEC.loader is None:
    raise RuntimeError("unable to load Session Brief validator")
VALIDATOR = importlib.util.module_from_spec(VALIDATOR_SPEC)
VALIDATOR_SPEC.loader.exec_module(VALIDATOR)


BRIEF_PREFIX = b"""---
kind: session-brief
state_version: 2
source:
  harness: opencode
  session_id: ses_parent
extraction:
  adapter_state_json: |-
"""
BRIEF_SUFFIX = b"""  guards: {}
---
## Purpose And Context
Purpose.
## Current State
State.
## Extraction History
History.
"""


def brief_bytes(state_line: bytes = b'{"old":1}') -> bytes:
    return BRIEF_PREFIX + b"    " + state_line + b"\n" + BRIEF_SUFFIX


def bundle_bytes(state: object) -> bytes:
    return json.dumps({"next_state": state}, separators=(",", ":")).encode("utf-8") + b"\n"


class SetAdapterStateTest(unittest.TestCase):
    def run_helper(self, brief: Path, bundle: Path) -> tuple[int, str, str]:
        stdout = io.StringIO()
        stderr = io.StringIO()
        with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
            result = HELPER.main([str(brief), str(bundle)])
        return result, stdout.getvalue(), stderr.getvalue()

    def write_fixture(
        self, directory: str, *, brief_document: bytes | None = None, bundle_document: bytes | None = None
    ) -> tuple[Path, Path]:
        brief = Path(directory) / "brief.md"
        bundle = Path(directory) / "bundle.json"
        brief.write_bytes(brief_document if brief_document is not None else brief_bytes())
        bundle.write_bytes(bundle_document if bundle_document is not None else bundle_bytes({"new": 2}))
        return brief, bundle

    def test_replaces_only_state_line_and_preserves_final_newline(self) -> None:
        state = {"version": 1, "source_identity": "123:456", "known_child_ids": ["ses_child"]}
        expected_state = json.dumps(state, separators=(",", ":"))
        with tempfile.TemporaryDirectory() as directory:
            brief, bundle = self.write_fixture(directory, bundle_document=bundle_bytes(state))
            before = brief.read_bytes()
            result, stdout, stderr = self.run_helper(brief, bundle)
            after = brief.read_bytes()

        self.assertEqual(0, result)
        self.assertIn("updated adapter state", stdout)
        self.assertEqual("", stderr)
        self.assertEqual(
            before.replace(
                b'    {"old":1}\n',
                b"    " + expected_state.encode("ascii") + b"\n",
                1,
            ),
            after,
        )
        self.assertTrue(after.endswith(b"\n"))

    def test_identical_state_is_unchanged_without_rewrite(self) -> None:
        state = {"same": [1, 2, 3], "nested": {"value": True}}
        with tempfile.TemporaryDirectory() as directory:
            brief, bundle = self.write_fixture(
                directory,
                brief_document=brief_bytes(json.dumps(state, separators=(",", ":")).encode("ascii")),
                bundle_document=bundle_bytes(state),
            )
            before_bytes = brief.read_bytes()
            before_stat = os.stat(brief)
            result, stdout, stderr = self.run_helper(brief, bundle)
            after_stat = os.stat(brief)

            self.assertEqual(before_bytes, brief.read_bytes())

        self.assertEqual(0, result)
        self.assertIn("unchanged", stdout)
        self.assertEqual("", stderr)
        self.assertEqual(before_stat.st_mtime_ns, after_stat.st_mtime_ns)
        self.assertEqual(before_stat.st_ino, after_stat.st_ino)

    def test_malformed_bundle_json_does_not_write(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            brief, bundle = self.write_fixture(directory, bundle_document=b'{"next_state":')
            before = brief.read_bytes()
            result, stdout, stderr = self.run_helper(brief, bundle)

            self.assertEqual(before, brief.read_bytes())

        self.assertEqual(1, result)
        self.assertEqual("", stdout)
        self.assertIn("not valid JSON", stderr)

    def test_non_utf8_brief_does_not_write(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            brief, bundle = self.write_fixture(directory, brief_document=brief_bytes() + b"\xff")
            before = brief.read_bytes()
            result, stdout, stderr = self.run_helper(brief, bundle)

            self.assertEqual(before, brief.read_bytes())

        self.assertEqual(1, result)
        self.assertEqual("", stdout)
        self.assertIn("not valid UTF-8", stderr)

    def test_missing_or_nonobject_next_state_does_not_write(self) -> None:
        cases = ({}, {"next_state": []}, {"next_state": None})
        for payload in cases:
            with self.subTest(payload=payload), tempfile.TemporaryDirectory() as directory:
                brief, bundle = self.write_fixture(
                    directory,
                    bundle_document=json.dumps(payload, separators=(",", ":")).encode("ascii"),
                )
                before = brief.read_bytes()
                result, stdout, stderr = self.run_helper(brief, bundle)

                self.assertEqual(1, result)
                self.assertEqual("", stdout)
                self.assertIn("next_state", stderr)
                self.assertEqual(before, brief.read_bytes())

    def test_missing_or_duplicate_marker_does_not_write(self) -> None:
        cases = (
            brief_bytes().replace(b"  adapter_state_json: |-\n", b"  adapter_state_json: |\n"),
            brief_bytes().replace(
                b"  guards: {}\n",
                b"  adapter_state_json: |-\n    {\"duplicate\":true}\n  guards: {}\n",
            ),
        )
        for document in cases:
            with self.subTest(document=document), tempfile.TemporaryDirectory() as directory:
                brief, bundle = self.write_fixture(directory, brief_document=document)
                before = brief.read_bytes()
                result, stdout, stderr = self.run_helper(brief, bundle)

                self.assertEqual(1, result)
                self.assertEqual("", stdout)
                self.assertIn("brief", stderr)
                self.assertEqual(before, brief.read_bytes())

    def test_syntactic_controlled_key_variants_are_rejected(self) -> None:
        cases = (
            brief_bytes().replace(b"extraction:\n", b"extraction:  \n"),
            brief_bytes().replace(
                b"  adapter_state_json: |-\n", b"  adapter_state_json: |- \n"
            ),
            brief_bytes().replace(
                b"  adapter_state_json: |-\n", b"  adapter_state_json: |\n"
            ),
            brief_bytes().replace(
                b"  adapter_state_json: |-\n", b"  adapter_state_json: |- # comment\n"
            ),
            brief_bytes().replace(
                b"  adapter_state_json: |-\n", b"   adapter_state_json: |-\n"
            ),
            brief_bytes().replace(
                b"  guards: {}\n",
                b"  adapter_state_json: |- \n    {\"duplicate\":true}\n  guards: {}\n",
            ),
            brief_bytes().replace(b"extraction:\n", b"extraction:\nextraction:\n"),
        )
        for document in cases:
            with self.subTest(document=document), tempfile.TemporaryDirectory() as directory:
                brief, bundle = self.write_fixture(directory, brief_document=document)
                before = brief.read_bytes()
                result, stdout, stderr = self.run_helper(brief, bundle)

                self.assertEqual(1, result)
                self.assertEqual("", stdout)
                self.assertIn("brief", stderr)
                self.assertEqual(before, brief.read_bytes())

    def test_malformed_or_multiline_block_does_not_write(self) -> None:
        cases = (
            brief_bytes().replace(b'    {"old":1}\n', b'     {"old":1}\n'),
            brief_bytes().replace(
                b'    {"old":1}\n', b'    {"old":1}\n    {"second":2}\n'
            ),
            brief_bytes().replace(b'    {"old":1}\n', b"\n"),
        )
        for document in cases:
            with self.subTest(document=document), tempfile.TemporaryDirectory() as directory:
                brief, bundle = self.write_fixture(directory, brief_document=document)
                before = brief.read_bytes()
                result, stdout, stderr = self.run_helper(brief, bundle)

                self.assertEqual(1, result)
                self.assertEqual("", stdout)
                self.assertIn("adapter_state_json", stderr)
                self.assertEqual(before, brief.read_bytes())

    def test_unicode_and_escapes_are_serialized_with_compact_json(self) -> None:
        bundle_document = (
            r'{"next_state":{"unicode":"caf\u00e9","newline":"line\nbreak",'
            r'"slash":"\/","quote":"\""}}'
        ).encode("utf-8")
        expected = json.dumps(
            {
                "unicode": "café",
                "newline": "line\nbreak",
                "slash": "/",
                "quote": '"',
            },
            separators=(",", ":"),
        )
        with tempfile.TemporaryDirectory() as directory:
            brief, bundle = self.write_fixture(directory, bundle_document=bundle_document)
            result, stdout, stderr = self.run_helper(brief, bundle)
            after = brief.read_bytes()

        self.assertEqual(0, result)
        self.assertIn(expected.encode("ascii"), after)
        self.assertEqual("", stderr)

    def test_source_fingerprint_typo_is_replaced_exactly(self) -> None:
        correct = "sha256:" + "a" * 64
        typo = "sha256:" + "a" * 63 + "b"
        state = {
            "version": 1,
            "sessions": {
                "ses_parent": {
                    "prefix_fingerprints": {
                        "message_created": correct,
                        "part_created": correct,
                    }
                }
            },
        }
        old_state = json.dumps(
            {
                "version": 1,
                "sessions": {
                    "ses_parent": {
                        "prefix_fingerprints": {
                            "message_created": typo,
                            "part_created": typo,
                        }
                    }
                },
            },
            separators=(",", ":"),
        ).encode("ascii")
        with tempfile.TemporaryDirectory() as directory:
            brief, bundle = self.write_fixture(
                directory, brief_document=brief_bytes(old_state), bundle_document=bundle_bytes(state)
            )
            result, stdout, stderr = self.run_helper(brief, bundle)
            state_line = brief.read_bytes().split(b"  adapter_state_json: |-\n", 1)[1].split(
                b"\n", 1
            )[0].decode("ascii")[4:]

        self.assertEqual(0, result)
        self.assertEqual(json.dumps(state, separators=(",", ":")), state_line)
        self.assertIn(correct, state_line)
        self.assertNotIn(typo, state_line)
        self.assertEqual("", stderr)

    def test_changed_state_symlink_is_rejected_without_touching_link_or_target(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "target.md"
            link = Path(directory) / "brief.md"
            bundle = Path(directory) / "bundle.json"
            target.write_bytes(brief_bytes())
            link.symlink_to(target.name)
            bundle.write_bytes(bundle_bytes({"new": 2}))
            target_before = target.read_bytes()
            target_stat_before = os.stat(target)
            link_stat_before = os.lstat(link)
            link_target_before = os.readlink(link)

            result, stdout, stderr = self.run_helper(link, bundle)

            self.assertEqual(1, result)
            self.assertEqual("", stdout)
            self.assertIn("is a symlink", stderr)
            self.assertTrue(link.is_symlink())
            self.assertEqual(link_target_before, os.readlink(link))
            self.assertEqual(link_stat_before.st_ino, os.lstat(link).st_ino)
            self.assertEqual(target_before, target.read_bytes())
            self.assertEqual(target_stat_before.st_ino, os.stat(target).st_ino)
            self.assertEqual(target_stat_before.st_mtime_ns, os.stat(target).st_mtime_ns)

    def test_validator_public_path_and_cli_report_non_utf8_brief(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            brief = Path(directory) / "brief.md"
            brief.write_bytes(b"---\n\xff\n---\n")
            errors = VALIDATOR.validate_path(brief)
            completed = subprocess.run(
                [sys.executable, str(VALIDATOR_SCRIPT), str(brief)],
                capture_output=True,
                text=True,
                check=False,
            )

        self.assertTrue(any("UTF-8" in error for error in errors), errors)
        self.assertEqual(1, completed.returncode)
        self.assertIn("UTF-8", completed.stderr)
        self.assertNotIn("Traceback", completed.stderr)
        self.assertEqual("", completed.stdout)

    def test_cli_returns_actionable_nonzero_error(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            brief, bundle = self.write_fixture(directory, bundle_document=b"{}")
            completed = subprocess.run(
                [sys.executable, str(SCRIPT), str(brief), str(bundle)],
                capture_output=True,
                text=True,
                check=False,
            )

        self.assertNotEqual(0, completed.returncode)
        self.assertIn("next_state", completed.stderr)
        self.assertEqual("", completed.stdout)


if __name__ == "__main__":
    unittest.main()
