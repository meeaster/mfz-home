---
name: openspec-orchestrate
description: Plan and coordinate an OpenSpec implementation as a standalone, plan-first workflow.
disable-model-invocation: true
argument-hint: "<change>"
license: MIT
compatibility: Requires OpenSpec CLI and OpenCode delegate_general.
metadata:
  author: mindframe-z
  version: "3.1"
---

OpenSpec orchestration is a **standalone, plan-first execution workflow**. It turns OpenSpec's flat
task checklist into cohesive work packages, packs those packages into the smallest practical list
of bounded worker sessions, then executes that list sequentially. The worker list is the primary
planning result: each listed implementation worker corresponds to one future `delegate_general`
call. Coordinator and operator checkpoints remain separate and never inflate the worker count.

This is an alternative to `openspec-apply-change`, not an overlay on it. Do not assume that Apply is
loaded, and do not depend on a skill call stack.

Keep three locations distinct throughout the run:

- **Implementation workspace:** the current or explicitly selected code repository where source
  changes are made.
- **OpenSpec planning root:** the repository or standalone store selected by OpenSpec for specs,
  changes, and task state.
- **Change root:** the selected change directory under the planning root.

A standalone store is a planning repository, not the implementation workspace. `--store` changes
where OpenSpec commands read and write planning artifacts; it does not change the coordinator's
working directory. A workset can identify candidate repositories but does not authorize edits.

