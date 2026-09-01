# Vision

## Problem

Consequential work sometimes needs an independent quality-first judgment, but model-selectable delegation requires each caller to reconstruct the same reviewer role and does not receive OpenCode's native task presentation. Automatically reviewing every worker result would add cost and encourage open-ended review loops.

## Intended Behavior

`reviewer` is a native OpenCode subagent for independent review of completed work against requirements and repository evidence. The parent supplies a self-contained review brief naming the artifact or diff, governing requirements, review boundary, material risks, and expected finding format.

The agent has no custom system prompt. It inherits OpenCode's provider prompt and ordinary environment context. Its configured Sol/high model is the current quality-first review policy, while the role-based name remains stable if that policy changes.

The reviewer returns prioritized, evidence-backed findings and identifies unsupported concerns. It does not implement fixes, own acceptance, expand requirements, or commission another agent. It inherits global capabilities, including shell access for efficient inspection, while agent-specific rules deny file-editing tools. The parent supplies the review boundary and available validation evidence, then adjudicates findings and decides whether remediation is warranted.

Review cadence belongs to the invoking workflow. Risk, accumulated scope, subsystem boundaries, or final verification may justify a review; the existence of a worker result alone does not.

## Success

Parents invoke `reviewer` when independence is valuable, provide an adequate charter, observe native child-session progress, and receive findings that distinguish correctness failures, maintainability concerns, unsupported hypotheses, and already-covered behavior. The parent can adjudicate every finding without asking the reviewer to reconstruct missing scope.

## Non-Goals

- Automatically reviewing every implementation or worker result.
- Implementing remediation or modifying reviewed artifacts.
- Replacing focused parent verification and established acceptance gates.
- Discovering product requirements or architecture that the review brief leaves unresolved.
- Recursively delegating work.
