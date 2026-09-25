---
date: 2026-09-25
evals: [explore-evidence, single-source-file]
criterion: coordinator_skills_in_role
skill: evidence-gathering
file: SKILL.md
change: wording
outcome: partial
environment: minimal
preset: gpt6
models:
  primary: { agent: build, model: openai/gpt-6-sol, variant: medium }
  subagents:
    explore: { model: openai/gpt-6-luna, variant: high }
  judge: { model: openai/gpt-6-astra, variant: medium }
runs: { before: "8/17", after: "7/8" }
---

# Delegated investigations require `task-evidence` instead of loading it

## Behavior targeted

After direct orchestration dispatched `explore`, the primary session had also loaded `task-evidence` itself. `task-evidence` is the producer's output contract: `orchestration/SKILL.md` says to "require `task-evidence` for their producers", and `docs/orchestrator/context-and-evidence.md` has the coordinator load only skill bodies its own work needs.

The baseline came from re-grading every earlier recording once the per-session skill check was added: 9 of 17 `explore-evidence` and `single-source-file` runs failed. In each failing run, `task-evidence` was loaded in the primary session right after `evidence-gathering`, whose "Preserve the result" section began "Load `task-evidence` and save one coherent investigation result" without saying who does the saving.

## Change

In `evidence-gathering/SKILL.md`, "Preserve the result", replaced the first bullet with two:

```markdown
- When you carry out the investigation, load `task-evidence` and save one coherent investigation result with support, applicability, contradictions, and limits. Return the substantive answer and its file pointer.
- When you delegate it, require `task-evidence` in the producer's brief. The producer saves the result and returns the answer with its pointer; the output contract stays in the producer's context, and this session keeps only the bounded question and the return.
```

The rule stays where the model met it, with the loading step made conditional on who carries out the investigation. The delegated branch names the alternative action and the reason, following `2026-09-24-explore-evidence-skill-md-acceptance-line.md`.

## Result

- Before: 8/17 passed `coordinator_skills_in_role` across the four earlier result sets.
- After: 7/8 (four runs of each eval). Every other code and rubric criterion passed in all eight. In every run, the first brief to `explore` named `task-evidence`.
- The one failure (`explore-evidence`) called `effort-context`, `evidence-gathering`, and `task-evidence` in a single parallel batch right after loading `orchestration`, before any of their bodies were read. The new wording could not have influenced that decision. The only earlier mention of `task-evidence` in that context is `orchestration/SKILL.md`: "Load `evidence-gathering` for deliberate investigations and require `task-evidence` for their producers."

## Interpretation

Hypothesis: `gpt-6-sol` at medium effort sometimes batch-loads every skill named near a load instruction, so a skill named in the same sentence as one to load can be loaded pre-emptively. The fix in the loaded skill covers only runs that load sequentially. Rewording the `orchestration` line so `task-evidence` appears only as something written into the producer's brief would test this. Watch for the failure rate changing without a change in the batch-load pattern.

## Locators

- Source: mfz-home `3ef4f04` with a dirty working tree (43 files rendered from uncommitted changes).
- Before: code-judge re-grade of `results/2026-09-24T23-04-57.345Z-bfa7cde3`, `2026-09-24T23-16-41.315Z-07ccb675`, `2026-09-24T23-29-42.245Z-4e519fe9`, and `2026-09-24T23-41-05.155Z-fe329981`.
- After: `results/2026-09-25T00-08-19.153Z-f2ac91ad` (failing run `eval_fd4de651-1b12-4be3-a3a6-09dbcfa2d8f9`).
