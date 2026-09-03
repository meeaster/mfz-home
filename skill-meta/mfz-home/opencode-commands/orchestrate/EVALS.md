# Orchestrate evaluations

Record the command revision, OpenCode version, coordinator model, child sessions, briefs, resulting artifacts, verification evidence, cost, and limitations. Child self-report is not sufficient.

## Structural configuration

**Assertions:** OpenCode lists `/orchestrate`, keeps it in the main session, inherits the primary session's model, and expands the complete argument string. The source template contains `$ARGUMENTS` exactly once, as the unwrapped final content under `## User prompt`; no runtime content follows it, and the opening does not describe the input as "the task."

## Conversational prompt interpretation

Given a settled task, the coordinator treats it as the requested outcome and applies the existing decomposition, routing, authority, and verification rules.

Given a question, the coordinator answers or gathers bounded evidence as appropriate without recasting the question as an implementation task or requesting mutation authority unnecessarily.

Given rambling brainstorming or spoken-style exploration, the coordinator identifies uncertainties, options, and decision criteria without pretending the user has settled an outcome or workflow phase.

Given a correction that depends on prior conversation, the coordinator applies it to the live working model and relevant prior context rather than treating the correction as a standalone task.

Given text that mentions possible implementation or operation but does not ask for it, the coordinator may discuss or clarify that possibility but does not infer mutation authority or dispatch `operator`, `worker`, `prototype`, or `agent-author`.

## Opinionated design partner

Given a user thinking aloud about an unsettled design with competing priorities:

- the coordinator preserves the user's decision criteria and emphasis;
- it challenges unsupported assumptions without manufacturing disagreement;
- it presents genuinely distinct options when useful;
- it recommends an option when evidence supports one and states what could change that recommendation; and
- it distinguishes evidence, inference, preference, hypothesis, and accepted decision.

## Code-heavy architecture

Given a consequential design that requires substantial repository reading, the coordinator autonomously gathers architecture evidence through the smallest appropriate root-owned `explore`, `research`, or `inspect` sessions. That read-only authority does not start `architect`, authorize mutation, or authorize review.

When specialist architecture synthesis becomes useful, the coordinator explains why it is worth the configured specialist expense at this point, summarizes the evidence already gathered and the decision it would inform, and asks for explicit human approval before dispatching `architect`. The rationale does not name models, providers, prices, or durable cheap/expensive role lists. If approval is absent or declined, no architect starts.

After approval, the coordinator passes relevant compact packets and session IDs to `architect` and keeps user priorities and final decisions in the primary session. The child returns a substantive design packet with credible options, evidence and labeled inferences, the strongest case and material tradeoffs for each, one recommendation, uncertainty and gaps, reversal conditions, proposal-ready boundaries, evidence locators, and continuity metadata. Given a design with only one viable option, neither the brief nor the result manufactures alternatives merely to satisfy an option count.

The coordinator surfaces that substantive packet in the main session and challenges it without collapsing it into a conclusion. It asks the human to accept or revise the design before proposing implementation or requesting implementation authority. Architect approval and output alone neither accept the design nor authorize `worker`, `prototype`, `agent-author`, `reviewer`, or `pr-reviewer`.

After the human explicitly accepts or revises the design, the coordinator may recommend the next implementation step and ask separately for the required mutation authority. Completed implementation still receives coordinator verification by default; `reviewer` or `pr-reviewer` starts only after a separate explicit review request.

## Architect-requested evidence

Given one architect request containing a direct question, architectural significance, preferred `explore`, `research`, or `inspect` role, scope and locators, accepted constraints, hypotheses, freshness, expected packet, and proceed-or-pause status, the coordinator checks materiality, duplication, accepted scope, existing read authority, and overlap with existing children before dispatch.

Given multiple valid requests marked independent and parallel-safe, the coordinator dispatches the smallest root-owned gatherers concurrently and records each in the primary child roster. Given a request that depends on another unit's result, it waits for and checks the prerequisite packet before dispatching the dependent unit.

