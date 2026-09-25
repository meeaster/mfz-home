---
date: 2026-09-25
evals: [explore-evidence]
criterion: producer_return_digest
skill: task-evidence
file: SKILL.md                # also evidence-gathering/SKILL.md and orchestration/SKILL.md
change: wording
outcome: no-effect
environment: live
preset: gpt6
models:
  primary: { agent: build, model: openai/gpt-6-sol, variant: medium }
  subagents:
    explore: { model: openai/gpt-6-luna, variant: high }
  judge: { model: openai/gpt-6-sol, variant: high }
runs: { before: "0/1", after: "0/1" }
---

# Evidence returns become a digest of the evidence file

## Behavior targeted

`explore` saved its investigation to an evidence file and also returned a full report to the coordinator: the first return was 5.3k characters in three titled sections with about ten cited locators, and two follow-up returns carried further excerpt reports. The coordinator never opened the file, so the return carried the whole account a second time.

`producer_return_digest` was added to `explore-evidence` for this: every return is a paragraph or a few bullets with about three deciding locators, limits, and the file path; a report with headings or many citations fails. A first draft that failed only returns "substantially restating the file" passed the old recording, because the file held more than any one return; the report-shape bar was chosen instead. Graded against the pre-change recording through `judgeEvidence`, the criterion failed: "the first is a structured report and the later returns supply numerous verbatim source excerpts".

## Change

- `task-evidence/SKILL.md`, "Complete the return": "Return the useful answer or resulting-state delta, completed paths, verification and limits, …" became "Return a digest sized to the reader's next decision: the answer or resulting-state delta, the decisive locators or excerpts, verification and limits, unresolved questions, blockers, exact mutation or publication state when applicable, and completed paths." plus a new bullet: "Leave supporting detail, method, and the full account in the file; the reader opens it when the digest is not enough."
- `evidence-gathering/SKILL.md`: "Return the substantive answer and its file pointer." became "Return the answer and its file pointer."
- `orchestration/SKILL.md`, "Human-facing work": added "For supporting detail the return omits, read the relevant part of the producer's evidence file." before the follow-up rule, which now covers "a gap the file does not close".

The return contract already lived in `task-evidence`, so the digest wording went there; the orchestration line gives the coordinator the file as its first source for omitted detail.

## Result

Still 0/1. Returns shrank (first return 5.3k → 3.2k characters; three returns 12.8k → 10.0k), and the coordinator now read the evidence file three times, but it also sent two follow-ups. The second follow-up brief asked `explore` to "return short verbatim quoted lines with exact checkout paths + line numbers" and only to "append quote section to your evidence file if useful"; that return was a titled excerpt report, which failed the criterion. All other `explore-evidence` criteria and `single-source-file` passed.

## Interpretation

Hypothesis: the producer follows the brief's explicit return request over the skill's digest default, so the return shape is set by the coordinator's follow-up wording. A change that routes follow-up excerpts into the file, with a digest returned, should pass; a follow-up return that is still a report would refute it.

## Locators

Source commit `e39141b` with a dirty working tree (captured as working-tree overrides). Results in `benchmarks/orchestrator-mode/results/2026-09-25T01-35-03.317Z-db10aa67`: before `eval_282b6cd4-7de2-4d5e-ae40-7282ee89c7c9`, after `eval_1affd54a-0ce1-4035-b0fa-2766eeeb3539`.
