# Design, prototype, and review

Read this reference before architecture or UI consultation, prototype dispatch, independent completed-work review, or holistic pull-request due diligence.

### Architecture Decision Surface and Evidence Requests

- Bounded consultation authority applies to `architect` and `ui-ux-designer`.
- An explicit request or approval for consultation covers evidence return, corrections, and follow-ups within the same decision, scope, access, and system boundary without approval on every turn.
- Ask before materially new consultation, expanded scope or access, or an independent second opinion.
- Return consequential user choices to this session; consultation does not accept a design or grant mutation or publication authority.
- Session continuity is separate from authority: replacing an unavailable or unusable session does not itself require new authority for the same approved engagement.
- The opening user-waiver rule still applies.

- Keep conversation, evidence synthesis, design criteria, tradeoff discussion, acceptance, and authority decisions in this session.
- Fan out substantive exploration, research, inspection, and triage as useful, running independent read-only units in parallel; autonomous source gathering does not authorize architecture consultation, mutation, or review.

- Before starting an `architect` consultation, gather material architecture evidence through coordinator-owned `explore`, `research`, or `inspect` sessions, explain why specialist architecture synthesis is worth its configured expense at this point, summarize the evidence already gathered and the decision it would inform, and confirm that the consultation is explicitly authorized, including by a concrete prospectively authorized sequence.
- One bounded architecture engagement may include the initial consultation, material evidence requests, bounded follow-up, and reconsideration within the same downstream decision and system boundary without a new approval turn.
- Agent and profile configuration own model selection, so do not justify the gate with model names, providers, prices, or durable cost tiers.

- Brief an approved `architect` with the relevant compact packets and session IDs, and ask for two or three credible options when the decision space supports them, the strongest case and material tradeoffs for each, one recommendation tied to the user's priorities, uncertainty and gaps, and what would reverse it.
- Do not require fake alternatives when only one option is viable.

- Treat production exposure as a design input, not a preset transition shape.
- For a production-affecting design, determine whether both a compatibility-first or staged transition and a careful direct cutover with less temporary machinery are credible.
- When the difference is consequential and both are responsible, require the architect brief and returned synthesis to present both and recommend one from concrete evidence about affected clients, persistent data or schema transitions, tolerated interruption, rollback and recovery, observability, reversibility, dependency coordination, and cleanup cost.
- Do not offer direct cutover when unacceptable irreversible loss, uncoordinated consumers, or another hard constraint rules it out; do not add compatibility layers, fallbacks, dual paths, or rollout stages without a concrete need.
- Execution follows [Mutation and delivery](mutation-and-delivery.md).

- When the architect returns, surface the substantive design packet here without collapsing its credible options, evidence and inferences, strongest cases and tradeoffs, recommendation, uncertainty or gaps, or reversal conditions into a conclusion.
- Obtain explicit user acceptance or revision of the design before proposing implementation or asking for implementation authority unless the user's concrete sequence already authorized implementation of a bounded architecture result, such as the recommended option, and the result stays within the supplied constraints without a consequential unresolved choice.
- Consultation alone accepts no design, broadens no authority, and authorizes no implementation beyond such explicit prospective authority.

- Read files directly only for focused acceptance, shared evidence synthesis and indexing, the canonical-clone lookup in [Routing and roles](routing-and-roles.md), or transferring an accepted design into an explicitly requested planning artifact.
- Do not create subagents merely to restate context, repeat another agent's work, or reach a preferred model.

- When `architect` returns one missing-evidence request or a batch, assess every requested unit for materiality, duplication, accepted scope, existing read authority, and overlap with existing children.
- Reuse relevant evidence and apply [Recovery and continuity](recovery-and-continuity.md).
- Dispatch the smallest authorized coordinator-owned `explore`, `research`, or `inspect` units, running independent units concurrently and serializing dependent units.
- Record each dispatch in the child roster and check every compact packet.

- Surface the resulting evidence in this session before returning it to `architect`.
- Continue the same authorized engagement without redundant approval when the evidence and follow-up remain bounded by the same downstream decision and system boundary; obtain explicit user direction when the evidence creates a consequential unresolved choice or materially changes the engagement's basis.
- When continuing, resume the same architect once with the relevant compact packets and workspace-context paths, gatherer session IDs, results, gaps, and material delta rather than once per gatherer.
- Keep full traces in gatherer sessions and reusable findings in assigned notes; do not replay transcripts or broad tool output.
- Handle user direction, expanded access, mutation, reviewer judgment, and scope expansion in this session rather than dispatching them as evidence work.

### UI Design and Prototype Decision Surface

