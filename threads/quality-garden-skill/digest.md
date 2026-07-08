# Digest — quality-garden-skill

## Current State
The quality-garden skill is designed, implemented, registered, and synced as of 2026-07-04 21:37. It defines a five-role workflow (Gardener, Chair, Reviewer, Merger, Human) for scoped, behavior-preserving maintenance PRs, with a two-party review gate and a separate final-merge adjudication step. The design went through several refinement passes in one continuous session — trimming the chair brief, relocating the duplicate-PR check, swapping in an independent subagent reviewer, and splitting the Merger out from the Chair — before being synced into the tool and validated end-to-end: a real gardener run produced PR #4 with all tests passing.

## Components
- **Role Architecture** — the Gardener/Chair/Reviewer/Merger/Human model governing scoped maintenance PRs · settled: duplicate-PR checking owned solely by the Gardener, Chair brief kept lean (points to the skill rather than restating rules), Reviewer is a read-only independent subagent, Merger is a distinct adjudication role.
- **SKILL.md & Registration** — `skills/quality-garden/SKILL.md`, `shared/skills.yml`, `profiles/base/profile.yml` · complete and synced into the tool via `pnpm dev skills upgrade`.
- **Review & Merge Gate** — independent-subagent review (to satisfy two-party review) feeding a separate PR-context-only Merger that must always leave a decision comment · design settled; one open gap on keeping reviewer comments to pure code-quality findings.
- **Validation run (tangential)** — `src/sync/index.ts` refactor + new unit tests, `tests/integration/apply.test.ts` integration test, resulting in PR #4 · opened on branch `quality-garden/sync-maintenance`, `pnpm test:skills` passing (4 files, 36 tests), awaiting review/merge.

## Direction
- Tighten reviewer guidance so PR comments stay pure code-quality findings and stop including process narration (e.g. "checked other PRs") — flagged but not yet fixed.
- Carry PR #4 (https://github.com/meeaster/mindframe-z/pull/4, branch `quality-garden/sync-maintenance`) through the review → Merger → Human gate as the skill's first live validation run.

## Open Questions
None.

## Key Decisions
- Five-role model: Gardener (explores, changes, verifies, opens PR), Chair (sets constraints, dispatches, reviews lean), Reviewer (independent subagent, read-only merge gate), Merger (adjudicates approve/deny from PR-only context), Human (final merge).
- Changes must be behavior-preserving unless explicitly approved otherwise; one scoped target per garden run; PR must stay draft/reviewable with no automatic merge.
- Integration testing is a first-class garden target — the skill should treat missing isolated integration tests as a valid target to close.
- Duplicate-PR avoidance lives only in the Gardener's section, not the Chair brief.
- Reviewer role is filled by an independent general subagent (Opus 4.8, high effort) rather than Claude Code itself, since Claude Code posting its own PR comments in auto mode would defeat two-party review.
- Merger is a separate role/context from the Chair — a chair that orchestrated and watched the gardener could bias its own final call even on a high-capability model — using Claude Fable 5 with PR-only context (no gardener transcript, no chair opinion).
- Merger defaults to manual mode, auto only when explicitly authorized, and must always leave a PR decision comment in both modes.

## Design
```
Gardener ──opens draft PR──▶ Reviewer ──review comments──▶ Merger ──approve/deny + mandatory comment──▶ Human
 (explore,                    (independent                 (PR-context                                 (final
  change,                      subagent,                     only; no                                   merge)
  test)                        read-only)                    gardener/chair
                                                               context)

Chair: sets constraints, dispatches Gardener, keeps brief lean — does not review or merge.
```

## Intent
Build a quality-garden skill that turns ad-hoc code review into repeatable, scoped, behavior-preserving maintenance PRs with real test confidence and a PR-level review/decision gate, structured around stable, separated roles rather than one context doing everything.

## Vision
The skill should let a Gardener autonomously find and close a single maintenance gap (including missing integration test coverage) end-to-end — explore, change, verify, open a draft PR — while independent review and merge-adjudication steps keep humans in control by default, with auto mode available only once explicitly trusted.

## Perspective
The user treats process independence as more important than raw model capability: the reasoning for splitting Merger from Chair — "the same context that orchestrated and watched the gardener's work could bias the final call even if the chair uses Fable" — shows a deliberate distrust of self-review, echoed in the earlier refusal to let Claude Code post its own PR review comments in auto mode. The user also favors lean documentation over restating rules across roles (the Chair brief should point at the skill, not duplicate it), and wants manual-by-default automation, escalating to auto mode only with explicit authorization.

## Sources
None.
