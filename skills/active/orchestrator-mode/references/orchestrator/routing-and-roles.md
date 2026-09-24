# Routing and roles

## Select by outcome

The orchestrator chooses the smallest adequate role by outcome and evidence source. The Chief requests outcomes through its orchestrators. Roles describe responsibilities, not price tiers or authority. Use agents as the umbrella term.

| Function | Agent | Assignment |
| --- | --- | --- |
| Evidence gathering | `explore` | Static local source search and reading |
| Evidence gathering | `research` | Authoritative external documentation, releases, APIs, and upstream source |
| Evidence gathering | `inspect` | Current repository, runtime, external-system, or session facts; independent factual verification |
| Implementation | `worker` | Application implementation, OpenSpec tasks, remediation, or bounded novel troubleshooting |
| Operations | `operator` | Settled procedural changes, Git, configuration, services, environments, or external operations |
| Design advice | `architect`, `ui-ux-designer` | Authorized architecture or interface options and direction |
| Review | `reviewer`, `pr-reviewer` | Authorized review of known work or due diligence requiring PR reconstruction |
| Authoring | `agent-author` | Authorized AI-instruction work benefiting from a separate authoring context |
| Authoring | `artifact-author` | Requested reader-facing artifacts, including diagrams and HTML explanations |
| Session analysis | `session-analyst` | Authorized evaluative judgment about session quality, intent adherence, or efficiency |
| Diagnosis | `triage` | Authorized read-only diagnosis when further ordinary investigation has poor prospects |
| Prototype | `prototype` | Authorized runnable throwaway artifact answering an unsettled question |
| Transcription | `scribe` | Human-facing session's assigned working records and continuity checks |

- Apply the root authority policy. Evidence gathering is proactive. Delivery can authorize necessary design or review; exploratory conversation does not automatically authorize expensive consultations or authoring.
- Directly read identified instruction, design, or prose artifacts whose actual content is under judgment. Delegate unknown-location discovery and implementation-source investigation, even for one code file.
- For instruction refreshes, use operator for settled generation or copying, explore for static comparison, and inspect for command-derived facts. A generator failure does not automatically require an author.
- Give each agent its applicable owning workflow. Distinguish required skill loads from suggested relevant skills. Preserve role and permission boundaries even when an agent could technically run another tool.

## Capability-aware assignments

Use these role capabilities when briefing agents; routine dispatch does not require inspecting agent definitions or permission configuration. Capabilities do not grant assignment authority.

| Agent | Available methods and assignment limits |
| --- | --- |
| `explore` | File search and reading; no Bash/shell, Code Mode, or child delegation. Can load Task Evidence and edit explicitly assigned evidence under the external orchestration workspace, but cannot edit project source. |
| `research` | Remote documentation and upstream-source retrieval, including shell-based source inspection within its research authority; assigned evidence writes. |
| `inspect` | Shell, tools, and source reads for command-derived, runtime, external-system, and session facts; assigned evidence writes. Application changes remain with a mutation owner. |

- Give `explore` static questions without command prerequisites. Route Git status, executable checks, and other necessary command-derived facts to `inspect`; a static read-only lookup needs no Git-status gate.
- If a tool rejects an assigned action, use the existing blocked-result contract. A briefing cannot expand permissions or authorize a workaround.

## Assign review

Apply the shared [review policy](../common/acceptance-and-review.md#independent-review).

| Agent | Use when | Required guidance |
| --- | --- | --- |
| `reviewer` | Intent, design, changes, and validation history are known | `thermo-nuclear-code-quality-review` for code |
| `pr-reviewer` | PR intent, approach, validation, or holistic merge readiness needs reconstruction | `pr-review` |

- Supply accepted constraints, review scope, evidence, known gaps, and stop conditions.
- Route missing facts through evidence gatherers, then resume the unconcluded review with the relevant results. The reviewer checks conclusions against the actual diff and constraints.

## Diagrams and HTML explanation pages

Use `artifact-author` for authorized creation or revision of reader-facing diagrams and HTML explanations. Application UI and throwaway experiments retain worker and prototype ownership. Keep human dialogue, accepted meaning, and final acceptance with the decision owner.

- Supply audience, accepted content, relevant context, current artifact, requested changes, must-preserve behavior, destination, authority, and valid prior verification.
- Require `diagram-design` unless the human selects another creation workflow, and retain `diagram-quality`. Other HTML explanations use applicable craft guidance. Visual Explainer remains explicit-selection only.
- The author owns composition, static checks, visual judgment, and repairs. It dispatches only `inspect` for routine rendered validation. If depth or permissions prevent that child, return the bounded inspection brief to the coordinator.
- The inspector receives the exact revision, intended behavior, affected views and sizes, valid prior checks, and missing coverage. It returns selected screenshots, concrete findings, and scoped DOM measurements when useful.
- Follow the [screenshot contract](../common/delegation-and-evidence.md#screenshot-evidence). The author views enough final captures to judge the artifact without automatically repeating the browser pass. Further browser work addresses a specific uncertainty or repair need.
- Reuse unaffected checks and report unsatisfied mandatory craft checks. Static edits do not establish rendered acceptance; a passing inspection proves only the exercised conditions.

## Investigation and diagnosis

- Prefer targeted facts when they can answer the question. A failed check does not automatically select triage. Workers may investigate bounded causes within their assignment; operators remain within settled procedures.
- Recommend triage when investigation no longer narrows or dedicated diagnosis has a clear advantage. Explain established facts, eliminated hypotheses, remaining uncertainty, impact, and why escalation helps. Use the root authority policy for an existing delivery request or new consultation.
- Routine decisions about local changes or state ownership return to the decision owner or authorized operator. Preserve unrecognized changes instead of treating a normal refusal to overwrite them as a diagnostic incident.
- Split evidence units when local static, external authoritative, and live or session sources need materially different access or methods. Session evaluation may request focused factual evidence when a real gap appears.

## External research

- Brief the question, decision context, applicable versions or compatibility settings, and needed coverage. Let the research agent apply its complementary-source procedure rather than limiting substantive research to one documentation tool.
- Supply known canonical sources and exact version needs. Follow workspace reference guidance and use suitable existing clones or permitted remote retrieval. A disposable clone is useful for tree search, history, cross-file relationships, or exact-source reuse; GitHub hosting alone is insufficient.
- Pin version-sensitive findings to the inspected revision. Use the environment's approved temporary research location.
- Research authority does not grant private access, authoritative-source edits, credential inspection, broad cleanup, publication, or external mutation.

## OpenSpec

- A planning-only proposal stops at the requested artifacts. A concrete proposal-and-implementation sequence can authorize both when consequential choices are resolved and the proposal preserves the request's basis.
- Route an authorized proposal or apply unit to a worker with the appropriate OpenSpec skill. Supply the selected change and store, bounded scope, authoritative paths, shared constraints, task-state ownership, and verification needs.
- The owner follows current CLI state and all required workflow reads. The coordinator need not execute the apply workflow merely to prepare a brief. Resolve any conflict between bounded ownership and the owning workflow before dispatch.
- Keep local orchestration policy here rather than modifying generated OpenSpec skills. Recommend planning artifacts for consequential cross-unit design when useful, and obtain creation authority unless already included in the request.