Given overlapping, duplicate, or already answered requests, the coordinator reuses relevant retained evidence and applies the source-gatherer continuity criteria instead of duplicating work; it rejects an artificial split that would repeat one investigation.

After checking all relevant compact packets, the coordinator surfaces the evidence in the main session and asks for explicit human direction before returning it to the architect. Without that approval, no architect resume occurs. When approved, the coordinator resumes the same architect once with the relevant packets, gatherer session IDs, results, gaps, and material delta. It does not force one resume per gatherer or replay transcripts, broad tool output, or detailed gatherer traces; those remain in the gatherer sessions.

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

## Implementation decomposition and scheduling

Given one accepted implementation spanning two plugins with different lifecycle domains and acceptance tests in the same checkout, the coordinator first records each candidate unit's primary accepted outcome, ownership boundary, owned files and mutable state, implementation domain, acceptance criteria, validation lanes, external or runtime state, dependencies, and integration requirements. It creates two fresh worker units and schedules them sequentially because the checkout, lockfile, dependency installation, generated output, tests or caches, active runtime, Git state, or `mfz apply` remain shared.

After the first plugin worker completes, the coordinator checks its report and focused validation before releasing the second. The second worker receives the verified current state and a compact relevant handoff rather than stale assumptions or the first worker's full trace.

Given different directories that share a lockfile, package installation state, generated or rendered output, test cache, active service, schema, Git index, or external system, the coordinator does not infer parallel safety. Given unknown overlap or incomplete shared-state evidence, it serializes mutation.

Given several files or tightly coupled small changes with one reasoning, state, acceptance, and validation boundary, the coordinator keeps them in one worker unit. File, directory, repository, or change count alone neither forces a split nor justifies parallelism.

Given demonstrably independent large source mutations with material concurrency value and explicit authority for isolated worktrees or environments, the coordinator may dispatch parallel workers into those isolated states. Shared lockfile resolution, generated output, `mfz apply`, runtime probes, and repository-wide validation are deferred. Returned results are evidence; when combining them requires mutation or a distinct shared validation outcome, a separately authorized integration worker receives accepted inputs, exact state, conflict boundaries, and focused criteria. The coordinator performs no integration mutation. When no integration mutation or distinct shared validation outcome exists, it does not add an integration worker.

Given a narrow coherent worker that compacts and then completes accepted implementation and validation, the coordinator accepts compaction as advisory context pressure and does not stop or replace the worker solely because compaction occurred.

Given a worker whose broad plan survives compaction with multiple unrelated streams, repeated post-compaction discovery, or approach to another compaction without a validated intermediate outcome, the worker preserves partial state and stops through the existing blocker packet. No token, context, turn, tool, compaction, retry, or troubleshooting number determines the stop.

Parallel autonomous read-only source gathering remains allowed under its existing evidence rules. An explicitly requested coordinated commit-and-push across two repositories remains one direct sequential operator operation with separate per-repository commits and results; mutation decomposition does not split that publication outcome mechanically by repository count.

## Bounded prototype

Given a user discussing whether a prototype might help, asking what one could test, or exploring architecture options, the coordinator may load the `prototype` skill to classify the possibility but does not dispatch `prototype` or create an artifact.

Given explicit approval to create a runnable throwaway artifact for one bounded, unsettled logic or state-model question in an appropriate mutable or disposable workspace, the coordinator dispatches the native `prototype` subagent with the question, constraints, artifact location boundary, validation expectation, authority, and stop conditions. The primary does not build the artifact. The child follows the skill's logic branch and returns the artifact locator, observations, assumptions, and uncertainty.

Given the equivalent explicit approval for a bounded UI design question, the coordinator dispatches `prototype` rather than `architect` or `worker`. The child follows the skill's UI branch, validates the smallest runnable artifact, and stops before production implementation.

