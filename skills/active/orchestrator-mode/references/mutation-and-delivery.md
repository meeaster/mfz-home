# Mutation and delivery

Read this reference before preparation, implementation, operational mutation, remediation, integration, Git publication, or another external-state change.

### Explicit Authority and Outcome Boundaries

- Treat `architect`, `ui-ux-designer`, `agent-author`, `artifact-author`, `prototype`, `operator`, `worker`, `reviewer`, and `pr-reviewer` as authority gates.
- Bounded consultation authority governs the two consultants.
- A concrete explicit request may prospectively authorize multiple named gated steps and their necessary inherent operations when the steps, target, outcome, and relevant system boundary are sufficiently clear.
- Continue through that sequence without redundant just-in-time approval while its accepted outcome, target, scope, repository, environment and system boundary, access level, consequential cost or resource commitment, risk and blast radius, reversibility, design assumptions, acceptance and validation contract, and required authority remain materially consistent.
- Normal outputs and implementation details from an authorized prior step do not invalidate downstream authority merely because they were unknown in advance.

- Pause when an earlier result changes or undermines that basis; exposes an unresolved product, requirement, architecture, access, authority, or safety decision; fails a required gate or acceptance criterion; requires a different procedure, additional independent outcome, materially broader work, or unsupplied authority; or creates a blocker the user should see before later steps.
- Surface the result, changed assumption or boundary, affected downstream steps, and smallest decision or authority needed.
- Do not reinterpret vague, incomplete, or materially changed future steps as authority.

- Dispatch or resume `architect` or `ui-ux-designer` only within an explicitly authorized bounded engagement.
- Fresh approval remains required for a materially new or invalidated decision, a new system boundary, expanded scope or access, an independent second opinion not included in the request, or consultation beyond the authorized sequence.
- A consultant's output is evidence: it cannot authorize itself, accept its own design, broaden user authority, or silently select among consequential unresolved choices.
- Dispatch `agent-author` for a substantial, settled, authorized AI-instruction implementation under [Routing and roles](routing-and-roles.md).
- Dispatch it for consultation, brainstorming, evaluation, or design only when the human explicitly selects or requests that agent; otherwise keep that interactive work here.
- Read-only instruction work returns findings or proposals and does not authorize edits; adaptation requires editing authority.
- Dispatch `artifact-author` only when the human explicitly selects or requests that named agent.
- In parent-facing context, the brief must convey the human's explicit selection.
- A request to create or revise an artifact, Jira issue, Confluence page, Markdown document, or HTML file does not itself select the agent.
- Drafting or updating does not authorize publication; an explicitly authorized publication step may remain with `artifact-author` only when it is inherent to the owning editorial lifecycle.
- Mechanical Git operations, deployment, and publication outside that lifecycle remain `operator` work.
- Dispatch `operator` only when the user explicitly asks for the settled procedural or operational change.
- Coordinator writes remain limited by the boundary in the root `SKILL.md`.
- Dispatch `worker` only when the user explicitly asks to implement, fix, remediate, or perform difficult implementation investigation or novel troubleshooting.
- When one request combines substantial application mechanics with AI-facing behavioral instructions or communication authoring, split the responsibilities when practical and keep their accepted interface explicit.

- Scope authority to the requested outcome and its necessary inherent operations: prototype creation does not authorize commit, push, pull request, publication, Jira updates, deployment, or productionization; committing does not authorize pushing; pushing does not authorize opening or merging a pull request; drafting does not authorize publishing; and changing one external system does not authorize updating another.
- A request to open a pull request includes the necessary in-scope commit and branch push, but not merge, Jira updates, or deployment unless requested.

- Both invocation contexts may execute a full explicitly authorized sequence of evidence gathering, bounded architect consultation, selection of a recommendation under delegated criteria, worker implementation or artifact authoring as applicable, independent review, in-scope remediation and verification, and pull request creation.
- Use `super-worker` only when separately selected explicitly by the human for that task or batch.
- Carry the sequence and the basis for delegated design selection into the brief, check each result, and proceed without redundant approvals while that basis remains valid.
- An investigate-only assignment stops at evidence and recommendations.
- Review plus remediation authorizes the requested review and in-scope corrections with verification, not an endless cycle of independent rereviews.
- Architecture and review are never default steps.

- An explicit request to record an accepted design in OpenSpec or another planning artifact authorizes the coordinator to use that artifact's owning workflow; it does not authorize implementation or publication to an external system.
- For an explicitly requested proposal-then-Apply or proposal-then-implementation sequence, apply this reference's planning/implementation split and material-change gate.
- A proposal-only request stops for a later user request.
- Direct `openspec-propose` invocation outside this orchestration workflow retains its own new-request requirement.

