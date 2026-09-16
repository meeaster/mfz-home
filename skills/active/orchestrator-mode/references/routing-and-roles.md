# Routing and roles

Read this reference when classifying an evidence target, selecting a specialist or mutation owner, or applying the diagnostic gate. Role selection grants no authority beyond the current request.

## Select the smallest adequate role

Use the smallest adequate role for each unit's needed cognitive outcome:

- `explore` for static local evidence through file search and reading;
- `research` for authoritative external documentation, releases, APIs, registries, metadata, and upstream repository source through the most suitable evidence route, including disposable clones;
- `inspect` for bounded factual evidence from repositories, runtimes, cloud accounts, deployed environments, external work systems, and prior agent sessions through read-only commands and configured tools, including session lookup, metadata, cost, chronology, reconstruction, and post-worker acceptance evidence;
- `session-analyst` for evaluative reasoning about prior-session quality, intent adherence, behavior, efficiency, patterns, or recommendations when factual reconstruction alone cannot answer the question;
- `triage` for read-only diagnostic judgment on one concrete unexpected symptom that remains unexplained;
- `architect` for evidence-informed architecture options and recommendation when sustained design synthesis would burden this session;
- `ui-ux-designer` for optional specialist consultation on implementation-ready interface direction or critique when design judgment is the primary need;
- `agent-author` by default for a substantial, settled, explicitly authorized AI-instruction implementation whose behavioral coherence, related records or evaluations, or isolated execution provides concrete value; use it for consultation, brainstorming, evaluation, or design only when the human explicitly selects or requests `agent-author`;
- `artifact-author` only when the human explicitly selects or requests `artifact-author` to transform accepted or supplied working context into a durable artifact that another person can understand, review, decide from, or use; supply relevant coordinator synthesis rather than asking it to rediscover that synthesis from raw producer evidence;
- `prototype` for an explicitly authorized throwaway artifact that tests one bounded, unsettled logic, state-model, or UI design question;
- `operator` for explicitly authorized bounded procedural and operational mutations with settled requirements and procedures;
- `worker` for explicitly authorized application implementation, OpenSpec implementation, substantive code changes, focused remediation, difficult implementation investigation, and novel troubleshooting;
- `super-worker` for the same work only when the human explicitly requests that agent for the task or batch;
- `reviewer` for explicitly requested review of known work for correctness, maintainability, and substantive behavior-preserving structural simplification;
- `pr-reviewer` for explicitly authorized holistic merge due diligence when pull-request intent, rationale, implementation, or validation must be reconstructed and challenged.

### Keep OpenSpec planning separate

- The coordinator runs an explicitly requested planning-only OpenSpec proposal as its own `openspec-propose` unit.
- The proposal unit creates and presents or checks the required planning artifacts, then stops.
- OpenSpec Apply or other implementation is a separate fresh delegated unit and proceeds only when explicitly authorized and the proposal preserves the sequence's material basis.

### Preserve explicit super-worker selection

- Keep `worker` as the default implementation agent.
- Use `super-worker` only for the task or batch the human explicitly selected it for, never as automatic escalation for difficulty, failures, or perceived quality.
- Apply the worker contracts in [Mutation and delivery](mutation-and-delivery.md), [Child contracts](child-contracts.md), and [Recovery and continuity](recovery-and-continuity.md) equally to `super-worker`.
- Agent or model selection grants no implementation or publication authority and does not replace another role's ownership.
- Carry the explicit selection and its scope into child briefs; outside that scope, use ordinary role routing.

## Classify evidence by outcome and source

- Classify the needed outcome before the evidence source.
- Use `inspect` to establish bounded facts about the caller's repository, runtime, cloud, deployments, external work systems, or prior sessions, including factual session reconstruction and a narrow check sufficient to answer why an operation stopped.
- If available evidence directly answers the question, stop without adding diagnosis or evaluation.
- Use `session-analyst` only when the requested outcome requires judgment about session performance or meaning; supply relevant inspect packets when available, while allowing focused raw-session retrieval when analysis exposes a gap.
- Select `explore`, `research`, and `inspect` by evidence target: local static workspace, external authoritative source, or factual current/live/session state.
- Research may execute commands that retrieve or analyze external public evidence.
- When these evidence families materially differ, split them into the smallest relevant source-gathering units.

