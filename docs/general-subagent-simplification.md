# General subagent simplification

## Status

Discussion recorded on 2026-09-22 for later consideration. This is a human-facing design note, not an active instruction or an accepted implementation plan. The user deferred implementation and requested this record. No agent, permission, model assignment, or workflow change was authorized by that request.

## Why reconsider the agent catalog

The discussion began with routine Git operations. The user wants to consider delegating an explicitly requested commit or push to OpenCode's built-in `general` subagent on GPT-6 Luna with the `high` variant. This would keep procedural work out of the main conversation without requiring the custom `operator` agent outside orchestration.

The broader question is whether the current catalog creates unnecessary distinctions between tasks that a general agent can perform with a clear brief. The user prefers OpenCode's default system prompts and observes that current models usually follow instructions such as "report findings without changing files." The user questioned whether separate agents and tool restrictions add enough value to justify their complexity.

These are preferences and observations, not measured evidence that permission restrictions or specialist prompts never help.

## Current evidence

The following facts came from source inspection during this discussion. Recheck them before implementing a redesign because the checkout contained existing local changes.

- `operator`, `worker`, `inspect`, `reviewer`, `triage`, and `ui-ux-designer` have empty prompt bodies in `opencode/agents/`. Their definitions and profiles can still supply descriptions, permissions, and model settings.
- Other agents contain reusable methods or skill-loading instructions. Replacing those agents requires deciding which instructions remain useful and where they belong.
- OpenCode supports custom agents without a custom system prompt. Keeping a named agent does not require replacing OpenCode's default prompt.
- OpenCode's built-in `general` agent handles multi-step work and cannot launch further subagents by default. The subagent tool exposed in this session supports a per-call model override.
- The current `orchestrator` definition permits named specialists, including `operator`, but does not permit `general`.
- Orchestration's mutation guidance assigns mechanical Git publication to `operator`.
- The artifact workflow lets `artifact-author` dispatch `inspect` for rendered validation. A leaf-only general replacement would change that interaction.

