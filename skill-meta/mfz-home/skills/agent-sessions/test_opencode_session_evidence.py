from __future__ import annotations

import json
import importlib.util
import sqlite3
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
from pathlib import Path


SCRIPT = (
    Path(__file__).parents[4]
    / "skills/active/agent-sessions/scripts/opencode-session-evidence.py"
)
SCRIPT_SPEC = importlib.util.spec_from_file_location("opencode_session_evidence", SCRIPT)
if SCRIPT_SPEC is None or SCRIPT_SPEC.loader is None:
    raise RuntimeError("unable to load extractor module")
EVIDENCE = importlib.util.module_from_spec(SCRIPT_SPEC)
SCRIPT_SPEC.loader.exec_module(EVIDENCE)


class OpenCodeSessionEvidenceTest(unittest.TestCase):
    def setUp(self) -> None:
        self.tempdir = tempfile.TemporaryDirectory()
        self.database = Path(self.tempdir.name) / "opencode.db"
        connection = sqlite3.connect(self.database)
        connection.executescript(
            """
            CREATE TABLE session (
                id TEXT PRIMARY KEY,
                parent_id TEXT,
                title TEXT NOT NULL,
                directory TEXT NOT NULL,
                agent TEXT,
                model TEXT,
                time_created INTEGER NOT NULL,
                time_updated INTEGER NOT NULL
            );
            CREATE TABLE message (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                time_created INTEGER NOT NULL,
                time_updated INTEGER NOT NULL,
                data TEXT NOT NULL
            );
            CREATE TABLE part (
                id TEXT PRIMARY KEY,
                message_id TEXT NOT NULL,
                session_id TEXT NOT NULL,
                time_created INTEGER NOT NULL,
                time_updated INTEGER NOT NULL,
                data TEXT NOT NULL
            );
            CREATE TABLE session_message (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL
            );
            """
        )
        sessions = [
            ("ses_parent", None, "Progress visibility", "/workspace", "build", "sol", 1, 500),
            ("ses_child", "ses_parent", "Explore", "/workspace", "explore", "luna", 10, 200),
            ("ses_fallback", "ses_parent", "Fallback", "/workspace", "explore", "luna", 20, 210),
        ]
        connection.executemany(
            "INSERT INTO session VALUES (?, ?, ?, ?, ?, ?, ?, ?)", sessions
        )
        connection.execute(
            "INSERT INTO message VALUES (?, ?, ?, ?, ?)",
            (
                "msg_1",
                "ses_parent",
                100,
                300,
                json.dumps({"role": "assistant", "finish": "stop"}),
            ),
        )
        connection.execute(
            "INSERT INTO message VALUES (?, ?, ?, ?, ?)",
            (
                "msg_2",
                "ses_parent",
                200,
                200,
                json.dumps({"role": "assistant", "finish": "stop"}),
            ),
        )
        parts = [
            ("prt_1", 101, 101, {"type": "text", "text": "secret-like content " * 200}),
            ("prt_2", 102, 102, {"type": "reasoning", "text": "hidden"}),
            (
                "prt_3",
                103,
                103,
                {"type": "compaction", "auto": True, "overflow": False, "tail_start_id": "msg_1"},
            ),
            (
                "prt_4",
                104,
                200,
                {
                    "type": "tool",
                    "tool": "task",
                    "callID": "call_new",
                    "state": {
                        "status": "completed",
                        "input": {},
                        "metadata": {"sessionId": "ses_child"},
                    },
                },
            ),
            (
                "prt_5",
                105,
                201,
                {
                    "type": "tool",
                    "tool": "task",
                    "callID": "call_resume",
                    "state": {
                        "status": "completed",
                        "input": {"task_id": "ses_child"},
                        "metadata": {"sessionId": "ses_child"},
                    },
                },
            ),
            (
                "prt_6",
                106,
                202,
                {
                    "type": "tool",
                    "tool": "task",
                    "callID": "call_fallback",
                    "state": {
                        "status": "completed",
                        "input": {"task_id": "ses_missing"},
                        "metadata": {"sessionId": "ses_fallback"},
                    },
                },
            ),
            (
                "prt_7",
                107,
                203,
                {
                    "type": "tool",
                    "tool": "bash",
                    "callID": "call_running",
                    "state": {"status": "running", "input": {"command": "work"}},
                },
            ),
        ]
        connection.executemany(
            "INSERT INTO part VALUES (?, 'msg_1', 'ses_parent', ?, ?, ?)",
            [(part_id, created, updated, json.dumps(data)) for part_id, created, updated, data in parts],
        )
        connection.commit()
        connection.close()

    def tearDown(self) -> None:
        self.tempdir.cleanup()

    def run_script(self, *arguments: str, check: bool = True) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [sys.executable, str(SCRIPT), "--db", str(self.database), *arguments],
            check=check,
            capture_output=True,
            text=True,
        )

    def run_script_with_db_after(
        self, *arguments: str, check: bool = True
    ) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [sys.executable, str(SCRIPT), *arguments, "--db", str(self.database)],
            check=check,
            capture_output=True,
            text=True,
        )

    def add_tool_context_fixture(self) -> None:
        connection = sqlite3.connect(self.database)
        connection.executemany(
            "INSERT INTO message VALUES (?, ?, ?, ?, ?)",
            [
                (
                    "ctx_assistant",
                    "ses_parent",
                    190,
                    210,
                    json.dumps(
                        {
                            "role": "assistant",
                            "finish": "tool-calls",
                            "error": "CTX_ASSISTANT_ERROR_SECRET",
                        }
                    ),
                ),
                (
                    "ctx_old_user",
                    "ses_parent",
                    80,
                    205,
                    json.dumps(
                        {"role": "user", "secret": "CTX_OLD_USER_SECRET"}
                    ),
                ),
                (
                    "ctx_near_user",
                    "ses_parent",
                    90,
                    205,
                    json.dumps(
                        {"role": "user", "secret": "CTX_NEAR_USER_SECRET"}
                    ),
                ),
            ],
        )
        parts = [
            (
                "ctx_req_a",
                "ctx_old_user",
                200,
                200,
                {"type": "text", "text": "older request"},
            ),
            (
                "ctx_req_early",
                "ctx_near_user",
                199,
                199,
                {"type": "text", "text": "near early"},
            ),
            (
                "ctx_req_equal",
                "ctx_near_user",
                200,
                200,
                {"type": "text", "text": "near equal"},
            ),
            (
                "ctx_target",
                "ctx_assistant",
                200,
                210,
                {
                    "type": "tool",
                    "tool": "bash",
                    "callID": "ctx_call",
                    "state": {
                        "status": "error",
                        "title": "restart service",
                        "input": {"command": "CTX_INPUT_SECRET"},
                        "output": "CTX_OUTPUT_SECRET_LONG",
                        "error": "CTX_ERROR_SECRET_LONG",
                    },
                },
            ),
            (
                "ctx_req_after",
                "ctx_near_user",
                201,
                201,
                {"type": "text", "text": "after target"},
            ),
            (
                "ctx_unrelated",
                "ctx_assistant",
                202,
                202,
                {
                    "type": "tool",
                    "tool": "secret-tool",
                    "callID": "ctx_unrelated_call",
                    "state": {
                        "status": "completed",
                        "input": "CTX_UNRELATED_SECRET",
                        "output": "CTX_UNRELATED_OUTPUT_SECRET",
                    },
                },
            ),
        ]
        connection.executemany(
            "INSERT INTO part VALUES (?, ?, 'ses_parent', ?, ?, ?)",
            [
                (part_id, message_id, created, updated, json.dumps(data))
                for part_id, message_id, created, updated, data in parts
            ],
        )
        connection.commit()
        connection.close()

    def test_locate_and_outline_topology(self) -> None:
        located = json.loads(self.run_script("locate", "Progress").stdout)
        self.assertEqual(["ses_parent"], [item["id"] for item in located["candidates"]])

        outlined = json.loads(self.run_script("outline", "ses_parent").stdout)
        self.assertEqual(
            ["new", "resume", "fallback-new"],
            [item["kind"] for item in outlined["task_invocations"]],
        )
        self.assertEqual("msg_1", outlined["compactions"][0]["tail_start_id"])
        self.assertEqual("msg_1", outlined["cursors"]["message_updated"]["id"])
        self.assertEqual("call_running", outlined["running_tools"][0]["call_id"])

    def test_outline_aggregate_ties_have_stable_key_order(self) -> None:
        connection = sqlite3.connect(self.database)
        connection.executemany(
            "INSERT INTO message VALUES (?, 'ses_parent', ?, ?, ?)",
            [
                ("msg_user_a", 301, 301, json.dumps({"role": "user"})),
                ("msg_user_b", 302, 302, json.dumps({"role": "user"})),
            ],
        )
        connection.execute(
            "INSERT INTO part VALUES (?, 'msg_2', 'ses_parent', ?, ?, ?)",
            (
                "prt_completed_bash",
                204,
                204,
                json.dumps(
                    {
                        "type": "tool",
                        "tool": "bash",
                        "state": {"status": "completed"},
                    }
                ),
            ),
        )
        connection.commit()
        connection.close()

        outlined = json.loads(self.run_script("outline", "ses_parent").stdout)
        self.assertEqual(["assistant", "user"], [item["role"] for item in outlined["message_roles"]])
        self.assertEqual(
            ["<unset>", "stop"],
            [item["finish"] for item in outlined["message_finishes"]],
        )
        self.assertEqual(
            ["tool", "compaction", "reasoning", "text"],
            [item["type"] for item in outlined["part_types"]],
        )
        self.assertEqual(
            [("task", "completed"), ("bash", "completed"), ("bash", "running")],
            [(item["tool"], item["status"]) for item in outlined["tools"]],
        )

    def test_tool_context_returns_exact_pinned_multipart_context(self) -> None:
        self.add_tool_context_fixture()
        result = json.loads(
            self.run_script(
                "tool-context",
                "ses_parent",
                "ctx_target",
                "--max-text-chars",
                "5",
            ).stdout
        )

        self.assertEqual(
            {
                "source",
                "mode",
                "session",
                "pin",
                "counts",
                "tool",
                "message",
                "request",
            },
            set(result),
        )
        self.assertEqual("tool-context", result["mode"])
        self.assertEqual(
            {"message_created", "message_updated", "part_created", "part_updated"},
            set(result["pin"]),
        )
        self.assertEqual({"messages": 5, "parts": 13}, result["counts"])
        self.assertEqual(
            {"time": 210, "id": "ctx_target"}, result["pin"]["part_updated"]
        )
        self.assertEqual(
            "1970-01-01T00:00:00.001Z",
            result["session"]["time_created_iso"],
        )
        self.assertEqual(
            {
                "id": "ctx_target",
                "message_id": "ctx_assistant",
                "time_created": 200,
                "time_updated": 210,
                "type": "tool",
                "tool": "bash",
                "call_id": "ctx_call",
                "status": "error",
                "task_title": "restart service",
            },
            result["tool"],
        )
        self.assertNotIn("input_preview", result["tool"])
        self.assertNotIn("output_preview", result["tool"])
        self.assertNotIn("error_preview", result["tool"])
        self.assertEqual(
            {
                "id": "ctx_assistant",
                "role": "assistant",
                "finish": "tool-calls",
                "has_error": True,
                "time_created": 190,
                "time_updated": 210,
            },
            result["message"],
        )
        self.assertEqual(
            {
                "message_id": "ctx_near_user",
                "message_role": "user",
                "parts": [
                    {
                        "id": "ctx_req_early",
                        "message_id": "ctx_near_user",
                        "time_created": 199,
                        "time_updated": 199,
                        "message_role": "user",
                        "text_preview": "near ",
                        "text_truncated": True,
                    },
                    {
                        "id": "ctx_req_equal",
                        "message_id": "ctx_near_user",
                        "time_created": 200,
                        "time_updated": 200,
                        "message_role": "user",
                        "text_preview": "near ",
                        "text_truncated": True,
                    },
                ],
            },
            result["request"],
        )
        request_ids = [part["id"] for part in result["request"]["parts"]]
        self.assertNotIn("ctx_req_a", request_ids)
        self.assertNotIn("ctx_req_after", request_ids)
        self.assertNotIn("CTX_", json.dumps(result))

    def test_tool_context_content_options_and_root_option_placement(self) -> None:
        self.add_tool_context_fixture()
        before = self.run_script(
            "--pretty",
            "--max-output-bytes",
            "1000000",
            "tool-context",
            "ses_parent",
            "ctx_target",
            "--max-text-chars",
            "5",
        )
        after = self.run_script_with_db_after(
            "tool-context",
            "ses_parent",
            "ctx_target",
            "--pretty",
            "--max-output-bytes",
            "1000000",
            "--max-text-chars",
            "5",
        )
        self.assertTrue(before.stdout.startswith("{\n"))
        self.assertEqual(json.loads(before.stdout), json.loads(after.stdout))

        included = json.loads(
            self.run_script(
                "tool-context",
                "ses_parent",
                "ctx_target",
                "--include-tool-content",
                "--max-text-chars",
                "5",
                "--max-tool-chars",
                "5",
                "--max-output-bytes",
                "1000000",
            ).stdout
        )
        tool = included["tool"]
        for preview, truncated in (
            ("input_preview", "input_truncated"),
            ("output_preview", "output_truncated"),
            ("error_preview", "error_truncated"),
        ):
            self.assertIn(preview, tool)
            self.assertLessEqual(len(tool[preview]), 5)
            self.assertIs(tool[truncated], True)
        self.assertNotIn("CTX_UNRELATED_SECRET", json.dumps(included))
        self.assertNotIn("CTX_OUTPUT_SECRET_LONG", json.dumps(included))

    def test_tool_context_rejects_mismatched_or_non_tool_targets(self) -> None:
        self.add_tool_context_fixture()
        mismatched = self.run_script(
            "tool-context", "ses_child", "ctx_target", check=False
        )
        self.assertNotEqual(0, mismatched.returncode)
        self.assertIn("part not found in session", mismatched.stderr)

        wrong_type = self.run_script(
            "tool-context", "ses_parent", "prt_1", check=False
        )
        self.assertNotEqual(0, wrong_type.returncode)
        self.assertIn("part is not a tool", wrong_type.stderr)

        connection = sqlite3.connect(self.database)
        connection.execute(
            "UPDATE part SET session_id = 'ses_child' WHERE id = 'ctx_target'"
        )
        connection.commit()
        connection.close()
        moved = self.run_script(
            "tool-context", "ses_parent", "ctx_target", check=False
        )
        self.assertNotEqual(0, moved.returncode)
        self.assertIn("part not found in session", moved.stderr)

    def test_tool_context_rejects_non_assistant_owner(self) -> None:
        self.add_tool_context_fixture()
        connection = sqlite3.connect(self.database)
        connection.execute(
            "UPDATE message SET data = ? WHERE id = 'ctx_assistant'",
            (json.dumps({"role": "user", "finish": "tool-calls"}),),
        )
        connection.commit()
        connection.close()

        completed = self.run_script(
            "tool-context", "ses_parent", "ctx_target", check=False
        )
        self.assertNotEqual(0, completed.returncode)
        self.assertIn("owning message is not assistant", completed.stderr)

    def test_reconstruction_locator_groups_enforce_record_ceiling(self) -> None:
        observations = {
            "parts_created": [
                {
                    "id": "part-" + "x" * 100,
                    "time_created": 1,
                    "time_updated": 1,
                    "type": "tool",
                    "tool": "bash",
                    "status": "completed",
                }
            ],
            "parts_updated": [],
        }
        with self.assertRaisesRegex(SystemExit, "max-record-bytes"):
            EVIDENCE.reconstruction_evidence(observations, "ses_parent", 64)

    def test_bundle_initial_parent_and_children(self) -> None:
        result = json.loads(
            self.run_script(
                "bundle",
                "ses_parent",
                "--limit",
                "1",
                "--max-output-bytes",
                "1000000",
            ).stdout
        )
        self.assertEqual("bundle", result["mode"])
        self.assertEqual("ses_parent", result["sessions"]["ses_parent"]["metadata"]["id"])
        self.assertNotIn("parent_id", result["sessions"]["ses_parent"]["metadata"])
        self.assertLessEqual(
            len(
                json.dumps(
                    result["sessions"]["ses_parent"]["metadata"],
                    separators=(",", ":"),
                ).encode("utf-8")
            ),
            16_000,
        )
        self.assertEqual(
            ["ses_child", "ses_fallback"], result["topology"]["current_child_ids"]
        )
        self.assertEqual(
            ["ses_child", "ses_fallback"], result["topology"]["added_child_ids"]
        )
        parent = result["sessions"]["ses_parent"]
        self.assertEqual("initial", parent["state"])
        self.assertTrue(parent["coverage"]["complete"])
        self.assertEqual(2, parent["counts"]["messages"])
        self.assertEqual(7, parent["counts"]["parts"])
        self.assertEqual("msg_2", parent["coverage"]["ending_cursors"]["message_created"]["id"])
        self.assertEqual("msg_1", parent["coverage"]["ending_cursors"]["message_updated"]["id"])
        self.assertEqual("prt_7", parent["coverage"]["terminal_identities"]["part_updated"])
        self.assertEqual(
            {
                "messages_created": 2,
                "messages_updated": 2,
                "parts_created": 7,
                "parts_updated": 7,
            },
            parent["coverage"]["pages"],
        )
        self.assertEqual(
            ["msg_1", "msg_2"],
            [item["id"] for item in parent["observations"]["messages_created"]],
        )
        self.assertEqual(
            {"prt_1", "prt_3", "prt_4", "prt_5", "prt_6", "prt_7"},
            {
                item["id"]
                for item in parent["observations"]["parts_created"]
                + parent["observations"]["parts_updated"]
            },
        )
        self.assertEqual(1, parent["reasoning_records_excluded"])
        self.assertEqual(
            {"message_created", "part_created"},
            set(parent["prefix_fingerprints"]),
        )
        self.assertTrue(
            all(
                value.startswith("sha256:")
                for value in parent["prefix_fingerprints"].values()
            )
        )
        self.assertEqual(
            ["new", "resume", "fallback-new"],
            [item["kind"] for item in parent["task_invocations"]],
        )
        self.assertEqual("initial", result["sessions"]["ses_child"]["state"])
        self.assertEqual(0, result["sessions"]["ses_child"]["counts"]["messages"])
        self.assertEqual(
            [
                {"session_id": "ses_child", "status": "present", "state": "initial"},
                {"session_id": "ses_fallback", "status": "present", "state": "initial"},
            ],
            result["topology"]["children"],
        )
        self.assertIn("sessions", result["next_state"])
        self.assertEqual(
            set(result["topology"]["known_child_ids"]),
            set(result["next_state"]["known_child_ids"]),
        )

    def test_bundle_default_view_is_the_full_compatibility_shape(self) -> None:
        default = json.loads(
            self.run_script("bundle", "ses_parent", "--max-output-bytes", "1000000").stdout
        )
        explicit_full = json.loads(
            self.run_script(
                "bundle",
                "ses_parent",
                "--view",
                "full",
                "--max-output-bytes",
                "1000000",
            ).stdout
        )
        self.assertEqual(default, explicit_full)
        self.assertEqual("full", default["view"])
        self.assertEqual("full", explicit_full["view"])
        self.assertIn("observations", default["sessions"]["ses_parent"])
        self.assertNotIn("evidence", default["sessions"]["ses_parent"])

    def test_bundle_reconstruction_deduplicates_and_selects_evidence(self) -> None:
        connection = sqlite3.connect(self.database)
        connection.execute(
            "INSERT INTO message VALUES (?, ?, ?, ?, ?)",
            (
                "msg_user",
                "ses_parent",
                90,
                90,
                json.dumps({"role": "user", "finish": "stop"}),
            ),
        )
        connection.execute("UPDATE part SET time_updated = 400 WHERE id = 'prt_1'")
        connection.execute(
            "INSERT INTO part VALUES (?, ?, ?, ?, ?, ?)",
            (
                "prt_user",
                "msg_user",
                "ses_parent",
                98,
                98,
                json.dumps({"type": "text", "text": "user question"}),
            ),
        )
        connection.execute(
            "INSERT INTO part VALUES (?, ?, ?, ?, ?, ?)",
            (
                "prt_8",
                "msg_1",
                "ses_parent",
                108,
                108,
                json.dumps(
                    {
                        "type": "tool",
                        "tool": "bash",
                        "callID": "call_completed",
                        "state": {"status": "completed", "input": {}},
                    }
                ),
            ),
        )
        connection.execute(
            "INSERT INTO part VALUES (?, ?, ?, ?, ?, ?)",
            (
                "prt_9",
                "msg_1",
                "ses_parent",
                109,
                109,
                json.dumps(
                    {
                        "type": "tool",
                        "tool": "python",
                        "callID": "call_error",
                        "state": {"status": "error", "input": {}},
                    }
                ),
            ),
        )
        connection.execute(
            "INSERT INTO part VALUES (?, ?, ?, ?, ?, ?)",
            (
                "prt_10",
                "msg_1",
                "ses_parent",
                110,
                110,
                json.dumps(
                    {
                        "type": "tool",
                        "tool": "custom",
                        "callID": "call_unknown",
                        "state": {"input": {}},
                    }
                ),
            ),
        )
        connection.execute(
            "INSERT INTO part VALUES (?, ?, ?, ?, ?, ?)",
            (
                "prt_12",
                "msg_1",
                "ses_parent",
                111,
                111,
                json.dumps(
                    {
                        "type": "tool",
                        "tool": "bash",
                        "callID": "call_completed_again",
                        "state": {"status": "completed", "input": {}},
                    }
                ),
            ),
        )
        connection.execute(
            "INSERT INTO part VALUES (?, ?, ?, ?, ?, ?)",
            (
                "prt_13",
                "msg_1",
                "ses_parent",
                112,
                112,
                json.dumps(
                    {
                        "type": "tool",
                        "tool": "zsh",
                        "callID": "call_zsh",
                        "state": {"status": "completed", "input": {}},
                    }
                ),
            ),
        )
        connection.execute(
            "INSERT INTO part VALUES (?, ?, ?, ?, ?, ?)",
            (
                "prt_14",
                "msg_1",
                "ses_parent",
                113,
                113,
                json.dumps(
                    {
                        "type": "tool",
                        "callID": "call_missing_tool",
                        "state": {"status": "completed", "input": {}},
                    }
                ),
            ),
        )
        connection.execute(
            "INSERT INTO part VALUES (?, ?, ?, ?, ?, ?)",
            (
                "prt_11",
                "msg_1",
                "ses_parent",
                99,
                99,
                json.dumps({"type": "text", "text": "short"}),
            ),
        )
        connection.commit()
        connection.close()

        result = json.loads(
            self.run_script(
                "bundle",
                "ses_parent",
                "--view",
                "reconstruction",
                "--max-output-bytes",
                "1000000",
            ).stdout
        )
        parent = result["sessions"]["ses_parent"]
        evidence = parent["evidence"]

        self.assertEqual("reconstruction", result["view"])
        self.assertNotIn("observations", parent)
        self.assertEqual(
            ["prt_user", "prt_11", "prt_1"],
            [item["id"] for item in evidence["text_records"]],
        )
        self.assertEqual(
            {"prt_user": "user", "prt_11": "assistant", "prt_1": "assistant"},
            {item["id"]: item["message_role"] for item in evidence["text_records"]},
        )
        self.assertEqual(400, evidence["text_records"][2]["time_updated"])
        self.assertEqual(
            ["prt_4", "prt_5", "prt_6", "prt_7", "prt_9", "prt_10"],
            [item["id"] for item in evidence["tool_records"]],
        )
        self.assertNotIn("prt_8", [item["id"] for item in evidence["tool_records"]])
        self.assertEqual(
            [
                {
                    "tool": "<unknown-tool>",
                    "part_ids": ["prt_14"],
                },
                {"tool": "bash", "part_ids": ["prt_8", "prt_12"]},
                {"tool": "zsh", "part_ids": ["prt_13"]},
            ],
            evidence["completed_tool_locators"],
        )
        self.assertEqual(
            {"tool", "part_ids"},
            set(evidence["completed_tool_locators"][0]),
        )
        locator_text = json.dumps(evidence["completed_tool_locators"])
        for leaked_field in (
            "message_id",
            "time_created",
            "time_updated",
            "call_id",
            "status",
            "task_title",
            "input_preview",
            "output_preview",
            "error_preview",
        ):
            self.assertNotIn(leaked_field, locator_text)
        self.assertEqual(
            {
                "text_observations_total": 3,
                "tool_observations_total": 10,
                "tool_records_returned": 6,
                "completed_non_task_tool_observations_omitted": 4,
                "completed_tool_locators_returned": 4,
                "message_observations_omitted": True,
            },
            evidence["selection"],
        )
        self.assertEqual(
            evidence["selection"]["tool_observations_total"],
            evidence["selection"]["tool_records_returned"]
            + evidence["selection"]["completed_tool_locators_returned"],
        )
        self.assertEqual(
            evidence["selection"]["completed_non_task_tool_observations_omitted"],
            evidence["selection"]["completed_tool_locators_returned"],
        )
        self.assertEqual(
            {
                "metadata",
                "state",
                "counts",
                "coverage",
                "prefix_fingerprints",
                "compactions",
                "task_invocations",
                "running_tools",
                "nonterminal_messages",
                "message_roles",
                "message_finishes",
                "part_types",
                "tools",
                "evidence",
                "reasoning_records_excluded",
                "reasoning_records_total",
                "gaps",
                "session_id",
                "status",
            },
            set(parent),
        )
        self.assertIn("source", result)
        self.assertIn("parent_session_id", result)
        self.assertIn("topology", result)
        self.assertIn("content", result)
        self.assertIn("gaps", result)
        self.assertIn("next_state", result)

    def test_bundle_prior_state_is_a_noop(self) -> None:
        first = json.loads(
            self.run_script("bundle", "ses_parent", "--max-output-bytes", "1000000").stdout
        )
        state = json.dumps(first["next_state"], separators=(",", ":"))
        second = json.loads(
            self.run_script(
                "bundle",
                "ses_parent",
                "--state",
                state,
                "--max-output-bytes",
                "1000000",
            ).stdout
        )
        self.assertEqual("incremental", second["sessions"]["ses_parent"]["state"])
        self.assertEqual([], second["gaps"])
        observations = second["sessions"]["ses_parent"]["observations"]
        for stream in (
            "messages_created",
            "messages_updated",
            "parts_created",
            "parts_updated",
        ):
            self.assertEqual([], observations[stream])
        self.assertEqual(
            first["next_state"], second["next_state"], "a no-op must preserve reusable state"
        )

    def test_bundle_initial_repin_state_uses_starter_prefix_fingerprints(self) -> None:
        real_delta = EVIDENCE.bundle_delta_data

        def force_parent_repin(connection, session_id, *arguments):
            result = real_delta(connection, session_id, *arguments)
            if session_id == "ses_parent":
                result["post_pin_mutations"]["messages"] = [{"id": "settling"}]
            return result

        with patch.object(EVIDENCE, "bundle_delta_data", side_effect=force_parent_repin):
            with EVIDENCE.connect_read_only(str(self.database)) as connection:
                initial = EVIDENCE.bundle(
                    connection,
                    str(self.database),
                    "ses_parent",
                    None,
                    1,
                    10_000,
                    16_000,
                    False,
                    2_000,
                    500,
                )

        parent = initial["sessions"]["ses_parent"]
        self.assertEqual("requires_repin", parent["state"])
        starter_state = initial["next_state"]["sessions"]["ses_parent"]
        self.assertEqual(
            {stream: {"time": 0, "id": ""} for stream in EVIDENCE.BUNDLE_STREAMS},
            starter_state["cursors"],
        )
        self.assertEqual({"messages": 0, "parts": 0}, starter_state["counts"])
        self.assertEqual(
            {stream: None for stream in EVIDENCE.BUNDLE_STREAMS},
            starter_state["terminal_identities"],
        )
        with EVIDENCE.connect_read_only(str(self.database)) as connection:
            expected_message_prefix = EVIDENCE.prefix_fingerprint(
                connection, "ses_parent", "message_created", (0, "")
            )
            expected_part_prefix = EVIDENCE.prefix_fingerprint(
                connection, "ses_parent", "part_created", (0, "")
            )
        self.assertEqual(
            {
                "message_created": expected_message_prefix,
                "part_created": expected_part_prefix,
            },
            starter_state["prefix_fingerprints"],
        )

        settled = json.loads(
            self.run_script(
                "bundle",
                "ses_parent",
                "--state",
                json.dumps(initial["next_state"], separators=(",", ":")),
                "--max-output-bytes",
                "1000000",
            ).stdout
        )
        settled_parent = settled["sessions"]["ses_parent"]
        self.assertEqual("incremental", settled_parent["state"])
        self.assertTrue(settled_parent["coverage"]["complete"])
        self.assertFalse(
            any(gap["kind"] == "historical-prefix-fingerprint-mismatch" for gap in settled["gaps"])
        )

    def test_bundle_detects_missing_known_child(self) -> None:
        first = json.loads(
            self.run_script("bundle", "ses_parent", "--max-output-bytes", "1000000").stdout
        )
        connection = sqlite3.connect(self.database)
        connection.execute("DELETE FROM session WHERE id = 'ses_fallback'")
        connection.commit()
        connection.close()

        result = json.loads(
            self.run_script(
                "bundle",
                "ses_parent",
                "--state",
                json.dumps(first["next_state"], separators=(",", ":")),
                "--max-output-bytes",
                "1000000",
            ).stdout
        )
        self.assertEqual(["ses_fallback"], result["topology"]["missing_child_ids"])
        self.assertEqual("missing", result["sessions"]["ses_fallback"]["state"])
        self.assertEqual(
            "missing-child", result["sessions"]["ses_fallback"]["gaps"][0]["kind"]
        )
        self.assertIn(
            {"kind": "missing-child", "session_id": "ses_fallback"}, result["gaps"]
        )
        self.assertEqual(
            first["next_state"]["sessions"]["ses_fallback"],
            result["next_state"]["sessions"]["ses_fallback"],
        )

    def test_bundle_text_previews_exclude_tool_content_and_reasoning_bodies(self) -> None:
        result = json.loads(
            self.run_script("bundle", "ses_parent", "--max-output-bytes", "1000000").stdout
        )
        encoded = json.dumps(result)
        parent = result["sessions"]["ses_parent"]
        text = next(
            item
            for item in parent["observations"]["parts_created"]
            if item["id"] == "prt_1"
        )
        self.assertEqual("assistant", text["message_role"])
        self.assertEqual(2000, len(text["text_preview"]))
        self.assertIs(text["text_truncated"], True)
        self.assertNotIn(
            "text_truncated",
            next(
                item
                for item in parent["observations"]["parts_created"]
                if item["id"] == "prt_3"
            ),
        )
        self.assertNotIn("input_preview", encoded)
        self.assertNotIn("output_preview", encoded)
        self.assertNotIn("error_preview", encoded)
        self.assertNotIn('"command"', encoded)
        self.assertNotIn("hidden", encoded)
        self.assertTrue(result["content"]["text_previews"])
        self.assertFalse(result["content"]["tool_content"])

    def test_metadata_timestamps_include_utc_iso_milliseconds(self) -> None:
        located = json.loads(self.run_script("locate", "Progress").stdout)
        candidate = located["candidates"][0]
        self.assertEqual(1, candidate["time_created"])
        self.assertEqual("1970-01-01T00:00:00.001Z", candidate["time_created_iso"])
        self.assertEqual(500, candidate["time_updated"])
        self.assertEqual("1970-01-01T00:00:00.500Z", candidate["time_updated_iso"])

        outlined = json.loads(self.run_script("outline", "ses_parent").stdout)
        self.assertEqual(
            "1970-01-01T00:00:00.001Z", outlined["session"]["time_created_iso"]
        )
        self.assertEqual(
            "1970-01-01T00:00:00.500Z", outlined["session"]["time_updated_iso"]
        )

        bundled = json.loads(
            self.run_script("bundle", "ses_parent", "--max-output-bytes", "1000000").stdout
        )
        metadata = bundled["sessions"]["ses_parent"]["metadata"]
        self.assertEqual(1, metadata["time_created"])
        self.assertEqual("1970-01-01T00:00:00.001Z", metadata["time_created_iso"])
        self.assertEqual("1970-01-01T00:00:00.500Z", metadata["time_updated_iso"])
        child_metadata = bundled["sessions"]["ses_child"]["metadata"]
        self.assertEqual("1970-01-01T00:00:00.010Z", child_metadata["time_created_iso"])

    def test_bundle_merges_overlapping_creation_and_update_observations(self) -> None:
        first = json.loads(
            self.run_script("bundle", "ses_parent", "--max-output-bytes", "1000000").stdout
        )
        state = first["next_state"]
        state["sessions"]["ses_parent"]["cursors"]["message_created"] = {
            "time": 0,
            "id": "",
        }
        state["sessions"]["ses_parent"]["cursors"]["message_updated"] = {
            "time": 200,
            "id": "",
        }
        state["sessions"]["ses_parent"]["counts"]["messages"] = 0
        state["sessions"]["ses_parent"]["terminal_identities"]["message_created"] = None
        state["sessions"]["ses_parent"]["terminal_identities"]["message_updated"] = None
        connection = sqlite3.connect(self.database)
        connection.row_factory = sqlite3.Row
        state["sessions"]["ses_parent"]["prefix_fingerprints"][
            "message_created"
        ] = EVIDENCE.prefix_fingerprint(
            connection, "ses_parent", "message_created", (0, "")
        )
        connection.close()
        result = json.loads(
            self.run_script(
                "bundle",
                "ses_parent",
                "--state",
                json.dumps(state, separators=(",", ":")),
                "--max-output-bytes",
                "1000000",
            ).stdout
        )
        parent = result["sessions"]["ses_parent"]["observations"]
        self.assertEqual(["msg_1", "msg_2"], [item["id"] for item in parent["messages_created"]])
        self.assertEqual([], parent["messages_updated"])
        merged = next(item for item in parent["messages_created"] if item["id"] == "msg_1")
        self.assertEqual(300, merged["time_updated"])

    def test_bundle_merge_helper_prefers_greatest_update_version(self) -> None:
        created = [
            {"id": "record", "time_updated": 10, "marker": "created"},
        ]
        updated = [
            {"id": "record", "time_updated": 20, "marker": "older-update"},
            {"id": "record", "time_updated": 30, "marker": "latest-update"},
            {"id": "updated-only", "time_updated": 25, "marker": "only"},
        ]
        merged_created, merged_updated, reasoning = EVIDENCE.merge_bundle_observations(
            created, updated
        )
        self.assertEqual("latest-update", merged_created[0]["marker"])
        self.assertEqual(["updated-only"], [item["id"] for item in merged_updated])
        self.assertEqual(0, reasoning)

    def test_bundle_detects_compensated_nonterminal_replacement(self) -> None:
        first = json.loads(
            self.run_script("bundle", "ses_parent", "--max-output-bytes", "1000000").stdout
        )
        connection = sqlite3.connect(self.database)
        connection.execute("DELETE FROM part WHERE id = 'prt_1'")
        connection.execute(
            "INSERT INTO part VALUES (?, ?, ?, ?, ?, ?)",
            (
                "prt_replacement",
                "msg_1",
                "ses_parent",
                102,
                102,
                json.dumps({"type": "text", "text": "replacement"}),
            ),
        )
        connection.commit()
        connection.close()

        result = json.loads(
            self.run_script(
                "bundle",
                "ses_parent",
                "--state",
                json.dumps(first["next_state"], separators=(",", ":")),
                "--max-output-bytes",
                "1000000",
            ).stdout
        )
        parent = result["sessions"]["ses_parent"]
        self.assertEqual("rebuild_required", parent["state"])
        self.assertFalse(parent["coverage"]["complete"])
        self.assertEqual(7, parent["counts"]["parts"])
        self.assertEqual(
            "prt_7", parent["coverage"]["terminal_identities"]["part_created"]
        )
        self.assertNotEqual(
            first["next_state"]["sessions"]["ses_parent"]["prefix_fingerprints"][
                "part_created"
            ],
            parent["prefix_fingerprints"]["part_created"],
        )
        for stream in (
            "messages_created",
            "messages_updated",
            "parts_created",
            "parts_updated",
        ):
            self.assertEqual([], parent["observations"][stream])
        fingerprint_gap = next(
            gap
            for gap in parent["gaps"]
            if gap["kind"] == "historical-prefix-fingerprint-mismatch"
        )
        self.assertEqual("rebuild-required", fingerprint_gap["action"])
        self.assertNotEqual(fingerprint_gap["previous"], fingerprint_gap["current"])
        self.assertFalse(
            any(gap["kind"] == "terminal-identity-missing" for gap in parent["gaps"])
        )
        self.assertEqual(
            first["next_state"]["sessions"]["ses_parent"],
            result["next_state"]["sessions"]["ses_parent"],
        )

    def test_bundle_rejects_malformed_state(self) -> None:
        first = json.loads(
            self.run_script("bundle", "ses_parent", "--max-output-bytes", "1000000").stdout
        )

        parent_known = json.loads(json.dumps(first["next_state"]))
        parent_known["known_child_ids"] = ["ses_parent"]
        parent_known["sessions"] = {
            "ses_parent": parent_known["sessions"]["ses_parent"]
        }
        version_boolean = json.loads(json.dumps(first["next_state"]))
        version_boolean["version"] = True
        string_cursor = json.loads(json.dumps(first["next_state"]))
        string_cursor["sessions"]["ses_parent"]["cursors"]["message_created"] = "0:"
        null_terminal_identity = json.loads(json.dumps(first["next_state"]))
        null_terminal_identity["sessions"]["ses_parent"]["terminal_identities"][
            "message_created"
        ] = None
        mismatched_terminal_identity = json.loads(json.dumps(first["next_state"]))
        mismatched_terminal_identity["sessions"]["ses_parent"]["terminal_identities"][
            "message_created"
        ] = "msg_1"
        non_null_empty_terminal = json.loads(json.dumps(first["next_state"]))
        non_null_empty_terminal["sessions"]["ses_parent"]["cursors"][
            "message_created"
        ] = {"time": 0, "id": ""}
        non_null_empty_terminal["sessions"]["ses_parent"]["terminal_identities"][
            "message_created"
        ] = "msg_1"
        missing_prefix_fingerprint = json.loads(json.dumps(first["next_state"]))
        del missing_prefix_fingerprint["sessions"]["ses_parent"]["prefix_fingerprints"]

        for state, message in (
            (parent_known, "must not contain the parent session"),
            (version_boolean, "unsupported bundle state version"),
            (string_cursor, "must contain exactly time and id"),
            (null_terminal_identity, "must be non-null when cursor id is nonempty"),
            (mismatched_terminal_identity, "must match cursor id"),
            (non_null_empty_terminal, "must be null when cursor id is empty"),
            (missing_prefix_fingerprint, "must contain prefix_fingerprints"),
        ):
            completed = self.run_script(
                "bundle",
                "ses_parent",
                "--state",
                json.dumps(state, separators=(",", ":")),
                check=False,
            )
            self.assertNotEqual(0, completed.returncode)
            self.assertIn(message, completed.stderr)

    def test_bundle_enforces_record_and_total_output_ceilings(self) -> None:
        record_limit = self.run_script(
            "bundle",
            "ses_parent",
            "--max-record-bytes",
            "64",
            check=False,
        )
        self.assertNotEqual(0, record_limit.returncode)
        self.assertIn("bundle record", record_limit.stderr)

        output_limit = self.run_script(
            "bundle",
            "ses_parent",
            "--max-output-bytes",
            "1000",
            check=False,
        )
        self.assertNotEqual(0, output_limit.returncode)
        self.assertIn("output would be", output_limit.stderr)

        stream_limit = self.run_script(
            "bundle",
            "ses_parent",
            "--limit",
            "1",
            "--max-records",
            "4",
            check=False,
        )
        self.assertNotEqual(0, stream_limit.returncode)
        self.assertIn("per-stream ceiling", stream_limit.stderr)

    def test_bundle_root_output_options_work_before_and_after_subcommand(self) -> None:
        before = self.run_script(
            "--pretty",
            "--max-output-bytes",
            "1000000",
            "bundle",
            "ses_parent",
        )
        after = self.run_script(
            "bundle",
            "ses_parent",
            "--pretty",
            "--max-output-bytes",
            "1000000",
        )
        self.assertTrue(before.stdout.startswith("{\n"))
        self.assertTrue(after.stdout.startswith("{\n"))
        self.assertEqual(json.loads(before.stdout), json.loads(after.stdout))

        db_after = self.run_script_with_db_after(
            "bundle", "ses_parent", "--max-output-bytes", "1000000"
        )
        self.assertEqual("ses_parent", json.loads(db_after.stdout)["parent_session_id"])

        before_limit = self.run_script(
            "--max-output-bytes", "1000", "bundle", "ses_parent", check=False
        )
        after_limit = self.run_script(
            "bundle", "ses_parent", "--max-output-bytes", "1000", check=False
        )
        self.assertNotEqual(0, before_limit.returncode)
        self.assertNotEqual(0, after_limit.returncode)
        self.assertIn("output would be", before_limit.stderr)
        self.assertIn("output would be", after_limit.stderr)

    def test_delta_is_structural_paginated_and_tracks_updates(self) -> None:
        result = json.loads(
            self.run_script(
                "delta",
                "ses_parent",
                "--message-after",
                "100:msg_1",
                "--message-updated-after",
                "200:",
                "--part-after",
                "0:",
                "--updated-after",
                "0:",
                "--limit",
                "3",
            ).stdout
        )
        self.assertEqual(["msg_1"], [item["id"] for item in result["messages_updated"]])
        self.assertEqual(1, result["reasoning_records_excluded"])
        self.assertTrue(result["has_more"]["parts_created"])
        self.assertNotIn("text_preview", result["parts_created"][0])
        compaction = next(
            item for item in result["parts_created"] if item["type"] == "compaction"
        )
        self.assertEqual("msg_1", compaction["tail_start_id"])

    def test_consecutive_delta_preserves_between_page_update(self) -> None:
        first = json.loads(
            self.run_script(
                "delta",
                "ses_parent",
                "--message-after",
                "0:",
                "--message-updated-after",
                "0:",
                "--part-after",
                "0:",
                "--updated-after",
                "0:",
                "--limit",
                "1",
            ).stdout
        )

        connection = sqlite3.connect(self.database)
        connection.execute(
            "UPDATE message SET time_updated = ?, data = ? WHERE id = ?",
            (
                400,
                json.dumps(
                    {"role": "assistant", "finish": "error", "error": "failed"}
                ),
                "msg_1",
            ),
        )
        connection.commit()
        connection.close()

        def rendered_cursor(name: str) -> str:
            value = first["cursors"][name]
            return f"{value['time']}:{value['id']}"

        second = json.loads(
            self.run_script(
                "delta",
                "ses_parent",
                "--message-after",
                rendered_cursor("message_created"),
                "--message-updated-after",
                rendered_cursor("message_updated"),
                "--part-after",
                rendered_cursor("part_created"),
                "--updated-after",
                rendered_cursor("part_updated"),
                "--limit",
                "1",
            ).stdout
        )
        self.assertEqual(["msg_2"], [item["id"] for item in second["messages_created"]])
        self.assertEqual(["msg_1"], [item["id"] for item in second["messages_updated"]])
        self.assertEqual(1, second["messages_updated"][0]["has_error"])

    def test_content_and_total_output_are_bounded(self) -> None:
        completed = self.run_script(
            "--max-output-bytes",
            "1000",
            "delta",
            "ses_parent",
            "--message-after",
            "0:",
            "--message-updated-after",
            "0:",
            "--part-after",
            "0:",
            "--updated-after",
            "0:",
            "--include-content",
            check=False,
        )
        self.assertNotEqual(0, completed.returncode)
        self.assertIn("output would be", completed.stderr)

    def test_delta_honors_inclusive_upper_bounds(self) -> None:
        result = json.loads(
            self.run_script(
                "delta",
                "ses_parent",
                "--message-after",
                "0:",
                "--message-updated-after",
                "0:",
                "--part-after",
                "0:",
                "--updated-after",
                "0:",
                "--message-through",
                "100:msg_1",
                "--message-updated-through",
                "300:msg_1",
                "--part-through",
                "103:prt_3",
                "--updated-through",
                "103:prt_3",
            ).stdout
        )
        self.assertEqual(["msg_1"], [item["id"] for item in result["messages_created"]])
        self.assertNotIn("msg_2", [item["id"] for item in result["messages_created"]])
        self.assertEqual("prt_3", result["cursors"]["part_created"]["id"])
        self.assertEqual("prt_3", result["through"]["part_created"]["id"])

    def test_active_pin_requires_repin_after_between_page_mutation(self) -> None:
        pin_arguments = (
            "--message-through",
            "200:msg_2",
            "--message-updated-through",
            "300:msg_1",
            "--part-through",
            "107:prt_7",
            "--updated-through",
            "203:prt_7",
            "--limit",
            "1",
        )
        first = json.loads(
            self.run_script(
                "delta",
                "ses_parent",
                "--message-after",
                "0:",
                "--message-updated-after",
                "0:",
                "--part-after",
                "0:",
                "--updated-after",
                "0:",
                *pin_arguments,
            ).stdout
        )
        connection = sqlite3.connect(self.database)
        connection.execute(
            "UPDATE message SET time_updated = 400 WHERE id = 'msg_1'"
        )
        connection.execute("UPDATE part SET time_updated = 400 WHERE id = 'prt_1'")
        connection.commit()
        connection.close()

        def rendered_cursor(name: str) -> str:
            value = first["cursors"][name]
            return f"{value['time']}:{value['id']}"

        second = json.loads(
            self.run_script(
                "delta",
                "ses_parent",
                "--message-after",
                rendered_cursor("message_created"),
                "--message-updated-after",
                rendered_cursor("message_updated"),
                "--part-after",
                rendered_cursor("part_created"),
                "--updated-after",
                rendered_cursor("part_updated"),
                *pin_arguments,
            ).stdout
        )
        self.assertFalse(second["pin_consistent"])
        self.assertTrue(second["requires_repin"])
        self.assertEqual("msg_1", second["post_pin_mutations"]["messages"][0]["id"])
        self.assertEqual("prt_1", second["post_pin_mutations"]["parts"][0]["id"])
        self.assertEqual(first["cursors"], second["cursors"])

    def test_final_probe_detects_pinned_row_deletion(self) -> None:
        pin_arguments = (
            "--message-through",
            "200:msg_2",
            "--message-updated-through",
            "300:msg_1",
            "--part-through",
            "107:prt_7",
            "--updated-through",
            "203:prt_7",
        )
        first = json.loads(
            self.run_script(
                "delta",
                "ses_parent",
                "--message-after",
                "0:",
                "--message-updated-after",
                "0:",
                "--part-after",
                "0:",
                "--updated-after",
                "0:",
                *pin_arguments,
            ).stdout
        )
        connection = sqlite3.connect(self.database)
        connection.execute("DELETE FROM part WHERE id = 'prt_1'")
        connection.commit()
        connection.close()

        probe = json.loads(
            self.run_script(
                "delta",
                "ses_parent",
                "--message-after",
                "200:msg_2",
                "--message-updated-after",
                "300:msg_1",
                "--part-after",
                "107:prt_7",
                "--updated-after",
                "203:prt_7",
                *pin_arguments,
                "--expected-source-identity",
                first["source"]["identity"],
                "--expected-message-count",
                str(first["pin_counts"]["messages"]),
                "--expected-part-count",
                str(first["pin_counts"]["parts"]),
            ).stdout
        )
        self.assertTrue(probe["requires_repin"])
        self.assertEqual(["part_count"], probe["guard_mismatch"])
        self.assertEqual("prt_7", probe["cursors"]["part_created"]["id"])

    def test_schema_failure_is_explicit(self) -> None:
        broken = Path(self.tempdir.name) / "broken.db"
        sqlite3.connect(broken).close()
        completed = subprocess.run(
            [sys.executable, str(SCRIPT), "--db", str(broken), "locate", "x"],
            check=False,
            capture_output=True,
            text=True,
        )
        self.assertIn("required table is missing", completed.stderr)


if __name__ == "__main__":
    unittest.main()
