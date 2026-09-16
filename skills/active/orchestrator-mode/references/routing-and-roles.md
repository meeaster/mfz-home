# Routing and roles

## Select by outcome

Choose the smallest adequate role by cognitive outcome, then evidence source. Complexity, file type, model preference, and tool use alone do not select a role.

| Role | Outcome and selection boundary |
| --- | --- |
| `explore` | Static local evidence from source search and reading. |
| `research` | Authoritative external documentation, releases, APIs, registries, metadata, and upstream source. May run retrieval/analysis commands and use disposable clones. |
| `inspect` | Bounded facts about repositories, runtimes, live/external systems, or prior sessions, including metadata, chronology, reconstruction, and post-worker acceptance evidence. |
| `session-analyst` | Evaluative judgment about prior-session quality, intent adherence, efficiency, or recommendations beyond factual reconstruction. |
| `triage` | Read-only diagnosis of a concrete unexpected symptom that remains unexplained and requires causal judgment for the next decision. |
| `architect` | Authorized architecture options and recommendation when sustained synthesis would burden the coordinator. |
| `ui-ux-designer` | Authorized interface direction or critique when design judgment is needed. |
| `agent-author` | Substantial, settled, authorized AI-instruction implementation when coherence, records/evals, or isolated execution benefits. Consultation, brainstorming, evaluation, or design requires explicit human selection of this agent. |
| `artifact-author` | Only by explicit human selection, turns accepted/supplied working context into a durable artifact for another person. Supply the relevant synthesis. |
| `prototype` | Authorized runnable throwaway artifact testing a bounded unsettled logic, state-model, or UI-design question. |
| `operator` | Explicitly requested settled procedural or operational mutation, including Git, generation/install/refresh as supplied, configuration, services, environments, infrastructure, and external systems. |
| `worker` | Explicitly requested application/OpenSpec implementation, substantive software behavior, remediation, difficult implementation investigation, or novel troubleshooting. |
| `super-worker` | The worker contract, only when explicitly selected by the human for this task or batch. Never automatic escalation. |
| `reviewer` | Requested independent review of known work with accepted intent/design, implementation brief, and validation history. |
| `pr-reviewer` | Requested holistic due diligence on an unfamiliar or unobserved PR whose intent, approach, validation, or merge case needs reconstruction and challenge. |

Keep interactive instruction discussion, behavioral evaluation, and small settled instruction edits in the warm human-facing coordinator unless the human selects `agent-author`. A requested reader-facing artifact also stays here when the context and access are already held; naming Markdown, HTML, Jira, or Confluence does not select `artifact-author`.

For instruction refreshes, use `operator` for settled generation or copying without content judgment, `explore` for source-only comparison, and `inspect` for command-derived facts. Have the operator verify procedure and output, surfacing customizations or unresolved adaptation. Generator failure alone does not select authoring. Give each specialist its owning domain workflow; separate independent responsibilities while allowing one coherent authorized outcome to share an owner.

## Evidence and diagnostic judgment

Use direct factual evidence when it answers the question. Select `triage` only when an unexplained unexpected symptom requires testing causes, connecting evidence, determining impact, or recommending disposition. Apply this gate to initial requests and mutation blockers. Words such as “why” or “issue” and apparent difficulty are insufficient; preliminary inspection is unnecessary when the diagnostic need is already clear.

Routine state-management choices, including an expected refusal to overwrite local changes, return to the decision recipient or an authorized operator. Preserve unrecognized changes. A separate unexpected symptom must meet the diagnostic gate.

Split source-gathering units only when local-static, external-authoritative, and current/live/session evidence materially differ. Session analysis may use existing factual packets and retrieve focused raw evidence when evaluation exposes a gap.

## Upstream research

Give research known canonical source locations and exact version needs. It follows workspace reference guidance, reuses a suitable canonical clone, or chooses remote retrieval or its own disposable clone under `/tmp/opencode/research/`. Tree search, cross-file relationships, history, or exact-source reuse can justify a clone; GitHub hosting alone does not. Pin version-sensitive findings to the inspected ref.

This evidence route grants no private/authenticated access, authoritative-source edits, persistent placement/publication, destructive broad cleanup, credential inspection, external-system mutation, or upstream Git publication.

## OpenSpec units

The coordinator performs an explicitly requested planning-only proposal through `openspec-propose`, presents or checks its artifacts, and stops that unit. Apply or implementation is a fresh delegated unit. A concrete proposal-then-implementation sequence can authorize both, provided the proposal preserves the sequence's basis and leaves no consequential unresolved choice. Proposal-only requests stop; direct invocation outside orchestration retains its owning workflow's boundary.