## Apply the diagnostic gate

- Apply this diagnostic gate to initial requests and every blocker or remediation handoff: start fresh `triage` only when a concrete unexpected symptom remains unexplained and the downstream decision requires diagnostic judgment, such as testing plausible causes, connecting evidence, determining impact or affected scope, or recommending disposition.
- Domain labels, words such as "why," "investigate," or "issue," apparent complexity, and model capability do not establish that need.
- Use a narrow `inspect` unit when direct facts suffice; do not require preliminary inspection when the diagnostic need is already clear.

### Keep state-management decisions out of triage

- Routine state management and unresolved handling choices are not diagnostic symptoms.
- Preserve local changes and return needed handling decisions to the decision recipient; an explicitly authorized settled procedure belongs to `operator`.
- An expected refusal to overwrite local changes needs no diagnosis.
- A separate unexpected symptom during that work must pass the same diagnostic gate.

## Route accepted work by primary outcome

- Beyond source gathering, route by primary accepted outcome and complexity rather than destination system, artifact type, or whether files are touched.
- In human-facing context, keep an explicitly requested reader-facing artifact in this warm coordinator when it already holds the relevant context and source access.
- A request for an artifact, Jira issue, Confluence page, Markdown document, or HTML file does not select `artifact-author`; only the human's explicit selection of that named agent does.
- Keep small, bounded, settled AI-instruction edits and interactive instruction consultation, brainstorming, evaluation, or design in the warm coordinator unless the human explicitly requests an independent `agent-author` perspective.
- Route a substantial, settled AI-instruction implementation to `agent-author` when behavioral coherence, related records or evaluations, or focused isolated implementation provides concrete value.
- Creating a bounded logic, state-model, or UI prototype belongs to `prototype`; routine configuration, source-control operations, supported CLI workflows, infrastructure or deployment operations, environment preparation, and external-system or operational state changes with settled procedures belong to `operator`; application implementation, OpenSpec implementation, substantive software behavior, focused remediation, difficult investigation tied to implementation, and novel troubleshooting belong to `worker`.
- Keep unresolved architecture decisions with `architect`, application UI or code with `worker`, throwaway decision artifacts with `prototype`, read-only UI direction with `ui-ux-designer`, and dedicated PR, OpenSpec, and Jira workflows with their owners.
- Raw orchestration evidence notes, transcripts, implementation handoffs, and ordinary chat responses remain internal to their producers.
- Give each mutation lane the owning domain skill or workflow.
- Prefer separate bounded agents for genuinely independent responsibilities.
- Combine operations when the user explicitly requested one coordinated outcome and a single owner can execute it safely without crossing authority boundaries.

### Route supplied instruction refreshes

- Settled generation, installation, copying, or upstream refresh of instructions as supplied belongs to `operator` when no instruction-content judgment is required.
- Require verification of the procedure and resulting content, and surface customizations or unresolved decisions rather than silently adapting them.
- Source-only what-changed comparison remains `explore`; command-derived evidence remains `inspect`.
- Answer questions about behavioral effects, convention conflicts, or needed adaptation in the warm coordinator unless the human explicitly requests an independent `agent-author` perspective.
- A refresh requires no mandatory author review or automatic gated dispatch.
- An unexpected generator error is not authoring by itself; apply this reference's diagnostic gate.

## Route upstream evidence

- Route upstream documentation, releases, APIs, registry facts, metadata, and repository internals to `research`.
- The researcher chooses between remote retrieval, a suitable canonical clone, and a disposable clone according to the question and source guidance.
- A clone is useful when source-tree search, cross-file relationships, implementation details, history, or reusable exact-source locators matter; hosting on GitHub alone does not require one.

- Tell research about any known canonical source location or exact version requirement.
- It checks the workspace reference guidance, reuses a suitable clone when available, or creates its own disposable clone beneath `/tmp/opencode/research/`.
- Version-sensitive findings identify the exact inspected commit, tag, or ref.

- Research remains evidence-gathering-only.
- Private or authenticated access, non-temporary placement, persistent publication, destructive broad cleanup, credential inspection, edits to authoritative projects or canonical references, commit, push, pull request, external-system mutation, and upstream publication remain outside its authority.
- The coordinator retains synthesis, and current or runtime facts about the caller's systems remain with `inspect`.
