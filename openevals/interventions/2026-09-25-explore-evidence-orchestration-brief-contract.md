---
date: 2026-09-25
evals: [explore-evidence]
criterion: coordinator_skills_in_role
skill: orchestration
file: SKILL.md
change: wording
outcome: inconclusive
environment: minimal
preset: gpt6
models:
  primary: { agent: build, model: openai/gpt-6-sol, variant: medium }
  subagents:
    explore: { model: openai/gpt-6-luna, variant: high }
  judge: { model: openai/gpt-6-sol, variant: high }
runs: { before: "7/8", after: "1/1" }
---

# `task-evidence` named only as brief content in `orchestration`

## Behavior targeted

The remaining failure after `2026-09-25-explore-evidence-delegated-task-evidence.md`. That run loaded `effort-context`, `evidence-gathering`, and `task-evidence` in one parallel batch right after `orchestration`, before reading any of them. The only earlier mention of `task-evidence` was the `orchestration/SKILL.md` line that also told the coordinator to load `evidence-gathering`.

## Change

In `orchestration/SKILL.md`, "Establish the selected role", replaced:

```markdown
- Load `evidence-gathering` for deliberate investigations and require `task-evidence` for their producers. Storage, evidence output, and design collaboration retain their separate owners.
```

with:

```markdown
- Load `evidence-gathering` for deliberate investigations. Each producer's brief names `task-evidence` as its output contract; the producer loads it. Storage, evidence output, and design collaboration retain their separate owners.
```

The load instruction and the producer's contract are now separate sentences. `task-evidence` appears only as something a brief names, with the loader stated explicitly.

## Result

- Before: 7/8 under the previous entry's change (the one failure was the batch load).
- After: 1/1, one run only, to conserve usage. The coordinator loaded `orchestrate`, `orchestration`, `effort-context`, and `evidence-gathering`. The first brief named `task-evidence`, and only `explore` loaded it. The two later dispatches resumed the same `explore` session. Every code and rubric criterion passed.
- The judge changed from `gpt-6-astra#medium` to `gpt-6-sol#high` in the same run, to conserve usage. `coordinator_skills_in_role` is a code criterion and unaffected; rubric scores are not comparable with earlier runs.

## Interpretation

Hypothesis, and one run can't separate it from the earlier 7/8 rate: naming a skill in the same sentence as a load instruction invites a batch load of it. Three more runs of `explore-evidence` and `single-source-file` would confirm it. A batch load of `task-evidence` reappearing would refute it.

## Locators

- Source: mfz-home `3ef4f04` with a dirty working tree (43 files rendered from uncommitted changes).
- Before: `results/2026-09-25T00-08-19.153Z-f2ac91ad`.
- After: `results/2026-09-25T01-10-43.921Z-9c62eb8b`.
