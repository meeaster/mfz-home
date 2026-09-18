# Routing and roles

## Select by outcome

Choose the smallest adequate role by cognitive outcome, then evidence source. Complexity, file type, model preference, and tool use alone do not select a role.

| Role | Outcome and selection boundary |
| --- | --- |
| `explore` | Static local evidence from source search and reading. |
| `research` | Authoritative external documentation, releases, APIs, registries, metadata, and upstream source. May run retrieval/analysis commands and use disposable clones. |
| `inspect` | Bounded facts about repositories, runtimes, live/external systems, or prior sessions, including metadata, chronology, reconstruction, and post-worker acceptance evidence. |
| `session-analyst` | Evaluative judgment about prior-session quality, intent adherence, efficiency, or recommendations beyond factual reconstruction. |
| `triage` | Human-authorized specialist read-only diagnosis of an unexplained unexpected symptom. Apply the escalation gate below; causal reasoning is also part of bounded worker investigation. |
| `architect` | Architecture options and recommendation, only by explicit human selection or acceptance of a recommendation to use this specialist. |
| `ui-ux-designer` | Human-selected interface direction or critique. Apply the explicit-selection gate in [Design, prototype, and review](design-prototype-and-review.md#design-consultation). |
| `agent-author` | Substantial, settled, authorized AI-instruction implementation when coherence, records/evals, or isolated execution benefits. Consultation, brainstorming, evaluation, or design requires explicit human selection of this agent. |
| `artifact-author` | Default owner of requested reader-facing diagrams and HTML explanation pages; other communication artifacts require explicit human selection. Turns accepted/supplied context into an artifact for another person. |
| `prototype` | Authorized runnable throwaway artifact testing a bounded unsettled logic, state-model, or UI-design question. |
| `operator` | Explicitly requested settled procedural or operational outcome, including Git, generation/install/refresh as supplied, configuration, services, environments, infrastructure, and external systems. Immediate completion steps may remain with an implementation owner under Mutation and delivery. |
| `worker` | Explicitly requested application/OpenSpec implementation, substantive software behavior, remediation, difficult implementation investigation, or novel troubleshooting. |
| `super-worker` | The worker contract, only when explicitly selected by the human for this task or batch. Never automatic escalation. |
| `reviewer` | Human-selected specialist review of known work with accepted intent/design, implementation brief, and validation history. Apply the explicit-selection gate in Design, prototype, and review. |
| `pr-reviewer` | Human-selected specialist due diligence on an unfamiliar or unobserved PR whose intent, approach, validation, or merge case needs reconstruction and challenge. Apply the same explicit-selection gate. |

Keep interactive instruction discussion, behavioral evaluation, and small settled instruction edits in the warm human-facing coordinator unless the human selects `agent-author`. Other requested text artifacts may stay here when context and access are already held; naming Markdown, Jira, or Confluence alone does not select `artifact-author`.

For instruction refreshes, use `operator` for settled generation or copying without content judgment, `explore` for source-only comparison, and `inspect` for command-derived facts. Have the operator verify procedure and output, surfacing customizations or unresolved adaptation. Generator failure alone does not select authoring. Give each specialist its owning domain workflow; separate independent responsibilities while allowing one coherent authorized outcome to share an owner.

## Diagrams and HTML explanation pages

Delegate creation, layout options, and revision to `artifact-author` without requiring the human to name the agent. Gather missing subject-matter evidence through the appropriate evidence role first. Keep human discussion, accepted meaning, feedback, and acceptance in the coordinator. This route covers communication artifacts; application UI implementation and throwaway design experiments retain their worker and prototype owners.

Supply the current artifact when present, audience, accepted content and decisions, relevant synthesis, requested changes, must-preserve behavior, destination, authority, and existing validation evidence. Preserve the author's judgment on ordinary layout details; ask about consequential ambiguity rather than unspecified implementation measurements. For diagrams, require `diagram-design` unless the human selects another creation workflow, and retain `diagram-quality`. Other HTML explanations use applicable craft guidance; Visual Explainer follows the global explicit-selection rule. Choose continuity under [Recovery and continuity](recovery-and-continuity.md#choose-child-continuity), including its soft freshness preference and hard non-resumption limit.

The author owns composition, light static checks, inspector dispatch, visual judgment, and repairs. Its only permitted child is `inspect`, which performs routine rendered validation under the shared browser instructions. Before handoff, the author views a small selected set of final captures sufficient to judge the artifact, with further image reads when findings or repairs need them. This does not require another routine browser pass. The author returns the artifact version, inspector session IDs, evidence, and remaining limits to the coordinator for final acceptance. If permissions or available depth prevent nested dispatch, the coordinator dispatches the supplied inspection brief and returns findings to the author. Author browser work addresses a named uncertainty, disputed finding, or repair need. Preserve applicable craft-workflow coverage and disclose unsatisfied mandatory checks. Completed edits and static checks alone do not establish rendered acceptance.

Give the inspector the exact artifact version, intended behavior, affected views and display sizes, valid prior evidence, and remaining coverage. Require selected screenshots of affected views and scoped DOM measurements when needed for interaction, state, or a concrete uncertainty. Apply the [screenshot evidence contract](child-contracts.md#screenshot-evidence) to storage, accessibility, and capture quality. Keep detailed browser traces with the inspector; return concrete findings, selected image locators, and relevant measurements. Reuse unaffected checks. Prefer a fresh inspector for a new revision and resume it for a focused repair recheck when retained browser state or defect knowledge helps. Permit bounded read-only investigation of a persisting defect until evidence supports the author's next repair or a material blocker needs coordination. Route repairs to the author under the continuity rule. A passing recheck supports only the conditions exercised.

## Evidence and diagnostic judgment

Use direct factual evidence when it answers the question. Workers can investigate bounded causes within their assignment; a failed check or unexplained symptom does not automatically select `triage`. Gather specific missing evidence when it can change the next decision. Continue or assign bounded worker investigation when there is a useful hypothesis or evidence path, making investigation and repair authority explicit. Operators handle settled procedural corrections, not open-ended diagnosis.

Recommend `triage` when investigation stops narrowing or specialist diagnosis has a clear advantage over further evidence gathering or worker investigation. Explain the failure and impact, established facts and eliminated hypotheses, remaining uncertainty, and why escalation is worthwhile. Dispatch only with explicit human authorization for that diagnostic scope, including authorization already supplied for the situation. A parent-facing coordinator returns the recommendation to its parent unless that human authority was delegated. No fixed number of attempts or mandatory evidence/worker sequence precedes escalation; recommend it immediately when its advantage is already clear. Apply this gate to initial requests and mutation blockers without hardcoding model identity.

Routine state-management choices, including an expected refusal to overwrite local changes, return to the decision recipient or an authorized operator. Preserve unrecognized changes. A separate unexpected symptom must meet the diagnostic gate.

Split source-gathering units only when local-static, external-authoritative, and current/live/session evidence materially differ. Session analysis may use existing factual packets and retrieve focused raw evidence when evaluation exposes a gap.

## Upstream research

Give research known canonical source locations and exact version needs. It follows workspace reference guidance, reuses a suitable canonical clone, or chooses remote retrieval or its own disposable clone under `/tmp/opencode/research/`. Tree search, cross-file relationships, history, or exact-source reuse can justify a clone; GitHub hosting alone does not. Pin version-sensitive findings to the inspected ref.

This evidence route grants no private/authenticated access, authoritative-source edits, persistent placement/publication, destructive broad cleanup, credential inspection, external-system mutation, or upstream Git publication.

## OpenSpec units

The coordinator performs an explicitly requested planning-only proposal through `openspec-propose`, presents or checks its artifacts, and stops that unit. Apply or implementation is a fresh delegated unit. A concrete proposal-then-implementation sequence can authorize both, provided the proposal preserves the sequence's basis and leaves no consequential unresolved choice. Proposal-only requests stop; direct invocation outside orchestration retains its owning workflow's boundary.

OpenSpec skills are generated assets; put local orchestration guidance here rather than editing those skills or creating authoring records for them. Load their bodies only for work or decisions you own. When delegating apply, establish scope, authority, readiness, dependencies, and acceptance from current accepted artifacts and checked evidence. Avoid executing the apply workflow in the coordinator merely to prepare the worker's implementation context. Give the owner the selected change and store, assigned scope, authoritative paths, shared constraints, and task-state write ownership; require it to load and follow `openspec-apply-change`, including current CLI state and all mandatory context reads. If the workflow cannot express a bounded assignment without conflicting requirements, resolve that scope before dispatch. The coordinator reads deeper for its own material decisions and refreshes uncertain or changed evidence; it does not waive the owning workflow's required reads or completion rules.
