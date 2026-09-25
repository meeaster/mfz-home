---
date: 2026-09-25
evals: [authorized-fix, explore-evidence]
criterion: brief_quality   # also dispatches_wrote_files, returned_files_read, producer_return_pointer held
skill: task-output         # also orchestration, evidence-gathering, global AGENTS.md; explore.md prompt reverted
file: SKILL.md
change: wording
outcome: partial
environment: live
preset: gpt6
models:
  primary: { agent: build, model: openai/gpt-6-sol, variant: medium }
  subagents:
    explore: { model: openai/gpt-6-luna, variant: high }
    worker: { model: openai/gpt-6-luna, variant: max }
  judge: { model: openai/gpt-6-sol, variant: high }
runs: { before: "2/2", after: "5/8" }   # authorized-fix 2/4, explore-evidence 3/4 with confirmation
---

# The parent assigns each subagent's output paths

## Behavior targeted

After [the file-response contract](2026-09-25-authorized-fix-task-output-file-response.md), subagents resolved their own storage: the worker in `eval_3a4cc304` saved under its own session ID (`_sessions/opencode/ses_f29430328…/evidence/accept-release-fix--ses-f29430328ffe.md`) rather than the coordinator's. The human wants the parent, which tracks where the effort lives, to hand each subagent the files it owns and tell it to load `task-output`, in the dispatch prompt rather than in agent system prompts. `brief_quality` in `explore-evidence` was changed to fail a brief that assigns no output path or omits `task-output`.

## Change

- `task-output/SKILL.md`, "Ownership and location": "Use an explicitly assigned output path. Otherwise load `effort-context` for its storage-location operation before writing." became "A dispatched assignment writes to the paths its brief assigns: the response file and, for a lesson, the learnings file. For an investigation in your own session, obtain a location from `effort-context`'s storage-location operation; …". The blocked-write rule now also covers "If no path is assigned".
- `orchestration/SKILL.md`: the brief "assigns the response and learnings paths from the effort's storage, tells it to load that skill, and states the information needed".
- `assignments-and-dependencies.md`: Outputs row "Assigned paths for the response file and any learnings, plus other required artifacts"; the brief bullet "assign the output paths, tell the producer to load `task-output`".
- `evidence-gathering/SKILL.md` and the global `AGENTS.md`: the delegating session assigns the output path (from `effort-context`'s storage location in default mode) and tells the subagent to load `task-output`.
- `opencode/agents/explore.md`: the previous attempt's prompt edits were reverted to the committed text (with the skill renamed).

## Result

2/2 on one repetition each (`authorized-fix` `eval_ecb7d6f0`, `explore-evidence` `eval_76666cab`). Both briefs assigned a path under the coordinator's session (`_sessions/opencode/ses_f293a5…/evidence/<topic>--<agent>.md`) and said to load `task-output`; both replies were the path and completion state; the coordinator read each file whole.

`authorized-fix` first scored `dispatches_wrote_files` and `returned_files_read` 0: the worker wrote its file with `mkdir -p … && cat > <path> <<'EOF'`, which the fact helper did not count. No edit had been denied. The helper now counts shell redirects as writes and excludes a redirect from counting as a read; the rejudged recording passed every criterion.

Confirmation (repetitions 2 to 4): `authorized-fix` 1/3, `explore-evidence` 2/3; 5/8 overall. Every failure was `producer_return_pointer`, and path assignment and whole-file reads held in all eight. In `authorized-fix` reps 3 and 4 the briefs said "report its outcome and exact remaining change state" and "Report implementation, concrete test/check output, changed files, any blocker/uncertainty"; the worker wrote that to its file and also replied with bullets such as "- `bun test`: passed (2 tests, 0 failures)." In `explore-evidence` rep 4 the third reply stated a correction ("an ordinary judge-hash change clears `slot.judgeRunId`, so it skips the early-stop guard …"). Addressed in the [next entry](2026-09-25-authorized-fix-reply-summary-sentence.md).

## Interpretation

Hypothesis: path assignment belongs with the dispatcher because it holds the effort's location; producers follow an assigned path reliably. A producer that ignores an assigned path, or a coordinator that omits it, would refute it.

## Locators

Source commit `e39141b` with a dirty working tree (22 working-tree overrides). Results in `benchmarks/orchestrator-mode/results/2026-09-25T01-35-03.317Z-db10aa67`.
