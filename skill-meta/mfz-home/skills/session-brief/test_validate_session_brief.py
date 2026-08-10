from __future__ import annotations

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).parents[4] / "skills/active/session-brief/scripts/validate-session-brief.py"
SCRIPT_SPEC = importlib.util.spec_from_file_location("validate_session_brief", SCRIPT)
if SCRIPT_SPEC is None or SCRIPT_SPEC.loader is None:
    raise RuntimeError("unable to load Session Brief validator")
VALIDATOR = importlib.util.module_from_spec(SCRIPT_SPEC)
SCRIPT_SPEC.loader.exec_module(VALIDATOR)


FINGERPRINT = "sha256:" + "0" * 64


def cursor(time: int, record_id: str) -> dict[str, object]:
    return {"time": time, "id": record_id}


def session_state(prefix: str, populated: bool) -> dict[str, object]:
    if populated:
        cursors = {
            "message_created": cursor(100, f"msg_{prefix}"),
            "message_updated": cursor(100, f"msg_{prefix}"),
            "part_created": cursor(101, f"prt_{prefix}"),
            "part_updated": cursor(101, f"prt_{prefix}"),
        }
        terminals = {
            "message_created": f"msg_{prefix}",
            "message_updated": f"msg_{prefix}",
            "part_created": f"prt_{prefix}",
            "part_updated": f"prt_{prefix}",
        }
        counts = {"messages": 1, "parts": 1}
    else:
        cursors = {stream: cursor(0, "") for stream in VALIDATOR.STREAMS}
        terminals = {stream: None for stream in VALIDATOR.STREAMS}
        counts = {"messages": 0, "parts": 0}
    return {
        "cursors": cursors,
        "counts": counts,
        "terminal_identities": terminals,
        "prefix_fingerprints": {
            "message_created": FINGERPRINT,
            "part_created": FINGERPRINT,
        },
    }


def opencode_state() -> dict[str, object]:
    return {
        "version": 1,
        "source_identity": "123:456",
        "parent_session_id": "ses_parent",
        "known_child_ids": ["ses_child"],
        "sessions": {
            "ses_parent": session_state("parent", True),
            "ses_child": session_state("child", False),
        },
    }


DEFAULT_BODY = """## Purpose And Context
The session established a bounded implementation context.
## Current State
The pinned work is represented by this brief.
## Extraction History
- Created at the pinned boundary.
"""