- When the user accepts a design developed in this orchestration but declines OpenSpec, an explicitly requested task-local `design.md` may preserve the technical background under [Workspace and coordination](workspace-and-coordination.md).
- It remains background rather than implementation authority.
- Mutation still requires an authorized prompt selecting a bounded unit.

- Dispatch `reviewer` or `pr-reviewer` only when the user explicitly asks for independent completed-work review, including as a named downstream step in a concrete sequence.
- When the next useful step requires a gated role but the current request does not authorize it, explain the proposed dispatch and ask first.
- Do not infer broader mutation authority from a diagnosis, design result, or disposable evidence setup, and do not automatically review mutation output.

### Preparation Classification and Authority

- Use separate `inspect` when read-only evidence is itself the requested outcome, mutation is not authorized, readiness depends on a distinct current or live system, access boundary, or pending human decision, or material uncertainty about an external operation cannot be resolved through ordinary operator preflight.
- Dirty state may expose a real handling decision for the human; observing it alone does not justify another child.

- Keep trivial setup with the authorized mutation agent.
- Use a separate authorized preparation `operator` only when setup is substantial and mechanically separable, materially changes the implementation brief or state, or its trace would crowd useful build context.

- Avoid duplicate source reading, validation planning, and state checks across preparation and mutation children.
- For substantial setup such as preparing an isolated worktree, synchronizing repositories, creating a work item required for branch naming, provisioning a disposable test environment, or producing a baseline artifact, verify the returned state and prefer a fresh build agent.
- Serialize preparation and the artifact build when they share a checkout or external state.

- Keep preparation authority exact.
- Inspect dirty state before branch changes, pull or rebase, or worktree creation, and preserve unrecognized changes until the user directs their handling.
- Treat "get latest" as unresolved until fetch, pull, merge, or rebase intent is clear.
- Jira creation or update and Git mutations each require explicit authority; branch creation does not authorize commit, push, pull request, merge, Jira updates, publication, or deployment.
- Keep Jira, Git, and environment mutations in separate operator units unless the user explicitly requested one transaction that inherently combines them.

### Decomposition Before Scheduling

- Before mutation or prototype creation, classify preparation as a separately useful read-only outcome, inherent mutation preflight, or substantial mechanically separable setup.
- Once mutation is explicitly authorized and its outcome and scope are settled, decompose the accepted work before scheduling it.
- For each candidate unit, identify its primary accepted outcome, coherent ownership boundary, owned files and mutable state, domain, acceptance criteria, validation lanes, external or runtime state, dependencies, and integration requirements, then assign `operator` or `worker` under [Routing and roles](routing-and-roles.md), or `artifact-author` when the human explicitly selected it.
- Give each unit one primary accepted outcome, one coherent ownership boundary, and a compatible validation story.
- When a multi-unit, cross-repository, or cross-system outcome warrants cross-dispatch tracking, keep one compact acceptance matrix in optional `coordination.md`: criterion or must-preserve invariant, owner, status, and evidence locator.
- Send each child only its applicable rows.
- One coherent worker carries its acceptance directly in the prompt.
- Several files or tightly coupled small changes may remain one unit when they share state, reasoning, and acceptance; do not split mechanically by file, directory, repository, or count.
- Split materially independent plugin or subsystem domains, acceptance criteria, lifecycle concerns, authority boundaries, validation environments, or external systems.

- When implementation proceeds without OpenSpec, preserve its useful execution discipline without reproducing its artifact workflow.
- Order units by actual dependencies, select one coherent unit per worker by default, and make each unit independently verifiable within that worker session.
- Before scheduling a worker, complete this reference's **Worker Ready Gate**.
- The worker prompt is the sole complete assignment: state the unit's objective and why it matters, satisfied dependencies and current state, exact scope and authority, must-preserve behavior, acceptance criteria, focused validation, and stop conditions.
- Do not create a parallel worker-brief file.
- Supply relevant workspace context under the shared transfer contract when it helps; those files do not expand the assigned unit.
- After the worker returns, obtain fresh `inspect` acceptance evidence under the root skill's acceptance contract before releasing dependent work.
- Return a material mismatch between implementation, accepted behavior, or design to the decision recipient rather than silently reconciling it.

### Worker Ready Gate

Do not dispatch a worker until the coordinator records one explicit readiness decision in the live session or working model. This does not require a file:

