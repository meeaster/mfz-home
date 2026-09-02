from __future__ import annotations

import importlib.util
import json
import os
import shutil
import sqlite3
import subprocess
import sys
import tempfile
import unittest
from unittest import mock
from pathlib import Path


SCRIPT = (
    Path(__file__).parents[4]
    / "skills/active/agent-sessions/scripts/opencode-session-evidence.py"
)
SPEC = importlib.util.spec_from_file_location("opencode_session_evidence", SCRIPT)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError("unable to load evidence adapter")
EVIDENCE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(EVIDENCE)


def assistant(*content: dict[str, object], completed: int | None = 20) -> dict[str, object]:
    data: dict[str, object] = {
        "agent": "build",
        "model": {"providerID": "provider", "id": "model"},
        "content": list(content),
        "time": {"created": 10},
    }
    if completed is not None:
        data["time"] = {"created": 10, "completed": completed}
    return data


class OpenCodeSessionEvidenceTest(unittest.TestCase):
    def setUp(self) -> None:
        self.tempdir = tempfile.TemporaryDirectory()
        self.database = Path(self.tempdir.name) / "opencode.db"
        connection = sqlite3.connect(self.database)
        connection.executescript(
            """
            PRAGMA journal_mode = WAL;
            CREATE TABLE session_v2 (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                parent_id TEXT,
                fork_session_id TEXT,
                fork_boundary TEXT,
                title TEXT,
                directory TEXT NOT NULL,
                time_created INTEGER NOT NULL,
                time_updated INTEGER NOT NULL,
                time_compacting INTEGER,
                time_archived INTEGER,
                time_suspended INTEGER,
                idle_outcome TEXT
            );
            CREATE TABLE session_message (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                type TEXT NOT NULL,
                seq INTEGER NOT NULL,
                time_created INTEGER NOT NULL,
                time_updated INTEGER NOT NULL,
                data TEXT NOT NULL,
                UNIQUE(session_id, seq)
            );
            CREATE TABLE session_inbox (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                type TEXT NOT NULL,
                payload TEXT NOT NULL,
                delivery TEXT NOT NULL,
                enqueued_seq INTEGER NOT NULL,
                time_created INTEGER NOT NULL
            );
            CREATE TABLE event_sequence (
                aggregate_id TEXT PRIMARY KEY,
                seq INTEGER NOT NULL,
                owner_id TEXT
            );
            CREATE TABLE event (
                id TEXT PRIMARY KEY,
                aggregate_id TEXT NOT NULL,
                seq INTEGER NOT NULL,
                created INTEGER NOT NULL,
                type TEXT NOT NULL,
                data TEXT NOT NULL
            );
            """
        )
        connection.executemany(
            "INSERT INTO session_v2 VALUES (?, 'project', ?, ?, ?, ?, '/workspace', ?, ?, ?, NULL, NULL, NULL)",
            [
                ("ses_parent", None, None, None, "Parent", 1, 200, None),
                ("ses_child", "ses_parent", None, None, "Child", 2, 100, None),
                (
                    "ses_fork",
                    None,
                    "ses_parent",
                    json.dumps({"messageID": "msg_user", "type": "after"}),
                    "Fork",
                    3,
                    100,
                    None,
                ),
            ],
        )
        messages = [
            (
                "msg_user",
                "ses_parent",
                "user",
                1,
                10,
                10,
                {"text": "parent request " + "x" * 100},
            ),
            (
                "msg_assistant",
                "ses_parent",
                "assistant",
                2,
                20,
                20,
                assistant(
                    {"id": "ct_text", "type": "text", "text": "answer"},
                    {"id": "ct_reason", "type": "reasoning", "text": "REASONING_SECRET"},
                    {
                        "id": "ct_tool",
                        "type": "tool",
                        "name": "shell",
                        "callID": "call_1",
                        "state": {
                            "status": "completed",
                            "input": {"secret": "TOOL_SECRET"},
                            "output": "TOOL_OUTPUT_SECRET",
                        },
                    },
                ),
            ),
            (
                "msg_compaction",
                "ses_parent",
                "compaction",
                3,
                30,
                30,
                {"status": "completed", "summary": "COMPACTION_SECRET"},
            ),
            (
                "msg_running",
                "ses_parent",
                "assistant",
                4,
                40,
                40,
                assistant(
                    {
                        "type": "tool",
                        "name": "read",
                        "callID": "call_running",
                        "state": {"status": "running", "input": {"path": "PRIVATE"}},
                    },
                    completed=None,
                ),
            ),
            (
                "msg_child",
                "ses_child",
                "assistant",
                1,
                10,
                10,
                assistant({"type": "text", "text": "child result"}),
            ),
        ]
        connection.executemany(
            "INSERT INTO session_message VALUES (?, ?, ?, ?, ?, ?, ?)",
            [
                (message_id, session_id, kind, seq, created, updated, json.dumps(data))
                for message_id, session_id, kind, seq, created, updated, data in messages
            ],
        )
        connection.execute(
            "INSERT INTO session_inbox VALUES ('inbox_1', 'ses_parent', 'user', '{}', 'pending', 5, 50)"
        )
        connection.executemany(
            "INSERT INTO event_sequence VALUES (?, ?, NULL)",
            [("ses_parent", 9), ("ses_child", 3)],
        )
        connection.execute(
            "INSERT INTO event VALUES ('evt_1', 'ses_parent', 9, 50, 'message.updated', '{\"secret\":\"EVENT_SECRET\"}')"
        )
        connection.commit()
        connection.close()

    def tearDown(self) -> None:
        self.tempdir.cleanup()

    def run_script(
        self, *arguments: str, check: bool = True, database: Path | None = None
    ) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [
                sys.executable,
                str(SCRIPT),
                "--db",
                str(database or self.database),
                *arguments,
            ],
            check=check,
            capture_output=True,
            text=True,
        )

    def snapshot(self) -> dict[str, object]:
        return json.loads(
            self.run_script(
                "--max-content-chars", "20", "snapshot", "ses_parent"
            ).stdout
        )

    def delta(self, checkpoint: dict[str, object]) -> dict[str, object]:
        return json.loads(
            self.run_script(
                "--max-content-chars",
                "20",
                "delta",
                "ses_parent",
                "--checkpoint-json",
                json.dumps(checkpoint, separators=(",", ":")),
            ).stdout
        )

    def mutate(self, sql: str, parameters: tuple[object, ...] = ()) -> None:
        connection = sqlite3.connect(self.database)
        connection.execute(sql, parameters)
        connection.commit()
        connection.close()

    def test_snapshot_envelope_checkpoint_order_topology_and_privacy(self) -> None:
        result = self.snapshot()
        self.assertEqual({"name": EVIDENCE.ADAPTER, "version": 2}, result["adapter"])
        self.assertEqual("snapshot", result["mode"])
        self.assertEqual("v2", result["source"]["schema"])
        self.assertEqual(["ses_child"], result["scope"]["direct_child_ids"])
        self.assertEqual([1, 2, 3, 4], [item["seq"] for item in result["sessions"]["ses_parent"]["all_history"]])
        self.assertEqual(3, result["sessions"]["ses_parent"]["active_context_start_seq"])
        self.assertEqual(["ses_fork"], [item["id"] for item in result["topology"]["forks"]])
        self.assertEqual("ses_parent", result["topology"]["forks"][0]["fork"]["session_id"])
        checkpoint = result["checkpoint"]
        self.assertEqual(
            EVIDENCE.CHECKPOINT_FIELDS,
            set(checkpoint),
        )
        self.assertEqual(
            EVIDENCE.SESSION_CHECKPOINT_FIELDS,
            set(checkpoint["sessions"]["ses_parent"]),
        )
        self.assertEqual(4, checkpoint["sessions"]["ses_parent"]["terminal_seq"])
        self.assertEqual(9, checkpoint["event_watermarks"]["ses_parent"])
        self.assertEqual(5, checkpoint["inbox_watermarks"]["ses_parent"])
        encoded = json.dumps(result)
        for secret in (
            "REASONING_SECRET",
            "TOOL_SECRET",
            "TOOL_OUTPUT_SECRET",
            "COMPACTION_SECRET",
            "EVENT_SECRET",
            "PRIVATE",
        ):
            self.assertNotIn(secret, encoded)
        reasoning = result["sessions"]["ses_parent"]["all_history"][1]["content"][1]
        self.assertEqual("reasoning", reasoning["type"])
        self.assertNotIn("text", reasoning)
        self.assertEqual(1, result["sessions"]["ses_parent"]["reasoning_records_excluded"])

    def test_snapshot_is_deterministic_and_bounded(self) -> None:
        first = self.run_script("--max-content-chars", "20", "snapshot", "ses_parent")
        second = self.run_script("--max-content-chars", "20", "snapshot", "ses_parent")
        self.assertEqual(first.stdout, second.stdout)
        result = json.loads(first.stdout)
        user = result["sessions"]["ses_parent"]["all_history"][0]
        self.assertEqual(20, len(user["text_preview"]))
        self.assertIs(user["text_truncated"], True)
        limited = self.run_script(
            "--max-output-bytes", "1000", "snapshot", "ses_parent", check=False
        )
        self.assertNotEqual(0, limited.returncode)
        self.assertIn("output would be", limited.stderr)
        messages = self.run_script(
            "--max-messages", "1", "snapshot", "ses_parent", check=False
        )
        self.assertNotEqual(0, messages.returncode)
        self.assertIn("raise --max-messages", messages.stderr)

    def test_noop_and_pure_append_delta(self) -> None:
        checkpoint = self.snapshot()["checkpoint"]
        no_op = self.delta(checkpoint)
        self.assertEqual("delta", no_op["mode"])
        self.assertEqual([], no_op["sessions"]["ses_parent"]["appended"])
        self.assertEqual(checkpoint, no_op["checkpoint"])

        self.mutate(
            "UPDATE session_v2 SET time_updated = 300 WHERE id = 'ses_parent'"
        )
        self.mutate(
            "INSERT INTO session_message VALUES (?, ?, ?, ?, ?, ?, ?)",
            (
                "msg_append",
                "ses_parent",
                "user",
                5,
                50,
                50,
                json.dumps({"text": "new request"}),
            ),
        )
        appended = self.delta(checkpoint)
        self.assertEqual("delta", appended["mode"])
        self.assertEqual(
            ["msg_append"],
            [item["id"] for item in appended["sessions"]["ses_parent"]["appended"]],
        )
        self.assertEqual(5, appended["checkpoint"]["sessions"]["ses_parent"]["terminal_seq"])

    def assert_rebuild(self, checkpoint: dict[str, object], reason: str) -> None:
        result = self.delta(checkpoint)
        self.assertEqual("rebuild_required", result["mode"])
        self.assertEqual(reason, result["reason"])
        self.assertNotIn("sessions", result)

    def test_existing_message_update_requires_rebuild(self) -> None:
        checkpoint = self.snapshot()["checkpoint"]
        self.mutate(
            "UPDATE session_message SET time_updated = 99, data = ? WHERE id = 'msg_user'",
            (json.dumps({"text": "changed"}),),
        )
        self.assert_rebuild(checkpoint, "projected-prefix-changed")

    def test_deletion_and_replacement_require_rebuild(self) -> None:
        checkpoint = self.snapshot()["checkpoint"]
        self.mutate("DELETE FROM session_message WHERE id = 'msg_user'")
        self.assert_rebuild(checkpoint, "projected-history-deleted")

        self.tearDown()
        self.setUp()
        checkpoint = self.snapshot()["checkpoint"]
        self.mutate("DELETE FROM session_message WHERE id = 'msg_user'")
        self.mutate(
            "INSERT INTO session_message VALUES ('msg_replacement', 'ses_parent', 'user', 1, 10, 10, '{\"text\":\"replacement\"}')"
        )
        self.assert_rebuild(checkpoint, "projected-prefix-changed")

    def test_child_add_remove_and_parent_change_require_rebuild(self) -> None:
        checkpoint = self.snapshot()["checkpoint"]
        self.mutate(
            "INSERT INTO session_v2 VALUES ('ses_new', 'project', 'ses_parent', NULL, NULL, 'New', '/workspace', 5, 5, NULL, NULL, NULL, NULL)"
        )
        self.assert_rebuild(checkpoint, "topology-changed")

        self.tearDown()
        self.setUp()
        checkpoint = self.snapshot()["checkpoint"]
        self.mutate("DELETE FROM session_v2 WHERE id = 'ses_child'")
        self.assert_rebuild(checkpoint, "topology-changed")

        self.tearDown()
        self.setUp()
        checkpoint = self.snapshot()["checkpoint"]
        self.mutate("UPDATE session_v2 SET parent_id = NULL WHERE id = 'ses_child'")
        self.assert_rebuild(checkpoint, "topology-changed")

    def test_new_completed_compaction_requires_rebuild(self) -> None:
        checkpoint = self.snapshot()["checkpoint"]
        self.mutate(
            "INSERT INTO session_message VALUES ('msg_compaction_2', 'ses_parent', 'compaction', 5, 50, 50, '{\"status\":\"completed\"}')"
        )
        self.assert_rebuild(checkpoint, "active-context-moved")

    def test_source_replacement_and_wrong_checkpoint_fail_closed(self) -> None:
        checkpoint = self.snapshot()["checkpoint"]
        replacement = Path(self.tempdir.name) / "replacement.db"
        shutil.copy2(self.database, replacement)
        os.replace(replacement, self.database)
        self.assert_rebuild(checkpoint, "source-changed")

        legacy = self.run_script(
            "delta",
            "ses_parent",
            "--checkpoint-json",
            '{"version":1,"sessions":{}}',
            check=False,
            database=self.database,
        )
        self.assertNotEqual(0, legacy.returncode)
        self.assertIn("full snapshot rebuild required", legacy.stderr)

    def test_stale_terminal_checkpoint_requires_rebuild(self) -> None:
        checkpoint = self.snapshot()["checkpoint"]
        checkpoint["sessions"]["ses_parent"]["terminal_seq"] = 99
        checkpoint["sessions"]["ses_parent"]["message_count"] = 99
        self.assert_rebuild(checkpoint, "projected-history-deleted")

    def test_path_resolution_precedence(self) -> None:
        with mock.patch.dict(os.environ, {"OPENCODE_DB": str(self.database)}):
            self.assertEqual(self.database, EVIDENCE.database_path(None))
        explicit = Path(self.tempdir.name) / "explicit.db"
        explicit.touch()
        with mock.patch.dict(os.environ, {"OPENCODE_DB": str(self.database)}):
            self.assertEqual(explicit, EVIDENCE.database_path(str(explicit)))

    def test_help_exposes_only_snapshot_and_delta(self) -> None:
        completed = subprocess.run(
            [sys.executable, str(SCRIPT), "--help"],
            capture_output=True,
            text=True,
            check=True,
        )
        self.assertIn("snapshot", completed.stdout)
        self.assertIn("delta", completed.stdout)
        for prohibited in ("bundle", "outline", "locate", "tool-context", "part-after"):
            self.assertNotIn(prohibited, completed.stdout.lower())

    def test_v1_only_database_is_rejected_without_fallback(self) -> None:
        legacy = Path(self.tempdir.name) / "legacy.db"
        connection = sqlite3.connect(legacy)
        connection.executescript("CREATE TABLE session(id TEXT); CREATE TABLE message(id TEXT); CREATE TABLE part(id TEXT);")
        connection.close()
        completed = self.run_script(
            "snapshot", "ses_parent", check=False, database=legacy
        )
        self.assertNotEqual(0, completed.returncode)
        self.assertIn("required table is missing: session_v2", completed.stderr)


if __name__ == "__main__":
    unittest.main()
