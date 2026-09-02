from __future__ import annotations

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).parents[4] / "skills/active/session-brief/scripts/validate-session-brief.py"
SPEC = importlib.util.spec_from_file_location("validate_session_brief", SCRIPT)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError("unable to load Session Brief validator")
VALIDATOR = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(VALIDATOR)


FINGERPRINT = "sha256:" + "0" * 64


def session_state(*, populated: bool) -> dict[str, object]:
    return {
        "terminal_seq": 4 if populated else -1,
        "message_count": 4 if populated else 0,
        "max_message_updated": 40 if populated else 0,
        "session_updated": 50 if populated else 2,
        "latest_completed_compaction_seq": 3 if populated else None,
        "active_context_start_seq": 3 if populated else None,
        "prefix_guard": FINGERPRINT,
        "metadata_guard": FINGERPRINT,
        "fork_provenance": None,
    }


def opencode_checkpoint() -> dict[str, object]:
    return {
        "adapter": "opencode-session-evidence",
        "version": 2,
        "source": {
            "identity": "123:456",
            "database": "/safe/opencode.db",
            "schema": "v2",
        },
        "parent_session_id": "ses_parent",
        "known_child_ids": ["ses_child"],
        "topology_guard": FINGERPRINT,
        "sessions": {
            "ses_parent": session_state(populated=True),
            "ses_child": session_state(populated=False),
        },
        "event_watermarks": {"ses_parent": 9, "ses_child": None},
        "inbox_watermarks": {"ses_parent": 5, "ses_child": None},
    }


DEFAULT_BODY = """## Purpose And Context
The session established a bounded implementation context.
## Current State
The pinned work is represented by this brief.
## Extraction History
- Created from an OpenCode V2 snapshot.
"""


def artifact(
    *,
    state: dict[str, object] | None = None,
    raw_state: str | None = None,
    harness: str = "opencode",
    adapter_version: int | None = None,
    activity: str = "active",
    evidence: str = "accepted",
    movement: str = "not-observed",
    complete: bool = True,
    gaps: list[object] | None = None,
    overall: str = "accepted",
    guard_sessions: dict[str, str] | None = None,
    body: str = DEFAULT_BODY,
) -> str:
    if state is None:
        state = opencode_checkpoint() if harness == "opencode" else {"version": 7, "offset": 42}
    if raw_state is None:
        raw_state = json.dumps(state, separators=(",", ":"))
    if adapter_version is None:
        adapter_version = 2 if harness == "opencode" else 7
    if gaps is None:
        gaps = []
    if guard_sessions is None:
        guard_sessions = {"ses_parent": "accepted"}
        if harness == "opencode":
            guard_sessions["ses_child"] = "accepted"
    gap_lines = " []" if not gaps else "\n" + "\n".join(f"    - {gap}" for gap in gaps)
    guards: list[str] = []
    for session_id, status in guard_sessions.items():
        guards.extend([f"      {session_id}:", f"        status: {status}"])
        if status == "rejected":
            guards.append("        reason: checkpoint guard failed")
    return f"""---
kind: session-brief
state_version: 2
title: Validator fixture
source:
  harness: {harness}
  session_id: ses_parent
  kind: test-store
  adapter_version: {adapter_version}
brief:
  created_at: 2026-09-02T00:00:00Z
  updated_at: 2026-09-02T00:01:00Z
  source_activity_at_pin: {activity}
  evidence_state_at_pin: {evidence}
  post_pin_movement: {movement}
coverage:
  mode: reconstruct
  complete_through: seq:4
  complete: {str(complete).lower()}
  gaps:{gap_lines}
  exclusions: []
extraction:
  adapter_state_json: |-
    {raw_state}
  guards:
    overall: {overall}
    sessions:
{chr(10).join(guards)}
  compactions: []
  children: []
  nonterminal: []
  final_message: null
  final_part: null
---
{body}"""


