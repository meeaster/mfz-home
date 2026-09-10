# Vision

## Problem

Consequential work sometimes needs an independent quality-first judgment, but model-selectable delegation requires each caller to reconstruct the same reviewer role and does not receive OpenCode's native task presentation. Automatically reviewing every worker result would add cost and encourage open-ended review loops.

## Intended Behavior

`reviewer` is a native OpenCode subagent for independent review of known completed work against requirements and repository evidence. Code review loads `thermo-nuclear-code-quality-review` and covers correctness, maintainability, and substantive behavior-preserving structural simplification even when the design is accepted. The parent supplies a decision-relevant brief naming the artifact or diff, governing requirements, review boundary, material risks, validation history, and expected finding format. Structural simplification alone does not require holistic PR due diligence.

The agent has no custom system prompt. It inherits OpenCode's provider prompt and ordinary environment context. `profiles/personal/profile.yml` owns the active Personal model and variant, while the role-based name remains stable if that policy changes.

The reviewer returns prioritized, evidence-backed proposals and identifies unsupported concerns. Major structural findings identify the concrete problem and evidence, a plausible simpler alternative, actual benefit and material tradeoffs, and demonstrated effects separately from expected benefits or uncertainty. It does not implement fixes, own acceptance, expand requirements, or commission another agent. It inherits global capabilities, including shell access for efficient inspection, while agent-specific rules deny edits outside `/tmp/opencode/orchestrator-evidence/` and deny delegation. The parent adjudicates findings; proposed design or scope changes return to the user before remediation.

The human authorized direct production of explicitly assigned task-evidence notes. The caller requires `orchestrator-task-evidence` and supplies the owned path; permission or skill loading alone authorizes no file. Ordinary review remains file-free. Keep the agent promptless and leave the shared note method with that skill.

Review cadence belongs to the invoking workflow. Risk, accumulated scope, subsystem boundaries, or final verification may justify a review; the existence of a worker result alone does not.

## Success

Parents invoke `reviewer` when independence is valuable, provide an adequate charter, observe native child-session progress, and receive findings that distinguish correctness failures, maintainability concerns, unsupported hypotheses, and already-covered behavior. The parent can adjudicate every finding without asking the reviewer to reconstruct missing scope.

## Non-Goals

- Automatically reviewing every implementation or worker result.
- Implementing remediation or modifying reviewed artifacts.
- Replacing focused parent verification and established acceptance gates.
- Discovering product requirements or architecture that the review brief leaves unresolved.
- Recursively delegating work.
