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

## 2026-09-02 - Human-gated architect consultation

- Preserved autonomous root-owned read-only evidence gathering while making clear that it grants no authority for architecture consultation, mutation, or review.
- Required the coordinator to explain why specialist synthesis is useful despite its configured expense, summarize gathered evidence and the pending decision, and obtain explicit human approval before starting `architect`; model selection remains owned by agent and profile configuration, so the command does not encode model names, providers, prices, or durable cost tiers.
- Required the main session to surface the substantive architect packet, including credible options, evidence and inferences, strongest cases and tradeoffs, recommendation, uncertainty and gaps, and reversal conditions.
- Required explicit human acceptance or revision of the design before implementation is proposed or its separate authority requested. Architect consultation accepts no design, authorizes no implementation, and does not weaken the existing explicit gates for authoring, prototypes, mutation, or either review lane.
- Left child fresh-versus-resume behavior, context-cost routing, handoff policy, dispatch foregrounding, and independent-review policy unchanged.

## 2026-09-02 - Fresh source gatherers and message memory

- Changed only `explore`, `research`, and `inspect` to fresh-by-default routing for each bounded unit. Resume now requires direct continuation of the same unresolved investigation and downstream decision, the same role and materially overlapping evidence family, no independence need, and retained value that compact memory cannot preserve.
- Added latest-only reusable memory in successor prompts, with source session ID, decision context, verified evidence and freshness, open work, warnings, and routing guidance. It remains evidence rather than truth, creates no filesystem artifact, avoids transcript replay, and is replaced rather than recursively accumulated.
- Made known context burden, staleness, compaction, noisy traces, failures, retries, and unrelated work advisory reasons for freshness without numeric token, cost, age, turn, or context thresholds. Missing telemetry is neutral; cache economics never independently justify resume; routine routing does not commission session archaeology.
- Based the policy on live trace `ses_f9b1f8dd0ffeLe0rAqH3HM1i7l`, including fresh research (`ses_f9b278de0ffeyk66VygUiPUYK7`), marker inspection (`ses_f9b278c3dffecwkI5b5aiVjR40`), and a fresh cross-role successor plus justified bounded repair (`ses_f9b25b2fbffeoz1nEdk1ryM5a1`). The successor used transferred memory without replaying the research trace; the repair was semantically justified but not proven cheaper, and observed compaction plus incomplete foreground-only usage markers did not support a universal threshold.
- Left background-versus-foreground defaults and continuity for `triage`, `architect`, `agent-author`, `prototype`, `worker`, `reviewer`, and `pr-reviewer` unchanged. Added no provider memory, persistence, plugin, model, permission, or validation-script behavior, and preserved the separate architect, implementation, and review authority gates.

## 2026-09-02 - Provisional non-source continuity defaults

- Defined continuity by retained role context rather than usage telemetry or a generic expense label. The defaults remain provisional until an explicitly requested post-hoc assessment can ground revisions in observed orchestration traces.
- Made `architect` strongly continuity-biased within one downstream design engagement, including human correction and reconsideration. Materially new boundaries and separately approved independent opinions start fresh; persistent anchoring is tested through correction before a fresh opinion supplements the existing engagement.
- Required explicit human approval for every architect dispatch or resume. Architect-requested evidence remains autonomously gatherable within scope, but the coordinator surfaces it in the main session and obtains direction before returning it.
- Made `triage` resumable within one incident, mutation and artifact roles fresh per accepted unit with bounded unchanged-unit continuation, and review roles fresh for initial judgment with only same-review evidence completion or conflict adjudication resumable.
- Kept coordinator verification as the post-remediation default. A separately approved independent rereview starts fresh, reviewers never repair or approve their own findings, and remediation normally goes to a fresh authorized worker.
- Added no background dispatch policy, numeric threshold, cost estimator, fixed model tier, persistent memory, automatic session analysis, role, command, file, script, plugin, or source-gatherer policy change.

## 2026-09-02 - Worker blocker classification and diagnosed continuation