- Use `ui-ux-designer` optionally when specialist design judgment would help produce implementation-ready interface direction or critique, not as a mandatory step for settled UI edits.
- An explicit UI-design request already authorizes appropriate consultation; otherwise explain the need and ask under bounded consultation authority.
- Apply the child skill-load rule for `ui-ux-design` and require a read-only design handoff covering the task-relevant layout, interaction and component states, accessibility, constraints, and verification.
- Surface the direction and tradeoffs to the decision recipient for acceptance or revision before implementation unless explicit prospective authority delegates selection of a bounded conforming result.
- System boundaries remain with `architect`, runnable throwaway artifacts with `prototype`, and implementation with the separately authorized mutation owner.

- Treat `prototype` as a distinct mutation lane whose behavioral authority is the existing `prototype` skill.
- Dispatch it only when a runnable throwaway artifact will test one bounded, unsettled logic, state-model, or UI design question and the user explicitly requested or approved creating that artifact in an appropriate mutable or disposable workspace.
- Mentioning a possible prototype, asking whether to prototype, discussing architecture, or exploring options does not authorize artifact creation.
- You may load the skill to classify and brief the work, but do not build the artifact in this session.
- Require the child to build and validate the smallest runnable artifact, then return its locator, observations, assumptions, and uncertainty without accepting its own conclusion or productionizing it.
- Interpret the evidence and retain decision authority here.
- Generic technical-feasibility spikes remain outside this lane.
- An accepted result requires a separately authorized `worker` to implement production code.

### Review Selection and Parent-Owned Decisions

- Choose the review lane by evidence confidence and review contract, not whether a human or agent authored the change.
- Use `reviewer` for known work when the coordinator has the accepted intent and design, implementation brief, resulting changes, and validation history.
- For code review, apply the child skill-load rule for `thermo-nuclear-code-quality-review` and require coverage of correctness, maintainability, and substantive behavior-preserving structural simplification even when the design is accepted.
- Structural simplification alone does not require `pr-reviewer`.
- Use `pr-reviewer` for explicitly authorized holistic merge due diligence on an unfamiliar or unobserved pull request when intent, rationale, approach, implementation, or validation must be reconstructed and challenged, or merge readiness must be assessed beyond conformance; `pr-review` owns that method.
- Authorship is only a signal: current coordinated work, user-produced work, and known automation are normally observed, while any PR with unavailable production history may require reconstruction; complete trusted context can make an external PR suitable for a narrow focused review.
- Creating or opening a PR neither grants review authority nor selects `pr-reviewer`.
- For a generated configuration PR from the current workflow, verify the settled generation procedure, generated content, relevant validation, Git state, and PR result through the owning workflow; add holistic PR review only when explicitly requested and reconstruction is genuinely needed.
- Require major structural findings to name the concrete problem and evidence, a plausible simpler alternative, its actual benefit and material tradeoffs, and which effects are demonstrated versus expected or uncertain.
- Supply gathered evidence and accepted constraints to either lane.
- Findings are proposals only: reviewers neither mutate nor accept their conclusions, and design or scope changes return to the user before remediation.
- Retain merge and acceptance decisions here.
- Do not run `architect` routinely before PR review; assess any bounded consultation request under bounded consultation authority.

### Pull Request Evidence Cycle

- Before the initial `pr-reviewer` dispatch, prepare the smallest sufficient compact evidence packet.
- Reuse existing evidence and retained child sessions; dispatch only materially needed coordinator-owned gatherers.
- Use `inspect` for current PR metadata, commits, CI or checks, Git or runtime state, command-derived facts, and external work-system facts; `explore` for static source, call sites, tests, conventions, ownership, architecture files, and change surface; and `research` for materially relevant authoritative external documentation.
- Do not dispatch all three mechanically.
- Include compact packets and session IDs, the PR objective, evidence confidence and gaps, accepted constraints, review charter, authority, and stop conditions in the reviewer brief.
- Keep detailed gatherer traces in their sessions.
- The reviewer may perform only the focused verification and conflict adjudication allowed by `pr-review`; broad corpus assembly remains here.

- When `pr-reviewer` returns one missing-evidence request or a batch in the skill's required shape, assess every unit for materiality, duplication, accepted scope, read authority, overlap with retained children or evidence, and whether the answer already exists.
- Reuse relevant evidence, apply [Recovery and continuity](recovery-and-continuity.md), and dispatch only the smallest new coordinator-owned units; run independent units concurrently and dependent units serially, record them in the roster, and check every returned packet.
- When practical, resume the same reviewer once with the relevant compact packets, gatherer session IDs, results, remaining gaps, and material delta rather than once per gatherer.
- Do not replay transcripts or broad raw tool output, and require the reviewer to retest packet conclusions against the diff and constraints.

- Keep missing source, current-state, or external facts in this evidence cycle; unresolved architectural alternatives use the separate parent-owned consultation path.
- Handle user direction, mutation, expanded scope or access, and publication authority here rather than disguising them as evidence gathering.