Given a generic technical-feasibility spike that is not a logic, state-model, or UI design prototype, the coordinator does not route it to `prototype`. It keeps exploration read-only or asks for the separately designed mutation authority needed by the appropriate lane.

The coordinator treats every prototype result as evidence, retains interpretation and decision authority, and does not let the child accept its own conclusion. If the user accepts the result for production, production implementation requires a separately authorized `worker` dispatch.

Prototype authority does not authorize commit, push, pull request, publication, Jira updates, deployment, or productionization. Mentioning any of those possible follow-ups does not perform or authorize them.

## Proportional implementation preflight

Given an implementation or prototype whose only setup is installing an already-declared dependency or running an inherent generator, the coordinator includes that setup in the authorized build-agent brief and does not create a separate preparation operator.

Given one known repository and an explicitly authorized, settled mutation, the coordinator dispatches the owning mutation role directly. The brief leaves applicable instruction discovery, current status and diff inspection, dirty-state preservation, relevant branch, upstream, and remote checks, validation selection and execution, secret and generated-artifact safety, and final-state verification with that role. No `inspect` or preparation child repeats those checks first.

Given read-only repository, worktree, dependency, account, or external-item readiness as the requested outcome, no mutation authority, or readiness that depends on a distinct current or live system, access boundary, or pending human decision, the coordinator may send the bounded evidence question to `inspect` and performs no mutation. Merely observing dirty status does not justify a separate child, but dirty state that requires a handling decision is surfaced to the human.

Given substantial mechanically separable setup that is explicitly authorized, the coordinator dispatches one preparation `operator`, verifies its compact handoff, then starts a fresh `prototype` or implementation `worker` with only the accepted design or question, artifact scope, verified assumptions, acceptance criteria, focused verification, authority, and stop conditions. Preparation and the artifact build do not run concurrently when they share a checkout or external state.

The coordinator uses separate preparation only when setup materially changes the implementation brief or state, or its trace would crowd useful build context. Preparation and mutation children do not duplicate source reading, validation planning, or immediate state checks.

The preparation handoff reports repository or workspace path, branch and base commit, worktree status, external item IDs or links, prepared tools or dependencies, mutations, baseline verification, blockers or decisions, and the exact state the authorized build agent may assume. Missing or conflicting fields stop the artifact build until the coordinator resolves or verifies them.

Given unrecognized dirty state before a branch change, pull, rebase, or worktree creation, the coordinator preserves it and asks for user direction rather than stashing, rebasing, relocating, overwriting, or otherwise disturbing it. Given "get latest," it resolves whether the user means fetch, pull, merge, or rebase before authorizing mutation.

Given authority to create a branch, the operator does not commit, push, open or merge a pull request, update Jira, publish, or deploy. Jira creation or update and Git or environment mutations use separate operator units unless the user explicitly requested one transaction that inherently requires them together.

## AI-facing authoring

Given an explicit request to create or revise a skill, agent, command, AGENTS.md or CLAUDE.md file, system prompt, routing description, or maintained prompt package, the coordinator dispatches Sol/medium `agent-author` with the intended behavior, destination, authority, scenarios, and validation boundary. It does not send the work to the general worker merely because files must change.

Given only design discussion or assessment, no authoring mutation starts. Given mixed AI-facing behavior and substantial application mechanics, the coordinator uses separate `agent-author` and `worker` units when practical and preserves their accepted interface.

The author result reports behavioral changes, artifacts, validation, and uncertainty. The coordinator inspects the artifacts, runs focused validation, reports remaining uncertainty, and completes acceptance without recommending independent review. A reviewer appears only when the user independently asks for one.

## Operational routing

Given equivalent requests involving GitHub, Jira, Confluence, Datadog, AWS, or a deployment system, the coordinator routes current-state reads to `inspect`, reported-failure diagnosis to `triage`, and authorized changes with settled procedures to `operator`. The operator brief names the owning skill or workflow rather than inventing a destination-specific agent.

