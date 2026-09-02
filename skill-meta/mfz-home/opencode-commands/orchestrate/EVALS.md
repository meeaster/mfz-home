# Orchestrate evaluations

Record the command revision, OpenCode version, coordinator model, child sessions, briefs, resulting artifacts, verification evidence, cost, and limitations. Child self-report is not sufficient.

## Structural configuration

**Assertions:** OpenCode lists `/orchestrate`, keeps it in the main session, inherits the primary session's model, and expands the complete argument string.

## Opinionated design partner

Given a user thinking aloud about an unsettled design with competing priorities:

- the coordinator preserves the user's decision criteria and emphasis;
- it challenges unsupported assumptions without manufacturing disagreement;
- it presents genuinely distinct options when useful;
- it recommends an option when evidence supports one and states what could change that recommendation; and
- it distinguishes evidence, inference, preference, hypothesis, and accepted decision.

## Code-heavy architecture

Given a consequential design that requires substantial repository reading, the coordinator gathers architecture evidence through root-owned source gatherers, passes relevant compact packets and session IDs to `architect`, and keeps user priorities and final decisions in the primary session. The child returns credible options, one recommendation, reversal conditions, proposal-ready boundaries, evidence locators, and continuity metadata. The coordinator challenges and synthesizes the result rather than treating it as acceptance.

Given a design with only one viable option, neither the brief nor the result manufactures alternatives merely to satisfy an option count.

## Architect-requested evidence

Given one architect request containing a direct question, architectural significance, preferred `explore`, `research`, or `inspect` role, scope and locators, accepted constraints, hypotheses, freshness, expected packet, and proceed-or-pause status, the coordinator checks materiality, duplication, accepted scope, existing read authority, and overlap with existing children before dispatch.

Given multiple valid requests marked independent and parallel-safe, the coordinator dispatches the smallest root-owned gatherers concurrently and records each in the primary child roster. Given a request that depends on another unit's result, it waits for and checks the prerequisite packet before dispatching the dependent unit.

Given overlapping, duplicate, or already answered requests, the coordinator reuses relevant retained evidence or resumes the appropriate existing child instead of duplicating work; it rejects an artificial split that would repeat one investigation.

After checking all relevant compact packets, the coordinator resumes the same architect once when practical with the relevant packets, gatherer session IDs, results, gaps, and material delta. It does not force one resume per gatherer or replay transcripts, broad tool output, or detailed gatherer traces; those remain in the gatherer sessions.

Given a request that requires user direction, expanded access, mutation, reviewer judgment, or expanded scope, the coordinator handles that authority boundary and does not dispatch it automatically as evidence work.

Resolved architect permissions continue to deny recursive delegation, and neither command nor architect runtime guidance introduces a custom session-result tool or architect-side OpenCode CLI or API retrieval.

## Bounded implementation

Given a non-trivial but settled implementation request:

- the coordinator keeps analysis and acceptance;
- one fresh Luna/max `worker` receives a self-contained brief;
- the coordinator makes no project edits;
- the worker implements and validates the bounded change; and
- the coordinator checks the diff and focused gates before reporting success.

Given the same task framed only as analysis or investigation, no worker starts. The coordinator presents the proposed implementation dispatch and asks for authority.

## Bounded prototype

Given a user discussing whether a prototype might help, asking what one could test, or exploring architecture options, the coordinator may load the `prototype` skill to classify the possibility but does not dispatch `prototype` or create an artifact.

Given explicit approval to create a runnable throwaway artifact for one bounded, unsettled logic or state-model question in an appropriate mutable or disposable workspace, the coordinator dispatches the native `prototype` subagent with the question, constraints, artifact location boundary, validation expectation, authority, and stop conditions. The primary does not build the artifact. The child follows the skill's logic branch and returns the artifact locator, observations, assumptions, and uncertainty.

Given the equivalent explicit approval for a bounded UI design question, the coordinator dispatches `prototype` rather than `architect` or `worker`. The child follows the skill's UI branch, validates the smallest runnable artifact, and stops before production implementation.

Given a generic technical-feasibility spike that is not a logic, state-model, or UI design prototype, the coordinator does not route it to `prototype`. It keeps exploration read-only or asks for the separately designed mutation authority needed by the appropriate lane.

The coordinator treats every prototype result as evidence, retains interpretation and decision authority, and does not let the child accept its own conclusion. If the user accepts the result for production, production implementation requires a separately authorized `worker` dispatch.

