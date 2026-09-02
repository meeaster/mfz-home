from __future__ import annotations

import contextlib
import importlib.util
import io
import json
import os
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).parents[4] / "skills/active/session-brief/scripts/set-adapter-state.py"
SPEC = importlib.util.spec_from_file_location("set_adapter_state", SCRIPT)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError("unable to load adapter-state helper")
HELPER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(HELPER)


PREFIX = b"""---
kind: session-brief
state_version: 2
source:
  harness: opencode
  session_id: ses_parent
  adapter_version: 2
extraction:
  adapter_state_json: |-
"""
SUFFIX = b"""  guards: {}
---
## Purpose And Context
Purpose.
## Current State
State.
## Extraction History
History.
"""


def brief_bytes(state: bytes = b'{"old":1}') -> bytes:
    return PREFIX + b"    " + state + b"\n" + SUFFIX


def adapter_bytes(checkpoint: object) -> bytes:
    return json.dumps({"checkpoint": checkpoint}, separators=(",", ":")).encode() + b"\n"


class SetAdapterStateTest(unittest.TestCase):
    def run_helper(self, brief: Path, output: Path) -> tuple[int, str, str]:
        stdout = io.StringIO()
        stderr = io.StringIO()
        with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
            result = HELPER.main([str(brief), str(output)])
        return result, stdout.getvalue(), stderr.getvalue()

    def fixture(
        self,
        directory: str,
        *,
        brief: bytes | None = None,
        output: bytes | None = None,
    ) -> tuple[Path, Path]:
        brief_path = Path(directory) / "brief.md"
        output_path = Path(directory) / "adapter.json"
        brief_path.write_bytes(brief if brief is not None else brief_bytes())
        output_path.write_bytes(output if output is not None else adapter_bytes({"version": 2}))
        return brief_path, output_path

    def test_exact_checkpoint_transport_and_final_newline(self) -> None:
        checkpoint = {"version": 2, "unicode": "café", "nested": {"value": True}}
        expected = json.dumps(checkpoint, separators=(",", ":")).encode("ascii")
        with tempfile.TemporaryDirectory() as directory:
            brief, output = self.fixture(directory, output=adapter_bytes(checkpoint))
            before = brief.read_bytes()
            result, stdout, stderr = self.run_helper(brief, output)
            after = brief.read_bytes()
        self.assertEqual(0, result)
        self.assertIn("updated adapter state from checkpoint", stdout)
        self.assertEqual("", stderr)
        self.assertEqual(before.replace(b'    {"old":1}\n', b"    " + expected + b"\n"), after)
        self.assertTrue(after.endswith(b"\n"))

    def test_equal_checkpoint_is_noop_without_rewrite(self) -> None:
        checkpoint = {"version": 2, "same": [1, 2]}
        state = json.dumps(checkpoint, separators=(",", ":")).encode("ascii")
        with tempfile.TemporaryDirectory() as directory:
            brief, output = self.fixture(
                directory, brief=brief_bytes(state), output=adapter_bytes(checkpoint)
            )
            before = os.stat(brief)
            result, stdout, stderr = self.run_helper(brief, output)
            after = os.stat(brief)
        self.assertEqual(0, result)
        self.assertIn("unchanged", stdout)
        self.assertEqual("", stderr)
        self.assertEqual(before.st_ino, after.st_ino)
        self.assertEqual(before.st_mtime_ns, after.st_mtime_ns)

    def test_missing_or_nonobject_checkpoint_does_not_write(self) -> None:
        for payload in ({}, {"checkpoint": []}, {"checkpoint": None}):
            with self.subTest(payload=payload), tempfile.TemporaryDirectory() as directory:
                brief, output = self.fixture(
                    directory, output=json.dumps(payload).encode()
                )
                before = brief.read_bytes()
                result, _, stderr = self.run_helper(brief, output)
                self.assertEqual(1, result)
                self.assertIn("checkpoint", stderr)
                self.assertEqual(before, brief.read_bytes())

    def test_malformed_marker_and_multiline_block_do_not_write(self) -> None:
        documents = (
            brief_bytes().replace(b"  adapter_state_json: |-\n", b"  adapter_state_json: |\n"),
            brief_bytes().replace(b'    {"old":1}\n', b'    {"old":1}\n    {"extra":2}\n'),
            brief_bytes().replace(
                b"  guards: {}\n",
                b'  adapter_state_json: |-\n    {"duplicate":true}\n  guards: {}\n',
            ),
        )
        for document in documents:
            with self.subTest(document=document), tempfile.TemporaryDirectory() as directory:
                brief, output = self.fixture(directory, brief=document)
                before = brief.read_bytes()
                result, _, stderr = self.run_helper(brief, output)
                self.assertEqual(1, result)
                self.assertIn("brief", stderr)
                self.assertEqual(before, brief.read_bytes())

    def test_symlink_and_utf8_fail_without_writes(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "target.md"
            link = Path(directory) / "brief.md"
            output = Path(directory) / "adapter.json"
            target.write_bytes(brief_bytes())
            link.symlink_to(target.name)
            output.write_bytes(adapter_bytes({"version": 2}))
            before = target.read_bytes()
            result, _, stderr = self.run_helper(link, output)
            self.assertEqual(1, result)
            self.assertIn("symlink", stderr)
            self.assertEqual(before, target.read_bytes())

        with tempfile.TemporaryDirectory() as directory:
            brief, output = self.fixture(directory, brief=brief_bytes() + b"\xff")
            before = brief.read_bytes()
            result, _, stderr = self.run_helper(brief, output)
            self.assertEqual(1, result)
            self.assertIn("UTF-8", stderr)
            self.assertEqual(before, brief.read_bytes())


if __name__ == "__main__":
    unittest.main()
