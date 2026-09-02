# Log

## 2026-09-01 - Initial design

- Added an explicit orchestration mode that pins the coordinator model family to Sol and keeps implementation out of the primary session.
- Routed work by stable agent role rather than naming model families in task briefs.
- Made coordinator verification the default acceptance path and reserved independent Sol review for consequential or hard-to-verify work.
- Required self-contained fresh-child briefs through the existing context-transfer contract.
- Kept the command ephemeral and separate from OpenSpec or other durable workflow state.

## 2026-09-01 - User-controlled model and expensive lanes

- Removed the command model override so orchestration uses whichever model and reasoning effort the user selected for the primary session.
- Allowed read-only `explore`, `research`, and `triage` work to fan out without separate approval.
- Required explicit user authority before every `worker` or `reviewer` dispatch because workers mutate state and reviewers consume an expensive model lane.
- Removed automatic review after worker output; coordinator verification remains the default.

## 2026-09-01 - Current-state inspection and planning artifacts

- Added `inspect` for read-only current state in cloud accounts, deployed environments, runtime systems, and work systems.
- Kept broad file and system evidence gathering in `explore`, `research`, `inspect`, and `triage` so the primary session can focus on conversation and design.
- Allowed the primary to record an accepted design in an explicitly requested OpenSpec or other planning artifact through its owning workflow.
- Kept application, infrastructure, and operational mutations behind an explicitly authorized worker.

## 2026-09-01 - Shared working model and decision packets

- Made the primary session an opinionated collaboration and design partner that challenges assumptions, weighs options, recommends, and states what evidence would change its view.
- Defined the primary session as the effort's shared working model across fresh child contexts.
- Required generous child briefs carrying all accumulated context that could change interpretation or judgment, while preserving the distinction between facts, inference, hypotheses, preferences, and accepted decisions.
- Required compact decision packets back from source-gathering children so raw discovery does not consume the primary context.
- Limited direct source inspection and repeated investigations to focused adjudication, consequential verification, and acceptance checks.

## 2026-09-01 - Operational mutation routing

- Kept agent roles based on purpose and authority rather than adding destination-specific GitHub, Atlassian, Datadog, or deployment agents.
- Routed current-state reads to `inspect`, reported-failure diagnosis to `triage`, and authorized state changes to `worker` using the owning domain skill or workflow.
- Made mutation authority outcome-scoped: commit, push, pull request, merge, publication, deployment, and cross-system updates remain distinct unless one requested transaction inherently requires an operation.
- Preferred separate bounded workers for independent systems so one authorization does not silently expand into another.

## 2026-09-01 - Continuity-aware child reuse

- Made the coordinator responsible for a compact roster of child sessions, prior objectives, explored areas, reusable retained context, and limitations.
- Required source-gathering decision packets to end with continuity metadata so later routing does not require loading full child transcripts.
- Preferred resuming a relevant child when scope and evidence overlap materially, passing only the new objective and context delta.
- Kept fresh children for independent evidence, changed role or authority, materially different scope, stale context, overloaded sessions, or bias risk.
- Treated provider prompt-cache savings as opportunistic rather than guaranteed; useful retained session context is the routing criterion.

## 2026-09-01 - Architecture consultant and phase guidance

- Added `architect` as a Sol/medium read-only consultant for code-heavy architecture synthesis while keeping user dialogue and final decisions in the primary session.
- Required credible options when they exist, one recommendation tied to user priorities, and explicit conditions that would reverse it; rejected forced alternatives when only one design is viable.
- Added proportional OpenSpec classification after accepted design and required user authority before proposal creation.
- Added risk-based review recommendations without automatic reviewer dispatch.
- Required one contextual next-step recommendation at meaningful phase boundaries instead of generic action menus.

## 2026-09-01 - Specialized agent authoring

- Added `agent-author` as a Sol/medium mutation lane for skills, agent and command definitions, repository agent guidance, system prompts, routing descriptions, maintained prompt packages, and authoring records.
- Required explicit create or revise authority and kept design discussion non-mutating.
- Routed general application mechanics to `worker`, product architecture to `architect`, and independent approval to `reviewer`.
- Split mixed AI-facing and application work when practical so each specialist owns a clear behavioral interface.
- Kept publication, source-control operations, deployment, and unrelated system changes outside authoring authority.

## 2026-09-01 - Proportional implementation preflight

- Added no new role: `inspect` owns read-only readiness, while explicitly authorized `worker` sessions own mutable preparation and implementation.
- Kept trivial or inherent setup with implementation and allowed a separate preparation worker only for substantial mechanically separable setup that would pollute implementation context.
- Required coordinator verification and a compact prepared-state handoff before a fresh implementation worker receives a narrowed brief.
- Serialized preparation and implementation over shared mutable state and rejected resume-for-cache as a continuity reason after substantial setup.
- Preserved unrecognized dirty state, made "get latest" require a concrete Git operation, and kept branch, commit, push, pull request, merge, Jira, publication, deployment, and environment authority distinct.

