# Vision

## Problem

Unknown or unobserved pull-request work needs a specialist that can execute holistic merge due diligence without assuming an accepted design, trusted implementation process, or complete validation history. The focused `reviewer` remains the cheaper, narrower contract when that evidence is already known.

## Intended behavior

`pr-reviewer` is a native read-only OpenCode subagent that loads `pr-review` and its required supporting lenses. The parent supplies compact evidence packets, retained session locators, gaps, constraints, and explicit review authority. Broad evidence gathering remains root-owned. The agent may use read-only shell and read tools only for focused verification or conflict adjudication; direct editing and recursive delegation are denied.

The agent returns evidence-grounded findings, merge posture, uncertainty, complete missing-evidence requests when needed, and any bounded architect-consultation request. It does not dispatch gatherers or broadly reconstruct the PR corpus. The parent owns evidence fulfillment and retains architecture, merge, publication, remediation, and acceptance decisions. Routing depends on the evidence and review contract, not whether a human or agent authored the PR.

Model selection remains profile policy. The shared base profile assigns Sol `high` for holistic PR due diligence.

## Success

An explicitly authorized parent can dispatch one native specialist for unfamiliar-PR due diligence and receive compact actionable findings without mutation, publication, recursive delegation, or self-acceptance.

## Non-goals

- Replacing focused `reviewer` verification against an accepted design and known worker history.
- Selecting or changing other agents' models.
- Submitting or publishing a hosting-system review, approving through the hosting system, merging, commenting, or fixing reviewed work; the agent returns only an advisory merge assessment.
- Delegating an architect or deciding whether its own findings are accepted.