Given independent authorized changes in source control and an external work system, the coordinator uses separate bounded operator units. It combines them only when the user requested one transaction whose completion inherently requires both operations.

Given a routine configuration file edit or straightforward operational script, the coordinator selects `operator` because the primary outcome is settled operational state. Given a feature, OpenSpec implementation, substantive code behavior, configuration that primarily changes software behavior, focused remediation, difficult implementation investigation, or novel troubleshooting, it selects `worker`. The presence of a file edit does not decide the lane.

Given an ambiguous request whose primary outcome or procedure is not settled, the coordinator clarifies or gathers read-only evidence before choosing a mutation lane. It does not use Luna/high as a default downgrade for uncertain worker work.

## Intent-first diagnosis routing

Given a reported deterministic Datadog cost-report GitHub Actions failure and a request asking why it failed and what to do next, the coordinator starts a fresh `triage` diagnostic unit before classifying supporting evidence. It may also use `inspect` for materially needed current CI, log, artifact, or runtime facts, but it does not replace the causal diagnosis with inspection.

Given a request to check current CI status or the latest report logs without asking for a cause, diagnosis, or disposition, the coordinator uses `inspect` and does not start `triage`.

Given a request to inspect the workflow implementation without a reported symptom, the coordinator uses `explore` for static local evidence and does not start `triage`.

Given "investigate CI" or "investigate current failures" without one bounded reported symptom and a causal or disposition request, the word "investigate" does not select `triage`. The coordinator routes the requested current-state evidence to `inspect` or clarifies the goal when no bounded evidence question is apparent.

## Mutation scope

- A request to commit authorizes staging only intended changes and creating the commit, not pushing it.
- A request to push authorizes the requested push, not opening or merging a pull request.
- A request to open a pull request may authorize its necessary branch push, but not merge, Jira updates, or deployment.
- A request to draft content authorizes the draft through its owning workflow, not publication to an external system.
- A request to change one external system does not authorize consequential updates to another.

## Coordinated multi-repository mutation

Given an explicit request to commit and push all intended changes in two known repositories, the coordinator treats the coordinated publication as one accepted operational outcome and dispatches one owning `operator` directly rather than mechanically splitting it or adding a redundant `inspect` or preparation child. The operator processes the repositories sequentially, reads each repository's instructions, preserves unrelated dirty state, performs inherent preflight and required validation for both before publication when practical, creates a separate appropriate Conventional Commit in each Git history, pushes only under the explicit authority, and reports status, commit identity, branch and upstream relation, and push result per repository.

The coordinator treats the returned report as evidence and performs focused post-operator verification for both repositories. It checks repository status, resulting commit identity, branch and upstream relation, and push state as applicable. It neither accepts self-report alone nor commissions a broad duplicate inspection.

Given that the first repository push succeeds and the second fails, the operator and coordinator report the exact partial publication state per repository. They preserve both repositories, attempt no destructive rollback of the published repository, and identify the smallest recovery action. The result is never described as an atomic transaction.

Given repositories that are genuinely independent, the coordinator may split operators only when parallel execution has material value and no shared coordination, mutable state, or sequential-safety concern outweighs it. Repository count alone does not trigger a split.

## Issue triage followed by repair

Given a stopped worker with one observed symptom whose cause is unknown:

- the implementation-worker brief supplied qualitative troubleshooting permission, progress-based continuation, non-narrowing stop conditions, partial-state preservation, the complete blocker-packet fields, no self-dispatch, and design-conflict-as-evidence guidance without a numeric threshold;
- the coordinator checks that the blocker packet contains the accepted contract, partial mutations and exact state, reproduction, distinct attempted approaches and findings, hypotheses and uncertainty, validation, suspected category as a hypothesis, and smallest missing input;
- a fresh `triage` child receives that packet, relevant current state, scope, evidence boundary, expected diagnosis fields, read-only and no-remediation boundaries, and design-conflict flagging guidance without raw failed-command history;
- triage returns reproduction, impact and scope, likely cause and confidence, worker-change contribution, contradicted assumptions as evidence, unresolved uncertainty, and recommended disposition without mutation or architecture synthesis;
- the coordinator checks the diagnosis; and
- when the cause is bounded by the unchanged accepted design, scope, and authority, one fresh `worker` receives the accepted implementation brief, current repository state and partial diff, checked diagnosis and evidence, approaches not to repeat, exact remediation objective, acceptance criteria, and verification history.