- Kept `worker` and `triage` frontmatter-only and placed their per-unit troubleshooting and diagnosis contracts in coordinator-supplied briefs so both agents continue to inherit the provider system prompt.
- Made the coordinator check worker blocker packets and start fresh read-only triage for one unknown symptom without transferring raw failed-command history.
- Made triage diagnosis a checked evidence boundary, then preferred a fresh standard worker with the accepted brief, current partial state, diagnosis, approaches not to repeat, remediation objective, and focused verification.
- Kept a narrow original-worker resume exception for one bounded answer that unlocks the exact unchanged unit when retained working state has concrete value beyond files and packets.
- Routed possible design-assumption conflict through the coordinator's smallest root-owned evidence pass and the existing human-gated architect engagement. Worker and triage cannot route directly to architect or declare the design invalid.
- Returned changed requirements, scope, access, or authority to the human while allowing existing implementation authority to continue only within the exact accepted contract.
- Deferred any stronger worker lane until comparable post-hoc traces show bounded stop, clear triage diagnosis, fresh standard-worker failure with a complete brief, and stronger-model success on the same bounded class of work. Added no role, model or profile change, override, background policy, automatic escalation, or numeric threshold.

## 2026-09-02 - Direct mutation preflight and coordinated repositories

- Corrected a steering defect observed after an explicit two-repository commit-and-push request: the coordinator dispatched a redundant read-only preflight that the mutation worker would have needed to repeat. The interrupted inspection returned no evidence and no Git mutation occurred.
- Made the authorized mutation owner responsible for ordinary immediate preflight, validation, safety checks, and final-state verification. Separate inspection now requires an independently useful read-only outcome, absent mutation authority, or a distinct live-system, access, or human-decision boundary.
- Kept substantial mechanically separable preparation available when it changes the brief or state or protects build context, while preventing duplicate source reading, validation planning, and state checks across children.
- Allowed one worker to execute an explicitly authorized coordinated operation across known repositories sequentially. Each repository keeps separate instructions, validation, Git history, Conventional Commit, remote handling, and result.
- Declared cross-repository publication non-atomic. Partial push success remains in place, receives exact per-repository reporting and the smallest recovery action, and never triggers destructive rollback.
- Required focused coordinator acceptance for every affected repository, including Git status, commit identity, branch and upstream relation, and push state as applicable, without a second broad preflight.
- Preserved exact mutation authority, dirty-state protection, human-gated architecture and design acceptance, source and non-source continuity, worker-to-triage escalation, promptless worker and triage definitions, foreground behavior, and coordinator acceptance.

## 2026-09-02 - Semantic implementation units and conservative mutation scheduling

- Required the coordinator to define coherent implementation units before scheduling them. Each unit now has one primary accepted outcome, one ownership boundary, explicit mutable state and domain, compatible acceptance and validation, dependencies, and integration needs; file, directory, repository, and change counts are not sizing rules.
- Made sequential mutation the default and unknown overlap a serialization decision. Different plugin directories in one checkout remain coupled through Git and index state, lockfiles, installation and dependency state, generated output, tests and caches, active runtime state, schemas, and `mfz apply` unless those surfaces are explicitly isolated.
- Allowed parallel mutation only for demonstrably independent responsibilities and state when concurrency has material value. Separately authorized isolated worktrees or environments defer shared integration, and a separately authorized integration worker owns any required combining mutation or distinct shared validation outcome.
- Added qualitative context-pressure guidance without numeric thresholds. A narrow worker may finish successfully after compaction; a broad plan that survives compaction with unrelated streams, repeated discovery, or no validated intermediate outcome stops through the existing blocker packet.
- Grounded the revision in post-hoc analysis `ses_f9a931650ffedb3OQbY9CXSBZg` of parent `ses_f9b7445b8ffeSMUeszW1oWFIhh`: one worker spanning materially different `omp-advisor` and `pstack` plugin domains reached about 251k effective context, compacted once, later failed another compaction after 274 tools and six failures, and returned no validation handoff; a fresh narrower retained-plugin worker also compacted near 251k and succeeded. Separate bounded profile follow-ups completed without compaction, showing that file or change count is not a sizing rule and compaction is pressure rather than proof of failure.
- Preserved parallel autonomous read-only source gathering and the direct one-worker path for explicitly requested coordinated multi-repository commit and push. Publication remains sequential, non-atomic, repository-specific, and unsplit by repository count alone.

## 2026-09-02 - Raw conversational invocation input

- Reframed command arguments as the user's raw current prompt rather than prematurely naming them as a settled task.
- Moved the single unwrapped `$ARGUMENTS` placeholder to the command's end under `## User prompt`, keeping the user's current message recent and distinct from the orchestration policy.
- Made questions, corrections, partial thoughts, brainstorming, spoken-style exploration, and prior-context-dependent input explicit while preserving natural conversational interpretation.
- Preserved all orchestration routing, continuity, authority, model inheritance, and validation behavior; mentioning possible implementation still grants no mutation authority.

## 2026-09-03 - Bounded continuation across mechanism changes