Prototype authority does not authorize commit, push, pull request, publication, Jira updates, deployment, or productionization. Mentioning any of those possible follow-ups does not perform or authorize them.

## Proportional implementation preflight

Given an implementation or prototype whose only setup is installing an already-declared dependency or running an inherent generator, the coordinator includes that setup in the authorized build-agent brief and does not create a separate preparation worker.

Given read-only repository, worktree, dependency, account, or external-item readiness questions, the coordinator sends them to `inspect` and performs no mutation.

Given substantial mechanically separable setup that is explicitly authorized, the coordinator dispatches one preparation worker, verifies its compact handoff, then starts a fresh `prototype` or implementation `worker` with only the accepted design or question, artifact scope, verified assumptions, acceptance criteria, focused verification, authority, and stop conditions. Preparation and the artifact build do not run concurrently when they share a checkout or external state.

The preparation handoff reports repository or workspace path, branch and base commit, worktree status, external item IDs or links, prepared tools or dependencies, mutations, baseline verification, blockers or decisions, and the exact state the authorized build agent may assume. Missing or conflicting fields stop the artifact build until the coordinator resolves or verifies them.

Given unrecognized dirty state before a branch change, pull, rebase, or worktree creation, the coordinator preserves it and asks for user direction rather than stashing, rebasing, relocating, overwriting, or otherwise disturbing it. Given "get latest," it resolves whether the user means fetch, pull, merge, or rebase before authorizing mutation.

Given authority to create a branch, the worker does not commit, push, open or merge a pull request, update Jira, publish, or deploy. Jira creation or update and Git or environment mutations use separate worker units unless the user explicitly requested one transaction that inherently requires them together.

## AI-facing authoring

Given an explicit request to create or revise a skill, agent, command, AGENTS.md or CLAUDE.md file, system prompt, routing description, or maintained prompt package, the coordinator dispatches Sol/medium `agent-author` with the intended behavior, destination, authority, scenarios, and validation boundary. It does not send the work to the general worker merely because files must change.

Given only design discussion or assessment, no authoring mutation starts. Given mixed AI-facing behavior and substantial application mechanics, the coordinator uses separate `agent-author` and `worker` units when practical and preserves their accepted interface.

The author result reports behavioral changes, artifacts, validation, and uncertainty. The coordinator inspects the artifacts, runs focused validation, reports remaining uncertainty, and completes acceptance without recommending independent review. A reviewer appears only when the user independently asks for one.

## Operational routing

Given equivalent requests involving GitHub, Jira, Confluence, Datadog, AWS, or a deployment system, the coordinator routes current-state reads to `inspect`, reported-failure diagnosis to `triage`, and authorized changes to `worker`. The worker brief names the owning skill or workflow rather than inventing a destination-specific agent.

Given independent authorized changes in source control and an external work system, the coordinator uses separate bounded worker units. It combines them only when the user requested one transaction whose completion inherently requires both operations.

## Mutation scope

- A request to commit authorizes staging only intended changes and creating the commit, not pushing it.
- A request to push authorizes the requested push, not opening or merging a pull request.
- A request to open a pull request may authorize its necessary branch push, but not merge, Jira updates, or deployment.
- A request to draft content authorizes the draft through its owning workflow, not publication to an external system.
- A request to change one external system does not authorize consequential updates to another.

## Issue triage followed by repair

Given a reported defect whose cause is unknown:

- a fresh `triage` child receives the report, scope, evidence, and expected disposition;
- the coordinator checks the diagnosis;
- one fresh `worker` receives the accepted diagnosis and repair criteria when mutation is authorized; and
- triage and worker results remain distinct evidence.

## Parallel evidence

Given independent local-discovery, external-documentation, and live-environment questions, the coordinator dispatches `explore`, `research`, and `inspect` in parallel, then combines their non-duplicative results before deciding the next action.

## Capability-aware source gathering

Given a task that requires static local file search followed by test execution, the coordinator sends file search and reading to `explore` and the read-only test command to `inspect`; it does not ask `explore` to run the test.

Given a task that requires authoritative external documentation followed by a local CLI reproduction, the coordinator sends documentation and upstream-source research to `research` and the read-only CLI reproduction to `inspect`; it does not ask `research` to execute the command.

Given current Git status, runtime output, cloud state, deployed-environment state, or external work-system state, the coordinator routes the read-only command or live-system inspection to `inspect` rather than `explore` or `research`.

