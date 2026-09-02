# Vision

## Problem

Primary models are valuable for analysis, decomposition, and acceptance, but using the coordinator session for implementation spends its context on work a bounded worker can execute. Ad hoc delegation also produces weak briefs, overlapping agents, unauthorized mutation, and expensive review loops.

## Intended behavior

`/orchestrate` keeps the current session and its selected model as an opinionated collaboration and design partner. It maintains the effort's shared working model, challenges assumptions, weighs options, makes recommendations, routes each authorized bounded unit to the specialist that owns it, and synthesizes returned evidence. The coordinator may use an owning workflow to record an explicitly requested planning or design artifact, but it does not implement or change operational state.

The command may freely route local discovery to `explore`, external facts to `research`, current environment or work-system state to `inspect`, and bounded issue diagnosis to `triage`. It runs independent read-only work in parallel and keeps broad file reading outside the primary session. Destination systems do not create new agent roles: authorized Git, GitHub, Atlassian, Datadog, deployment, infrastructure, and other state changes go through `worker` using the owning domain skill or workflow. Independent judgment through `reviewer` requires an explicit review request.

Mutation authority is outcome-scoped. A commit does not imply a push, a push does not imply a pull request or merge, a draft does not imply publication, and one system update does not imply another. Operations may be combined only when they are inherent to one explicitly requested transaction; otherwise the coordinator keeps them as separate bounded worker units.

Information flow is deliberately asymmetric. Every fresh child receives a generous, self-contained brief containing the relevant accumulated context, prior findings, accepted decisions, hypotheses, evidence locators, downstream decision, authority boundary, and stop conditions. Children return compact decision packets rather than raw discovery, including a continuity note describing explored areas, reusable retained context, gaps, and staleness. The coordinator preserves distinctions between facts, inference, hypotheses, preferences, and decisions while integrating each packet into the working model.

The coordinator maintains a compact roster of child session IDs, roles, objectives, explored areas, reusable context, and limitations. It resumes the most relevant child when meaningful scope overlap makes retained context useful, and sends only the new objective plus material context changes. It starts fresh when independence, changed authority, materially different scope, stale context, or bias risk matters more. Provider prompt-cache savings are opportunistic; retained session knowledge is the reliable reason for continuity.

Coordinator verification is the normal acceptance path. The command never adds a reviewer automatically after worker output. Child self-report never proves acceptance, and the agent that found or fixed a problem does not approve its own work.

## Success

One explicit command keeps conversation, design, decisions, recommendation, acceptance, and child continuity in the user-selected primary context while specialists gather evidence and perform authorized work. Rich context flows down to cheaper children, compact evidence and continuity metadata flow back, accepted design can be recorded without reconstruction, and implementation and independent review remain deliberate user decisions.

## Non-goals

- Creating planning artifacts without an explicit user request or bypassing their owning workflow.
- Delegating trivial coordination or restating the conversation through children.
- Making every task use every specialist.
- Automatic worker or reviewer dispatch without explicit user authority.
- Allowing the coordinator to implement when delegation is inconvenient.
- Acting as a neutral report aggregator without challenging, weighing, or recommending.