class SessionBriefValidatorTest(unittest.TestCase):
    def assert_valid(self, document: str) -> None:
        self.assertEqual([], VALIDATOR.validate_text(document))

    def assert_invalid(self, document: str, fragment: str) -> None:
        errors = VALIDATOR.validate_text(document)
        self.assertTrue(any(fragment in error for error in errors), errors)

    def test_valid_opencode_v2_checkpoint_and_locator(self) -> None:
        body = """## Purpose And Context
Purpose.
## Current State
State.
## Decisions
- The parent user accepted the scope. [source: parent/session=ses_parent;seq=1;message=msg_user]
## Corrections And Preferences
- The parent user corrected the output. [source: parent/session=ses_parent;seq=1;message=msg_user;content-index=0]
## Extraction History
- Created.
"""
        self.assert_valid(artifact(body=body))

    def test_valid_non_opencode_state_and_native_locator(self) -> None:
        body = """## Purpose And Context
Purpose.
## Current State
State.
## Decisions
- The user accepted the scope. [source: parent/file=session.jsonl;offset=42]
## Extraction History
- Created.
"""
        self.assert_valid(artifact(harness="claude", body=body))

    def test_legacy_and_unknown_opencode_state_require_rebuild(self) -> None:
        legacy = {
            "version": 1,
            "source_identity": "123:456",
            "parent_session_id": "ses_parent",
            "known_child_ids": [],
            "sessions": {},
        }
        self.assert_invalid(
            artifact(state=legacy, adapter_version=1), "full rebuild required"
        )
        unknown = opencode_checkpoint()
        unknown["version"] = 99
        self.assert_invalid(
            artifact(state=unknown, adapter_version=99), "adapter version must be 2"
        )

    def test_checkpoint_topology_and_session_guards(self) -> None:
        parent_child = opencode_checkpoint()
        parent_child["known_child_ids"] = ["ses_parent"]
        self.assert_invalid(artifact(state=parent_child), "must not contain the parent")

        mismatch = opencode_checkpoint()
        del mismatch["sessions"]["ses_child"]  # type: ignore[index]
        self.assert_invalid(artifact(state=mismatch), "must exactly match")

        malformed = opencode_checkpoint()
        malformed["sessions"]["ses_parent"]["terminal_seq"] = True  # type: ignore[index]
        self.assert_invalid(artifact(state=malformed), "terminal_seq must be an integer")

        fingerprint = opencode_checkpoint()
        fingerprint["sessions"]["ses_parent"]["prefix_guard"] = "sha256:bad"  # type: ignore[index]
        self.assert_invalid(artifact(state=fingerprint), "prefix_guard must use sha256")

    def test_compaction_boundary_and_watermarks_are_validated(self) -> None:
        movement = opencode_checkpoint()
        movement["sessions"]["ses_parent"]["active_context_start_seq"] = 2  # type: ignore[index]
        self.assert_invalid(artifact(state=movement), "must match latest_completed_compaction_seq")

        watermark = opencode_checkpoint()
        watermark["event_watermarks"]["ses_parent"] = -1  # type: ignore[index]
        self.assert_invalid(artifact(state=watermark), "nonnegative integers or null")

    def test_truth_table_accepts_movement_and_rejects_false_completeness(self) -> None:
        self.assert_valid(
            artifact(
                movement="detected",
                complete=False,
                gaps=["post-pin movement"],
            )
        )
        self.assert_invalid(
            artifact(movement="detected", gaps=["post-pin movement"]),
            "coverage.complete true requires post_pin_movement not-observed",
        )
        self.assert_valid(
            artifact(
                evidence="partially-accepted",
                complete=False,
                gaps=["child checkpoint rejected"],
                overall="rejected",
                guard_sessions={"ses_parent": "accepted", "ses_child": "rejected"},
            )
        )

    def test_missing_source_requires_rejected_parent(self) -> None:
        self.assert_valid(
            artifact(
                activity="missing",
                evidence="rejected",
                complete=False,
                gaps=["parent missing"],
                overall="rejected",
                guard_sessions={"ses_parent": "rejected", "ses_child": "accepted"},
            )
        )
        self.assert_invalid(
            artifact(activity="missing"), "requires the parent session guard to be rejected"
        )

    def test_opencode_rejects_old_and_child_only_locators(self) -> None:
        old = DEFAULT_BODY.replace(
            "## Extraction History",
            "## Decisions\n- Accepted. [source: parent/msg_old]\n## Extraction History",
        )
        self.assert_invalid(old and artifact(body=old), "needs direct parent evidence")
        child = DEFAULT_BODY.replace(
            "## Extraction History",
            "## Decisions\n- Accepted. [source: child/session=ses_child;seq=1;message=msg_child]\n## Extraction History",
        )
        self.assert_invalid(artifact(body=child), "needs direct parent evidence")

    def test_json_block_and_required_sections(self) -> None:
        spaced = json.dumps(opencode_checkpoint(), separators=(", ", ":"))
        self.assert_invalid(artifact(raw_state=spaced), "whitespace outside JSON strings")
        self.assert_invalid(
            artifact().replace("  adapter_state_json: |-", "  adapter_state_json: |"),
            "must use an actual YAML |- block scalar",
        )
        self.assert_invalid(
            artifact().replace("## Purpose And Context", "### Purpose And Context"),
            "exact level-2 ## Purpose And Context is required",
        )

    def test_validate_path(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "brief.md"
            path.write_text(artifact(), encoding="utf-8")
            self.assertEqual([], VALIDATOR.validate_path(path))


if __name__ == "__main__":
    unittest.main()
