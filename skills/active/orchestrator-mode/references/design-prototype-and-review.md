# Design, prototype, and review

## Design consultation

Route `architect` or `ui-ux-designer` through the standing orchestrator only when the human explicitly requests that specialist or accepts a recommendation to use it. General architecture, planning, UI-design, critique, or layout-option requests do not select either agent. When specialist consultation would help, the Chief explains the pending decision and why, then awaits acceptance. Otherwise continue through the ordinary task owner. The parent-facing orchestrator must carry that human approval from the Chief or return the recommendation in its envelope.

Architecture and UI consultation require an authorized bounded engagement. It covers corrections, evidence follow-up, and reconsideration within the same decision, scope, access, and system boundary. Ask for materially new consultation, expanded access/scope, or an unrequested independent opinion. Replacing an unavailable session does not change authority.

Before architect dispatch, the Chief classifies the needed evidence and routes it through the standing orchestrator's gatherers, then explains the pending decision and why specialist synthesis helps. Model selection belongs to configuration, not durable workflow cost tiers. Request credible options, strongest cases and tradeoffs, a recommendation grounded in the human's priorities, uncertainty, and reversal conditions. Offer alternatives only when genuinely viable.

For consequential production transitions, compare staged/compatibility-first change with a careful direct cutover when both are responsible. Ground the choice in affected clients, persistent data, tolerated interruption, recovery, observability, reversibility, dependency coordination, and cleanup. Hard constraints can rule out cutover; production alone does not justify compatibility layers or temporary machinery.

Surface the substantive returned options and reasoning to the decision recipient. Obtain acceptance or revision before implementation unless an explicit prospective sequence delegates selection of a conforming bounded result. Consultation cannot accept itself or authorize implementation.

Architects return evidence requests to the orchestrator. Use [Child contracts](child-contracts.md)'s missing-evidence cycle, include checked evidence in the next envelope, and resume the same engagement with the combined delta unless it reveals a consequential decision or changes its basis. Keep broad traces with gatherers.

For authorized `ui-ux-designer` consultation, require `ui-ux-design` and a read-only handoff covering relevant layout, interaction/component states, accessibility, constraints, and verification. Surface its direction for acceptance under the same prospective-selection rule. Settled UI edits need no consultation.

## Prototype

Use `prototype` only for an explicitly approved runnable throwaway artifact testing one bounded unsettled logic, state-model, or UI question. Discussion or a suggestion to prototype is not creation authority; generic feasibility spikes are outside this role.

The standing orchestrator dispatches a child that loads `prototype`, builds and validates the smallest useful artifact in the appropriate disposable workspace, and returns its locator, observations, assumptions, and uncertainty. The orchestrator accepts the packet; the Chief interprets the envelope. Production implementation requires its own worker authority; creation does not imply publication or productionization.

## Independent review

Route `reviewer` or `pr-reviewer` through the standing orchestrator only when the human explicitly requests the specialist or accepts a recommendation to use it. A general request to review work, a quality concern, or a workflow's review step does not itself select a reviewer agent. A sequence that explicitly names the specialist can authorize its bounded engagement in advance; the parent-facing orchestrator must receive that human approval from the Chief. After approval, select by evidence contract rather than authorship:

Choose whether substantive review is warranted separately from its rigor. Routine acceptance or factual inspection can suffice for bounded work; an authorized review should challenge correctness and maintainability without manufacturing findings. Inexpensive implementation can benefit from strict independent review, but model price alone does not select it.

- Use `reviewer` when accepted intent/design, implementation brief, changes, and validation are known. For code, require `thermo-nuclear-code-quality-review`, covering correctness, maintainability, and substantive behavior-preserving simplification.
- Use `pr-reviewer` with `pr-review` when PR intent, design rationale, implementation, validation, or holistic merge readiness must be reconstructed and challenged. Structural simplification alone does not require this role.

Supply accepted constraints, review charter, gathered evidence, confidence/gaps, and stop conditions. Major structural findings must identify the concrete problem and evidence, a plausible simpler alternative, benefits and tradeoffs, and demonstrated versus expected effects. Findings remain proposals; reviewers neither mutate nor accept their own recommendations. Keep merge and consequential design/scope decisions with the Chief and human.

A PR creation request grants no review authority. Known generated-configuration work receives owning-workflow verification unless separately requested holistic review needs reconstruction. Architect consultation is not a routine prerequisite.

For PR due diligence, the Chief classifies material missing evidence and routes it through the standing orchestrator to local-static, current-state, or external-source gatherers. The reviewer performs its workflow's focused checks and conflict adjudication. Handle complete single or batched evidence requests through the shared missing-evidence cycle, normally resuming once with checked results. Require the reviewer to retest packet conclusions against the diff and constraints. Architectural choices and expanded authority remain separate decisions.