def artifact(
    *,
    state: dict[str, object] | None = None,
    raw_state: str | None = None,
    adapter_style: str | None = "|-",
    harness: str = "opencode",
    activity: str = "active",
    evidence: str = "accepted",
    movement: str = "not-observed",
    complete: bool = True,
    gaps: list[object] | None = None,
    overall_guard: str = "accepted",
    guard_reason: str | None = None,
    decisions: list[str] | None = None,
    guard_sessions: dict[str, str] | None = None,
    rejection_reasons: bool = True,
    body: str | None = None,
) -> str:
    if state is None:
        state = opencode_state() if harness == "opencode" else {"version": 1, "position": 4}
    if raw_state is None:
        raw_state = json.dumps(state, separators=(",", ":"))
    if gaps is None:
        gaps = []
    if guard_sessions is None:
        guard_sessions = {"ses_parent": "accepted"}
        if harness == "opencode":
            guard_sessions["ses_child"] = "accepted"
    guard_lines = []
    for session_id, status in guard_sessions.items():
        guard_lines.append(f"      {session_id}:")
        guard_lines.append(f"        status: {status}")
        if status == "rejected" and rejection_reasons:
            guard_lines.append("        reason: session guard failed")
    overall_lines = [f"    overall: {overall_guard}"]
    if guard_reason is not None:
        overall_lines.append(f"    reason: {guard_reason}")
    rendered_gaps: list[str] = []
    for gap in gaps:
        if isinstance(gap, dict):
            items = list(gap.items())
            rendered_gaps.append(f"    - {items[0][0]}: {items[0][1]}")
            rendered_gaps.extend(f"      {key}: {value}" for key, value in items[1:])
        else:
            rendered_gaps.append(f"    - {gap}")
    gap_lines = " []" if not rendered_gaps else "\n" + "\n".join(rendered_gaps)
    adapter_lines = (
        f"  adapter_state_json: {adapter_style}\n    {raw_state}"
        if adapter_style is not None
        else f"  adapter_state_json: {raw_state}"
    )
    if body is None:
        body = DEFAULT_BODY
        if decisions is not None:
            body = (
                "## Purpose And Context\n"
                "The session established a bounded implementation context.\n"
                "## Current State\n"
                "The pinned work is represented by this brief.\n"
                "## Decisions\n"
                + "\n".join(decisions)
                + "\n## Extraction History\n"
                "- Created at the pinned boundary.\n"
            )
    return f"""---
kind: session-brief
state_version: 2
title: Validator fixture
source:
  harness: {harness}
  session_id: ses_parent
  kind: test-store
brief:
  created_at: 2026-08-08T00:00:00Z
  updated_at: 2026-08-08T00:01:00Z
  source_activity_at_pin: {activity}
  evidence_state_at_pin: {evidence}
  post_pin_movement: {movement}
coverage:
  mode: reconstruct
  complete_through: boundary-1
  complete: {str(complete).lower()}
  gaps:{gap_lines}
  exclusions: []
extraction:
{adapter_lines}
  guards:
{chr(10).join(overall_lines)}
    sessions:
{chr(10).join(guard_lines)}
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
        self.assertTrue(errors, "expected validation errors")
        self.assertTrue(
            any(fragment in error for error in errors),
            f"{fragment!r} not found in errors: {errors}",
        )

    def test_valid_opencode_v2_complete(self) -> None:
        self.assert_valid(
            artifact(decisions=["- The user accepted the scope. [source: parent/msg_parent]"])
        )
        descriptive = artifact().replace(
            "  kind: test-store\n",
            "  kind: sqlite-store\n"
            "  locator: null\n"
            "  fingerprint: source-1\n"
            "  adapter_version: 1\n"
            "  session_created_at: 2026-08-08T00:00:00Z\n"
            "  project: demo\n"
            "  directory: /workspace\n",
        )
        self.assert_valid(descriptive.replace("  exclusions: []", "  exclusions:\n    - reasoning bodies"))
        self.assert_valid(
            artifact()
            .replace(
                "  compactions: []",
                "  compactions:\n"
                "    - id: cmp_1\n"
                "      timestamp: 123\n"
                "      state: compacted\n",
            )
            .replace(
                "  children: []",
                "  children:\n"
                "    - id: ses_child\n"
                "      locator: child/ses_child\n"
                "      status: observed\n",
            )
            .replace(
                "  nonterminal: []",
                "  nonterminal:\n"
                "    - session_id: ses_child\n"
                "      tail_start_id: msg_tail\n",
            )
            .replace(
                "  final_message: null",
                "  final_message:\n"
                "    id: msg_parent\n"
                "    type: final\n",
            )
            .replace(
                "  final_part: null",
                "  final_part:\n"
                "    id: prt_parent\n"
                "    status: complete\n",
            )
        )

    def test_valid_current_source_movement_keeps_pin_acceptance(self) -> None:
        self.assert_valid(
            artifact(
                evidence="accepted",
                movement="detected",
                complete=False,
                gaps=[
                    {
                        "kind": "post-pin-movement",
                        "reason": "current parent work moved the source after the pin",
                    }
                ],
            )
        )

    def test_valid_partial_acceptance_truth_table(self) -> None:
        self.assert_valid(
            artifact(
                evidence="partially-accepted",
                overall_guard="rejected",
                complete=False,
                gaps=["child guard rejected"],
                guard_sessions={"ses_parent": "accepted", "ses_child": "rejected"},
            )
        )

    def test_valid_rejected_evidence_truth_table(self) -> None:
        self.assert_valid(
            artifact(
                evidence="rejected",
                overall_guard="rejected",
                complete=False,
                gaps=["parent pin rejected"],
                guard_sessions={"ses_parent": "rejected", "ses_child": "accepted"},
            )
        )

    def test_valid_missing_source_truth_table(self) -> None:
        self.assert_valid(
            artifact(
                activity="missing",
                evidence="rejected",
                overall_guard="rejected",
                complete=False,
                gaps=["parent session missing"],
                guard_sessions={"ses_parent": "rejected", "ses_child": "accepted"},
            )
        )
        self.assert_invalid(
            artifact(activity="missing"),
            "source_activity_at_pin missing requires the parent session guard to be rejected",
        )

    def test_invalid_session_brief_state_version_one(self) -> None:
        self.assert_invalid(
            artifact().replace("state_version: 2", "state_version: 1"),
            "state_version must be 2",
        )

    def test_rejected_session_truth_table_failures_are_independent(self) -> None:
        self.assert_invalid(
            artifact(
                evidence="partially-accepted",
                overall_guard="rejected",
                complete=False,
                gaps=["child guard rejected"],
                guard_sessions={"ses_parent": "accepted", "ses_child": "rejected"},
                rejection_reasons=False,
            ),
            "rejected guard needs reason or locator",
        )
        self.assert_invalid(
            artifact(
                evidence="partially-accepted",
                overall_guard="accepted",
                complete=False,
                gaps=["child guard rejected"],
                guard_sessions={"ses_parent": "accepted", "ses_child": "rejected"},
            ),
            "overall must be accepted iff every per-session guard is accepted",
        )
        self.assert_invalid(
            artifact(
                evidence="partially-accepted",
                overall_guard="rejected",
                complete=False,
                gaps=[],
                guard_sessions={"ses_parent": "accepted", "ses_child": "rejected"},
            ),
            "partially-accepted evidence requires a visible coverage gap",
        )
        self.assert_invalid(
            artifact(
                evidence="partially-accepted",
                overall_guard="rejected",
                complete=True,
                gaps=["child guard rejected"],
                guard_sessions={"ses_parent": "accepted", "ses_child": "rejected"},
            ),
            "partially-accepted evidence requires coverage.complete to be false",
        )

    def test_partial_and_rejected_require_their_truth_table_shapes(self) -> None:
        self.assert_invalid(
            artifact(
                evidence="partially-accepted",
                overall_guard="rejected",
                complete=False,
                guard_sessions={"ses_parent": "accepted", "ses_child": "accepted"},
            ),
            "mix of accepted and rejected",
        )
        self.assert_invalid(
            artifact(
                evidence="rejected",
                overall_guard="accepted",
                complete=False,
                gaps=["rejected evidence"],
                guard_sessions={"ses_parent": "accepted", "ses_child": "accepted"},
            ),
            "rejected evidence requires at least one rejected session guard",
        )

    def test_complete_true_requires_accepted_stable_pin_without_gaps(self) -> None:
        self.assert_invalid(
            artifact(gaps=["a visible gap"]),
            "coverage.complete true cannot have visible coverage gaps",
        )
        self.assert_invalid(
            artifact(movement="detected", gaps=["movement"]),
            "coverage.complete true requires post_pin_movement not-observed",
        )

    def test_controlled_nested_values_are_rejected(self) -> None:
        nested_child = artifact().replace(
            "  children: []",
            "  children:\n"
            "    - id:\n"
            "        version: 1\n",
        )
        self.assert_invalid(
            nested_child,
            "extraction.children[0].id must be a scalar or null",
        )

        nested_gap = artifact(gaps=["visible gap"]).replace(
            "  gaps:\n    - visible gap",
            "  gaps:\n"
            "    - reason: visible gap\n"
            "      locator:\n"
            "        sessions: {}",
        )
        self.assert_invalid(
            nested_gap,
            "coverage.gaps[0].locator must be a scalar or null",
        )

        nested_guard_reason = artifact(
            evidence="partially-accepted",
            overall_guard="rejected",
            complete=False,
            gaps=["child guard rejected"],
            guard_sessions={"ses_parent": "accepted", "ses_child": "rejected"},
        ).replace(
            "    overall: rejected\n",
            "    overall: rejected\n"
            "    reason:\n"
            "      sessions: {}\n",
        )
        self.assert_invalid(
            nested_guard_reason,
            "extraction.guards.reason must be a string or null",
        )

        nested_guard_locator = artifact(
            evidence="partially-accepted",
            overall_guard="rejected",
            complete=False,
            gaps=["child guard rejected"],
            guard_sessions={"ses_parent": "accepted", "ses_child": "rejected"},
        ).replace(
            "        reason: session guard failed\n",
            "        reason: session guard failed\n"
            "        locator:\n"
            "          sessions: {}\n",
        )
        self.assert_invalid(
            nested_guard_locator,
            "extraction.guards.sessions.ses_child.locator must be a string or null",
        )

    def test_malformed_four_stream_state(self) -> None:
        missing_cursor = opencode_state()
        del missing_cursor["sessions"]["ses_parent"]["cursors"]["part_updated"]  # type: ignore[index]
        self.assert_invalid(artifact(state=missing_cursor), "must contain all four Bundle stream cursors")

        malformed_cursor = opencode_state()
        malformed_cursor["sessions"]["ses_parent"]["cursors"]["part_updated"] = "0:"  # type: ignore[index]
        self.assert_invalid(artifact(state=malformed_cursor), "must contain exactly time and id")

    def test_malformed_or_missing_counts_and_terminal_map(self) -> None:
        missing_counts = opencode_state()
        del missing_counts["sessions"]["ses_parent"]["counts"]  # type: ignore[index]
        self.assert_invalid(artifact(state=missing_counts), "counts must contain messages and parts")

        malformed_counts = opencode_state()
        malformed_counts["sessions"]["ses_parent"]["counts"] = {"messages": True, "parts": 1}  # type: ignore[index]
        self.assert_invalid(artifact(state=malformed_counts), "must be nonnegative integers")

        missing_terminals = opencode_state()
        del missing_terminals["sessions"]["ses_parent"]["terminal_identities"]["part_updated"]  # type: ignore[index]
        self.assert_invalid(artifact(state=missing_terminals), "terminal_identities must contain all four")

    def test_terminal_mismatch_and_null_are_rejected(self) -> None:
        mismatch = opencode_state()
        mismatch["sessions"]["ses_parent"]["terminal_identities"]["part_created"] = "prt_other"  # type: ignore[index]
        self.assert_invalid(artifact(state=mismatch), "must match its cursor id")

        null_identity = opencode_state()
        null_identity["sessions"]["ses_parent"]["terminal_identities"]["part_created"] = None  # type: ignore[index]
        self.assert_invalid(artifact(state=null_identity), "must match its cursor id")

    def test_missing_and_malformed_creation_prefix_fingerprint(self) -> None:
        missing = opencode_state()
        del missing["sessions"]["ses_parent"]["prefix_fingerprints"]["part_created"]  # type: ignore[index]
        self.assert_invalid(artifact(state=missing), "must contain message_created and part_created")

        malformed = opencode_state()
        malformed["sessions"]["ses_parent"]["prefix_fingerprints"]["part_created"] = "sha256:bad"  # type: ignore[index]
        self.assert_invalid(artifact(state=malformed), "sha256:<64-hex>")

    def test_parent_as_child_and_session_set_mismatch(self) -> None:
        parent_child = opencode_state()
        parent_child["known_child_ids"] = ["ses_parent"]
        self.assert_invalid(artifact(state=parent_child), "must not contain the parent session")

        mismatch = opencode_state()
        del mismatch["sessions"]["ses_child"]  # type: ignore[index]
        self.assert_invalid(artifact(state=mismatch), "must exactly match the parent and known child IDs")

    def test_unknown_and_duplicate_generic_frontmatter_state(self) -> None:
        unknown = artifact().replace(
            "  guards:\n", "  parent_session_id: ses_parent\n  guards:\n"
        )
        self.assert_invalid(unknown, "extraction contains unsupported keys: parent_session_id")

        duplicate = artifact().replace(
            "state_version: 2\n", "state_version: 2\nstate_version: 2\n"
        )
        self.assert_invalid(duplicate, "duplicate key state_version")

    def test_actual_yaml_block_style_is_required(self) -> None:
        self.assert_invalid(
            artifact(adapter_style="|"),
            "must use an actual YAML |- block scalar",
        )
        self.assert_invalid(
            artifact(adapter_style=None),
            "must use an actual YAML |- block scalar",
        )

    def test_standard_json_constants_and_lexical_compactness(self) -> None:
        self.assert_invalid(
            artifact(harness="claude", raw_state='{"version":1,"value":NaN}'),
            "nonstandard JSON constant NaN",
        )
        self.assert_invalid(
            artifact(harness="claude", raw_state='{"version": 1}'),
            "whitespace outside JSON strings",
        )

    def test_non_opencode_accepts_raw_unicode_and_alternate_escape(self) -> None:
        raw_state = '{"version":1,"text":"caf' + chr(0xE9) + r'\/path"}'
        self.assert_valid(artifact(harness="claude", raw_state=raw_state))

    def test_fenced_fake_sections_do_not_bypass_narrative_checks(self) -> None:
        body = """```markdown
## Decisions
This is not semantic content.
```
## Purpose And Context
Purpose.
## Current State
State.
## Extraction History
History.
"""
        self.assert_valid(artifact(body=body))
        fake_only = """```markdown
## Purpose And Context
Purpose.
## Current State
State.
## Extraction History
History.
```
"""
        self.assert_invalid(
            artifact(body=fake_only),
            "exact level-2 ## Purpose And Context is required",
        )

    def test_numbered_and_multiline_authority_items(self) -> None:
        body = """## Purpose And Context
