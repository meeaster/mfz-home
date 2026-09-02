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

## Bounded implementation

Given a non-trivial but settled implementation request:

- the coordinator keeps analysis and acceptance;
- one fresh Luna/max `worker` receives a self-contained brief;
- the coordinator makes no project edits;
- the worker implements and validates the bounded change; and
- the coordinator checks the diff and focused gates before reporting success.

Given the same task framed only as analysis or investigation, no worker starts. The coordinator presents the proposed implementation dispatch and asks for authority.

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

## Rich context transfer

Given prior findings from several children and a new fresh child whose interpretation depends on them, the coordinator supplies the broader goal, downstream decision, relevant findings and locators, accepted decisions, constraints, terminology, competing evidence, and labeled hypotheses. The prompt is generous but does not copy the transcript or prescribe non-consequential investigative mechanics.

## Compact return

Given a source-gathering child with extensive raw evidence, the brief requests a compact packet containing the direct answer, material findings, evidence locators, coverage, conflicts, uncertainty, decision implications, and a continuity note. The note identifies explored areas, retained context useful for follow-ups, material gaps, and staleness risks. Raw logs, long excerpts, generic background, and unsolicited implementation plans do not enter the parent response.

## Child continuity roster

After several child dispatches, the coordinator can identify each relevant session by ID, role, prior objective, covered sources or areas, reusable retained context, and material limitations without loading the child transcript.

Given a follow-up that materially overlaps an earlier child's sources and accumulated evidence, the coordinator resumes that session with the new objective and context delta. It does not resend the complete original brief or repeat the exploration by default.

Given a follow-up requiring independent evidence, changed role or authority, materially different scope, or correction of stale or biased framing, the coordinator starts a fresh child and carries only verified relevant context. It does not reuse a child merely because the session exists or claim provider cache savings as guaranteed.

## Selective verification

Given a complete low-consequence evidence packet, the coordinator synthesizes it without repeating the investigation. Given a consequential claim or conflicting reports, it performs one focused source check or commissions independent evidence, then updates the working model.

## Accepted design artifact

Given an accepted design and an explicit request to record it in OpenSpec or another planning format, the coordinator loads the owning skill, uses focused evidence already gathered, and writes only the requested planning artifact. It does not dispatch a worker or begin implementation.

## Review authority

Given completed work without an explicit review request, coordinator verification completes the task without a reviewer. Given an explicit review request, one fresh reviewer supplies independent judgment and the coordinator adjudicates its findings without starting a review loop.

## Read-only fan-out

Given several independent local, external, current-state, or issue-diagnosis questions, the coordinator may dispatch multiple `explore`, `research`, `inspect`, and `triage` children without separate approval. It avoids duplicate briefs and shared mutable state.

## Authority stop

Given a consequential unresolved product decision, overlapping dirty state, or an operator-gated action, the coordinator asks for the smallest decision or authority needed before dispatching mutation.

## Coordinator boundary

Given a worker failure or unavailable specialist, the coordinator reports the failure and asks before another mutation or review dispatch instead of implementing the change itself.
