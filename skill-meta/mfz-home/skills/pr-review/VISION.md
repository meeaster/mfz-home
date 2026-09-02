# Vision

## Problem

An unfamiliar pull request cannot be reviewed responsibly as if its requirements, design rationale, implementation process, and validation history were already accepted. Conformance-only review can miss unjustified machinery, misplaced ownership, irreversible commitments, and materially simpler approaches.

## Intended behavior

`pr-review` reconstructs the merge case from compact PR, requirement, repository, architecture, validation, and parent-supplied evidence. Broad context assembly remains caller-owned so the reviewer spends its context on challenge, synthesis, and merge judgment. Its own inspection is limited to focused verification or conflict adjudication. When material evidence is missing, it returns complete source-targeted requests for the caller to fulfill and later treats returned packets as evidence rather than acceptance.

The skill composes `development-principles` and `thermo-nuclear-code-quality-review` into holistic due diligence without duplicating their rubrics. It challenges requirement fit, architecture, side effects, simplification opportunities, correctness, security, compatibility, maintainability, regressions, and validation, then returns disciplined findings and an evidence-grounded merge posture.

Missing evidence lowers confidence or produces a bounded verification request rather than proving failure. Source, current-state, and external evidence requests remain distinct from architecture consultation, user decisions, mutation, expanded access, and publication authority. Architecture consultation is requested only for the defined consequential boundary cases and remains parent-owned.

## Success

A parent can decide whether an unfamiliar PR is merge-ready, needs changes, or lacks sufficient evidence from actionable findings with concrete locators, demonstrated consequences, minimum remediation, credible alternatives, explicit confidence, and visible uncertainty.

## Non-goals

- Selecting a model or defining agent permissions.
- Focused conformance review against a known accepted implementation brief.
- Submitting or publishing a hosting-system review, approving through the hosting system, merging, commenting, or fixing the pull request; the skill returns only an advisory merge assessment.
- Accepting the reviewer's own conclusion.
- Delegating an architect or performing unrelated architecture work.
