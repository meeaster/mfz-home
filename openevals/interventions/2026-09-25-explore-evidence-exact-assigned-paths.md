---
date: 2026-09-25
evals: [explore-evidence]
criterion: returned_files_read
skill: task-output
file: SKILL.md
change: wording
outcome: effective           # target fixed in one run; brief_quality failed separately
environment: live
preset: gpt6
models:
  primary: { agent: build, model: openai/gpt-6-sol, variant: medium }
  subagents:
    explore: { model: openai/gpt-6-luna, variant: high }
  judge: { model: openai/gpt-6-sol, variant: high }
runs: { before: "0/1", after: "0/1" }   # returned_files_read 0 -> 1; the run failed brief_quality instead
---

# Producers write only the exact assigned paths

## Behavior targeted

With [built-in explore](2026-09-25-explore-evidence-builtin-explore-prompt.md), explore first wrote the assigned filename under its own session ID instead of the coordinator's, then switched to the assigned path, leaving an unread stray file (`returned_files_read` 0).

## Change

`task-output/SKILL.md`, "Ownership and location": "A dispatched assignment writes to the paths its brief assigns: the response file and, for a lesson, the learnings file." became "A dispatched assignment writes only to the exact paths its brief assigns, as given: the response file and, for a lesson, the learnings file."

Placed in the shared contract rather than an agent prompt, per the human's preference, so it covers every producer.

## Result

`eval_6ab46673`: 13/14. Explore wrote only the assigned path (`…/ses_f28efe95…/evidence/resume-decision--explore.md`, one add and one update), and `returned_files_read` passed.

The run failed `brief_quality`: the coordinator's first brief ended "Return sufficient concrete excerpts, not merely pointers; state uncertainties." Explore still put the excerpts in the file and replied with two lines and the path. No earlier run under the current coordinator guidance had this phrasing.

## Interpretation

Hypothesis: an exact-path line in the loaded contract is enough to keep producers on the assigned path without a system-prompt ownership line. A stray file in confirmation runs would refute it. The `brief_quality` failure is a separate, occasional coordinator habit that the producer contract now absorbs.

## Locators

Source commit `e39141b` with a dirty working tree (23 working-tree overrides). Results in `benchmarks/orchestrator-mode/results/2026-09-25T01-35-03.317Z-db10aa67`.