## 2026-09-01 - Root-owned architecture evidence

- Made the primary `/orchestrate` session own all architecture-specific `explore`, `research`, and `inspect` children so their evidence remains shared, reusable, and visible in the primary roster.
- Required relevant compact packets and session IDs before architect dispatch and a bounded evidence-request contract when the architect finds a material gap.
- Made the coordinator assess materiality, duplication, scope, and authority; fan out independent requests when useful; check packets; and resume the same architect with only the packet, session ID, and material delta.
- Rejected transcript replay, architect-side OpenCode session retrieval, a custom session-result transport, and nested architect delegation because they add topology and protocol complexity without reducing synthesis cost.
- Kept the policy evolutionary: revisit nesting only if repeated live cases show material root-mediation delay or primary-context bloat that outweighs simpler shared evidence ownership.

## 2026-09-01 - Batched architecture evidence coordination

- Accepted one architect evidence request or a batch with complete per-unit fields, dependencies, and parallel-safety markings.
- Required the primary to assess every unit for materiality, duplication, scope, read authority, and overlap with existing children before dispatch.
- Made independent authorized units concurrent and dependent units serial while preserving detailed evidence in root-owned gatherer sessions.
- Preferred one checked, batched resume of the same architect with packets, session IDs, results, gaps, and material delta over one resume per gatherer.

## 2026-09-02 - Proportional session reconstruction

- Removed the temporary continuity-artifact policy after observed cost and maintenance evidence showed that it duplicated durable OpenCode history, encouraged frequent Sol-authored refreshes, added context and staleness costs, and was not durable.
- Made durable OpenCode session history the sole continuity and trace-evidence backbone, with the active compaction summary and context as the default continuation path.
- Limited root-owned `session-analyst` reconstruction to material continuity gaps in work that spans a relevant compaction boundary; neither compaction itself nor genuinely new post-compaction work triggers recovery.
- Required the smallest question-led reconstruction of the relevant phase, compact continuation-changing output, coordinator conflict checks, and focused follow-up for bounded gaps.
- Kept persistent artifacts under separately requested owning workflows rather than creating parallel session state during reconstruction.

## 2026-09-02 - Native prototype routing

- Added `prototype` as a first-class mutation lane for explicitly authorized runnable artifacts that test one bounded, unsettled logic, state-model, or UI design question.
- Kept artifact procedure in the existing `prototype` skill and kept classification, interpretation, and final decisions with the coordinator.
- Distinguished prototype creation from architecture discussion, generic technical-feasibility spikes, and production implementation; accepted production work requires separate worker authority.
- Kept prototype authority outcome-scoped: it does not imply commit, push, pull request, publication, Jira updates, deployment, or productionization.
- Applied the existing proportional preparation policy without imposing separate setup work on trivial prototypes.

## 2026-09-02 - Agent-author acceptance policy

- Reversed the earlier risk-based review recommendation for agent-author output at the user's direction.
- Made coordinator artifact inspection, focused validation, and uncertainty reporting sufficient after agent authoring, without recommending independent review.
- Kept reviewers available by explicit user request and preserved risk-based review recommendations after consequential or hard-to-verify implementation work.

## 2026-09-02 - Capability-aware source gathering

- Defined `explore`, `research`, and `inspect` by evidence source and required operation: local static files, authoritative external sources, and current or command-derived facts respectively.
- Routed all read-only command execution to `inspect`, split materially different evidence classes into bounded units, and kept `explore` and `research` non-shell lanes.
- Preserved `triage` as goal-oriented diagnosis of one reported symptom rather than using it for generic shell work.

## 2026-09-02 - Holistic pull-request review routing

- Added explicitly authorized `pr-reviewer` routing for unfamiliar or unobserved pull requests whose intent, rationale, architecture, simplification, validation, and merge case must be reconstructed and challenged.
- Kept focused `reviewer` for defect and drift verification against a parent-owned accepted design, known worker brief, and supplied validation history.
- Made evidence confidence and review contract, not human-versus-agent provenance, select the lane; kept evidence reuse, architect escalation, merge decisions, and acceptance parent-owned.

## 2026-09-02 - Root-owned pull-request evidence cycle

- Moved broad PR, source, external, current-state, and validation gathering to root-owned source gatherers before and during due diligence.
- Added complete single or batched reviewer evidence requests, parent deduplication and scheduling, checked compact packets, and one practical reviewer resume with material delta.
- Limited reviewer-local inspection to focused verification or conflict adjudication and kept architecture consultation and authority questions outside the evidence cycle.