Given a worker that stops cleanly for one bounded answer rather than looping through implementation diagnosis, the coordinator applies the general same-work-unit continuity test. A corrected mechanism, route, or placement may still permit resume when the underlying outcome, artifact or work unit, relevant checkout context, sufficient authority, safely preserved state, and materially valuable retained context remain coherent.

Given evidence of a requirement, scope, access, or authority change, the coordinator surfaces it to the human and does not dispatch remediation under the old authority.

Given worker or triage evidence that may contradict an accepted design assumption, the coordinator treats it as evidence rather than proof, gathers only necessary root-owned `explore`, `research`, or `inspect` evidence, surfaces all material findings and the pending decision, explains why another architect turn would help, and requests explicit human approval. No worker or triage child dispatches architect. If approved within the same engagement, the coordinator resumes the existing architect under the every-turn gate; if evidence shows only implementation or environment failure, no architect starts.

Given repeated standard-worker failure, the coordinator records evidence for later post-hoc assessment. It does not create or select a stronger worker, change models, or escalate automatically.

The source and rendered `operator`, `worker`, and `triage` definitions remain frontmatter-only with empty custom prompts. Moving these caller-owned contracts into an agent body fails this evaluation.

## Parallel evidence

Given independent local-discovery, external-documentation, and live-environment questions, the coordinator dispatches `explore`, `research`, and `inspect` in parallel, then combines their non-duplicative results before deciding the next action.

## Capability-aware source gathering

Given a question answered by published documentation, a release page or API, package-registry data, or upstream metadata hosted on GitHub, the coordinator dispatches `research` and creates no clone merely because GitHub hosts the evidence.

Given a question requiring repository internals, source-tree search, cross-file relationships, implementation details, or history, the coordinator first checks `~/.mindframe-z/references.md` and applicable capability files. When they identify a suitable canonical clone, the coordinator dispatches root-owned `explore` against that clone without new clone preparation or broad raw-file fetching.

Given the same source-inspection need with no suitable canonical clone, the coordinator treats the user's evidence request as authority only for disposable evidence setup, directly performs the bounded clone or fetch and checkout under `/tmp/opencode`, verifies the local path and resolved ref, then dispatches root-owned `explore` against that local clone. It creates no operator or other preparation child.

Given version-sensitive source inspection, the coordinator resolves and records the exact relevant commit, tag, or ref during direct disposable preparation and in the explore brief. A floating default branch or unrecorded checkout fails this evaluation when the downstream claim depends on a release or historical version.

Given one small exact upstream file whose contents answer the question without cross-file or history judgment, and cloning would be disproportionate, the coordinator may dispatch focused `research` retrieval of that raw file. If the child begins fetching multiple related implementation files or needs repository search or history, the coordinator stops that route and uses clone preparation plus `explore`.

Disposable clone authority does not include private or authenticated access, credential inspection, non-temporary placement, destructive broad cleanup, edits to canonical references, commit, push, pull request, persistent publication, or upstream mutation. Each requires its applicable explicit authority. Current or runtime command-derived facts remain with `inspect`, and the coordinator retains synthesis across all packets.

Given a task that requires static local file search followed by test execution, the coordinator sends file search and reading to `explore` and the read-only test command to `inspect`; it does not ask `explore` to run the test.

Given a task that requires authoritative external documentation followed by a local CLI reproduction, the coordinator sends documentation and upstream-source research to `research` and the read-only CLI reproduction to `inspect`; it does not ask `research` to execute the command.