Purpose.
## Current State
State.
## Decisions
1. The parent user accepted the scope.

   The continuation remains part of the item and carries the direct locator [source: parent/msg_parent].
## Corrections And Preferences
- The parent user rejected the old framing.
  The correction locator is [source: parent/prt_parent].
## Extraction History
History.
        """
        self.assert_valid(artifact(body=body))

    def test_blank_separates_top_level_authority_prose(self) -> None:
        body = """## Purpose And Context
Purpose.
## Current State
State.
## Decisions
- The user accepted the scope.

The locator is [source: parent/msg_parent].
## Extraction History
History.
"""
        self.assert_invalid(
            artifact(body=body),
            "appropriately indented continuation after a blank",
        )

    def test_decision_prose_and_child_only_locator_are_rejected(self) -> None:
        prose = artifact(
            body="""## Purpose And Context
Purpose.
## Current State
State.
## Decisions
The user accepted the scope. [source: parent/msg_parent]
## Extraction History
History.
"""
        )
        self.assert_invalid(prose, "must be an unordered or numbered list item")

        child = artifact(
            decisions=["- The child decided the scope. [source: child/msg_child]"]
        )
        self.assert_invalid(child, "needs direct parent evidence")

        parent_and_child = artifact(
            decisions=[
                "- The parent decision is supported by both records. "
                "[source: parent/msg_parent] [source: child/msg_child]"
            ]
        )
        self.assert_valid(parent_and_child)

    def test_required_sections_must_be_exact_level_two_headings(self) -> None:
        self.assert_invalid(
            artifact().replace("## Purpose And Context", "### Purpose And Context"),
            "exact level-2 ## Purpose And Context is required",
        )

    def test_valid_path_and_cli_shape(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "brief.md"
            path.write_text(artifact(), encoding="utf-8")
            self.assertEqual([], VALIDATOR.validate_path(path))


if __name__ == "__main__":
    unittest.main()
