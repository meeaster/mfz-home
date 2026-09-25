---
date: 2026-09-25
evals: [authorized-fix, explore-evidence]
criterion: producer_return_pointer
skill: task-output         # also global AGENTS.md
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
runs: { before: "5/8", after: "6/8" }   # authorized-fix 3/4, explore-evidence 3/4 with confirmation
---

# The reply may carry one sentence on what was done; reported content goes in the file

## Behavior targeted

Under [parent-assigned paths](2026-09-25-authorized-fix-parent-assigns-output-paths.md), 3 of 8 runs failed `producer_return_pointer`. When a brief said "report" (for example "Report implementation, concrete test/check output, changed files, any blocker/uncertainty"), the worker wrote it to its file and also replied with bullets of test and check results; one explore follow-up reply stated a correction.

The human accepts a very brief summary of what was done in the reply. Both rubrics were changed first: a reply may add one short sentence saying what was done, at headline level ("Fixed the status normalization; tests and checks pass."), and fails with more than one sentence, a list, detailed results such as test counts or output, or an investigation's findings. Rejudged, the failing recordings still failed (`authorized-fix` `eval_6692cd3b`, `explore-evidence` `eval_61c45f18`).

## Change

- `task-output/SKILL.md`, "Write the response": "What a brief or role definition asks you to return is the file's content." became "What a brief or role definition asks you to report or return is the file's content."
- `task-output/SKILL.md`, "Reply": "…and the completion state: completed, partial, or blocked. The answer, findings, changes, check results, and blockers are in the file, not the reply." became "…the completion state (completed, partial, or blocked), and at most one short sentence saying what was done. The answer, findings, corrections, changes, test and check results, and blockers stay in the file."
- Global `AGENTS.md`: the subagent "replies with the path, the completion state, and at most a one-sentence summary of what was done."

"Report" was added because the failing briefs used that verb rather than "return". The summary sentence gives the model a sanctioned place for the urge to summarize, bounded to one sentence.

## Result

2/2 on one repetition each (`authorized-fix` `eval_3b8fd5b2`, `explore-evidence` `eval_ac7fac3e`). The worker replied "`…/ready-status-fix--worker.md` — completed. READY status now ignores case and surrounding spaces; tests and the final anti-slop check passed." The first judgment failed it for mentioning check results; the rubric was clarified to allow a headline outcome and fail only detailed results, and the rejudged recording passed every criterion. Explore replies were one sentence describing the work plus the path.

Confirmation (repetitions 2 to 4): `authorized-fix` 2/3, `explore-evidence` 2/3; 6/8 overall. No reply carried a list, test counts, or findings.

- `authorized-fix` rep 4 (`eval_8ab72a6e`) failed `producer_return_pointer` for length alone: "Updated `src/accept-release.ts` to compare the trimmed status case-insensitively. `bun test` and the final anti-slop check passed; tests were unchanged." The judge counted two sentences against the one-sentence bar.
- `explore-evidence` rep 3 (`eval_2c9106fd`) failed `returned_files_read`: after the second of two follow-ups the coordinator read the file only from line 350, the new part, instead of rereading it whole. Replies passed.

## Interpretation

Hypothesis: a bounded, sanctioned summary is easier to follow than a bare prohibition, and the verb in the brief ("report") must be named in the contract for the producer to route it to the file. Confirmation repetitions in which replies return to lists or findings would refute it.

## Locators

Source commit `e39141b` with a dirty working tree (22 working-tree overrides). Results in `benchmarks/orchestrator-mode/results/2026-09-25T01-35-03.317Z-db10aa67`.