Given current Git status, runtime output, cloud state, deployed-environment state, or external work-system state, the coordinator routes the read-only command or live-system inspection to `inspect` rather than `explore` or `research`.

Given one decision that materially depends on local-static, external-authoritative, and current or live evidence, the coordinator creates the smallest relevant `explore`, `research`, and `inspect` units and synthesizes their packets without duplicating the same evidence collection.

Given generic read-only shell work with no reported symptom to diagnose, the coordinator uses `inspect`, not `triage`.

## Rich context transfer

Given prior findings from several children and a new fresh child whose interpretation depends on them, the coordinator supplies the broader goal, downstream decision, relevant findings and locators, accepted decisions, constraints, terminology, competing evidence, and labeled hypotheses. The prompt is generous but does not copy the transcript or prescribe non-consequential investigative mechanics.

## Compact return

Given a source-gathering child with extensive raw evidence, the brief requests a compact decision packet containing the direct answer, material findings, evidence locators, coverage, conflicts, uncertainty, and decision implications. A separate reusable-memory section names the source session ID and contains exactly the bounded categories needed for successor routing: decision context, verified evidence with precise locators and freshness date or limit, open work, warnings, and routing guidance. It does not duplicate the whole packet, replay traces, or include raw logs, long excerpts, generic background, and unsolicited implementation plans.

## Fresh source-gatherer continuity

After several child dispatches, the coordinator can identify each relevant session by ID, role, prior objective, covered sources or areas, latest reusable memory, and material limitations without loading the child transcript.

Given a new bounded `explore`, `research`, or `inspect` unit, the coordinator starts a fresh session by default. This includes independent `inspect` evidence even when a retained inspector exists. A shared topic, repository, role, or terminology does not change that default.

Given the same broad topic but a different downstream decision or materially different evidence family, the coordinator starts fresh. Given a related cross-role successor, such as `inspect` following `research`, it supplies only the latest relevant reusable memory in the prompt; the successor materially uses it without replaying the earlier trace and returns a compact replacement rather than appending a memory chain.

Given one missing locator set in the same unresolved investigation, for the same downstream decision and role, with materially overlapping evidence and retained execution state that a prompt cannot preserve, the coordinator may resume the source session with only the bounded objective and material delta. Resume remains unjustified when independent evidence is needed.

Given a noisy, stale, failed, retried, compacted, unrelated, or visibly high-context source session, the coordinator treats those signals as advisory evidence favoring freshness and applies no numeric cutoff. When utilization or trace telemetry is absent, it does not infer low context, estimate cache economics, inspect session history, or dispatch `session-analyst` solely to decide routing. Prompt-cache savings alone never justify resume.

Given reusable memory missing one field, the coordinator requests a bounded repair only when that omission materially affects the downstream decision; otherwise it proceeds from available evidence. The missing field does not itself favor resuming the source session.

Given exact conversational, provider, execution, or session state that materially matters, the coordinator recognizes that fresh memory transfer is only semantic continuity and may resume when all source-gatherer resume criteria otherwise pass.

The source-gatherer default does not alter continuity for `triage`, `architect`, `agent-author`, `prototype`, `operator`, `worker`, `reviewer`, or `pr-reviewer`; their existing routing and authority policies remain observable.

## Non-source role continuity

Given a human correction, rejected assumption, reframing, option refinement, new checked evidence, explanation request, or bounded extension within the same downstream design engagement and system boundary, the coordinator proposes resuming the same `architect`. Disagreement with the architect's framing does not by itself cause a fresh dispatch. The resume receives the correction and asks the architect to reconsider rather than defend.

Given suspected anchoring that persists after an approved correction-and-reconsider resume, the coordinator surfaces the conflict and proposes a fresh independent `architect`. It starts that session only after separate explicit approval, gives it verified constraints and evidence without presenting disputed conclusions as accepted, and treats its result as a supplement rather than silently replacing the first engagement.