- Corrected the fresh-per-unit rule after the coordinator treated a resolved provenance and placement incompatibility as a new authoring unit even though the same objective, artifacts, checkout, generated evidence, authority, and validation context remained useful.
- Made a clean stop on one bounded decision continuity-biased when the user's answer preserves the underlying work unit and retained context has material value, including changes to mechanism, provenance, implementation route, placement, or blocker resolution.
- Added the concrete seven-generated-skill case: when formal vendoring is incompatible and no repository mutation occurred, choosing to refresh the same skills in their existing local location should resume the existing `agent-author`.
- Preserved fresh diagnosis after looping implementation, fresh independent review, fresh genuinely distinct mutation units, substantial-preparation separation, and all authority gates.

## 2026-09-03 - Additive operator routing

- Added `operator` as the explicitly authorized lane for settled procedural and operational mutation while preserving `worker` for application and OpenSpec implementation, substantive code changes, focused remediation, difficult implementation investigation, and novel troubleshooting.
- Routed by primary accepted outcome and complexity rather than whether files are touched; straightforward operational scripts and configuration remain operator work, while software behavior and difficult remediation remain worker work.
- Moved substantial mechanically separable preparation, Git publication, supported CLI workflows, infrastructure and deployment operations, and external-system state changes from orchestrate's worker route to operator without changing authority gates.
- Kept implementation troubleshooting on worker. Operator correction remains bounded to narrowing evidence within a settled procedure; unknown symptoms use fresh triage, bounded procedural continuation returns to operator, and novel troubleshooting goes to worker.
- Applied the same fresh-per-unit and bounded-continuation rules to operator, retained coordinator verification, and preserved `implement-design` and `openspec-rolling-apply` worker calls.
- Recorded the corrected placement: the base profile owns operator Luna/high, Personal inherits it without an override, and Personal worker remains Luna/max.

## 2026-09-03 - Local-clone upstream source inspection

- Distinguished GitHub-hosted published documentation, releases, APIs, registries, and metadata from repository internals so hosting location does not trigger cloning.
- Kept published and bounded one-file evidence with research, while routing source-tree search, cross-file relationships, implementation details, and history to root-owned explore against local source.
- Required the coordinator to check the canonical clone index first, then directly perform bounded disposable clone, fetch, and exact-ref checkout preparation under `/tmp/opencode` only when no suitable clone exists; this narrow exception avoids a ceremonial preparation child.
- Rejected the intermediate operator-preparation route before finalizing the policy because delegating a simple temporary clone adds ceremony without improving source judgment.
- Treated a request materially requiring upstream source inspection as narrow authority for temporary evidence infrastructure, without granting private access, credentials, persistent placement or publication, destructive broad cleanup, canonical-reference edits, or upstream Git mutation.
- Required exact commit, tag, or ref provenance for version-sensitive inspection and kept current or runtime command-derived facts with inspect.
- Grounded the change in the terminal-control investigation, where a research child fetched many GitHub implementation files and exposed weaker searchability, provenance, and role separation than local cloned source plus explore.

## 2026-09-03 - Intent-first failure diagnosis

- Corrected a trace-observed routing gap where a request to diagnose one deterministic Datadog cost-report GitHub Actions failure went to `inspect` because the available evidence was CI logs and artifacts.
- Made the requested outcome decisive before evidence-source routing: one bounded reported failure or symptom with a causal, diagnostic, root-cause, or disposition ask starts fresh `triage`.
- Kept `inspect` for supporting current CI, log, runtime, status, result, inventory, and command-derived facts, and kept `explore` and `research` under their existing evidence-source rules.
- Recorded that "investigate" alone is not a triage trigger and added adjacent regression cases without changing agent definitions, authority gates, or the wider orchestration model.

## 2026-09-03 - Pre-Mutation Safety Challenge

- Added a fresh `safety-reviewer` evidence step before operator dispatch for production, shared, destructive, cross-resource, broad-selector, IAM/access, networking/routing, monitoring-suppression, poorly reversible, or unclear-blast-radius external operations.
- Kept current-state gathering with fresh `inspect` units and ordinary immediate preflight and mutation with `operator`; the coordinator sends only a concrete operation packet and materially needed evidence to the safety reviewer.
- Made `conditions`, `hold`, and `insufficient evidence` pause operator dispatch while preserving an explicit user override path whose concern and residual risk remain visible.
- Kept `no material concern found` advisory rather than authorizing, retained coordinator acceptance, and excluded trivial isolated reversible operations from the extra lane.
- Required fresh reassessment after material packet changes and added no model-matrix testing, live cloud scenario, architecture consultation, or independent completed-work review.

