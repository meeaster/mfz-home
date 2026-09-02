from __future__ import annotations

import importlib.util
import json
import sqlite3
import subprocess
import sys
import tempfile
import unittest
from decimal import Decimal
from pathlib import Path
from typing import Any


SCRIPT = (
    Path(__file__).parents[4]
    / "skills/active/agent-sessions/scripts/opencode-session-cost.py"
)
SPEC = importlib.util.spec_from_file_location("opencode_session_cost", SCRIPT)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError("unable to load cost calculator")
COST = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(COST)


class OpenCodeSessionCostTest(unittest.TestCase):
    def setUp(self) -> None:
        self.tempdir = tempfile.TemporaryDirectory()
        self.database = Path(self.tempdir.name) / "opencode.db"
        self.catalog = Path(self.tempdir.name) / "models.json"
        self.create_database()
        self.catalog.write_text(json.dumps(self.catalog_data()), encoding="utf-8")

    def tearDown(self) -> None:
        self.tempdir.cleanup()

    @staticmethod
    def assistant(
        provider: str,
        model: str,
        tokens: dict[str, int] | None,
        variant: str | None = None,
    ) -> dict[str, Any]:
        data: dict[str, Any] = {
            "model": {"providerID": provider, "id": model},
            "content": [
                {"type": "text", "text": "TRANSCRIPT_SECRET"},
                {"type": "reasoning", "text": "REASONING_SECRET"},
                {
                    "type": "tool",
                    "name": "shell",
                    "state": {"input": {"secret": "TOOL_SECRET"}},
                },
            ],
            "time": {"created": 1},
        }
        if variant is not None:
            data["model"]["variant"] = variant
        if tokens is not None:
            data["cost"] = 0.001
            data["tokens"] = {
                "input": tokens["input"],
                "output": tokens["output"],
                "reasoning": tokens["reasoning"],
                "cache": {
                    "read": tokens["cache_read"],
                    "write": tokens["cache_write"],
                },
            }
        return data

    def create_database(self) -> None:
        connection = sqlite3.connect(self.database)
        connection.executescript(
            """
            CREATE TABLE session_v2 (
                id TEXT PRIMARY KEY,
                parent_id TEXT,
                title TEXT,
                agent TEXT,
                cost REAL NOT NULL
            );
            CREATE TABLE session_message (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                type TEXT NOT NULL,
                seq INTEGER NOT NULL,
                data TEXT NOT NULL,
                UNIQUE(session_id, seq)
            );
            """
        )
        connection.executemany(
            "INSERT INTO session_v2 VALUES (?, ?, ?, ?, ?)",
            [
                ("ses_root", None, "Root", "build", 0.1),
                ("ses_child", "ses_root", "Child", None, 0.02),
                ("ses_grandchild", "ses_child", "Grandchild", "research", 0.003),
                ("ses_fork", None, "Unrelated fork", "build", 9.0),
            ],
        )
        turns = [
            (
                "msg_root_a",
                "ses_root",
                1,
                self.assistant(
                    "provider-a",
                    "model-a",
                    {"input": 100, "output": 20, "reasoning": 5, "cache_read": 10, "cache_write": 3},
                    "fast",
                ),
            ),
            (
                "msg_root_b",
                "ses_root",
                2,
                self.assistant(
                    "provider-a",
                    "model-b",
                    {"input": 90, "output": 30, "reasoning": 4, "cache_read": 10, "cache_write": 0},
                    "slow",
                ),
            ),
            (
                "msg_running",
                "ses_root",
                3,
                self.assistant("provider-a", "model-a", None),
            ),
            (
                "msg_child",
                "ses_child",
                1,
                self.assistant(
                    "provider-a",
                    "model-a",
                    {"input": 1, "output": 2, "reasoning": 3, "cache_read": 4, "cache_write": 5},
                ),
            ),
            (
                "msg_grandchild",
                "ses_grandchild",
                1,
                self.assistant(
                    "provider-b",
                    "model-c",
                    {"input": 7, "output": 8, "reasoning": 9, "cache_read": 6, "cache_write": 5},
                    "reasoning",
                ),
            ),
            (
                "msg_fork",
                "ses_fork",
                1,
                self.assistant(
                    "provider-a",
                    "model-a",
                    {"input": 999, "output": 999, "reasoning": 999, "cache_read": 999, "cache_write": 999},
                ),
            ),
        ]
        connection.executemany(
            "INSERT INTO session_message VALUES (?, ?, 'assistant', ?, ?)",
            [(message_id, session_id, seq, json.dumps(data)) for message_id, session_id, seq, data in turns],
        )
        connection.execute(
            "INSERT INTO session_message VALUES ('msg_user', 'ses_root', 'user', 4, ?)",
            (json.dumps({"text": "USER_SECRET"}),),
        )
        connection.commit()
        connection.close()

    @staticmethod
    def catalog_data() -> dict[str, Any]:
        return {
            "provider-a": {
                "models": {
                    "model-a": {
                        "cost": {
                            "input": 1,
                            "output": 2,
                            "cache_read": 0.1,
                            "cache_write": 0.4,
                            "tiers": [
                                {
                                    "tier": {"type": "context", "size": 100},
                                    "input": 10,
                                    "output": 20,
                                    "cache_read": 30,
                                    "cache_write": 40,
                                }
                            ],
                        }
                    },
                    "model-b": {
                        "cost": {
                            "input": 1.1,
                            "output": 2.2,
                            "reasoning": 0.7,
                            "cache_read": 0.11,
                            "cache_write": 0.44,
                        }
                    },
                    "model-mode": {
                        "cost": {
                            "input": 1,
                            "output": 2,
                            "tiers": [
                                {
                                    "tier": {"type": "context", "size": 100},
                                    "input": 3,
                                    "output": 4,
                                }
                            ],
                            "context_over_200k": {"input": 5, "output": 6},
                        },
                        "experimental": {
                            "modes": {
                                "fast": {
                                    "cost": {
                                        "input": 10,
                                        "output": 20,
                                        "reasoning": 7,
                                        "tiers": [
                                            {
                                                "tier": {"type": "context", "size": 100},
                                                "input": 11,
                                                "output": 21,
                                                "reasoning": 7,
                                            }
                                        ],
                                    }
                                }
                            }
                        },
                    },
                }
            },
            "provider-b": {
                "models": {
                    "model-c": {
                        "cost": {
                            "input": 3,
                            "output": 4,
                            "reasoning": 1.25,
                            "cache_read": 0.5,
                            "cache_write": 0.25,
                        }
                    }
                }
            },
        }

    def run_calculator(self, *arguments: str, check: bool = True) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [
                sys.executable,
                str(SCRIPT),
                "--db",
                str(self.database),
                "--models-file",
                str(self.catalog),
                *arguments,
                "ses_root",
            ],
            check=check,
            capture_output=True,
            text=True,
        )

    def test_recursive_scope_model_switch_pricing_and_body_exclusion(self) -> None:
        completed = self.run_calculator()
        result = json.loads(completed.stdout)
        self.assertEqual("v2", result["source"]["schema"])
        self.assertEqual(
            ["ses_root", "ses_child", "ses_grandchild"],
            [session["id"] for session in result["sessions"]],
        )
        self.assertEqual([0, 1, 2], [session["depth"] for session in result["sessions"]])
        self.assertEqual(3, result["total"]["session_count"])
        self.assertEqual(4, result["total"]["turn_count"])
        self.assertEqual(
            {
                "input": 198,
                "output": 60,
                "cache_read": 30,
                "cache_write": 13,
                "reasoning": 21,
                "context": 241,
            },
            result["total"]["tokens"],
        )
        self.assertEqual(0.0021708, result["total"]["estimated_cost_usd"])
        self.assertEqual(0.123, result["total"]["stored_cost_usd"])
        self.assertEqual(["model-a", "model-b"], [item["modelID"] for item in result["sessions"][0]["breakdown"]])
        self.assertIsNone(result["sessions"][1]["agent"])
        for secret in ("TRANSCRIPT_SECRET", "REASONING_SECRET", "TOOL_SECRET", "USER_SECRET"):
            self.assertNotIn(secret, completed.stdout)

    def test_tier_reasoning_cache_and_mode_pricing(self) -> None:
        result = json.loads(self.run_calculator().stdout)
        root, child, grandchild = result["sessions"]
        self.assertEqual(0.00192, root["breakdown"][0]["estimated_cost_usd"])
        self.assertEqual(0.0001689, root["breakdown"][1]["estimated_cost_usd"])
        self.assertEqual(0.0000134, child["estimated_cost_usd"])
        self.assertEqual(0.0000685, grandchild["estimated_cost_usd"])

        catalog = COST.parse_catalog(json.dumps(self.catalog_data()).encode(), "fixture")
        base = COST.pricing_for(catalog, "provider-a", "model-mode", Decimal(100))
        tier = COST.pricing_for(catalog, "provider-a", "model-mode-fast", Decimal(101))
        self.assertEqual(Decimal(1), base["input"])
        self.assertEqual(Decimal(11), tier["input"])
        self.assertEqual(Decimal(7), tier["reasoning"])

    def test_deterministic_pretty_and_local_catalog_metadata(self) -> None:
        first = self.run_calculator()
        second = self.run_calculator()
        self.assertEqual(first.stdout, second.stdout)
        pretty = self.run_calculator("--pretty")
        self.assertTrue(pretty.stdout.startswith("{\n"))
        self.assertEqual(json.loads(first.stdout), json.loads(pretty.stdout))
        pricing = json.loads(first.stdout)["pricing"]
        self.assertEqual("file", pricing["source_kind"])
        self.assertEqual(64, len(pricing["sha256"]))
        self.assertNotIn("retrieved_at", pricing)

    def test_malformed_json_and_incomplete_usage_fail_without_bodies(self) -> None:
        connection = sqlite3.connect(self.database)
        connection.execute("UPDATE session_message SET data = 'not-json' WHERE id = 'msg_user'")
        connection.commit()
        connection.close()
        malformed = self.run_calculator(check=False)
        self.assertNotEqual(0, malformed.returncode)
        self.assertIn("contains malformed JSON", malformed.stderr)
        self.assertNotIn("USER_SECRET", malformed.stderr)

        self.tearDown()
        self.setUp()
        connection = sqlite3.connect(self.database)
        connection.execute(
            "UPDATE session_message SET data = ? WHERE id = 'msg_running'",
            (
                json.dumps(
                    {
                        "model": {"providerID": "provider-a", "id": "model-a"},
                        "content": [{"type": "text", "text": "INCOMPLETE_SECRET"}],
                        "cost": 0.1,
                    }
                ),
            ),
        )
        connection.commit()
        connection.close()
        incomplete = self.run_calculator(check=False)
        self.assertNotEqual(0, incomplete.returncode)
        self.assertIn("tokens", incomplete.stderr)
        self.assertNotIn("INCOMPLETE_SECRET", incomplete.stderr)

    def test_cycle_guard_does_not_duplicate_scope(self) -> None:
        connection = sqlite3.connect(self.database)
        connection.execute(
            "UPDATE session_v2 SET parent_id = 'ses_grandchild' WHERE id = 'ses_root'"
        )
        connection.commit()
        connection.close()
        result = json.loads(self.run_calculator().stdout)
        self.assertEqual(
            ["ses_root", "ses_child", "ses_grandchild"],
            [session["id"] for session in result["sessions"]],
        )

    def test_missing_pricing_and_v2_contract_fail_clearly(self) -> None:
        catalog = self.catalog_data()
        del catalog["provider-b"]["models"]["model-c"]
        self.catalog.write_text(json.dumps(catalog), encoding="utf-8")
        pricing = self.run_calculator(check=False)
        self.assertNotEqual(0, pricing.returncode)
        self.assertIn("pricing model missing", pricing.stderr)

        legacy = Path(self.tempdir.name) / "legacy.db"
        connection = sqlite3.connect(legacy)
        connection.executescript(
            "CREATE TABLE session(id TEXT); CREATE TABLE message(id TEXT); CREATE TABLE part(id TEXT);"
        )
        connection.close()
        completed = subprocess.run(
            [
                sys.executable,
                str(SCRIPT),
                "--db",
                str(legacy),
                "--models-file",
                str(self.catalog),
                "ses_root",
            ],
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertNotEqual(0, completed.returncode)
        self.assertIn("required table is missing: session_v2", completed.stderr)


if __name__ == "__main__":
    unittest.main()
