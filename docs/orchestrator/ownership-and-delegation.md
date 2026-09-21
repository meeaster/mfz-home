# Ownership and delegation

Delegation earns its cost when it improves capability, context isolation, independent judgment, parallel progress, or execution economics. Existing coordinator context matters: handing off a task cannot remove context already loaded, but it can keep subsequent investigation and execution details out of the conversation.

This page explains the design under the [architecture status](architecture.md#design-status). It does not replace the runtime [routing rules](../../skills/active/orchestrator-mode/references/routing-and-roles.md).

## The coordinator remains a collaborator

In `baked-in`, the current session owns problem framing, human dialogue, relevant shared understanding, assignments, and packet acceptance. In `chief/split`, the standing orchestrator owns `assignments/` and accepts producer packets, while the Chief retains human dialogue, consequential decisions, and envelope acceptance. Small settled instruction edits and text artifacts can stay here when the necessary context is already present. Reader-facing diagrams and HTML explanation pages go to `artifact-author` by default, keeping rendering and revision detail outside the human conversation. Application UI and throwaway design experiments retain their separate owners.

Application implementation remains delegated, including small edits. A capable inexpensive worker can perform a narrow change economically. This design does not adopt a general exception allowing the coordinator to edit application code whenever it appears faster.

Substantive evidence gathering over unbounded corpora routes to evidence roles, while bounded artifacts whose exact content is under judgment, such as instruction packages, agent or command definitions, and authoring records, are read directly by the coordinator.

The scribe is the coordinator's transcription subordinate, not a general prose writer.

## Assign coherent outcomes

A useful assignment has one accepted outcome, compatible authority, and a coherent validation boundary. File count and tool type do not establish those boundaries. Ordinary immediate preflight belongs with the mutation owner rather than a separate preparatory agent.

Prefer a unit that can reasonably finish within one context window, counting reading, implementation, likely debugging, verification, and completion evidence. Leave room for surprises. This is a planning preference, not a token budget or a claim that compaction causes failure. Large features may have independently verifiable slices; tightly coupled work should remain together when splitting would create more reconstruction and integration work.

Validation can dominate the context requirement even when the edit is small. For application implementation, an extended browser session may warrant a fresh inspector with a bounded validation assignment. Compare that agent's setup and defect-handoff costs with the implementation context the worker would retain. The worker supplies immediate checks and remaining coverage; completion of its implementation assignment does not mean the whole feature is accepted before the separate validation returns. Diagram and HTML communication artifacts use the explicit author/inspector split described below.

The runtime contract extends that principle to necessary completion steps. A worker can make an authorized configuration change, apply it, and verify the rendered result when these form one settled outcome. A separate operator adds value when the operation needs a distinct authority decision, environment, procedure, or independently useful handoff.

This avoids a worker-to-coordinator-to-operator round trip whose only purpose is to execute the next known command. It does not make every deployment or publication inherent in implementation. Consequentially different targets, effects, and authority remain separate decisions.

Mutation remains serialized when shared state or overlap is uncertain. Separate directories do not isolate the Git index, installed dependencies, runtime processes, or external systems. Parallelism is useful for genuinely independent work, not as a goal by itself.

## Compare complete alternatives

The relevant alternatives are direct coordinator work, a fresh child, and continuation of an existing child. Their cost includes the entire information path: briefing, loaded guidance and source, execution, returned results, acceptance reads, and possible rework.

Direct work can avoid reconstruction when the coordinator already understands a task. It can also accumulate detailed tool results that distract from later human discussion. Delegation can contain those details, but loses much of that benefit if the coordinator subsequently rereads every source file and output.

The artifact being produced may be common to both alternatives. Model prices, generated explanations, handoff content, and repair work can still differ. Comparing marginal cost from the actual session state is more informative than comparing raw token totals.

## Model fit is an economic and quality judgment

The human commonly uses Luna for bounded work because its capability can be sufficient at low cost. A lower-cost worker followed by targeted review and repair can outperform a more expensive all-in-one approach economically. That is a strategy to evaluate, not a promise that every assignment benefits from review or that all models are interchangeable.

The coordinator's more capable model may be useful for ambiguity, human collaboration, and adjudication. Cheap child tokens do not compensate for unreliable claims that trigger expensive coordinator work and repeated repairs. Conversely, reloading a relevant file in a cheap child may cost less than asking the coordinator to produce a bespoke condensed handoff.

The coordinator uses each subagent's configured default model and variant unless the human explicitly requests an override. It resolves an explicit request through the models tool and preserves any requested reasoning effort; it does not query defaults or recommend model changes for routine routing. Luna is the lowest-cost GPT-5.6 tier for bounded work, Terra balances capability and cost, and Sol is the highest-capability GPT-5.6 tier for complex work. Lower reasoning effort uses fewer tokens and less latency; higher effort permits more deliberation. `max` changes effort rather than model tier, and the Luna `max` defaults for triage, worker, and prototype do not transfer automatically to Terra or Sol. Reviews can measure costs at the actual recorded model's rates without turning those observations into dispatch-time model selection. A model's price or reputation alone does not establish whether a particular result is trustworthy.

Within Orchestrator Mode, the human controls use of architect and reviewer specialists. The coordinator can recommend them with a concrete reason, but dispatch requires an explicit request for the specialist or acceptance of that recommendation. General design, implementation, or review requests do not authorize these agents. This keeps the decision to use their more capable models with the human, without encoding model names or prices. Approval can cover a bounded engagement and its in-scope follow-ups, including specialist steps explicitly named in an approved sequence.

## Freshness and continuity have different benefits

Fresh children receive focused assignments and can supply independent judgment. Resumed children can preserve useful investigation state, terminology, and cached context. Topic overlap alone does not establish that retained context is useful, and cache savings alone do not justify continuation.

For artifact-author, agent-author, and any subagent known from the human's explicit selection to be using Sol, a latest recorded request-input context above 150,000 tokens requires a fresh session at the next dispatch. The author roles remain covered regardless of model. This includes small corrections and near-complete units. The coordinator transfers the artifact, accepted decisions, remaining work, relevant evidence, and safely preserved state. A missing material detail calls for a bounded handoff repair, not resuming past the limit. The rule does not interrupt an active call or select another role. Sol coverage comes from a known explicit selection, not a configured-default lookup. Unknown model selection or context stays unknown; cumulative processed input is not the current window.

Within that boundary, a completed validated revision supplies a useful freshness decision point. Prefer a fresh artifact-author for the next revision when its latest recorded request-input context is around 100k or more and the current artifact plus a compact handoff preserve the needed understanding. This is a soft preference selected by the human, not a universal cost crossover or provider pricing tier. Below the hard limit, an unresolved revision or repair can continue when retained reasoning or state materially helps. Other roles do not inherit the soft preference.

Otherwise, retained understanding and the next assignment decide continuity. A substantial revision can benefit from a compact author's design reasoning; a small edit can favor freshness when previous history is mostly obsolete browser output. The handoff carries the current artifact, accepted intent, decisions, remaining work, and selected validation evidence. It need not reload every earlier screenshot. Use already available context telemetry rather than commission session archaeology for routine dispatch. Provider caching can reuse prefixes across fresh sessions, but hits vary and retained cached history still costs money.

For diagrams and HTML explanation pages, the author owns composition, light static checks, interpretation, and repairs. It may dispatch only inspect and manages routine rendered validation and repair rechecks within its assignment. If permissions or available depth block nested dispatch, the coordinator handles the supplied inspection brief. The author can use targeted browser work for a named uncertainty, disputed finding, or repair need without repeating the inspector's full pass. Prefer a fresh inspector for a new revision and continuation for a focused recheck when useful state remains; subsequent author dispatches remain subject to the same non-resumption limit. The author returns inspector session IDs and version-specific evidence; the coordinator retains final acceptance.

The current [continuity defaults](../../skills/active/orchestrator-mode/references/recovery-and-continuity.md#choose-child-continuity) vary by role and distinguish an unresolved unit from a new one. The architecture treats those defaults as revisable through evidence, not as a mandate to minimize session count.

An interrupted child may already have caused side effects even without a completed note. Continuation depends on reconciling known effects and pending operations, including ignored files and external state. Starting fresh does not reset the underlying environment.

## When to reconsider a boundary

Troubleshooting is not exclusive to a specialist role. Workers can investigate bounded causes and repair within their authority; gatherers can supply a missing fact; operators perform settled procedural corrections. Recommend triage when progress stops narrowing or specialist diagnosis has a clear advantage. Explain the basis and obtain human authorization unless it already covers the situation. This is a deliberate role escalation, not an automatic model policy or a requirement to exhaust a fixed sequence of cheaper attempts. Fresh-worker investigation must bring a useful new approach or evidence rather than reset an unsuccessful loop.

Separate missing handoff content from failure to apply an instruction already supplied. In the audited effort, an inspector read the consumer-working-directory lesson and still omitted it from its command. Another interrupted inspector's side-effect finding never reached its successor. The first needs better execution or removal of the unnecessary operation; the second needs recovery and transfer. Repeating a global warning would not address both.

A boundary deserves reconsideration when repeated context reconstruction, coordinator rereading, operational relays, or repair cycles exceed its isolation or assurance benefit. A single incident can also reveal a clear structural problem. The alternative must preserve authority, required evidence, and the human's ability to understand and direct the effort.

Detailed command choices remain with the agent unless an observed failure, accepted procedure, or consequential constraint makes a particular method necessary. Review should improve assignments and context selection rather than script every step.