### Read-only inspection correction

- Allowed the safety reviewer to verify consequential packet claims through clearly read-only Bash and inherited integration operations while keeping mutation and delegation denied.
- Replaced the blanket broad-inventory and architecture exclusions with path-based scope: investigate credible blast-radius paths, including broad inspection for genuinely broad operations, and omit unrelated systems or design preferences.

## 2026-09-03 - Lifecycle-first text-conservative structure

- Reorganized the command into eight lifecycle-primary sections followed by the final user prompt, with subsections that expose the coordinator/user decision surface and coordinator/child-agent contract where each becomes relevant.
- Moved existing obligations largely verbatim and preserved their modalities, authority boundaries, freshness defaults, exceptions, causal sequence, and intentional repeated emphasis.
- Removed one fragile `above` reference after moving preparation classification ahead of the operational-safety section; no other non-heading runtime wording changed.
- Added focused structural and losslessness assertions without changing invocation, roles, permissions, models, tools, numeric limits, fallback lanes, authority gates, or behavior.

## 2026-09-03 - Prospective sequence authority

- Replaced redundant just-in-time approval with prospective authority for concrete user-requested sequences whose named steps, target, outcome, and system boundary are clear.
- Defined material invalidation across outcome, target, scope, environment and system boundary, access, consequential resources, risk, reversibility, design assumptions, validation, and required authority; required a visible pause for failed gates, unresolved consequential choices, broader or different work, missing authority, safety-reviewer non-clean status, or user-relevant blockers.
- Changed architect gating from approval before every turn to one bounded engagement covering material evidence requests, follow-up, and reconsideration within the same downstream decision and system boundary. Kept fresh authority for materially new or invalidated decisions, new boundaries, unrequested independent opinions, and out-of-sequence architecture work.
- Kept architect output advisory and human authority controlling. A prospectively authorized implementation of a bounded architecture result may continue only within supplied constraints and without a consequential unresolved choice.
- Added the parent-only OpenSpec orchestration exception: an explicit proposal-then-Apply or implementation request remains two workflow units, with `openspec-propose` planning-only and stopped before a fresh implementation worker. Proposal-only and direct skill invocation retain their later-request boundary.
- Clarified that explicitly named implementation-to-review, commit-to-push-to-PR, preparation-to-build, evidence-to-architecture-to-implementation, and higher-risk operation sequences may continue without ceremonial approval while their authority basis remains intact. Merge, deployment, unnamed external systems, broader access, and other adjacent outcomes remain excluded.
- Added focused static evaluation scenarios for conforming continuation, material-change pauses, all three non-clean safety statuses, and vague future-step denial. No OpenSpec skill, native agent, profile, model, permission, plugin, or operational system changed.

## 2026-09-03 - Salient read-only delegation prerequisite

- Made explicit near the coordinator-boundary opening that invoking `/orchestrate` requests and authorizes the command's named read-only subagent dispatches and therefore satisfies applicable delegation prerequisites.
- Added focused scenarios for autonomous source gatherers, comparative current-runtime evidence staying with a fresh `inspect` unit, targeted `session-analyst` reconstruction, and the boundary between focused coordinator acceptance checks and substantive evidence aggregation.
- Preserved every mutation, architecture, authoring, prototype, safety-review, implementation, review, and publication gate. Added no arbitrary or recursive delegation, broader scope, role-selection change, source-routing change, prospective-sequence change, permission, model, tool, agent-definition, plugin, or operational-state change.
- Grounded the clarification in OpenCode GPT extension commit `8068c5e48c0b3d81b0849349d0626ba048cb0c6d` and triage session `ses_f96d9ed06ffeOy0PVKjhx1cxpt`; the prior command already met the rule literally, so this revision addresses dispatch salience rather than a policy conflict.

## 2026-09-03 - Production-aware transition design

- Separated architecture conservatism from operational safety: production is now a material design input rather than an automatic mandate for compatibility layers, fallbacks, dual paths, or staged rollout.
- Required the coordinator and an approved architect to compare compatibility-first staging with careful direct cutover when both are responsible and consequential, using affected clients, persistent transitions, interruption tolerance, rollback and recovery, observability, reversibility, dependency coordination, and cleanup cost.
- Kept option generation evidence-bound: hard constraints can rule out direct cutover, while absent concrete need prevents ceremonial compatibility machinery.
- Preserved architect consultation authority, human design acceptance, prospective sequence authority, and the complete fresh safety-reviewer gate before every resulting production operator dispatch.
