# Vision

## Problem

Unknown or unobserved pull-request work needs a specialist that can execute holistic merge due diligence without assuming an accepted design, trusted implementation process, or complete validation history. Known work remains with `reviewer` for correctness, maintainability, and substantive behavior-preserving structural simplification. Structural simplification alone does not require this lane.

## Intended behavior

`pr-reviewer` is a native read-only OpenCode subagent that a loaded workflow must explicitly route to. It loads `pr-review` and its required supporting lenses. The parent supplies compact evidence packets, retained session locators, gaps, constraints, and explicit review authority. Broad evidence gathering remains root-owned. The agent may use read-only shell and read tools only for focused verification or conflict adjudication; edits outside the task-evidence root and recursive delegation are denied.

The human authorized direct production of explicitly assigned notes under `/tmp/opencode/orchestrator-evidence/`. The caller requires `orchestrator-task-evidence`, which owns note production and reuse. Permission or skill loading alone authorizes no file. Ordinary review remains file-free, and the exception permits no project or external-system mutation.

The agent returns evidence-grounded findings, merge posture, uncertainty, complete missing-evidence requests when needed, and any bounded architect-consultation request. It does not dispatch gatherers or broadly reconstruct the PR corpus. The parent owns evidence fulfillment and retains architecture, merge, publication, remediation, and acceptance decisions. Routing depends on the evidence and review contract, not whether a human or agent authored the PR.

Model selection remains profile policy. The shared base profile assigns Sol `high` for holistic PR due diligence.

## Success

An explicitly authorized parent can dispatch one native specialist for unfamiliar-PR due diligence and receive compact actionable findings without changes beyond its assigned evidence note, publication, recursive delegation, or self-acceptance.

## Non-goals

- Replacing focused `reviewer` verification against an accepted design and known worker history.
- Selecting or changing other agents' models.
- Submitting or publishing a hosting-system review, approving through the hosting system, merging, commenting, or fixing reviewed work; the agent returns only an advisory merge assessment.
- Delegating an architect or deciding whether its own findings are accepted.