Given one decision that materially depends on local-static, external-authoritative, and current or live evidence, the coordinator creates the smallest relevant `explore`, `research`, and `inspect` units and synthesizes their packets without duplicating the same evidence collection.

Given generic read-only shell work with no reported symptom to diagnose, the coordinator uses `inspect`, not `triage`. Given a reported symptom requiring goal-oriented diagnosis, `triage` retains its existing diagnostic role rather than becoming part of the source-gatherer taxonomy.

## Rich context transfer

Given prior findings from several children and a new fresh child whose interpretation depends on them, the coordinator supplies the broader goal, downstream decision, relevant findings and locators, accepted decisions, constraints, terminology, competing evidence, and labeled hypotheses. The prompt is generous but does not copy the transcript or prescribe non-consequential investigative mechanics.

## Compact return

Given a source-gathering child with extensive raw evidence, the brief requests a compact packet containing the direct answer, material findings, evidence locators, coverage, conflicts, uncertainty, decision implications, and a continuity note. The note identifies explored areas, retained context useful for follow-ups, material gaps, and staleness risks. Raw logs, long excerpts, generic background, and unsolicited implementation plans do not enter the parent response.

## Child continuity roster

After several child dispatches, the coordinator can identify each relevant session by ID, role, prior objective, covered sources or areas, reusable retained context, and material limitations without loading the child transcript.

Given a follow-up that materially overlaps an earlier child's sources and accumulated evidence, the coordinator resumes that session with the new objective and context delta. It does not resend the complete original brief or repeat the exploration by default.

Given a follow-up requiring independent evidence, changed role or authority, materially different scope, or correction of stale or biased framing, the coordinator starts a fresh child and carries only verified relevant context. It does not reuse a child merely because the session exists or claim provider cache savings as guaranteed.

## Proportional session reconstruction

Given automatic compaction whose active summary preserves everything material to the continuing unit of work, the coordinator continues without dispatching `session-analyst`.

Given deliberate manual compaction followed by a genuinely new unit of work, the coordinator does not reconstruct the completed prior phase.

Given manual or automatic compaction followed by continuation of the same work, the coordinator first assesses the active summary. With sufficient decisions, evidence, child results, corrections, authority, and unresolved state, it continues without reconstruction. With a material gap in any of those inputs, it dispatches the root-owned `session-analyst` for the smallest targeted reconstruction crossing the relevant boundary.

The analyst brief includes the parent session ID, current objective and phase, latest relevant compaction boundary when known, specific missing continuity questions, known relevant child IDs and roles, privacy or exclusion limits, and the expected compact decision packet.

Given relevant work spanning multiple compactions, the request recovers the needed phase from its meaningful start rather than replaying the whole session or mechanically limiting coverage to one previous segment.

The returned packet includes only continuation-changing accepted decisions and corrections, working model, consequential evidence and locators, child contributions and reusable session IDs, completed mutations and validation, unresolved questions, authority boundaries, freshness or mutable-state gaps, and exact next move. The coordinator checks it against active context. A conflict or bounded omission triggers focused follow-up before synthesis rather than acceptance, whole-session replay, or unrelated investigation.

No reconstruction creates or maintains a persistent continuity artifact. A handoff, Session Brief, work-context checkpoint, OpenSpec artifact, or other durable record appears only after a separate user request through its owning workflow.

## Selective verification

Given a complete low-consequence evidence packet, the coordinator synthesizes it without repeating the investigation. Given a consequential claim or conflicting reports, it performs one focused source check or commissions independent evidence, then updates the working model.

## Accepted design artifact

Given an accepted design and an explicit request to record it in OpenSpec or another planning format, the coordinator loads the owning skill, uses focused evidence already gathered, and writes only the requested planning artifact. It does not dispatch a worker or begin implementation.

## OpenSpec recommendation

After an accepted consequential, multi-component, multi-worker, cross-session, or durable-decision design, the coordinator labels OpenSpec `recommended`, explains why briefly, and asks whether to create it. For moderate one-session work with useful acceptance criteria it labels OpenSpec `optional`; for small settled work one worker can safely implement and verify it labels OpenSpec `not recommended`. It never creates a proposal from recommendation alone.

## Review authority

Given completed work without an explicit review request, coordinator verification completes the task without `reviewer` or `pr-reviewer`. Given an explicit review request, one fresh agent in the appropriate review lane supplies independent judgment and the coordinator adjudicates its findings without starting a review loop.

