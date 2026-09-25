---
date: 2026-09-24
evals: [explore-evidence]
criterion: coordinator_lean
skill: orchestration
file: references/acceptance-and-review.md
change: addition
outcome: no-effect
environment: minimal
preset: gpt6
models:
  primary: { agent: build, model: openai/gpt-6-sol, variant: medium }
  subagents:
    explore: { model: openai/gpt-6-luna, variant: high }
  judge: { model: openai/gpt-6-astra, variant: medium }
runs: { before: "0/4", after: "0/4" }
---

# Acceptance table row for investigation returns

## Behavior targeted

After selecting direct orchestration, the primary session dispatched `explore` with a good brief, then read the investigated checkout source itself to double-check the findings before answering. The code judge showed the dispatch; the rubric's `coordinator_lean` criterion failed in every run.

In the four baseline runs, the primary session made 12, 10, 10, and 7 reads of checkout source after `explore` returned. The brief asked for quotes with paths and line numbers, and the evidence file already contained them. Reasoning summaries read "Need read evidence", then "Reading source files".

## Change

Added one row to the "Verify the outcome" table in `references/acceptance-and-review.md`, below the row for straightforward changes:

```markdown
| Investigation return | Accept after checking the answer against the brief and the locators and excerpts it cites; the producer's investigation stands as the evidence rather than being repeated in its sources. |
```

Placement rationale: the acceptance table is the reference every coordination role reads before dispatch, and the next row already routes evidence gaps to "focused follow-up from the owner".

## Result

- Before: 0/4 on `coordinator_lean`.
- After: 0/4. The primary session read the acceptance reference in every run, then still made 11, 8, 8, and 11 checkout source reads after the return.
- Neighbouring evals: `single-source-file` and `identified-instruction` passed one run each.

The row was removed and replaced by the change in `2026-09-24-explore-evidence-skill-md-acceptance-line.md`.

## Interpretation

Hypothesis: for `gpt-6-sol` at medium effort, a rule in a reference file read once before dispatch doesn't govern a decision made much later, after the child returns. A row in a table of situations may also read as one option rather than a constraint. To confirm, put the same wording in `SKILL.md` and see whether it changes the behavior, and test a stronger model under the same placement.

## Locators

- Source: mfz-home `3ef4f04` with a dirty working tree (43 files rendered from uncommitted changes).
- Before: `results/2026-09-24T23-16-41.315Z-07ccb675` (1 run) and the three added repetitions in the same result.
- After: `results/2026-09-24T23-29-42.245Z-4e519fe9`.
