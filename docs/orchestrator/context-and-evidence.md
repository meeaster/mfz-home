# Context and evidence

The [2026-09-22 redesign](redesign-2026-09-22.md#workspace-structure-and-ownership) replaces the earlier file layout and continuity policy below. The prior explanation is retained for historical context. Current evidence and operational-learning ownership are defined in [Task Evidence](../../skills/active/orchestrator-task-evidence/SKILL.md).

The coordinator needs enough understanding to be an informed partner, not a copy of every specialist's working context. Evidence files preserve facts and reasoning that influence decisions, design, implementation, and acceptance. Session history retains the detailed execution trace.

This page explains the implemented [workspace contract](../../skills/active/orchestrator-mode/references/workspace-and-coordination.md) and the rationale for selective handoffs. Worker acceptance is described separately in [Acceptance and verification](acceptance-and-verification.md).

## Context must serve a consumer

A substantial coordinator load earns its place when it improves human discussion, scopes an assignment, resolves an acceptance question, supports authorized direct work, or preserves necessary continuity. A file can be valuable without causing an immediate tool call. Helping explain a consequential tradeoff to the human is useful work.

Project relevance alone is insufficient. Detailed library alternatives may be useful during stack selection and irrelevant to a later one-line executable repair. The relevant consumer and next decision determine what to transfer.

## Skill bodies follow ownership

The coordinator determines task ownership before loading specialist guidance. It loads bodies needed for its own work and decisions, including consequential scoping or acceptance. Loading every skill associated with the overall topic defeats isolation before delegation begins.

Descriptions can still help the coordinator suggest likely relevant skills to a child. This preserves useful matching judgment when the coordinator and child use different models. Suggestions remain hints: the child checks applicability and selects other needed skills. Explicit requirements from the human, applicable instructions, or the delegation contract remain distinct. Task Evidence is an explicit contract requirement.

Fresh children do not inherit loaded skill bodies. Applicable mandatory guidance can therefore be repeated legitimately across sessions. Its cost must be evaluated alongside its benefit and the model doing the work, rather than treated automatically as waste.

Provider-level caching is separate from inherited context. A fresh session can reuse a matching provider-cached prefix, but reading the same files does not guarantee that result. Aggregate cache counts do not identify which content matched. Cached input still occupies context and incurs charges. Review observed request costs separately from expected savings; orchestration uses configured default models rather than selecting alternatives to chase cache or price differences.

OpenSpec's generated skills retain their own reading and execution requirements. The [OpenSpec routing contract](../../skills/active/orchestrator-mode/references/routing-and-roles.md#openspec) keeps local ownership guidance in Orchestrator Mode. A coordinator authoring a proposal follows Propose's required reads. For delegated apply, it establishes readiness and acceptance from current accepted artifacts without first running the implementation workflow just to prepare the worker's context. The implementation owner loads Apply and follows its current-state and mandatory reading requirements. The coordinator still reads deeper for material decisions and refreshes uncertain evidence; avoiding duplicate ownership does not authorize skipping workflow requirements.

## Workspace files have separate jobs

Efforts use `/tmp/opencode/orchestrator-workspaces/<effort>/`. Names describe the human's overall goal and remain stable across phases. Empty `sessions/<session-id>.md` markers support lookup and retain earlier session associations. The design assumes sequential use and avoids active-owner metadata or takeover protocols.

| Material | Purpose |
| --- | --- |
| `context.md` | Required current understanding: goal, motivation, preferences, constraints, waivers, accepted decisions and rationale, consequential rejected directions, open questions, and next step. |
| `assignments/<assignment-id>/evidence/<producer-id>.md` | Attributed findings from one direct producer, with supporting observations, uncertainty, applicability, and useful lessons. The topology's assignment owner owns the note: the current session in `baked-in` and the standing orchestrator in `chief/split`. Required for each evidence-producing dispatch; internal helpers contribute through their parent's note unless separately assigned one. |
| `sources/` | Raw material retained from another system, such as an extracted Teams meeting transcript. Created when needed, with provenance and extraction limits recorded in a linked note or index entry. |
| `screenshots/` | Useful rendered captures when validation produces images. The existing owner note or helper return maps selected images to artifact revisions, viewports, relevant state, and recipient-accessible paths. |
| `index.md` | At effort level, one scribe-maintained pointer row per completed assignment. At assignment level, a catalog of checked notes and source captures, with their relevance, freshness, conflicts, and supersession; it is required after the first checked producer note or source capture. |
| `synthesis/<topic>.md` | Authorized evidence-informed reasoning with concrete reuse value. Creation requires a human request or acceptance of a recommendation. |
| `design.md` | Optional accepted technical background shared by several units. |
| `coordination.md` | Optional cross-unit ownership, dependencies, status, and acceptance state. |

The workspace is temporary internal memory, not publication or new authority. A complete assignment belongs in the brief or its explicitly designated authoritative specification. Separate brief files, placeholder notes, and duplicated catalogs add maintenance without established benefit.

## Notes preserve findings, not the whole investigation

Evidence producers choose the depth and structure their findings warrant. Economical language removes unnecessary wording, not useful source detail, conflicting evidence, reasoning, or uncertainty. A substantial freeform note can prevent repeated investigation; its length alone is not a defect. Briefs and returns select what the immediate consumer needs rather than duplicate that depth.

Shared handoff ownership follows the coordinating orchestrator's direct children. For example, artifact-author's nested inspector returns findings directly to the author without loading Task Evidence or writing a separate shared note by default. The author incorporates relevant findings, attribution, artifact versions, screenshots or measurement links, and limits into its own handoff. Detailed traces stay with the inspector. An explicit independent evidence-note assignment is the exception; an authorized child orchestrator still assigns notes to its own direct producers.

Saving a capture does not prove that it contains usable evidence. The inspector checks content, readable scale, and overlays, and the author views selected final images before handing back a visual artifact. A fresh author receives the current artifact and selected evidence rather than an automatic replay of obsolete images. The [screenshot contract](../../skills/active/orchestrator-mode/references/child-contracts.md#screenshot-evidence) defines the runtime obligations without another shared note or manifest.

Preserve discoveries that can improve a successor's decisions or actions, including the conditions for applying them. No fixed word limit, mandatory lesson section, or additional lesson file is required. Evaluate whether the discovery was captured, selected, applied, and useful. Cross-effort promotion requires deliberate maintenance through the owning workflow.

Research findings establish external facts, options, constraints, and uncertainty. Implementation handoffs explain changes, relevant validation, unexpected effects, and discoveries. Review findings support acceptance or challenge a previous claim. They currently share `evidence/` because each can inform downstream decisions.

The `sources/` folder holds retained inputs, while these interpreted findings remain in `evidence/`. For example, an extracted meeting transcript can be retained before anyone analyzes it. Notes link to the capture rather than replacing its content with a summary. Source captures share the workspace's temporary lifetime.

The primary consumers are the next decision and likely effort continuation. Full auditability does not require every note to repeat a session trace. Exact commands, excerpts, versions, and hashes earn their space when they make a claim actionable, reproducible, or correctly bounded. Routine command histories and unchanged file inventories usually do not.

A successor note explains what it adds, independently verifies, qualifies, or contradicts. An inspector can reference the worker's implementation description and preserve its own observations instead. One disproved claim does not make every finding in a note obsolete.

A recommended procedure remains a proposal. The coordinator reassesses whether it addresses a remaining gap before making it a requirement. In the audit, a useful manual installation probe persisted after a regression covered its purpose; repeating its recommendation created work without adding equivalent evidence.

## Briefs and returns select the next useful context

A brief preserves objective, why it matters, relevant human priorities, authority, consequential constraints, selected readings, expected result, and stop conditions. The coordinator supplies critical details directly when a pointer cannot safely carry them. Otherwise, a path and its relevance can replace a repeated summary.

Selected readings should answer the next unit's questions. Sending the full predecessor chain by default transfers the burden of context selection to every child. Readers retain discretion to search or read selected material in full when useful.

The return identifies the completed note and the material result, uncertainty, blocker, or changed state. The coordinator reads deeper for a reason, such as a contradiction or insufficient acceptance evidence. Routine rereading of every modified file reduces the benefit of delegation.

## Continuity preserves meaning without replay

On coordinator instruction, the scribe transcribes assigned state files, including `context.md`, effort-level `index.md` pointer rows, and authorized synthesis, using pointer briefs with `session_context` pulls. The coordinator owns the decisions and content and updates `context.md` when discussion changes the shared understanding or a phase boundary changes the next step. It replaces stale statements instead of appending an activity log. The index preserves discoverability and supersession; context does not need to duplicate it.

A later authorization to commit should replace an earlier no-commit constraint. After completion, context should state the resulting commit status and remaining authority, with operational details in the producer note. Appending an authorization section while retaining contradictory constraints or obsolete pending actions leaves the successor to reconcile a history that the coordinator already understands. No dedicated publication section is required.

Resumption reads context first and reconciles selected working files with the current request and mutable state. Prior-session inspection requires a specific unresolved fact blocking the next action, or an explicit historical investigation request. Missing temporary files or a new session alone do not justify replaying history.

The earlier continuity policy treated an accepted design, completed proposal, or accepted implementation as a possible transition, not a mandatory reset. The current [continuity reference](../../skills/active/orchestrator-mode/references/recovery-and-continuity.md#after-parent-compaction) keeps compaction explicitly human-requested and defines the subsequent automatic recovery check.

Coordinator transitions are distinct from the role-specific child non-resumption limit. Artifact-author and agent-author regardless of model, plus any subagent explicitly assigned Sol by the human, require a fresh child above 150,000 recorded request-input tokens at the next dispatch. Determine Sol coverage from the known explicit selection rather than querying configured defaults. Preserve necessary meaning through selected artifacts and evidence even when little work remains. This policy does not establish a degradation threshold for other sessions.

Before a transition, current context must agree with accepted artifacts about authority, decisions, remaining work and verification limits, mutable state, and the next action. Relevant child handles preserve useful continuity. A completed proposal does not grant implementation authority, and a stale read-only constraint does not describe later authorized implementation. Existing files can carry this state without another handoff document. Refresh relevant mutable state on resumption rather than assume the recorded checkout is unchanged.

Anything required beyond the temporary effort needs deliberate promotion through its owning workflow. Recovery should preserve uncertainty where evidence is missing rather than reconstruct confident-looking state from guesses. [Session review](session-review.md#assess-coordinator-phase-boundaries) evaluates actual historical readiness separately from a possible context saving.