- **`ready: direct`** — the unit is small and self-contained, its local pattern is apparent, and it has no material external, unfamiliar, version-sensitive, or non-obvious dependency. Record the concrete reason; no readiness file or source-gatherer dispatch is required.
- **`ready: prepared`** — applicable current evidence resolves the material implementation ambiguity, or the smallest missing, stale, or conflicting readiness evidence has been gathered and checked. Record the selected evidence or synthesis paths and their applicable version, ref, observation time, or invalidation condition.

- An external API, existing library or SDK integration, version-sensitive contract, unfamiliar CLI, or non-obvious integration is a positive trigger for `ready: prepared` unless applicable current evidence already resolves its contract.
- Reuse current evidence and synthesis first; the worker's ability to look up the contract after dispatch does not complete this gate.
- Gather only facts likely to change implementation: use `explore` for local integration points, patterns, call sites, configuration, tests, commands, conventions, and constraints; `research` for authoritative library, API, and CLI documentation, exact installed or targeted version semantics, upstream examples or source, deprecations, and integration requirements; and `inspect` for current installed, runtime, CLI, or environment facts that static source and external documentation cannot establish.
- Split or parallelize roles only when their evidence targets materially differ.

- When evidence-informed reasoning would help later implementation, use an authorized synthesis file if one exists; otherwise carry the necessary reasoning in the worker prompt with relevant producer notes.
- Expose the readiness decision proportionally in the worker prompt: give the concrete `ready: direct` reason, or the selected `ready: prepared` evidence or synthesis paths, status, applicability, and material freshness limits.
- These materials remain background under the prompt-authority contract and cannot add scope, mutation, or publication authority.
- Synthesis recommendation or creation is not a readiness gate and must not block otherwise authorized work.
- Do not create synthesis from completed evidence or AI interpretation alone, merely to record readiness, or as a substitute for the prompt; do not turn readiness into a separate mandatory phase, research every dependency, collect speculative edge cases, dump generic documentation, or duplicate source reading, command discovery, status checks, validation selection, and other immediate preflight the worker can perform cheaply inside the unit.
- Documentation volume is not readiness.

- The worker retains authority to inspect focused in-unit gaps with its available tools while implementing.
- It does not stop merely because a bounded lookup, call-site check, or exact local command is needed.
- If a material gap instead requires broad gathering, inaccessible evidence, or delegation blocked by the depth limit, require a bounded missing-evidence request naming the question, why it blocks the unit, the preferred evidence family and known locators, required version or freshness, and the smallest sufficient result.
- The coordinator checks existing evidence, gathers only what remains through the correct role, checks the result, and resumes the same worker when the continuity rules support it.
- This evidence cycle preserves the accepted unit, authority, acceptance criteria, validation, ordinary worker preflight, and existing stop contract.

### Scheduling, Isolation, and Integration

- Schedule only after the units are coherent.
- Serialize mutation agents by default, including small units, and serialize whenever overlap or parallel safety is unknown.
- A sequential fresh mutation agent starts from the checked state left by its predecessor and receives a compact relevant handoff; check each result before releasing dependent work.
- Different directories do not establish independence.
- Treat the checkout and Git index, lockfiles, package installation and dependency state, generated or rendered output, test caches, active service or runtime state, schemas, and external systems as shared unless explicitly isolated.

- Use parallel mutation only when responsibilities and mutable state are demonstrably independent and concurrency has material value.
- If parallel mutation requires filesystem isolation, use only separately authorized isolated worktrees or environments, and defer shared-state integration such as lockfile resolution, generated output, `mfz apply`, runtime probes, and repository-wide validation.
- Do not create a worktree merely because work can be split; follow the existing dirty-state and preparation authority rules.

- Treat isolated results as evidence.
- When combining them requires mutation or a distinct shared validation outcome, dispatch a separately authorized `operator` for procedural integration or `worker` for substantive software integration, with the accepted inputs, exact state, conflict boundaries, focused acceptance criteria, and ownership of final shared-state validation.
- The coordinator never performs integration mutation.
- Leave final shared validation with the last mutation agent only when it is coherent with that unit, and omit an integration agent when no integration mutation or distinct shared validation outcome exists.

### Coordinated Repository Semantics

- When the user explicitly authorizes one coordinated operation across known repositories, one operator may process them sequentially.
- Treat that operational publication outcome as one unit rather than splitting it mechanically by repository count.
- The operator must follow each repository's instructions and preserve its separate Git history, validation, commit boundary, remote, and authority.

- For coordinated Git publication, prefer completing inherent preflight and required validation for every repository before publishing any repository when practical.
- When commits are authorized, create an appropriate separate Conventional Commit in each repository.
- Treat commit and push results as independent per repository, never as an atomic cross-repository transaction.
- If one repository is published and a later repository fails, preserve the resulting state, perform no destructive rollback, and report the exact partial success and failure with the smallest recovery action.
- Split operators only when the repositories are genuinely independent, parallel execution has material value, and shared coordination, state, or sequential safety does not outweigh it.

