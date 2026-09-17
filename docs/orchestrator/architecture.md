# Orchestrator architecture

Orchestrator Mode keeps the main session available as the human's design and implementation partner while specialists handle bounded investigation and execution. It supports an effort from an unclear problem through decisions, implementation, and acceptance without requiring the entire investigation to fit in one conversation.

This document set explains the design for the human and future maintainers. It is not an additional runtime skill or a requirement to load every page during orchestration.

## Design status

The source contracts were revised on 2026-09-16 following the discussion and audit in session `ses_f554f2fb4ffeGRvDV6x1fnVR0V`. They supersede the unconditional inspection policy at baseline `fec8a524`. Source implementation, runtime activation, and observed behavioral improvement are separate claims; task reports and execution evidence support validation and activation results.

| Status | Decision |
| --- | --- |
| Implemented | Explicit orchestration, bounded child assignments, producer-owned evidence notes, required maintained `context.md`, workspace-first recovery, and ownership-based skill loading with optional child hints. |
| Implemented in source | Coordinator-owned acceptance based on the result and remaining uncertainty replaces mandatory inspection after every worker mutation. |
| Implemented in source | Authorized immediate validation and activation stay with a coherent implementation assignment when a separate operational owner adds no distinct value. |
| Open | Whether research findings and execution handoffs need separate directories. The existing `evidence/` layout remains in use. |
| Deferred | Automatic escalation to more capable models. Reviews remain model-aware without introducing an escalation mechanism. |
| Implemented in source | Development Principles remains shared judgment guidance; owning workflows and repository policy supply execution requirements. Ordinary-use reviews observed the shorter skill in watch and overview work, without establishing causal equivalence. |
| Implemented in source | Coverage-based briefs recognize aggregate equivalence; coordinator phase transitions consider artifact readiness; consequential orchestration choices receive brief explanations. Reviews retain all standing categories, evidence-backed strengths, and decision-ready recommendations. |
| Implemented in source | Orchestrator Mode distinguishes coordinator readiness from delegated OpenSpec application work. Generated OpenSpec skills remain unchanged; their mandatory reads, schema, store, scope, and authorization contracts remain controlling. |
| Deferred | Technical Writing's unrelated maintenance obligation needs separate consideration. |

## Purpose and priorities

The coordinator retains the understanding needed to discuss the problem, challenge assumptions, explain tradeoffs, and direct the effort. Specialists absorb detail that does not improve those responsibilities. Human back-and-forth is a primary use of the main context, not overhead to eliminate.

Delegation addresses both finite context and cost. Extensive research, tool output, and implementation history can crowd out decisions and make later turns expensive. The architecture does not depend on a fixed context threshold or pricing tier. Those depend on the model and provider at the time of use.

The governing priority is to minimize unnecessary context while preserving useful behavior. Moving long instructions behind links is insufficient when an effort eventually loads them all. Each distinct requirement should have one owner, and ordinary mechanics should remain with the model where judgment is adequate.

A smaller prompt is not automatically better. Domain constraints, useful reasoning, source fidelity, and evidence needed for acceptance earn their space. The target is a good outcome at reasonable total cost, including human effort, coordinator work, and repair cycles.

Write economically without sacrificing useful evidence, meaning, applicability, or uncertainty. Source producers retain freeform depth; coordinators select what each downstream consumer needs. Useful discoveries should improve later decisions and execution, rather than merely increase the number of notes. Promotion into durable guidance is deliberate, not automatic rule accumulation.

Strict substantive review is a deliberate quality-control choice, including for inexpensive implementation. Selecting that review is separate from deciding its rigor. Routine acceptance can be proportionate while an authorized reviewer aggressively challenges correctness and maintainability with concrete evidence.

## How the parts fit together

The human-facing coordinator interprets the request, develops understanding with the human, selects bounded work, and accepts or challenges returned results. An explicitly selected parent-facing orchestrator coordinates only its delegated assignment and returns consequential questions to its parent. It does not recursively dispatch another orchestrator.

The [Orchestrator Mode skill](../../skills/active/orchestrator-mode/SKILL.md) owns coordination, routing, authority, and acceptance. Its branch references contain the applicable execution contracts. [Task Evidence](../../skills/active/orchestrator-task-evidence/SKILL.md) owns how producers write and reuse their assigned notes. A child brief supplies the current assignment and authority; background files do not grant more work.

The effort workspace preserves shared understanding and selected findings outside the conversation. It lets the human compact at a meaningful boundary, such as an accepted design, and continue implementation without manually reconstructing the whole investigation. Durable plans such as an explicitly requested OpenSpec proposal can support that boundary; they are not mandatory for every effort.

The usual flow is collaborative framing, decision-relevant evidence, an accepted direction, bounded execution, and acceptance. These are responsibilities rather than a required waterfall. Questions and new evidence can revise an earlier decision without expanding authority silently.

## Read by question

- [Ownership and delegation](ownership-and-delegation.md) explains why work stays with the coordinator or moves to a child, including continuity and model fit.
- [Context and evidence](context-and-evidence.md) explains what belongs in the main session, briefs, returns, and workspace files.
- [Acceptance and verification](acceptance-and-verification.md) explains proportionate acceptance and the handoff it requires.
- [Review orchestrator sessions](session-review.md) provides the method for assessing real behavior, alternatives, and model-specific costs.

## Authority and sources of truth

A child brief operates alongside global, workspace, and project instructions, built-in or custom agent prompts, and loaded skills. Agent descriptions guide routing; they are not automatically child prompt bodies. Custom bodies need a demonstrated benefit. Review the interaction of applicable instructions rather than attributing all behavior to the brief.

Runtime instructions determine current execution behavior. These architecture documents explain accepted intent, tradeoffs, and pending changes. The review method evaluates behavior without authorizing implementation. A human request remains the source of authority for changes, external actions, and publication.

Target-specific authoring records live in the separate Personal knowledge repository at `authoring-records/mfz-home/skills/orchestrator-mode/` and `orchestrator-task-evidence/`. Their `VISION.md` preserves intent, `EVALS.md` contains scenarios and expectations, and optional `MAINTENANCE.md` explains outside sources, adaptations, and refresh considerations. They are local references rather than dependencies required to understand these pages. Task reports and execution traces retain observed results for their recorded revisions.

When a pending design is implemented, reconcile the affected runtime instructions and scenarios, then update this status. Report validation separately from expected behavior and keep detailed traces out of routine architecture reading. Record cleanup does not require a replacement archive.

The earlier [author and operator investigation](../orchestrator-author-operator-workflow.md) contains historical options and cost evidence. Its provisional alternatives are not additional accepted requirements.
