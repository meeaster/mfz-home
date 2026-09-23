"""End-to-end accounting for reusable sessions and compaction boundaries."""

import json
import sqlite3
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[1] / "scripts/opencode-session-cost.py"


def usage(context, output=10, cache_read=0, reasoning=0, cache_write=0):
    return {"input": context, "output": output, "reasoning": reasoning,
            "cache": {"read": cache_read, "write": cache_write}}


def tool(name, input_data, text, metadata=None):
    return {"type": "tool", "id": name, "name": name,
            "state": {"status": "completed", "input": input_data,
                      "content": [{"type": "text", "text": text}],
                      "metadata": metadata or {}}}


class SessionCostTest(unittest.TestCase):
    def test_nested_reuse_compaction_and_source_accounting(self):
        with tempfile.TemporaryDirectory() as directory:
            db = Path(directory) / "sessions.db"
            catalog = Path(directory) / "models.json"
            catalog.write_text(json.dumps({"openai": {"models": {"test": {
                "cost": {"input": 1, "output": 2, "cache_read": 0.5,
                         "cache_write": 1, "tiers": [{"tier": {"size": 25000},
                         "input": 2, "output": 4, "cache_read": 1,
                         "cache_write": 2}]}}, "test2": {"cost": {
                             "input": 3, "output": 5, "cache_read": 0.25,
                             "cache_write": 1.5, "reasoning": 7}}}}}))
            connection = sqlite3.connect(db)
            connection.executescript("""
                CREATE TABLE session_v2 (id TEXT PRIMARY KEY, parent_id TEXT,
                    title TEXT, agent TEXT, cost REAL);
                CREATE TABLE session_message (id TEXT PRIMARY KEY, session_id TEXT,
                    type TEXT, seq INTEGER, data TEXT);
            """)
            for sid, parent in (("root", None), ("child", "root"), ("grandchild", "child")):
                connection.execute("INSERT INTO session_v2 VALUES (?, ?, ?, ?, ?)",
                                   (sid, parent, sid, "agent", 0))

            def message(sid, seq, kind, **data):
                value = {"time": {"created": seq * 1000}, **data}
                connection.execute("INSERT INTO session_message VALUES (?, ?, ?, ?, ?)",
                                   (f"{sid}-{seq}", sid, kind, seq, json.dumps(value)))

            def assistant(sid, seq, tokens, content=None, model="test"):
                message(sid, seq, "assistant", model={"providerID": "openai", "id": model},
                        tokens=tokens, cost=0, content=content or [])

            message("root", 1, "user", text="initial", files=[])
            assistant("root", 2, usage(26000), [
                tool("skill", {"id": "sample"}, "S" * 80,
                     {"directory": "/skills/sample"}),
                tool("read", {"path": "/skills/sample/references/a.md"}, "R" * 40),
                tool("read", {"path": "/skills/sample/SKILL.md"}, "D" * 12),
                tool("read", {"path": "/project/AGENTS.md"}, "A" * 20),
                tool("read", {"path": str(Path.home() / ".mindframe-z" / "AGENTS.md")},
                     "G" * 16),
                tool("subagent", {"prompt": "first"}, "started",
                     {"sessionID": "child"}),
            ])
            message("root", 3, "idle", outcome="completed")
            message("root", 4, "user", text="follow-up", files=[])
            assistant("root", 5, usage(100, 20, cache_read=900), [
                tool("subagent", {"sessionID": "child", "prompt": "second"}, "done")])
            message("root", 6, "synthetic", text="child finished",
                    metadata={"childID": "child", "source": "subagent"})
            assistant("root", 7, usage(300, reasoning=10), model="test2")
            message("root", 8, "idle", outcome="completed")

            message("child", 1, "user", text="first")
            assistant("child", 2, usage(1000, cache_read=1000, reasoning=20), [
                tool("subagent", {"prompt": "nested"}, "started",
                     {"sessionID": "grandchild"})])
            message("child", 3, "idle", outcome="completed")
            message("child", 4, "user", text="second")
            assistant("child", 5, usage(2000, cache_write=200))
            message("child", 6, "compaction", status="completed",
                    model={"providerID": "openai", "id": "test"},
                    tokens=usage(300, 50, cache_read=300), cost=0)
            assistant("child", 7, usage(80))
            message("child", 8, "idle", outcome="completed")
            message("grandchild", 1, "user", text="nested")
            assistant("grandchild", 2, usage(500))
            connection.commit()
            connection.close()

            result = subprocess.run(
                [sys.executable, str(SCRIPT), "--db", str(db), "--models-file",
                 str(catalog), "root"], capture_output=True, text=True, check=True,
            )
            report = json.loads(result.stdout)
            sessions = {item["id"]: item for item in report["sessions"]}
            self.assertEqual(report["total"]["tokens"]["input"], 30280)
            self.assertEqual(report["total"]["turn_count"], 8)
            self.assertEqual(report["total"]["estimated_cost_usd"], 0.0586)
            self.assertEqual(report["total"]["cost_components_usd"], {
                "input": 0.05688, "output": 0.00031, "cache_read": 0.0011,
                "cache_write": 0.0002, "reasoning": 0.00011,
            })
            self.assertEqual(report["session_tree"]["children"][0]["owner_agent"], "agent")
            self.assertEqual(report["session_tree"]["children"][0]["children"][0]["id"],
                             "grandchild")
            self.assertEqual(sessions["child"]["compaction_windows"][0]["own"]["tokens"]["input"], 3300)
            self.assertEqual(sessions["child"]["compaction_windows"][1]["own"]["tokens"]["input"], 80)
            self.assertEqual(len(sessions["child"]["request_cycles"]), 2)
            self.assertEqual(sessions["child"]["request_cycles"][1]["compaction_windows"], [1, 2])
            self.assertEqual(sessions["root"]["request_cycles"][0]["combined"]["tokens"]["input"], 27500)
            self.assertEqual(sessions["root"]["request_cycles"][1]["combined"]["tokens"]["input"], 2780)
            self.assertEqual(sessions["root"]["request_cycles"][1]["messages_while_active"], 1)
            self.assertEqual(sessions["root"]["request_cycles"][1]["idle_gap_ms"], 1000)
            self.assertEqual(sessions["root"]["request_cycles"][0]["ending_context_tokens"], 26000)
            self.assertEqual(sessions["root"]["request_cycles"][1]["maximum_context_tokens"], 1000)
            self.assertEqual(sessions["root"]["request_cycles"][1]["first_model_request"]
                             ["cache_read_percent"], 90)
            self.assertEqual(sessions["root"]["request_cycles"][0]["first_model_request"]
                             ["pricing"]["tier"]["threshold_tokens"], 25000)
            self.assertNotIn("details", report["total"]["context_deliveries"])
            self.assertNotIn("request_ledger", report)
            self.assertEqual(sessions["root"]["compaction_windows"][0]["checkpoints"][0]["threshold"], 25000)
            self.assertEqual(report["attribution"]["matched_child_requests"], 3)
            self.assertEqual(report["attribution"]["unmatched_child_cycles"], [])
            self.assertEqual(sessions["root"]["context_deliveries"]["skills"]["sample"], {
                "document_characters": 92, "supporting_file_characters": 40,
                "rough_tokens": 33,
            })
            self.assertEqual(report["total"]["context_deliveries"]["category_totals"]
                             ["project_instruction_read"]["characters"], 20)
            self.assertEqual(report["total"]["context_deliveries"]["category_totals"]
                             ["global_instruction_read"]["characters"], 16)
            self.assertEqual(sessions["root"]["subtree"]["estimated_cost_usd"],
                             report["total"]["estimated_cost_usd"])
            self.assertAlmostEqual(sum(cycle["combined"]["estimated_cost_usd"]
                                       for cycle in sessions["root"]["request_cycles"]),
                                   report["total"]["estimated_cost_usd"])
            for session in sessions.values():
                self.assertAlmostEqual(sum(window["own"]["estimated_cost_usd"]
                                           for window in session["compaction_windows"]),
                                       session["estimated_cost_usd"])
                self.assertAlmostEqual(sum(cycle["own"]["estimated_cost_usd"]
                                           for cycle in session["request_cycles"]),
                                       session["estimated_cost_usd"])

            detailed = subprocess.run(
                [sys.executable, str(SCRIPT), "--db", str(db), "--models-file",
                 str(catalog), "--summary", "--delivery-details", "--request-ledger", "root"],
                capture_output=True, text=True, check=True,
            )
            projected = json.loads(detailed.stdout)
            self.assertEqual(len(projected["request_ledger"]), 8)
            step = projected["request_ledger"][0]
            self.assertEqual((step["session_id"], step["cycle_index"],
                              step["compaction_window_index"], step["timestamp_ms"]),
                             ("root", 1, 1, 2000))
            self.assertEqual(step["applied_rates_usd_per_million"]["input"], 2)
            self.assertEqual(step["cost_components_usd"]["input"], 0.052)
            self.assertEqual(step["reasoning_rate_source"], "output_fallback")
            self.assertEqual(projected["request_ledger"][2]["modelID"], "test2")
            self.assertEqual(projected["request_ledger"][2]["reasoning_rate_source"], "explicit")
            self.assertEqual(projected["request_ledger"][2]["cost_components_usd"]["reasoning"],
                             0.00007)
            self.assertEqual(next(item for item in projected["request_ledger"]
                                  if item["record_type"] == "compaction")
                             ["compaction_window_index"], 1)
            self.assertIn("details", projected["total"]["context_deliveries"])
            self.assertNotIn("context_deliveries", projected["sessions"][0]
                             ["request_cycles"][0])


if __name__ == "__main__":
    unittest.main()