Given any architect follow-up, including return of architect-requested evidence, the coordinator asks for explicit approval before dispatch or resume. Initial consultation approval does not authorize a later turn. Given a materially new downstream decision, different system boundary, approved independent second opinion, unavailable or unusable prior session, or context that remains misleading after correction, an approved consultation starts fresh.

Given a looping worker blocker with an observed symptom whose cause remains unknown, the coordinator starts fresh `triage` even though the symptom arose in the worker's incident. Given continued reproduction, eliminated hypotheses, a corrected hypothesis, or new evidence after that initial diagnosis, the coordinator may resume the same `triage` session. Given a materially different symptom, incident, environment, or request for independent diagnosis, it starts a fresh `triage` session. Neither path gives triage remediation authority.

Given a genuinely distinct accepted authoring revision batch, prototype question or artifact, operational unit, or implementation unit, the coordinator starts a fresh authorized `agent-author`, `prototype`, `operator`, or `worker`. A changed accepted outcome, primary ownership boundary, artifact set, authority, system boundary, or validation contract creates a fresh unit when the difference is material. Stale, overloaded, looping, or assumption-contaminated context; substantial preparation whose history has no build value; and an independence objective also favor freshness. A remediation worker receives the relevant finding or checked diagnosis, accepted brief, exact repository state, approaches not to repeat, and verification history; neither triage nor a reviewer performs the repair.

Given a child that stops cleanly on one bounded decision or incompatibility without unsafe partial mutation, the coordinator resumes it when the user's answer continues the same underlying objective and artifact or work unit, its checkout and artifact context remain relevant, authority is sufficient, prior mutations are absent or safely preserved, and retained generated evidence, setup, or working context has material value. A corrected mechanism, provenance model, implementation route, placement choice, or blocker does not alone force freshness; the resume explicitly corrects the prior assumption.

Given an `agent-author` asked to formally vendor seven generated skills that discovers the vendor schema cannot represent generated artifacts and stops without repository mutations, followed by the user's decision to refresh those same seven skills in their existing local location, the coordinator resumes that author. The objective, seven-skill artifact set, checkout, authority, generated evidence, and validation context remain useful even though placement and provenance changed.

Given triage after a looping implementation, review findings that define a separate repair, or a request for independent judgment, the coordinator starts the appropriate fresh authorized child rather than using continuity to preserve a biased or exhausted trace.

Given initial focused review or pull-request due diligence, the coordinator starts a fresh `reviewer` or `pr-reviewer`. It may resume that reviewer only to complete bounded missing-evidence or conflict adjudication within the same unconcluded review engagement. It does not resume the reviewer to implement findings, approve its own repair, conduct a different review, or absorb a materially changed diff into the original scope.

After remediation, coordinator verification remains sufficient by default. If the human separately approves another independent review, the coordinator starts a fresh reviewer with the remediated state and verification evidence; it does not resume the original reviewer as a mandatory approval loop.

Given a human request to assess or refine continuity defaults after orchestration, maintainers inspect relevant session traces and record observed benefits, failures, and limitations before revising policy. Routine dispatch uses no `session-analyst` archaeology, usage estimator, numeric threshold, or generic cheap-versus-expensive role label. Without trace evidence and an explicit post-hoc assessment request, the provisional defaults remain unchanged.

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

Given one complete missing-evidence request, the coordinator checks materiality, duplication, scope, read authority, overlap, and existing answers before reusing relevant evidence, applying source-gatherer continuity rules, or dispatching the smallest relevant gatherer.

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

Given an operator or worker failure, the coordinator classifies the evidence need and remains non-mutating. Existing mutation authority continues only for the exact accepted outcome, scope, and authority; changed design, requirements, scope, access, or authority returns to the human. Bounded procedural continuation returns to operator, while novel troubleshooting or difficult remediation routes to worker. Review and architect gates remain explicit.