This is a structured process. Skip a phase only when its completion criterion is already true and
you can show why. `tasks.md` (or the schema's task artifact) is the only durable completion ledger;
the coordinator owns its checkboxes. Workers report completion; the coordinator accepts it only
after reviewing the diff and running the gate, then updates only task checkboxes accepted under the
selected review route.
The work packages, worker list, ownership, order, and estimates are temporary coordination state
unless the user explicitly asks to persist them elsewhere.

A review is a bounded acceptance checkpoint, not another planning authority. Coordinator diff and
gate review is the default. Use an independent review only when the user asks or the accepted
contract puts authority, security, irreversible state, concurrency, or immutable evidence at material
risk. Its charter is limited to owned task IDs, artifact anchors, observable criteria, and directly
affected lines. Generic quality, hypothetical hardening, and a later task do not become current scope.

## 1. Prepare The Change

Perform the stable Apply preparation contract yourself. Do not edit implementation files during
this phase.

### Select the change

- If the user supplied a change name, use it.
- Otherwise infer it only when conversation context names one unambiguously.
- If more than one active change is possible, run `openspec list --json` and use
  `AskUserQuestion` to let the user choose. Do not guess.
- Announce `Using change: <name>` and explain how to override it.

Resolve the implementation workspace separately from the OpenSpec planning root. Use the current
code repository when the invocation is clearly inside one. If the current directory is the store
itself, or more than one code repository is a plausible target, ask the user to select the affected
repository before any implementation phase. Planning may inspect a selected read-only repository,
but execution cannot begin without an implementation workspace.

### Resolve the store

If the user names a store or the work lives in a registered standalone OpenSpec store, run
`openspec store list --json`, identify the store id, and pass `--store <id>` on every command that
reads or writes specs and changes: `status`, `instructions`, `list`, `show`, `validate`, `archive`,
`doctor`, and `context`. Keep the flag on follow-up commands when the CLI prints it in a hint.
Commands that do not read or write specs or changes do not take this flag. Without a store, use the
nearest local `openspec/` root.

### Read status and instructions

Run:

```bash
openspec status --change "<name>" --json
openspec instructions apply --change "<name>" --json
```

Include the store flag when required. Parse the JSON rather than assuming a spec-driven layout.
From `status`, retain:

- `schemaName` and the artifact that owns the task list;
- `planningHome`, `changeRoot`, and `actionContext`;
- `actionContext.mode` and `allowedEditRoots`.

Treat `planningHome`, `changeRoot`, and the selected store as OpenSpec planning locations. Do not
infer the implementation workspace from a store's `allowedEditRoots`; the store model intentionally
separates planning from code.

From `instructions apply`, retain:

- every concrete path in `contextFiles`;
- total and complete progress, plus the pending-task count;
- the dynamic instruction for the current state.

Handle terminal states before planning:

- For `state: "blocked"`, show the missing-artifact message, suggest the appropriate change-
  continuation workflow, and stop.
- For `state: "all_done"`, show the completed progress, suggest archiving, and stop.
- For any other state, continue only when pending tasks exist.

Workspace guard: when `actionContext.mode` is `workspace-planning` and `allowedEditRoots` is empty,
explain that full workspace apply is not supported in this workflow. Treat linked repositories and
folders as read-only context, ask the user to select an affected area through an explicit
implementation workflow, and stop before editing.

### Load context and show progress

Read every path returned under `contextFiles` in the coordinator. Follow the returned paths for
every schema; do not assume that the files are named `proposal.md`, `design.md`, `tasks.md`, or
`specs/`. The Sol planner reads the same complete path set independently; the coordinator's
understanding is not replaced by the planner's.

Then show:

- schema name;
- progress as `N/M tasks complete`;
- every remaining task id and description;
- the dynamic instruction from the CLI;
- the planning repository, change root, and any read-only or operator-gated boundary.
- the implementation workspace, separately from the planning root.

**Completion criterion:** all returned context files have been read, pending task ids are enumerated
exactly, status and workspace constraints are understood, and no implementation edit has occurred.
The planner independently rereads the same files; Phase 3 validates the returned ledger against the
coordinator's loaded context and the mutable task artifact.

## 2. Delegate The Execution Plan

Do a bounded local static preflight from the loaded artifacts and repository state: record pending
task ids, roots, the dirty baseline, artifact-explicit seams, obvious shared files, generated outputs,
cross-repository edges, migration boundaries, and likely verification commands. Record these facts
locally for coordinator validation, but do not perform open-ended repository discovery, duplicate
their contents in the delegate prompt, or invent work packages or workers. The planner owns broad
read-only repository exploration needed to resolve candidate reads, exact writes, dependencies,
gates, work packages, and the final worker list.

During Phases 1 through 3, the coordinator performs preparation, preflight, and validation directly.
The required Sol/high `delegate_general` planner is the only workflow planning child-model call.
Advisor checkpoints are allowed, but they cannot supply, revise, or replace the planning result.
Do not use a second planner or unplanned discovery model. A chartered independent review may occur
after implementation under Phase 5, but it is a read-only checkpoint, not a worker or a second plan.

Make exactly one initial read-only planning call with `delegate_general`:

```text
Model: openai/gpt-5.6-sol
Variant: high
Agent: general
```

If that model or variant is not allowlisted by `delegate_general`, report the configuration problem
and stop. Do not silently substitute a cheaper model. The planning child may read the supplied
OpenSpec context and the current implementation repository, but it must not edit, commit, test,
delegate, or inspect unrelated session history.

The planning call uses `openai/gpt-5.6-sol` at `high`. Every implementation worker uses
`openai/gpt-5.6-luna` at `xhigh`; Sol is not an implementation route. Reject any other model or
variant in the planning result.

Copy each `contextFiles` path verbatim into the delegate prompt. Before calling `delegate_general`,
compare the complete delegated path list with the Apply output and confirm that no path is missing,
added, or changed. Stop with an incomplete preparation report if the lists differ.

### Define The Review Route

Set the review route before implementation. `coordinator-only` is the default: the coordinator's
diff review, write-scope check, and focused gate are the acceptance review. Plan one independent,
fresh, read-only `openai/gpt-5.6-sol` at `high` checkpoint only for a user request or an explicit
material-risk trigger in the accepted contract. Size, novelty, or a desire for more ideas is not a
trigger. An independent review is never an implementation worker and may not edit or delegate.

For each planned review scope, define a charter with:

- exact owned task IDs and OpenSpec artifact anchors;
- observable acceptance criteria and focused gates;
- affected safety, authority, or immutable-data invariants, or `not implicated`;
- planned write paths and review exclusions; and
- adjacent future tasks or follow-up concerns that share a seam without expanding current scope.

The default remediation budget permits one consolidated batch for failed task IDs followed by one
scope-locked closure verification. A second remediation, additional task reopening, or broader review
requires an explicit user decision unless an authority, security, or likely immutable-data-loss issue
is evidenced.

Use this prompt verbatim except for replacing its angle-bracket placeholders with concrete values
from the Apply preparation output. Do not compress, summarize, rename, reorder, or omit its fields.

```text
Perform a READ-ONLY OpenSpec orchestration-planning pass.

Change:
- Change identifier: <change>
- Schema: <schema-name>
- OpenSpec change root: <change-root>
- Planning home: <planning-home>
- Implementation workspace: <implementation-workspace>

Static preflight facts:
- Context read set: <every exact contextFiles path, one per line>
- Planner instruction: read and interpret the complete context read set independently; no task or
  spec summary is supplied here
- Coordinator route: <model>@<variant or unknown>
- Coordinator-known boundaries: <planning root, change root, implementation workspace, dirty
  baseline, and operator-gated actions>

Worker routing:
- Planning call: `openai/gpt-5.6-sol` at `high`.
- Every implementation worker: `openai/gpt-5.6-luna` at `xhigh`.
- Do not assign Sol to implementation or use any other model/variant.
- An independent review, only when its charter justifies one, is a fresh read-only
  `openai/gpt-5.6-sol` at `high` checkpoint. It is not an implementation worker.

Allowed planning inputs:
- Every concrete path returned under contextFiles:
  <one path per line>
- Current repository source, tests, configuration, architecture, and package metadata as needed
- Broad read-only repository exploration needed to resolve semantic seams, candidate reads, exact
  writes, dependencies, and verification gates

Read every listed context path before planning. Treat the listed paths as exact. Derive task ids,
task descriptions, shared files, generated outputs, migration boundaries, and verification gates
from those files. Use the task artifact's exact hierarchical task-id strings, such as `1.1`, `1.2`,
or `2.3`; never use ordinal ids from the CLI summary. If one path is unreadable, return an incomplete
planning report rather than substituting or reconstructing it. The coordinator has also read these
files, but the prompt intentionally carries paths and boundaries rather than a duplicated summary.

Use the standard OpenSpec artifacts as the change contract. Do not depend on external planning
artifacts, prior session history, or any other planning format. Do not edit, create, format,
commit, or modify files. Do not edit the tasks artifact. Do not run tests or migrations. Do not
delegate another agent. Do not load or execute the orchestration skill, assess the availability of
`delegate_general`; this is already the required planning child. Do not infer or expose secrets.

Planning objective:
Choose `current-session` or `delegated` execution. First derive cohesive work packages from the
OpenSpec tasks and repository seams. Then pack those packages into the smallest practical list of
implementation workers. A worker is a delegation unit, not a task heading, verification phase, or
operator checkpoint. One worker may own several adjacent work packages when their read/write sets
overlap or later work builds directly on earlier context.

Derive acceptance criteria from exact task and OpenSpec artifact anchors. Keep downstream consumers,
generic quality work, and speculative hardening visible as exclusions or follow-ups rather than
inventing current task scope.

Delegated workers run sequentially in the coordinator workspace because delegate_general has no
directory/worktree argument. Every delegated worker, including a retry, will be a fresh
delegate_general session with an explicitly selected model and variant; never plan to resume a
planner or another worker. Account for every pending OpenSpec task found in the task artifact exactly
once, including tasks assigned to coordinator or operator checkpoints rather than implementation
workers.

Choose `current-session` only when the coordinator is explicitly running
`openai/gpt-5.6-luna` at `xhigh`. If the coordinator route cannot be confirmed, choose `delegated`;
every delegated implementation worker must use `openai/gpt-5.6-luna` at `xhigh`.

Worker-packing rules:
- Optimize total execution cost, not each worker in isolation. A fresh worker duplicates OpenSpec
  context, repository policy, shared source reads, and handoff review.
- Prefer one worker when all pending implementation fits safely. For larger changes, normally aim
  for roughly two to five implementation workers. More than six requires a concrete repository,
  ownership, or context-budget reason for every additional boundary.
- Start a fresh worker when the next package moves to a substantially disjoint semantic and file
  area, crosses an independently governed repository, or would push the combined working set into
  the mandatory-split band.
- Keep packages in the same worker when they repeatedly read or write the same core files, share
  fixtures or generated outputs, or form one implementation-and-test loop. Sequential dependencies
  alone do not require separate workers.
- Do not create implementation workers for coordinator validation, operator approval, remote PR
  actions, merge waiting, final status reporting, or a no-write verification step that the
  coordinator can perform.
- For each proposed split, compare it with assigning the package to an adjacent worker. Keep the
  split only when the saved working-set pressure or authority isolation exceeds the duplicated-read
  and handoff cost.

Required output:

0. Context-read attestation
   - State `Read all <N> context paths` with the exact count supplied in this prompt.
   - List any unreadable path instead and return an incomplete planning report.

1. Contract summary
   - Restate requested behavior and boundaries from the OpenSpec artifacts.
   - State explicit non-goals and operator-gated actions.
   - Treat task headings as hints for packages, not worker boundaries.

2. Complete task ledger mapping
   - Assign every pending task id exactly once.
   - Copy each task id verbatim from the task artifact. Never convert hierarchical ids such as
     `1.1` into ordinal ids such as `1`, or infer ids from section counts.
   - Do not omit, duplicate, merge away, or invent task ids.
   - Map each task id to one work package and then to one implementation worker,
     `current-session`, `coordinator`, or `operator-gate`.

3. Work packages
   For every cohesive package provide:
   - package id and goal;
   - exact task ids;
   - why these tasks form one semantic and file-area unit;
   - likely files to read, with a candidate read set and estimated payload;
   - likely files to create or modify, with exact proposed write paths;
   - explicit write ownership, including generated outputs written by any proposed gate, or an
     explicit coordinator-owned designation for those outputs;
    - explicit out-of-scope files; include this field even for a no-write verification package;
    - relevant repository patterns and semantic seams;
    - dependencies and blocked-by relationships;
    - focused verification commands and pass gates;
    - observable acceptance criteria with exact task and artifact anchors;
    - affected safety, authority, or immutable-data invariants, or `not implicated`;
    - adjacent future tasks or follow-up concerns that share a seam but remain out of scope; and
    - confidence and uncertainty.

4. Implementation workers
   Pack the work packages into the actual fresh sessions the coordinator will delegate. For every
   worker provide:
   - worker id, goal, and exact package and task ids;
   - why these packages belong in one session;
   - candidate reads and exact proposed writes, consolidated across its packages;
   - explicit out-of-scope files;
   - dependencies and sequential position;
   - focused verification commands and pass gates;
   - estimated unique files, read payload, patch payload, command output, architectural seams, test
     breadth, and iteration buffer;
   - expected repeated reads from earlier fresh sessions and duplicated payload;
   - the concrete comparison with one fewer or one more worker that justifies this boundary;
   - `openai/gpt-5.6-luna` at `xhigh`;
   - confidence and uncertainty.

   List coordinator and operator checkpoints separately. They may own OpenSpec tasks but are not
   implementation workers and must not be counted as delegated sessions.

5. Dependency and conflict model
   - Build the dependency DAG.
   - Identify shared writable files and generated-file overlap.
   - Identify semantic API, fixture, and integration conflicts.
   - Identify migration, external-store, cross-repository, and operational sequencing constraints.

6. Context-budget assessment
   - Estimate candidate read/search payload, expected patch payload, command/test output, and an
     iteration buffer.
   - Use working-set payload, unique files, architectural seams, test breadth, and iteration buffer;
     do not use changed LOC alone.
   - Use these empirical workflow calibration bands, not model context limits:
     * preferred worker payload: roughly 360k-405k characters;
     * caution: roughly 405k-480k;
     * mandatory split or handoff: roughly 480k-540k;
     * rough payload/context conversion: payload divided by 2.4-2.7;
     * more than roughly 35 candidate read files is a caution signal.
    - Report every payload estimate in characters. If token equivalents are useful, label them
      separately and derive them from the character estimate; never substitute token counts for the
      character-based calibration bands.
   - For each proposed worker, distinguish unique reads from reads likely to be repeated across
     fresh sessions. Report total planned worker payload and the duplicated cross-worker payload.
    - Count the complete OpenSpec context read set in every worker's payload. Those repeated reads
      are intentional for independent overall understanding; task ownership and write scope still
      bound execution.
   - Optimize worker packing across four constraints: bounded per-session payload, cohesive
     read/write sets, minimal repeated context payload, and serialized ownership of shared files or
     semantic contracts. Do not merge unrelated tasks merely to share a file, and do not split a
     cohesive package merely to make its changed-LOC count smaller.
   - Report total payload across all workers and total duplicated cross-worker payload. Reject a
     larger worker count when it reduces per-worker payload but materially increases total uncached
     reads without crossing a safety band.
   - Identify workers that need an internal handoff or package split. Treat the bands as calibration
     ranges, not universal limits. Repeated reads are a cost-efficiency concern, not a guaranteed
     statement about provider cache behavior.

7. Execution recommendation
   - Choose `current-session` or `delegated`.
   - If `current-session`, explain why one coordinator session can safely implement and verify all
     pending tasks.
   - If `delegated`, return the exact sequential worker list the coordinator should invoke. State the
     implementation-worker count separately from coordinator and operator checkpoints.
   - Do not recommend parallel workers, worktrees, or cherry-picks. Record any need for them as an
     unresolved tooling boundary.

8. Worker contract
    - Define the coordinator implementation workspace and OpenSpec planning root for each worker.
    - Define exact owned task ids and exact write paths.
   - Define forbidden files and actions.
    - Define focused tests and the acceptance gate.
    - Define the coordinator's per-worker diff review, write-scope verification, focused-gate
      acceptance, exact task-id acceptance, coordinator-only checkbox update, and refreshed Apply
      progress reconciliation.
   - State that the worker starts with no prior worker context and must use a fresh `delegate_general`
     session with the selected model and variant.
   - Require a handoff with changed files, tests run, unresolved issues, and remaining scope.

9. Review route and charter
   - Choose `coordinator-only` or one independent review checkpoint and cite its user request or
     explicit material-risk trigger.
   - For each review scope, name exact owned task IDs, artifact anchors, observable acceptance
     criteria, focused gates, relevant invariants, planned write paths, and review exclusions.
   - State that new concerns must be classified as `accepted blocker`, `follow-up`, `future task`,
     or `closed`.
   - Reserve one consolidated remediation and one closure verification for accepted blockers. The
     permitted batch may reopen failed task IDs; any second remediation, additional reopening, or
     scope expansion needs explicit user authority unless authority, security, or likely immutable-
     data loss is evidenced.

10. Uncertainty register
    - List unresolved design questions and confidence.
    - Do not silently choose inventory paths, CLI output formats, renderer semantics, migration
     commands, canonical-spec destinations, or task-lifecycle actions when the contract leaves them
     open.

Return only the planning report. Do not implement. Use one compact plan envelope: state global worker
defaults once, use one task-to-package-to-owner table, and provide one concise record per package and
worker. Lead with the actual worker count and sequential worker list. Do not repeat the global worker
contract in every worker. An unresolved write path is a blocker, not permission to name a directory
or use a speculative path.
```

The planning result must cover all pending tasks, not merely the broad areas in the task headings.
It must identify shared semantic contracts even when files look separate. It must distinguish a
read-only context path from a writable implementation path and call out external stores, generated
files, migrations, and real-home operations.

**Completion criterion:** one planning result exists from the requested model, attests `Read all
<N> context paths` with the supplied count, contains a one-to-one task-to-package-to-owner mapping,
names its execution mode and exact worker sequence, separates checkpoints from delegated workers,
defines fresh-session model routing, gives every worker candidate reads, exact proposed writes, and
explicit out-of-scope files, reports per-worker and total duplicated payloads in characters, and
justifies every fresh-session boundary. It also contains a chartered review route with exact anchors,
criteria, exclusions, and a bounded remediation route. If any field is missing, stop and report the
incomplete plan instead of implementing from inference.

## 3. Validate And Announce The Plan

Reconcile the planning result against the actual Apply preparation output and the authoritative task
artifact before any implementation action.

- Reject an omitted, duplicated, merged-away, or invented task id.
- Compare task ids as exact strings against the coordinator's loaded task artifact. Reread the task
  artifact after planning because it is the mutable completion ledger. Reject ordinalized, renumbered,
  or otherwise normalized hierarchical ids even when the task count is correct.
- The coordinator has already read the proposal, design, and specs. Validate the planner's coverage
  against that loaded context and its context-read manifest; do not delegate another interpretation
  pass.
- Confirm that every package has one owner and every implementation worker has exact task ids,
  explicit writes, explicit out-of-scope files, dependencies, and a verification gate.
- Confirm that every review criterion and invariant has an exact owned task ID and OpenSpec artifact
  anchor. `not implicated` is valid; invented criteria are not.
- Confirm `coordinator-only` unless a user request or explicit material-risk trigger justifies one
  independent review checkpoint. The checkpoint must be separate from implementation workers.
- Confirm that the charter excludes unowned future tasks, generic quality work, and speculative
  hardening from current acceptance unless they demonstrate a current acceptance failure.
- Confirm one consolidated remediation and one scope-locked closure verification. That permitted
  remediation may reopen failed task IDs; a second remediation, additional reopening, or broader
  review must be user-gated except for evidenced authority, security, or likely immutable-data-loss
  risk.
- Confirm that every proposed write is an exact path. An unresolved or directory-only write blocks
  the plan.
- Confirm that every generated output written by a proposed gate belongs to the gate's write set or
  is explicitly coordinator-owned.
- For deterministic generation gates, require generate, record output hashes, regenerate, and
  compare hashes. Do not use `git diff --exit-code` as the proof when intended generated changes are
  part of the accepted diff.
- Confirm that the recommendation names current-session versus delegated execution and, when
  delegated, names an exact sequential worker order.
- If the recommendation is `current-session`, confirm that the coordinator is explicitly
  `openai/gpt-5.6-luna` at `xhigh`; otherwise reject the recommendation.
- Confirm that each delegated worker has an explicit model and variant and that the plan requires a
  fresh session with no `task_id`; the read-only planning child is never reused for implementation.
- Confirm that each worker reports candidate reads, exact proposed writes, repeated reads, duplicated
  payload, and the tradeoff that led to its boundaries.
- Confirm that coordinator and operator checkpoints are excluded from the implementation-worker
  count and are not delegated merely to account for their task ids.
- When more than six implementation workers are proposed, require a concrete disjoint-file,
  repository-authority, or mandatory-split justification for each boundary and compare the plan with
  the adjacent merged-worker alternative. Reject mechanical task-heading or verification-only
  workers.
- Selectively inspect the planner's proposed repository paths and seams to validate exact writes,
  ownership, and gates. Do not repeat broad repository exploration or silently replace the planner's
  package or worker assignment; an unresolvable path remains a blocker.
- Confirm that each worker receives the complete `contextFiles` path list and is required to read
  every OpenSpec context file before editing. Full context grants understanding, not execution
  authority; only the accepted task ids, write set, dependencies, and gates are actionable.
- Confirm that every implementation route is exactly `openai/gpt-5.6-luna` at `xhigh`.
- Confirm that the worker contract requires per-worker diff review, write-scope verification,
  focused-gate acceptance, exact task-id acceptance, coordinator-only checkbox updates, and
  refreshed Apply progress reconciliation.
- Serialize workers with overlapping writes, generated outputs, semantic contracts, or dependencies.
- Reject parallel-worker or worktree execution because delegate_general currently runs children in
  the coordinator directory. Record that limitation when the dependency graph would otherwise favor
  parallelism.
- Confirm that migration and irreversible machine operations are operator-gated.
- Keep uncertainty visible. Do not repair an underspecified plan by guessing.

Phase 3 is coordinator-local. After the single planning result arrives, do not make another planning,
implementation, or open-ended discovery call. The coordinator may selectively inspect the planner's
proposed candidate reads, exact writes, current diff, and declared seams to validate the result. An
advisor checkpoint may review the completed result but cannot change it. If validation fails, report
the concise defect list, mark execution blocked, and do not replay the complete planner report or
silently repair it.

For a normal run, show before implementation:

- selected mode and actual implementation-worker count;
- exact sequential worker list;
- exact task allocation;
- dependency and conflict order;
- write ownership and out-of-scope files;
- focused verification gates;
- review route, charter, and bounded remediation route;
- context-budget risks;
- migration, external-store, cross-repository, and operational boundaries;
- unresolved questions and confidence.

**Completion criterion:** the coordinator has a checked task-to-package-to-owner mapping, an exact
sequential list of bounded implementation workers, and a separate checkpoint list. Every fresh
worker boundary has a validated context or authority justification.

If the user requested `plan-only`, stop here after reporting the selected mode, task allocation,
validation result, and unresolved boundaries. Do not enter implementation or closeout.

## 4. Execute The Selected Mode

### Current-session execution

Follow the announced order. For each task:

- announce the exact task id and description;
- implement only that task and declared supporting changes;
- run its focused verification gate;
- inspect the diff and confirm that no out-of-scope file changed;
- mark its checkbox complete in the OpenSpec planning root only after the gate passes and any
  chartered review closes.

Keep source edits in the implementation workspace and planning-artifact edits in the OpenSpec
planning root. A selected store does not replace the implementation workspace.

Keep the working set tight. Do not widen a task because a nearby improvement is convenient. If the
implementation exposes a design issue, pause and propose an artifact update. If a blocker changes
the execution shape or invalidates later waves, stop before the affected task, record the invalidated
scope, and require a new orchestration decision rather than silently re-planning.

### Delegated workers

Use `delegate_general` for each implementation worker in the accepted worker list, one at a time in
the coordinator workspace. `delegate_general` creates child sessions in the coordinator's current
directory; a path written in a prompt does not create a worktree or confine a child session. Do not
claim parallel worker isolation unless the delegation tool has an explicit, tested
directory/worktree contract.

Every implementation worker must start a **fresh session**. Call `delegate_general` without
`task_id`, even when a previous planner or worker handled related files. Never resume the planning
child, a prior worker, or a failed attempt. If a retry is authorized, create another fresh session
whose prompt includes the current diff, the failure, and the narrowed or corrected scope. This
deliberately trades duplicated context payload for bounded context windows and clean ownership.
Confirm the selected model is allowlisted before calling it:

- Every implementation worker: `openai/gpt-5.6-luna`, variant `xhigh`.
- `openai/gpt-5.6-sol`, variant `high`, is reserved for the single initial planning call and any
  chartered read-only independent review.

These are routing rules, not claims that implementation-worker quality was benchmarked in the
planning panel. If a requested model or variant is unavailable, stop and report it; do not silently
substitute.

Every worker prompt must include:

- the exact task ids owned by that worker;
- the complete OpenSpec context path list it must read before editing;
- the exact implementation workspace it may modify;
- the exact OpenSpec planning root whose task artifact the coordinator owns;
- the worker goal and dependencies already satisfied;
- its explicit write set and explicit out-of-scope files;
- required focused tests and the pass gate;
- its review charter: task/artifact anchors, observable criteria, relevant invariants, and exclusions;
- the migration and real-home restrictions;
- a statement that this is a fresh session and that the worker must read every supplied OpenSpec
  context file to understand the overall change rather than assume another worker's context. Full
  context is for understanding only; the owned task ids and explicit write set are the execution
  authority;
- the planner's worker-specific candidate repository reads and semantic seams, with an instruction to
  focus on those paths after reading the OpenSpec context rather than repeat broad repository discovery;
- a required handoff containing changed files, tests run and outcomes, unresolved issues, and
  remaining scope.

Use this worker prompt structure:

```text
Implement only this accepted OpenSpec worker assignment.

Owned task ids: <exact ids>
Owned work packages: <exact package ids>
Worker goal: <goal>
Implementation workspace: <exact path>
OpenSpec planning root: <exact path>
Complete OpenSpec context paths to read before editing:
<one path per line>

Write ownership:
<exact files or generated outputs>

Out of scope:
<exact files, packages, workers, and task ids>

Review charter:
<task/artifact anchors, observable acceptance criteria, affected invariants or not implicated,
planned write paths, review exclusions, and whether the route is coordinator-only or independent>

Context rule: read the complete OpenSpec context above for overall change understanding, but act only
on the owned task ids, packages, satisfied dependencies, and explicit write ownership in this worker.

Repository context:
<planner-supplied candidate reads and semantic seams>

Repository rule: after reading the complete OpenSpec context, focus on the supplied worker repository
context. Bounded task-local discovery inside the accepted semantic seam is allowed when needed to
resolve implementation or verification details. Do not perform broad discovery across unrelated
areas. Report a blocker if the work requires an undeclared write, an unrelated area, a material worker
change, or a guess.

Dependencies already satisfied:
<accepted commits, workers, or contracts>

Required focused verification:
<commands and pass criteria>

This is a fresh worker session. Read the supplied context and current repository patterns before
editing; do not assume that another worker's reads or conclusions are in your context. Implement
only the owned task ids and their declared supporting changes. Keep the diff minimal and within the
write set. Do not edit the tasks artifact, mark checkboxes complete, start another agent, or absorb
another worker's tasks. Do not run live migration or modify a real home.
Report blockers instead of guessing.

Handoff required:
- changed files;
- tests or commands run and their outcomes;
- acceptance evidence for the chartered criteria;
- follow-up or future-task candidates, separated from blockers;
- unresolved issues;
- remaining scope.
```

Workers must not edit the tasks artifact, mark tasks complete, start another agent,
absorb another worker's tasks, exceed their write scope, commit, or perform live migration. After each
worker, the coordinator immediately reviews the handoff and diff, runs the focused gate, checks write
scope, and marks only task IDs accepted under the selected review route before starting the next
worker. When an independent review is chartered, hold its task IDs pending until Phase 5 closes that
review.

### Sequential worker protocol

Delegated workers share the coordinator workspace. Follow the accepted worker list sequentially, and
do not create worktrees, branches, or parallel waves. Before each worker, confirm that the
coordinator diff is understood and that the worker's declared write set does not conflict with
unaccepted changes. After each worker:

1. Review the coordinator diff and worker handoff.
2. Run the focused verification gate.
3. For `coordinator-only`, accept only the declared task ids and write set. For an independent route,
   retain the task IDs as pending until Phase 5 closes the chartered review.
4. Immediately update only task checkboxes accepted under the selected review route.
5. Re-run `openspec instructions apply --change "<name>" --json [--store <id>]` and confirm the
   expected progress before starting the next worker. The resolved standalone store id is mandatory
   whenever Phase 1 selected a store.

The coordinator owns commits. If a worker fails, changes scope, or exposes a shared semantic
conflict, classify the failure under Phase 5 before retrying or starting a dependent worker. Use a
fresh `delegate_general` session only for the one accepted consolidated remediation or after the user
authorizes a further reopening; never resume the failed worker. Do not run a live migration or
irreversible machine operation through a worker.

**Completion criterion:** every accepted worker has an in-scope diff, passing focused verification, a
complete handoff, and coordinator acceptance before its dependent worker starts. Every completed
checkbox is backed by that acceptance, and no parallel or unconfined worker was used.

## 5. Review And Remediate

Run this phase whenever coordinator review or a chartered independent checkpoint reports a concern.
For a `coordinator-only` route with passing diff and focused gates, move directly to closeout. An
independent review assesses acceptance, not the desirability of more work.

### Review Scope And Disposition

Give the reviewer only the chartered task IDs, anchors, observable criteria, invariants, changed
paths, and focused gates. It may inspect directly affected lines and evidence needed to verify those
criteria. It does not restart broad discovery across the change or adjacent future worker groups.

Each concern must include:

- one disposition: `accepted blocker`, `follow-up`, `future task`, or `closed`;
- exact owned task ID and OpenSpec artifact path plus requirement, heading, or scenario;
- expected and observed behavior with a command, test, artifact, or diff citation;
- affected file and line range;
- ordinary supported-execution impact; and
- the implicated authority, security, or immutable-data invariant, or `not implicated`.

An `accepted blocker` requires a current acceptance criterion to be false, or evidence of an
authority, security, or likely immutable-data-loss failure. A `follow-up` improves the delivered
task without invalidating acceptance. A `future task` is an unowned capability, downstream workflow,
or generic hardening and names its exact future task or separate-change destination. `closed` covers
unsupported, duplicate, or preference-only concerns. Do not remediate a concern before the
coordinator records its disposition.

### Consolidated Remediation And Closure

Collect every accepted blocker into one remediation batch. Reopen only the failed task IDs, preserve
accepted task IDs, and use the chartered write set or obtain a user decision for any wider write.
The remediation follows the selected execution mode and receives focused regression gates for all
accepted blockers. It does not absorb follow-ups or future tasks.

The coordinator then performs one closure verification limited to accepted blockers, remediation-
changed lines, directly affected criteria, and their focused gates. It records each original blocker
as closed or unresolved; it does not begin a new exploratory review. If a nonurgent concern remains
or appears, classify it and request a user decision before a second remediation, task reopening, or
scope expansion. For an evidenced authority, security, or likely immutable-data-loss risk, stop
closeout, preserve the evidence, apply only the narrow safety remediation permitted by the change,
and report the exception immediately.

When closure passes, accept the declared task IDs whose chartered criteria now pass, update only their
task-artifact checkboxes, and rerun `openspec instructions apply --change "<name>" --json [--store
<id>]` before closeout. Keep unresolved task IDs pending and report the required user or urgent-risk
authority.

**Completion criterion:** every independent-review concern has a disposition, at most one
consolidated remediation and one scope-locked closure verification have occurred, passing task IDs
have been accepted and reconciled in the task ledger, and any further work has explicit user or
urgent-risk authority.

## 6. Close The Change

After all accepted workers and checkpoints converge, re-run the Apply instruction query:

```bash
openspec instructions apply --change "<name>" --json
```

Include `--store <id>` when required. Verify the reported task state and progress against the
coordinator's ledger. Then:

- run the broadest required repository gates and record each command's outcome;
- run `openspec validate --changes <name> --json` when change artifacts or specs are in scope;
- review the final diff and confirm all modified files belong to accepted task ownership;
- keep canonical spec synchronization or archival separate unless the user asks or the lifecycle
  explicitly requires it;
- do not treat an unresolved uncertainty as complete;
- stop before real-home migration or another irreversible machine operation and request explicit
  authorization.

Do not mark a task complete because a worker claims completion. Mark it after coordinator review,
the required focused gate, and the selected review route, then use the per-worker and final OpenSpec
progress checks to reconcile the coordinator-owned ledger.

Report:

- change and schema;
- tasks completed this run and final `N/M` progress;
- selected mode and worker sequence;
- changed files and accepted commits;
- focused and broad verification outcomes;
- review route, accepted blockers, closure evidence, and follow-up or future-task dispositions;
- unresolved issues or explicit operator gates;
- whether the change is ready for archive or remains blocked.

**Completion criterion:** OpenSpec reports the accepted task state, every required verification
command has an outcome, the final diff is in scope, every remaining boundary is explicit, and the
change is complete or clearly blocked.
