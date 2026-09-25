---
date: 2026-09-24
evals: [explore-evidence]
criterion: coordinator_lean
skill: orchestration
file: SKILL.md
change: placement
outcome: effective
environment: minimal
preset: gpt6
models:
  primary: { agent: build, model: openai/gpt-6-sol, variant: medium }
  subagents:
    explore: { model: openai/gpt-6-luna, variant: high }
  judge: { model: openai/gpt-6-astra, variant: medium }
runs: { before: "0/4", after: "4/4" }
---

# Acceptance rule moved into SKILL.md beside the delegation rule

## Behavior targeted

The same failure as `2026-09-24-explore-evidence-acceptance-table-row.md`: after `explore` returned, the primary session re-read the investigated checkout source to verify the findings. The table-row attempt left it at 0/4.

## Change

Removed the "Investigation return" row from `references/acceptance-and-review.md`. Added this bullet to the "Human-facing work" section of `SKILL.md`, directly after the rule that delegates implementation-source investigation even for one code file:

```markdown
- Accept an investigation return from the locators and excerpts it cites. Send a gap, contradiction, or doubtful claim back to the producer as focused follow-up; re-reading the investigated sources here repeats the investigation in the context delegation was meant to keep lean.
```

Placement and wording rationale:

- `SKILL.md` is the skill body loaded with the skill, and it holds the delegation rule the model already followed reliably. The acceptance rule now sits next to it.
- Unlike the table row, the bullet names the alternative action (focused follow-up) and gives the reason (lean coordinator context).

## Result

- Before: 0/4 on `coordinator_lean`, under the table-row revision.
- After: 4/4. Every criterion passed in all four runs, and the primary session made no checkout source reads after the return. Instead, each run made one or two follow-up requests to `explore` (two or three dispatches in total).
- Re-graded after the per-session skill check was added: 2 of the 4 runs fail `coordinator_skills_in_role` because the coordinator loaded `task-evidence`. That failure is separate from `coordinator_lean`, which this change targeted.
- Neighbouring evals: `single-source-file` (all criteria pass) and `identified-instruction` (all pass; it still reads the identified policy file directly). One run each.

## Interpretation

Hypotheses, not established. Placement and wording changed together, so this result can't separate them:

- Placement: for `gpt-6-sol` at medium effort, rules in `SKILL.md` are followed at a later decision point more reliably than rules in a reference read before dispatch.
- Named alternative: telling the model what to do instead (follow up with the producer) may matter as much as the placement. The table row only said what to accept.

To separate them, put the SKILL.md wording back in the reference file, or the table-row wording in `SKILL.md`. Also rerun with the `glm` preset to see whether a different model family responds the same way.

## Locators

- Source: mfz-home `3ef4f04` with a dirty working tree (43 files rendered from uncommitted changes).
- Before: `results/2026-09-24T23-29-42.245Z-4e519fe9`.
- After: `results/2026-09-24T23-41-05.155Z-fe329981` (four `explore-evidence` runs, plus one run each of the neighbouring evals).