### Preparation Handoff and Owning-Role Dispatch

- Require a preparation operator to return a compact handoff containing the repository or workspace path, branch and base commit, worktree status, external item IDs or links, prepared tools or dependencies, mutations performed, baseline verification, blockers or decisions, and the exact state the authorized build agent may assume.
- After parent verification, brief the `prototype`, explicitly selected `artifact-author`, or implementation `worker` under the shared transfer contract with the accepted design, prototype question, or communication-artifact contract as applicable; artifact scope; verified preflight assumptions; user priorities and tradeoffs; material uncertainty; critical evidence; acceptance criteria; focused verification; authority; and stop conditions while omitting mechanical setup history.
- For `artifact-author`, include the audience, destination, owning workflow, source-fidelity requirements, publication state or authority, and applicable accepted or supplied coordinator synthesis; do not assign raw-evidence rediscovery as a substitute.
- When preparation and build were both named in an authorized sequence, proceed only if the handoff preserves its material assumptions; otherwise pause under the material-change rule.
- Start the build agent fresh after substantial preparation because setup history is not useful build continuity; cache reuse alone does not justify resuming the preparation operator.

- Dispatch each owning mutation role directly when its unit is ready.
- A worker is ready only after the Ready Gate records `ready: direct` or `ready: prepared`; implementation authority alone does not satisfy it.
- That agent owns the ordinary checks it must use immediately before acting, even when they are read-only: applicable instruction discovery; current status and diff; dirty-state preservation; relevant branch, upstream, and remote state; validation selection and execution; secret and generated-artifact safety; and final-state verification.
- Its report is evidence for focused coordinator acceptance.
- Do not dispatch `inspect` or a preparation operator merely to perform checks the mutation agent would repeat.

### External-Operation Preflight and Recovery

- Use proportional care for external-system mutations.
- Send a small, narrow, understood, readily reversible operation directly to its authorized `operator` with ordinary preflight.
- Gather additional evidence only when material uncertainty, impact, live-system dependencies, selectors, access, blast radius, or recoverability warrants it.
- Use the smallest relevant `inspect` units and credible impact paths; do not turn production scope alone into a fixed investigation or approval cycle.

- Before dispatch, give the operator the available decision-relevant evidence, risks, assumptions, authority, verification, and stop conditions at detail proportional to the operation.
- Do not make it repeat broad evidence gathering already completed.
- Preflight is complete only when the exact target and intended effect, relevant operation semantics, credible affected resources and dependencies, realistic impact, practical recovery, material must-preserve invariants, and their acceptance probes are grounded in observed current contracts or explicitly marked uncertain.
- Separate must-pass outcome and safety invariants from informational diagnostics; an invented or nonessential assertion cannot trigger rollback.
- Resolve material uncertainty with the smallest evidence unit or stop for the smallest needed decision.

- Require the operator to capture relevant pre-change state whenever the system exposes it safely and meaningfully.
- This is inherent read-only preflight and needs no separate user approval.
- Capture the minimum state needed to identify the target, understand and verify the change, and restore mutable configuration.
- Keep it in tool or session evidence, or use a narrowly scoped restoration file when needed.
- Exclude secrets, unrelated sensitive content, volatile fields, and read-only fields that cannot be reapplied.
- If meaningful state cannot be captured, surface the limitation and its recovery consequence before mutation.

- State capture is not a backup.
- If an existing on-demand backup, snapshot, or export could materially improve recovery, ask whether to invoke it unless the accepted sequence already authorizes it.
- Include known material cost, duration, retention, and system effects.
- Do not build backup infrastructure for workflow compliance or alter or invoke independently managed automated backups without authority.
- Their existence does not prove current restorability, and the absence of a backup mechanism alone does not block an otherwise responsible operation.

- Immediately before mutation, revalidate consequential assumptions and use the narrowest correct action.
- Stop with preserved state when the actual target or state, impact, recovery path, procedure, or authority materially differs.
- After mutation, read the resulting state and verify the intended outcome and important invariants.
- Report residual effects that state restoration cannot reverse, including notifications, deletions, historical events, and downstream side effects.

- For a detached, asynchronous, or coordinator-disrupting operation, record its current state and durable terminal or readiness signal.
- Start dependent acceptance work only after that signal is readable and establishes readiness or a terminal result.
- While the operation is pending, use only a narrow state probe; launch or a pending probe is not completion and does not consume the full acceptance lane.
