---
date: 2026-09-25
evals: [authorized-fix, explore-evidence]
criterion: producer_return_pointer   # also returned_files_read
skill: task-output                   # also orchestration, global AGENTS.md
file: SKILL.md
change: wording
outcome: effective
environment: live
preset: gpt6
models:
  primary: { agent: build, model: openai/gpt-6-sol, variant: medium }
  subagents:
    explore: { model: openai/gpt-6-luna, variant: high }
    worker: { model: openai/gpt-6-luna, variant: max }
  judge: { model: openai/gpt-6-sol, variant: high }
runs: { before: "6/8", after: "8/8" }   # 4/4 each, including confirmation
---

# A brief reply summary, and reading only what a follow-up changed

## Behavior targeted

The two failures under [the one-sentence reply](2026-09-25-authorized-fix-reply-summary-sentence.md) were within the human's intent once reviewed:

- `authorized-fix` rep 4 replied in two short sentences. The human accepts a brief summary of a few lines and a couple of bullets; the reply fails only when it reproduces the file.
- `explore-evidence` rep 3's coordinator read only the part a follow-up appended (from line 350). The human expects the coordinator to read what a follow-up added or changed, not to reread the whole file.

The judges were aligned first: `producer_return_pointer` passes a brief summary (a few lines, possibly a couple of bullets, a headline outcome) and fails headed sections, a long list, detailed output or a diff, a set of excerpts or locators, or the full answer with its support. `returned_files_read` (`returnedFilesUnread`) now requires a whole read after the file first exists and any read after its last write. Rejudged, both recordings passed every criterion (`eval_8ab72a6e` 10/10, `eval_2c9106fd` 14/14). This is a judge correction toward the human's bar, not a guidance fix, so the guidance below only aligns the instructions with it.

## Change

- `task-output/SKILL.md`, "Reply": "…and at most one short sentence saying what was done. The answer, findings, corrections, changes, test and check results, and blockers stay in the file." became "…and a brief summary of what was done: a few lines, at most a couple of bullets. After a follow-up, the summary says what was added or corrected. The full answer, supporting findings, excerpts, and detailed results stay in the file."
- `orchestration/SKILL.md`: "Read each returned file in full before acting on it, and again after a follow-up changes it, along with any learnings file the reply names." became "Read each returned file in full before acting on it, along with any learnings file the reply names. After a follow-up, read what it added or changed."
- Global `AGENTS.md`: the reply is "the path, the completion state, and a brief summary of what was done"; the parent reads the file in full "and after a follow-up read what changed".

## Result

8/8: `authorized-fix` 4/4 and `explore-evidence` 4/4 (repetition 1 `eval_8a3277be`, `eval_4c23be06`; confirmation 2 to 4). Worker replies were a few lines with a headline outcome and the path, for example "Updated `src/accept-release.ts` to trim whitespace and uppercase the status… `bun test` now passes (2 passed, 0 failed), and the final anti-slop check reported 0 warnings and 0 errors." Explore follow-up replies named what was appended ("Appended the missing verbatim excerpts … `judgeEvalRun`'s use of existing candidate evidence…"), and the coordinator read the files and their changes.

## Interpretation

Hypothesis: with the reply bounded by length and purpose rather than a sentence count, the models stay within it reliably; naming what a follow-up added gives the coordinator what it needs to read only the change. A reply that grows back into a report, or a coordinator that skips a follow-up's change, would refute it.

## Locators

Source commit `e39141b` with a dirty working tree (22 working-tree overrides). Results in `benchmarks/orchestrator-mode/results/2026-09-25T01-35-03.317Z-db10aa67`.