The [OpenCode V2 agent documentation](https://opencode.ai/v2/docs/agents) describes built-in agents, system prompts, model settings, and permission behavior. Runtime capabilities and exact model identifiers should be verified again when implementation begins. No live delegation trial was performed for this proposal.

## Proposed agent lineup

The assistant recommended making `general` the default delegated executor and keeping a separate coordinating agent. This recommendation remains provisional.

| Agent | Proposed treatment | Reason |
| --- | --- | --- |
| `general` | Default executor for bounded delegated work | The assignment supplies the objective, authority, relevant skills, model choice, and expected result. |
| `orchestrator` | Retain child-spawning capability | Coordinates an outcome that genuinely needs multiple child sessions. It can continue to use OpenCode's default prompt with the orchestration workflow. |
| Built-in `explore` | Keep available without mandatory routing | A convenient search specialist. Reconsider the custom override if its additions are no longer needed. |
| `scheduled-worker` | Retain as an infrastructure entry point | Scheduled jobs have a separate invocation lifecycle. |
| `omp-advisor` | Evaluate separately if still used | Its persistent advisory interaction differs from an ordinary delegated assignment. |

The proposed consolidation groups are:

| Current agents | Replacement assignment to `general` |
| --- | --- |
| `operator`, `worker` | Bounded operations or implementation with explicit mutation authority |
| `inspect`, `research`, `session-analyst` | Evidence gathering or analysis with the relevant sources and skills |
| `triage`, `architect`, `ui-ux-designer` | Diagnosis, architecture, or interface design with the appropriate method and model |
| `reviewer`, `pr-reviewer` | A fresh review session with the applicable review method and no repair authority |
| `agent-author`, `artifact-author`, `prototype` | Authoring or prototype work that loads its owning skills |
| `scribe` | Transcription of assigned state, if a separate transcription session remains useful |

A different task does not necessarily need a different agent ID. A separate agent is more useful when it provides a distinct delegation capability, an enforced access boundary, or a specialized system prompt that the user deliberately prefers.

Independent review remains possible with two fresh `general` sessions. The implementation session and review session receive different assignments and can use different models. Sharing an agent ID does not require sharing session context or letting the implementer accept its own work.

## Whether general should spawn children

The user raised the possibility of overriding `general` permissions to allow child spawning. The assistant recommended leaving it disabled initially, subject to runtime verification of the available controls.

Leaf-only execution keeps the assigning parent aware of active work and shared-state mutations. A child can complete its own bounded work with direct tools or return a specific request for missing evidence. An outcome that needs multiple child sessions can go to `orchestrator`.

This separation has a cost. An author that needs a rendered inspection would return the inspection brief to its coordinator, which dispatches the inspector and returns the findings. Repeated helper requests could make that arrangement slower and more expensive than direct child delegation.

Two alternatives remain open:

- Retain `general` as a leaf and use `orchestrator` for coordinated assignments.
- Allow `general` to delegate when its assignment explicitly grants that authority, potentially eliminating the separate coordinating agent.

The first option was the assistant's starting recommendation. Repeated parent-mediated helper requests would be a reason to reconsider it. No decision to change delegation depth or permissions was made.

## Instructions and permission boundaries

The user's preferred starting point is to rely on clear instructions for ordinary task boundaries, such as read-only review. A separate restricted agent needs a concrete benefit beyond giving the task a name.

An instruction depends on model compliance. An enforced permission can prevent an action even when the model makes a mistake. Which mechanism is appropriate depends on the consequence of the unwanted action and whether the available controls actually prevent it.

For example, denying an edit tool does not establish a read-only boundary if the agent retains unrestricted shell access. Conversely, allowing Git commands does not specify which changes the agent may commit or where it may push. The assignment must still carry that authority.

A useful question for each retained restriction is: "What unwanted action does this prevent, and does it prevent that action through all available tools?"

## Workflow simplification matters too

Replacing agent IDs alone does not remove mandatory evidence files, long briefs, acceptance steps, or repeated handoffs. Much of the current complexity lives in orchestration's routing and evidence requirements.

The proposed workflow would usually decide whether work needs a separate session, whether it requires child coordination, and what model, skills, authority, and result the assignment needs. It would avoid classifying every task into a specialist role before dispatch.

Briefs should remain proportional to the task. A routine Git assignment needs the repository, intended changes, authorized operations, relevant validation, and the expected final-state report. It does not inherently need a separate evidence document.

Delegation should also remain optional when the main session already has the context and can complete the work efficiently. A general default executor does not imply delegating every task.

## Original Git delegation idea

A narrower change could be considered independently of the broader redesign: outside a workflow that defines delegation routing, send explicitly requested routine Git commits or pushes to `general` using GPT-6 Luna with the `high` variant.

That rule would need to preserve the exact requested operation. A commit request does not imply a push, and a push request does not imply creating a new commit. The child would return the resulting commit identity, push status, and remaining changes as applicable.

An unconditional global rule would conflict with current orchestration routing. A rule limited to ordinary sessions could coexist with the existing `operator` route. The model override would apply to that dispatch rather than change the default model for every general assignment.

## Questions for a later investigation

- Which custom prompt instructions provide useful behavior beyond OpenCode's default prompt and existing skills?
- Which restrictions address a concrete unwanted action, and which mainly enforce role naming?
- Which skills, agent descriptions, profiles, and evaluation scenarios depend on the current agent IDs?
- Would a leaf-only general author create frequent inspector handoffs through the coordinator?
- Does using `general` reduce total work and context duplication while preserving scope, authority, and validation quality?
- Should a smaller catalog retain any specialist for a demonstrated quality advantage rather than a capability difference?
- Which evidence-file requirements have an actual later consumer, and which duplicate a sufficient child return?

If the user chooses to proceed, the empty-prompt leaf agents are a reasonable first consolidation candidate. Representative comparisons could cover Git publication, read-only review, implementation followed by independent review, and artifact creation with rendered validation. Those examples would expose both ordinary execution behavior and the cost of coordinator-mediated helper requests.

Useful observations include unauthorized changes, omitted checks, scope adherence, handoff count, duplicated reads, latency, and total model cost. No evaluation results are claimed here.

## Related sources

- [Global instruction authoring preferences](global-instruction-authoring.md)
- [Previous global instructions](gpt-6-global-instructions-backup.md), including the former ordinary-session operator routing
- [Orchestrator architecture](orchestrator/architecture.md)
- [Earlier author and operator workflow investigation](orchestrator-author-operator-workflow.md)
- [Current agent definitions](../opencode/agents/)
- [Orchestration routing and roles](../skills/active/orchestrator-mode/references/routing-and-roles.md)
- [Orchestration mutation and delivery](../skills/active/orchestrator-mode/references/mutation-and-delivery.md)

Discussion provenance: OpenCode session `ses_f3489c3b8ffdVRl7UYqUB6VaHd`.