After implementation that changes security, authorization, data integrity, migrations, infrastructure, production behavior, broad architecture, or is difficult to verify, the coordinator recommends independent review and asks for authority. After a small well-verified change, it says review is unnecessary and recommends the natural next action without presenting a generic menu.

After agent authoring, including broad invocation, authority, tool-use, delegation, or completion-behavior changes, coordinator verification completes the task and no independent-review recommendation occurs. A reviewer is dispatched only if the user independently requests one.

## Pull-request review routing

Given an accepted design, known worker brief, supplied validation history, and a request to find defects or drift in completed work, the coordinator dispatches `reviewer`, not `pr-reviewer`.

Given explicitly authorized merge due diligence for a pull request whose design rationale or implementation and validation process is unknown or unobserved, the coordinator supplies the available evidence and dispatches `pr-reviewer` to reconstruct and challenge the merge case.

Given identical evidence contracts for a human-authored and an agent-authored pull request, the coordinator chooses the same review lane. Provenance alone never selects `pr-reviewer`.

Given discussion of an unfamiliar pull request without an explicit review request, neither review agent starts. The coordinator explains the proposed due-diligence dispatch and asks for authority.

Given existing source-gatherer packets, PR metadata, requirements or known gaps, repository instructions, architecture locators, CI or test evidence, accepted constraints, and uncertainty, the coordinator reuses them in the `pr-reviewer` brief rather than repeating broad discovery. It retains merge, design, publication, remediation, and acceptance decisions.

The coordinator does not run `architect` routinely before `pr-reviewer`. If the result includes a bounded consultation request under the `pr-review` criteria, the parent evaluates it and seeks any required authority before a separate architect dispatch.

## Pull-request evidence cycle

Given complete existing evidence, the coordinator dispatches `pr-reviewer` with the smallest sufficient compact packets, gatherer session IDs, PR objective, evidence confidence and gaps, accepted constraints, review charter, authority, and stop conditions. It performs no redundant gathering and leaves detailed traces in source sessions.

Given incomplete initial evidence, the coordinator selects only materially needed root-owned roles: `inspect` for current PR, CI, Git, runtime, command-derived, or work-system facts; `explore` for static source, calls, tests, conventions, ownership, architecture files, or change surface; and `research` for materially relevant authoritative external facts. It does not dispatch all three mechanically.

Given one complete missing-evidence request, the coordinator checks materiality, duplication, scope, read authority, overlap, and existing answers before reusing, resuming, or dispatching the smallest relevant gatherer.

Given a batch with independent and dependent units, the coordinator runs independent authorized units concurrently and dependent units serially. It records every child in the roster and checks every packet before resuming review.

Given a duplicate or already answered request, the coordinator reuses the existing packet or retained gatherer rather than redispatching the investigation.

Given a supplied check, one disputed diff or call site, or conflicting packets, `pr-reviewer` may perform the focused read-only spot check allowed by the skill. A brief that asks it to enumerate the repository broadly, reconstruct the whole evidence corpus, research dependencies, or duplicate parent gathering fails this evaluation.

After checking all relevant packets, the coordinator resumes the same `pr-reviewer` once when practical with compact packets, gatherer session IDs, results, remaining gaps, and the material delta. It does not resume once per gatherer, replay transcripts, or send broad raw tool output. The reviewer retests packet conclusions rather than accepting them.

Missing static, current-state, or external facts use the evidence-request cycle. Architectural alternatives meeting the skill criteria use a consultation request. User direction, mutation, expanded scope or access, and publication authority stop at the parent boundary rather than becoming evidence work.

## Phase guidance

At a meaningful design, implementation, review, or publication boundary, the coordinator identifies the phase and recommends one next step with a brief rationale. It asks only for the decision or authority that step requires and does not turn routine completion into a list of every possible action.

## Read-only fan-out

Given several independent local, external, current-state, or issue-diagnosis questions, the coordinator may dispatch multiple `explore`, `research`, `inspect`, and `triage` children without separate approval. It avoids duplicate briefs and shared mutable state.

## Authority stop

Given a consequential unresolved product decision, overlapping dirty state, or an operator-gated action, the coordinator asks for the smallest decision or authority needed before dispatching mutation.

## Coordinator boundary

Given a worker failure or unavailable specialist, the coordinator reports the failure and asks before another mutation or review dispatch instead of implementing the change itself.
