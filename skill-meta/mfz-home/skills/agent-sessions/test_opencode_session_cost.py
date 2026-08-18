from __future__ import annotations

import importlib.util
import json
import sqlite3
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from typing import Any


SCRIPT = (
    Path(__file__).parents[4]
    / "skills/active/agent-sessions/scripts/opencode-session-cost.py"
)
SCRIPT_SPEC = importlib.util.spec_from_file_location("opencode_session_cost", SCRIPT)
if SCRIPT_SPEC is None or SCRIPT_SPEC.loader is None:
    raise RuntimeError("unable to load cost calculator module")
COST = importlib.util.module_from_spec(SCRIPT_SPEC)
SCRIPT_SPEC.loader.exec_module(COST)


class OpenCodeSessionCostTest(unittest.TestCase):
    def setUp(self) -> None:
        self.tempdir = tempfile.TemporaryDirectory()
        self.database = Path(self.tempdir.name) / "opencode.db"
        self.catalog = Path(self.tempdir.name) / "models.json"
        self._create_database()
        self._write_catalog(self._catalog_data())

    def tearDown(self) -> None:
        self.tempdir.cleanup()

    def _create_database(self) -> None:
        connection = sqlite3.connect(self.database)
        connection.executescript(
            """
            CREATE TABLE session (
                id TEXT PRIMARY KEY,
                parent_id TEXT,
                title TEXT NOT NULL,
                agent TEXT,
                model TEXT,
                cost TEXT NOT NULL
            );
            CREATE TABLE message (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                data TEXT NOT NULL
            );
            CREATE TABLE part (
                id TEXT PRIMARY KEY,
                message_id TEXT NOT NULL,
                session_id TEXT NOT NULL,
                data TEXT NOT NULL
            );
            """
        )
        connection.executemany(
            "INSERT INTO session (id, parent_id, title, agent, model, cost) VALUES (?, ?, ?, ?, ?, ?)",
            [
                ("ses_root", None, "Root session", "build", "provider-a/model-old", "0.1"),
                ("ses_child", "ses_root", "Child session", None, "provider-a/model-old", "0.02"),
                ("ses_grandchild", "ses_child", "Grandchild", "research", "provider-a/model-old", "0.003"),
            ],
        )
        messages = [
            (
                "msg_root_1",
                "ses_root",
                {"role": "assistant", "providerID": "provider-a", "modelID": "model-a", "variant": "fast"},
            ),
            (
                "msg_root_2",
                "ses_root",
                {"role": "assistant", "providerID": "provider-a", "modelID": "model-b", "variant": "slow"},
            ),
            (
                "msg_child",
                "ses_child",
                {"role": "assistant", "providerID": "provider-a", "modelID": "model-a"},
            ),
            (
                "msg_grandchild",
                "ses_grandchild",
                {"role": "assistant", "providerID": "provider-b", "modelID": "model-c", "variant": "reasoning"},
            ),
        ]
        connection.executemany(
            "INSERT INTO message (id, session_id, data) VALUES (?, ?, ?)",
            [(message_id, session_id, json.dumps(data)) for message_id, session_id, data in messages],
        )
        parts = [
            (
                "part_root_1",
                "msg_root_1",
                "ses_root",
                {
                    "type": "step-finish",
                    "cost": 0.001,
                    "tokens": {
                        "input": 100,
                        "output": 20,
                        "reasoning": 5,
                        "cache": {"read": 10, "write": 3},
                    },
                },
            ),
            (
                "part_root_2",
                "msg_root_2",
                "ses_root",
                {
                    "type": "step-finish",
                    "cost": 0.001,
                    "tokens": {
                        "input": 90,
                        "output": 30,
                        "reasoning": 4,
                        "cache": {"read": 10, "write": 0},
                    },
                },
            ),
            (
                "part_child",
                "msg_child",
                "ses_child",
                {
                    "type": "step-finish",
                    "cost": 0.0000134,
                    "tokens": {
                        "input": 1,
                        "output": 2,
                        "reasoning": 3,
                        "cache": {"read": 4, "write": 5},
                    },
                },
            ),
            (
                "part_grandchild",
                "msg_grandchild",
                "ses_grandchild",
                {
                    "type": "step-finish",
                    "cost": 0.0000685,
                    "tokens": {
                        "input": 7,
                        "output": 8,
                        "reasoning": 9,
                        "cache": {"read": 6, "write": 5},
                    },
                },
            ),
            (
                "part_text",
                "msg_root_1",
                "ses_root",
                {"type": "text", "text": "TRANSCRIPT_SECRET"},
            ),
            (
                "part_reasoning",
                "msg_root_1",
                "ses_root",
                {"type": "reasoning", "text": "REASONING_SECRET"},
            ),
            (
                "part_tool",
                "msg_root_1",
                "ses_root",
                {"type": "tool", "tool": "bash", "state": {"input": {"secret": "TOOL_SECRET"}}},
            ),
        ]
        connection.executemany(
            "INSERT INTO part (id, message_id, session_id, data) VALUES (?, ?, ?, ?)",
            [(part_id, message_id, session_id, json.dumps(data)) for part_id, message_id, session_id, data in parts],
        )
        connection.commit()
        connection.close()

    def _catalog_data(self) -> dict[str, Any]:
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
                    "model-context-base": {
                        "cost": {
                            "input": 1,
                            "output": 1,
                            "context_over_200k": {"input": 10, "output": 10},
                        },
                        "experimental": {"modes": {"unrelated": "malformed but ignored"}},
                    },
                    "model-context-over": {
                        "cost": {
                            "input": 1,
                            "output": 1,
                            "context_over_200k": {"input": 10, "output": 10},
                        }
                    },
                    "model-context-overlap": {
                        "cost": {
                            "input": 1,
                            "output": 1,
                            "context_over_200k": {"input": 10, "output": 10},
                            "tiers": [
                                {
                                    "tier": {"type": "context", "size": 100000},
                                    "input": 5,
                                    "output": 5,
                                }
                            ],
                        }
                    },
                    "model-mode": {
                        "cost": {"input": 1, "output": 2},
                        "experimental": {
                            "modes": {
                                "fast": {
                                    "cost": {"input": 10, "output": 20, "reasoning": 7}
                                },
                                "broken": "unrelated malformed but ignored",
                            }
                        },
                    },
                    "model-mode-base-rates": {
                        "cost": {
                            "input": 1,
                            "output": 2,
                            "cache_read": 100,
                            "cache_write": 100,
                            "tiers": [
                                {
                                    "tier": {"type": "context", "size": 100},
                                    "input": 3,
                                    "output": 4,
                                    "cache_read": 30,
                                    "cache_write": 40,
                                }
                            ],
                            "context_over_200k": {
                                "input": 5,
                                "output": 6,
                                "cache_read": 50,
                                "cache_write": 60,
                            },
                        },
                        "experimental": {"modes": {"fast": {"cost": {"input": 10, "output": 20}}}},
                    },
                    "model-mode-base-over": {
                        "cost": {
                            "input": 1,
                            "output": 2,
                            "tiers": [
                                {
                                    "tier": {"type": "context", "size": 300000},
                                    "input": 3,
                                    "output": 4,
                                }
                            ],
                            "context_over_200k": {"input": 5, "output": 6, "cache_read": 50},
                        },
                        "experimental": {"modes": {"fast": {"cost": {"input": 10, "output": 20}}}},
                    },
                    "model-mode-tier": {
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
                                        "tiers": [
                                            {
                                                "tier": {"type": "context", "size": 100},
                                                "input": 11,
                                                "output": 21,
                                            }
                                        ],
                                    }
                                }
                            }
                        },
                    },
                    "model-mode-over": {
                        "cost": {
                            "input": 1,
                            "output": 2,
                            "tiers": [
                                {
                                    "tier": {"type": "context", "size": 300000},
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
                                        "tiers": [
                                            {
                                                "tier": {"type": "context", "size": 300000},
                                                "input": 11,
                                                "output": 21,
                                            }
                                        ],
                                        "context_over_200k": {"input": 50, "output": 60},
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

    def _write_catalog(self, catalog: dict[str, object]) -> None:
        self.catalog.write_text(json.dumps(catalog), encoding="utf-8")

    def _replace_with_v2_database(self) -> None:
        connection = sqlite3.connect(self.database)
        connection.executescript(
            """
            DROP TABLE part;
            DROP TABLE message;
            DROP TABLE session;
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
                data TEXT NOT NULL
            );
            """
        )
        connection.executemany(
            "INSERT INTO session_v2 (id, parent_id, title, agent, cost) VALUES (?, ?, ?, ?, ?)",
            [
                ("ses_root", None, "V2 root", "build", 0.1),
                ("ses_child", "ses_root", "V2 child", None, 0.02),
                ("ses_fork", None, "V2 fork", "build", 0.5),
            ],
        )

        def assistant(
            provider_id: str,
            model_id: str,
            tokens: dict[str, int] | None,
            variant: str | None = None,
        ) -> dict[str, Any]:
            result: dict[str, Any] = {
                "agent": "build",
                "model": {"providerID": provider_id, "id": model_id},
                "content": [{"type": "text", "text": "V2_TRANSCRIPT_SECRET"}],
                "time": {"created": 1},
            }
            if variant is not None:
                result["model"]["variant"] = variant
            if tokens is not None:
                result["cost"] = 0.001
                result["tokens"] = {
                    "input": tokens["input"],
                    "output": tokens["output"],
                    "reasoning": tokens["reasoning"],
                    "cache": {
                        "read": tokens["cache_read"],
                        "write": tokens["cache_write"],
                    },
                }
            return result

        messages = [
            (
                "msg_root",
                "ses_root",
                "assistant",
                1,
                assistant(
                    "provider-a",
                    "model-a",
                    {"input": 100, "output": 20, "reasoning": 5, "cache_read": 10, "cache_write": 3},
                    "fast",
                ),
            ),
            (
                "msg_running",
                "ses_root",
                "assistant",
                2,
                assistant("provider-a", "model-a", None),
            ),
            (
                "msg_user",
                "ses_root",
                "user",
                3,
                {"content": [{"type": "text", "text": "V2_USER_SECRET"}]},
            ),
            (
                "msg_child",
                "ses_child",
                "assistant",
                1,
                assistant(
                    "provider-b",
                    "model-c",
                    {"input": 7, "output": 8, "reasoning": 9, "cache_read": 6, "cache_write": 5},
                    "reasoning",
                ),
            ),
            (
                "msg_fork",
                "ses_fork",
                "assistant",
                1,
                assistant(
                    "provider-a",
                    "model-b",
                    {"input": 999, "output": 999, "reasoning": 999, "cache_read": 999, "cache_write": 999},
                ),
            ),
        ]
        connection.executemany(
            "INSERT INTO session_message (id, session_id, type, seq, data) VALUES (?, ?, ?, ?, ?)",
            [
                (message_id, session_id, message_type, seq, json.dumps(data))
                for message_id, session_id, message_type, seq, data in messages
            ],
        )
        connection.commit()
        connection.close()

    def _add_turn(
        self,
        part_id: str,
        message_id: str,
        model_id: str,
        tokens: dict[str, int],
        variant: str | None = None,
        session_id: str = "ses_root",
    ) -> None:
        message = {
            "role": "assistant",
            "providerID": "provider-a",
            "modelID": model_id,
        }
        if variant is not None:
            message["variant"] = variant
        part = {
            "type": "step-finish",
            "cost": 0,
            "tokens": {
                "input": tokens["input"],
                "output": tokens["output"],
                "reasoning": tokens["reasoning"],
                "cache": {"read": tokens["cache_read"], "write": tokens["cache_write"]},
            },
        }
        connection = sqlite3.connect(self.database)
        connection.execute(
            "INSERT INTO message (id, session_id, data) VALUES (?, ?, ?)",
            (message_id, session_id, json.dumps(message)),
        )
        connection.execute(
            "INSERT INTO part (id, message_id, session_id, data) VALUES (?, ?, ?, ?)",
            (part_id, message_id, session_id, json.dumps(part)),
        )
        connection.commit()
        connection.close()

    def _add_session_turn(
        self,
        session_id: str,
        model_id: str,
        tokens: dict[str, int],
        variant: str = "high",
    ) -> None:
        connection = sqlite3.connect(self.database)
        connection.execute(
            "INSERT INTO session (id, parent_id, title, agent, model, cost) VALUES (?, ?, ?, ?, ?, ?)",
            (session_id, "ses_root", session_id, None, model_id, "0"),
        )
        connection.commit()
        connection.close()
        self._add_turn(
            f"part_{session_id}",
            f"msg_{session_id}",
            model_id,
            tokens,
            variant,
            session_id,
        )

    def run_calculator(
        self,
        *arguments: str,
        check: bool = True,
    ) -> subprocess.CompletedProcess[str]:
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

    def test_recursive_scope_exact_totals_and_model_switch(self) -> None:
        result = json.loads(self.run_calculator().stdout)

        self.assertEqual("ses_root", result["root_session_id"])
        self.assertEqual("read-only", result["source"]["mode"])
        self.assertEqual("v1", result["source"]["schema"])
        self.assertIn("all recursive descendants", result["scope"])
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
        self.assertIn("Models.dev-first", result["calculation"]["method"])
        self.assertIn("experimental.modes[mode].cost", result["calculation"]["method"])
        self.assertIn("only when reasoning is absent", result["calculation"]["reasoning_method"])
        self.assertEqual(
            ["ses_root", "ses_child", "ses_grandchild"],
            [session["id"] for session in result["sessions"]],
        )
        self.assertEqual(["main", "subagent", "subagent"], [session["kind"] for session in result["sessions"]])
        self.assertEqual([0, 1, 2], [session["depth"] for session in result["sessions"]])
        self.assertEqual(2, result["sessions"][0]["turn_count"])
        self.assertIsNone(result["sessions"][1]["agent"])
        self.assertEqual(
            {"providerID": "provider-a", "modelID": "model-a", "variant": "fast"},
            {key: result["sessions"][0]["breakdown"][0][key] for key in ("providerID", "modelID", "variant")},
        )
        self.assertEqual(
            {"providerID": "provider-a", "modelID": "model-b", "variant": "slow"},
            {key: result["sessions"][0]["breakdown"][1][key] for key in ("providerID", "modelID", "variant")},
        )
        self.assertNotIn("model-old", json.dumps(result))

    def test_tier_threshold_reasoning_fallback_explicit_reasoning_and_cache_categories(self) -> None:
        result = json.loads(self.run_calculator().stdout)
        root, child, grandchild = result["sessions"]

        self.assertEqual(0.00192, root["breakdown"][0]["estimated_cost_usd"])
        self.assertEqual(0.0001689, root["breakdown"][1]["estimated_cost_usd"])
        self.assertEqual(0.0000134, child["estimated_cost_usd"])
        self.assertEqual(0.0000685, grandchild["estimated_cost_usd"])
        self.assertEqual(
            {"input": 100, "output": 20, "cache_read": 10, "cache_write": 3, "reasoning": 5, "context": 113},
            root["breakdown"][0]["tokens"],
        )
        self.assertEqual(
            {"input": 90, "output": 30, "cache_read": 10, "cache_write": 0, "reasoning": 4, "context": 100},
            root["breakdown"][1]["tokens"],
        )
        self.assertEqual(
            {"input": 1, "output": 2, "cache_read": 4, "cache_write": 5, "reasoning": 3, "context": 10},
            child["tokens"],
        )
        self.assertEqual("reasoning", grandchild["breakdown"][0]["variant"])

    def test_local_catalog_output_is_deterministic_and_has_no_transcript_content(self) -> None:
        first = self.run_calculator()
        second = self.run_calculator()
        self.assertEqual(first.stdout, second.stdout)
        for secret in ("TRANSCRIPT_SECRET", "REASONING_SECRET", "TOOL_SECRET"):
            self.assertNotIn(secret, first.stdout)
        pricing = json.loads(first.stdout)["pricing"]
        self.assertNotIn("retrieved_at", pricing)
        self.assertEqual("file", pricing["source_kind"])
        self.assertEqual(64, len(pricing["sha256"]))

    def test_pretty_output(self) -> None:
        compact = json.loads(self.run_calculator().stdout)
        pretty = self.run_calculator("--pretty")
        self.assertTrue(pretty.stdout.startswith("{\n"))
        self.assertEqual(compact, json.loads(pretty.stdout))

    def test_missing_model_and_missing_rate_fail(self) -> None:
        missing_model = self._catalog_data()
        del missing_model["provider-b"]["models"]["model-c"]
        self._write_catalog(missing_model)
        completed = self.run_calculator(check=False)
        self.assertNotEqual(0, completed.returncode)
        self.assertIn("pricing model missing", completed.stderr)

        missing_rate = self._catalog_data()
        del missing_rate["provider-a"]["models"]["model-b"]["cost"]["output"]
        self._write_catalog(missing_rate)
        completed = self.run_calculator(check=False)
        self.assertNotEqual(0, completed.returncode)
        self.assertIn("output rate is missing", completed.stderr)

    def test_context_over_200k_precedence_and_missing_cache_defaults(self) -> None:
        self._add_turn(
            "part_context_equal",
            "msg_context_equal",
            "model-context-base",
            {"input": 199990, "output": 1, "reasoning": 0, "cache_read": 10, "cache_write": 0},
        )
        self._add_turn(
            "part_context_above",
            "msg_context_above",
            "model-context-over",
            {"input": 199991, "output": 1, "reasoning": 0, "cache_read": 10, "cache_write": 0},
        )
        self._add_turn(
            "part_context_overlap",
            "msg_context_overlap",
            "model-context-overlap",
            {"input": 199991, "output": 1, "reasoning": 0, "cache_read": 10, "cache_write": 0},
        )

        result = json.loads(self.run_calculator().stdout)
        by_model = {
            entry["modelID"]: entry
            for entry in result["sessions"][0]["breakdown"]
            if entry["modelID"].startswith("model-context")
        }
        self.assertEqual(0.199991, by_model["model-context-base"]["estimated_cost_usd"])
        self.assertEqual(1.99992, by_model["model-context-over"]["estimated_cost_usd"])
        self.assertEqual(0.99996, by_model["model-context-overlap"]["estimated_cost_usd"])
        self.assertEqual(200000, by_model["model-context-base"]["tokens"]["context"])
        self.assertEqual(200001, by_model["model-context-over"]["tokens"]["context"])
        self.assertEqual(10, by_model["model-context-over"]["tokens"]["cache_read"])

    def test_matching_mode_replaces_cost_and_preserves_exact_variants(self) -> None:
        tokens = {"input": 2, "output": 3, "reasoning": 1, "cache_read": 4, "cache_write": 5}
        self._add_turn("part_mode_fast", "msg_mode_fast", "model-mode-fast", tokens, "high")
        self._add_turn("part_mode_normal", "msg_mode_normal", "model-mode", tokens, "fast")

        result = json.loads(self.run_calculator().stdout)
        entries = {
            entry["modelID"]: entry
            for entry in result["sessions"][0]["breakdown"]
            if entry["modelID"].startswith("model-mode")
        }
        self.assertEqual(0.000087, entries["model-mode-fast"]["estimated_cost_usd"])
        self.assertEqual(0.00001, entries["model-mode"]["estimated_cost_usd"])
        self.assertEqual(tokens | {"context": 11}, entries["model-mode-fast"]["tokens"])
        self.assertEqual(tokens | {"context": 11}, entries["model-mode"]["tokens"])
        self.assertEqual("high", entries["model-mode-fast"]["variant"])
        self.assertEqual("fast", entries["model-mode"]["variant"])

    def test_mode_base_rates_preserve_base_tiers_and_context_over(self) -> None:
        self._add_session_turn(
            "ses_mode_base_rate",
            "model-mode-base-rates-fast",
            {"input": 5, "output": 1, "reasoning": 1, "cache_read": 5, "cache_write": 0},
        )
        self._add_session_turn(
            "ses_mode_base_tier",
            "model-mode-base-rates-fast",
            {"input": 96, "output": 1, "reasoning": 1, "cache_read": 5, "cache_write": 0},
        )
        self._add_session_turn(
            "ses_mode_base_over_equal",
            "model-mode-base-over-fast",
            {"input": 199995, "output": 1, "reasoning": 1, "cache_read": 5, "cache_write": 0},
        )
        self._add_session_turn(
            "ses_mode_base_over_above",
            "model-mode-base-over-fast",
            {"input": 199996, "output": 1, "reasoning": 1, "cache_read": 5, "cache_write": 0},
        )

        sessions = {
            session["id"]: session
            for session in json.loads(self.run_calculator().stdout)["sessions"]
        }
        self.assertEqual(0.00009, sessions["ses_mode_base_rate"]["estimated_cost_usd"])
        self.assertEqual(10, sessions["ses_mode_base_rate"]["tokens"]["context"])
        self.assertEqual(0.000446, sessions["ses_mode_base_tier"]["estimated_cost_usd"])
        self.assertEqual(101, sessions["ses_mode_base_tier"]["tokens"]["context"])
        self.assertEqual(1.99999, sessions["ses_mode_base_over_equal"]["estimated_cost_usd"])
        self.assertEqual(200000, sessions["ses_mode_base_over_equal"]["tokens"]["context"])
        self.assertEqual(1.000242, sessions["ses_mode_base_over_above"]["estimated_cost_usd"])
        self.assertEqual(200001, sessions["ses_mode_base_over_above"]["tokens"]["context"])

    def test_mode_tier_replacement_and_context_over_replacement(self) -> None:
        self._add_session_turn(
            "ses_mode_tier_equal",
            "model-mode-tier-fast",
            {"input": 95, "output": 1, "reasoning": 1, "cache_read": 5, "cache_write": 0},
        )
        self._add_session_turn(
            "ses_mode_tier_replace",
            "model-mode-tier-fast",
            {"input": 96, "output": 1, "reasoning": 1, "cache_read": 5, "cache_write": 0},
        )
        self._add_session_turn(
            "ses_mode_over_equal",
            "model-mode-over-fast",
            {"input": 199995, "output": 1, "reasoning": 1, "cache_read": 5, "cache_write": 0},
        )
        self._add_session_turn(
            "ses_mode_over_replace",
            "model-mode-over-fast",
            {"input": 199996, "output": 1, "reasoning": 1, "cache_read": 5, "cache_write": 0},
        )
        self._add_session_turn(
            "ses_mode_tier_replace_over",
            "model-mode-over-fast",
            {"input": 299996, "output": 1, "reasoning": 1, "cache_read": 5, "cache_write": 0},
        )

        sessions = {
            session["id"]: session
            for session in json.loads(self.run_calculator().stdout)["sessions"]
        }
        self.assertEqual(0.00099, sessions["ses_mode_tier_equal"]["estimated_cost_usd"])
        self.assertEqual(100, sessions["ses_mode_tier_equal"]["tokens"]["context"])
        self.assertEqual(0.001098, sessions["ses_mode_tier_replace"]["estimated_cost_usd"])
        self.assertEqual(101, sessions["ses_mode_tier_replace"]["tokens"]["context"])
        self.assertEqual(1.99999, sessions["ses_mode_over_equal"]["estimated_cost_usd"])
        self.assertEqual(200000, sessions["ses_mode_over_equal"]["tokens"]["context"])
        self.assertEqual(9.99992, sessions["ses_mode_over_replace"]["estimated_cost_usd"])
        self.assertEqual(200001, sessions["ses_mode_over_replace"]["tokens"]["context"])
        self.assertEqual(3.299998, sessions["ses_mode_tier_replace_over"]["estimated_cost_usd"])
        self.assertEqual(300001, sessions["ses_mode_tier_replace_over"]["tokens"]["context"])
        for session_id in (
            "ses_mode_tier_equal",
            "ses_mode_tier_replace",
            "ses_mode_over_equal",
            "ses_mode_over_replace",
            "ses_mode_tier_replace_over",
        ):
            self.assertEqual("high", sessions[session_id]["breakdown"][0]["variant"])

    def test_malformed_database_json_fails_without_body_output(self) -> None:
        connection = sqlite3.connect(self.database)
        connection.execute(
            "UPDATE part SET data = ? WHERE id = ?", ("not-json", "part_text")
        )
        connection.commit()
        connection.close()

        completed = self.run_calculator(check=False)
        self.assertNotEqual(0, completed.returncode)
        self.assertIn("contains malformed JSON", completed.stderr)
        self.assertNotIn("TRANSCRIPT_SECRET", completed.stderr)

    def test_cycle_guard_does_not_duplicate_recursive_scope(self) -> None:
        connection = sqlite3.connect(self.database)
        connection.execute(
            "UPDATE session SET parent_id = ? WHERE id = ?",
            ("ses_grandchild", "ses_root"),
        )
        connection.commit()
        connection.close()

        result = json.loads(self.run_calculator().stdout)
        self.assertEqual(
            ["ses_root", "ses_child", "ses_grandchild"],
            [session["id"] for session in result["sessions"]],
        )

    def test_v2_schema_recursive_cost_and_body_exclusion(self) -> None:
        self._replace_with_v2_database()

        completed = self.run_calculator()
        result = json.loads(completed.stdout)

        self.assertEqual("v2", result["source"]["schema"])
        self.assertEqual(["ses_root", "ses_child"], [item["id"] for item in result["sessions"]])
        self.assertEqual(2, result["total"]["session_count"])
        self.assertEqual(2, result["total"]["turn_count"])
        self.assertEqual(
            {
                "input": 107,
                "output": 28,
                "cache_read": 16,
                "cache_write": 8,
                "reasoning": 14,
                "context": 131,
            },
            result["total"]["tokens"],
        )
        self.assertEqual(0.12, result["total"]["stored_cost_usd"])
        self.assertEqual("fast", result["sessions"][0]["breakdown"][0]["variant"])
        self.assertNotIn("V2_TRANSCRIPT_SECRET", completed.stdout)
        self.assertNotIn("V2_USER_SECRET", completed.stdout)

    def test_v2_incomplete_usage_fails_without_body_output(self) -> None:
        self._replace_with_v2_database()
        connection = sqlite3.connect(self.database)
        connection.execute(
            "UPDATE session_message SET data = ? WHERE id = 'msg_running'",
            (
                json.dumps(
                    {
                        "model": {"providerID": "provider-a", "id": "model-a"},
                        "content": [{"type": "text", "text": "V2_INCOMPLETE_SECRET"}],
                        "cost": 0.1,
                    }
                ),
            ),
        )
        connection.commit()
        connection.close()

        completed = self.run_calculator(check=False)
        self.assertNotEqual(0, completed.returncode)
        self.assertIn("tokens", completed.stderr)
        self.assertNotIn("V2_INCOMPLETE_SECRET", completed.stderr)

    def test_root_in_both_schemas_fails_as_ambiguous(self) -> None:
        connection = sqlite3.connect(self.database)
        connection.executescript(
            """
            CREATE TABLE session_v2 (
                id TEXT PRIMARY KEY, parent_id TEXT, title TEXT, agent TEXT, cost REAL NOT NULL
            );
            CREATE TABLE session_message (
                id TEXT PRIMARY KEY, session_id TEXT NOT NULL, type TEXT NOT NULL,
                seq INTEGER NOT NULL, data TEXT NOT NULL
            );
            INSERT INTO session_v2 (id, parent_id, title, agent, cost)
            VALUES ('ses_root', NULL, 'duplicate root', NULL, 0);
            """
        )
        connection.commit()
        connection.close()

        completed = self.run_calculator(check=False)
        self.assertNotEqual(0, completed.returncode)
        self.assertIn("exists in both OpenCode V1 and V2 schemas", completed.stderr)


if __name__ == "__main__":
    unittest.main()
