---
name: openspec-orchestrate
description: Plan and coordinate an OpenSpec implementation as a standalone, plan-first workflow.
disable-model-invocation: true
argument-hint: "<change>"
license: MIT
compatibility: Requires OpenSpec CLI and OpenCode delegate_general.
metadata:
  author: mindframe-z
  version: "2.1"
---

OpenSpec orchestration is a **standalone, plan-first execution workflow**. It creates a temporary
execution graph above OpenSpec's flat task checklist, then implements that graph in the current
session or through bounded, fresh worker sessions. It is an alternative to `openspec-apply-change`,
not an overlay on it. Do not assume that Apply is loaded, and do not depend on a skill call stack.

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
after reviewing the diff and running the gate, then updates the accepted checkboxes immediately.
The execution graph, ownership, order, and estimates are temporary coordination state unless the
user explicitly asks to persist them elsewhere.

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
their contents in the delegate prompt, or invent execution groups. The planner owns broad read-only
repository exploration needed to resolve candidate reads, exact writes, dependencies, and gates.

During Phases 1 through 3, the coordinator performs preparation, preflight, and validation directly.
The required Sol/high `delegate_general` planner is the only workflow planning child-model call.
Advisor checkpoints are allowed, but they cannot supply, revise, or replace the planning result.
Do not use a second planner, implementation worker, or discovery model before or after it.

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

The planning call uses `openai/gpt-5.6-sol` at `high`. Every implementation group uses
`openai/gpt-5.6-luna` at `xhigh`; Sol is not an implementation route. Reject any other model or
variant in the planning result.

Copy each `contextFiles` path verbatim into the delegate prompt. Before calling `delegate_general`,
compare the complete delegated path list with the Apply output and confirm that no path is missing,
added, or changed. Stop with an incomplete preparation report if the lists differ.

Use this prompt shape. Fill in concrete paths and identifiers from the Apply preparation output;
do not replace the required fields with a short summary.

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
- Every implementation group: `openai/gpt-5.6-luna` at `xhigh`.
- Do not assign Sol to implementation or use any other model/variant.

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
Choose `current-session` or `delegated` execution. Delegated groups run sequentially in the
coordinator workspace because delegate_general has no directory/worktree argument. Every delegated
group, including a retry, will be a fresh delegate_general session with an explicitly selected model
and variant; never plan to resume a planner or another worker. Account for every pending OpenSpec
task found in the task artifact exactly once.

Choose `current-session` only when the coordinator is explicitly running
`openai/gpt-5.6-luna` at `xhigh`. If the coordinator route cannot be confirmed, choose `delegated`;
every delegated implementation group must use `openai/gpt-5.6-luna` at `xhigh`.

Required output:

1. Contract summary
   - Restate requested behavior and boundaries from the OpenSpec artifacts.
   - State explicit non-goals and operator-gated actions.
   - Treat task headings as hints for grouping, not authoritative execution groups.

2. Complete task ledger mapping
   - Assign every pending task id exactly once.
   - Copy each task id verbatim from the task artifact. Never convert hierarchical ids such as
     `1.1` into ordinal ids such as `1`, or infer ids from section counts.
   - Do not omit, duplicate, merge away, or invent task ids.
   - Map each task id to one execution group or to `current-session`.

3. Execution groups
   For every group provide:
   - group id and goal;
   - exact task ids;
   - why these tasks belong together or must be split;
   - likely files to read, with a candidate read set and estimated payload;
    - likely files to create or modify, with exact proposed write paths;
    - explicit write ownership, including generated outputs written by any proposed gate, or an
      explicit coordinator-owned designation for those outputs;
   - explicit out-of-scope files;
   - relevant repository patterns and semantic seams;
   - dependencies and blocked-by relationships;
   - focused verification commands and pass gates;
   - estimated unique files, read payload, changed LOC, architectural seams, test breadth, and
     iteration buffer;
   - expected repeated reads from earlier fresh sessions, their duplicated payload, and why the
     group is merged or split to minimize that payload without exceeding the worker budget;
   - the model and variant for the worker;
   - confidence and uncertainty.

4. Dependency and conflict model
   - Build the dependency DAG.
   - Identify shared writable files and generated-file overlap.
   - Identify semantic API, fixture, and integration conflicts.
   - Identify migration, external-store, cross-repository, and operational sequencing constraints.

5. Context-budget assessment
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
    - For each proposed worker, distinguish unique reads from reads likely to be repeated across
      fresh sessions. Report total planned worker payload and the duplicated cross-group payload.
    - Count the complete OpenSpec context read set in every worker's payload. Those repeated reads
      are intentional for independent overall understanding; task ownership and write scope still
      bound execution.
   - Optimize grouping across four constraints: bounded per-session payload, cohesive read/write
     sets, minimal repeated context payload, and serialized ownership of shared files or semantic
     contracts. Do not merge unrelated tasks merely to share a file, and do not split a cohesive
     group merely to make its changed-LOC count smaller.
   - Identify groups that need internal splits or a handoff. Treat the bands as calibration ranges,
     not universal limits. Repeated reads are a cost-efficiency concern, not a guaranteed statement
     about provider cache behavior.

6. Execution recommendation
   - Choose `current-session` or `delegated`.
   - If `current-session`, explain why one coordinator session can safely implement and verify all
     pending tasks.
   - If `delegated`, define a sequential group order and explain why each dependency is satisfied
     before the next worker starts.
   - Do not recommend parallel workers, worktrees, or cherry-picks. Record any need for them as an
     unresolved tooling boundary.

7. Worker contract
    - Define the coordinator implementation workspace and OpenSpec planning root for each group.
    - Define exact owned task ids and exact write paths.
   - Define forbidden files and actions.
    - Define focused tests and the acceptance gate.
    - Define the coordinator's per-group diff review, write-scope verification, focused-gate
      acceptance, exact task-id acceptance, coordinator-only checkbox update, and refreshed Apply
      progress reconciliation.
   - State that the worker starts with no prior worker context and must use a fresh `delegate_general`
     session with the selected model and variant.
   - Require a handoff with changed files, tests run, unresolved issues, and remaining scope.

8. Uncertainty register
   - List unresolved design questions and confidence.
   - Do not silently choose inventory paths, CLI output formats, renderer semantics, migration
     commands, canonical-spec destinations, or task-lifecycle actions when the contract leaves them
     open.

Return only the planning report. Do not implement. Use one compact plan envelope: state global worker
defaults once, use one task-to-group table, and provide one concise record per group. Do not repeat
the global worker contract in every group. An unresolved write path is a blocker, not permission to
name a directory or use a speculative path.
```

The planning result must cover all pending tasks, not merely the broad areas in the task headings.
It must identify shared semantic contracts even when files look separate. It must distinguish a
read-only context path from a writable implementation path and call out external stores, generated
files, migrations, and real-home operations.

**Completion criterion:** one planning result exists from the requested model, states that every
context path was read, contains a one-to-one mapping for every pending task found in the task
artifact, names its execution mode and waves, defines fresh-session model routing, candidate read
and exact proposed write sets, shared-file ownership, repeated-read payload, context-budget
tradeoffs, focused gates, and every unresolved boundary. If any field is missing, stop and report
the incomplete plan instead of implementing from inference.

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
- Confirm that every group has one owner, exact task ids, explicit writes, explicit out-of-scope
  files, dependencies, and a verification gate.
- Confirm that every proposed write is an exact path. An unresolved or directory-only write blocks
  the plan.
- Confirm that every generated output written by a proposed gate belongs to the gate's write set or
  is explicitly coordinator-owned.
- For deterministic generation gates, require generate, record output hashes, regenerate, and
  compare hashes. Do not use `git diff --exit-code` as the proof when intended generated changes are
  part of the accepted diff.
- Confirm that the recommendation names current-session versus delegated execution and, when
  delegated, names a sequential group order.
- If the recommendation is `current-session`, confirm that the coordinator is explicitly
  `openai/gpt-5.6-luna` at `xhigh`; otherwise reject the recommendation.
- Confirm that each delegated group has an explicit model and variant and that the plan requires a
  fresh session with no `task_id`; the read-only planning child is never reused for implementation.
- Confirm that each group reports candidate reads, exact proposed writes, repeated reads, duplicated payload, and
  the tradeoff that led to its boundaries.
- Selectively inspect the planner's proposed repository paths and seams to validate exact writes,
  ownership, and gates. Do not repeat broad repository exploration or silently replace the planner's
  grouping; an unresolvable path remains a blocker.
- Confirm that each worker receives the complete `contextFiles` path list and is required to read
  every OpenSpec context file before editing. Full context grants understanding, not execution
  authority; only the accepted task ids, write set, dependencies, and gates are actionable.
- Confirm that every implementation route is exactly `openai/gpt-5.6-luna` at `xhigh`.
- Confirm that the worker contract requires per-group diff review, write-scope verification,
  focused-gate acceptance, exact task-id acceptance, coordinator-only checkbox updates, and
  refreshed Apply progress reconciliation.
- Serialize groups with overlapping writes, generated outputs, semantic contracts, or dependencies.
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

- selected mode;
- exact task allocation;
- dependency and conflict order;
- write ownership and out-of-scope files;
- focused verification gates;
- context-budget risks;
- migration, external-store, cross-repository, and operational boundaries;
- unresolved questions and confidence.

**Completion criterion:** the coordinator has a checked, one-to-one mapping from every pending task
to the current session or one bounded worker group, and the selected execution order is explicit.

If the user requested `plan-only`, stop here after reporting the selected mode, task allocation,
validation result, and unresolved boundaries. Do not enter implementation or closeout.

## 4. Execute The Selected Mode

### Current-session execution

Follow the announced order. For each task:

- announce the exact task id and description;
- implement only that task and declared supporting changes;
- run its focused verification gate;
- inspect the diff and confirm that no out-of-scope file changed;
- mark its checkbox complete in the OpenSpec planning root only after the gate passes.

Keep source edits in the implementation workspace and planning-artifact edits in the OpenSpec
planning root. A selected store does not replace the implementation workspace.

Keep the working set tight. Do not widen a task because a nearby improvement is convenient. If the
implementation exposes a design issue, pause and propose an artifact update. If a blocker changes
the execution shape or invalidates later waves, stop before the affected task, record the invalidated
scope, and require a new orchestration decision rather than silently re-planning.

### Delegated workers

Use `delegate_general` for each implementation group, one group at a time in the coordinator
workspace. `delegate_general` creates child sessions in the coordinator's current directory; a path
written in a prompt does not create a worktree or confine a child session. Do not claim parallel
worker isolation unless the delegation tool has an explicit, tested directory/worktree contract.

Every implementation group must start a **fresh session**. Call `delegate_general` without
`task_id`, even when a previous planner or worker handled related files. Never resume the planning
child, a prior worker, or a failed attempt. If a retry is authorized, create another fresh session
whose prompt includes the current diff, the failure, and the narrowed or corrected scope. This
deliberately trades duplicated context payload for bounded context windows and clean ownership.
Confirm the selected model is allowlisted before calling it:

- Every implementation worker: `openai/gpt-5.6-luna`, variant `xhigh`.
- `openai/gpt-5.6-sol`, variant `high`, is reserved for the single initial planning call.

These are routing rules, not claims that implementation-worker quality was benchmarked in the
planning panel. If a requested model or variant is unavailable, stop and report it; do not silently
substitute.

Every worker prompt must include:

- the exact task ids owned by that worker;
- the complete OpenSpec context path list it must read before editing;
- the exact implementation workspace it may modify;
- the exact OpenSpec planning root whose task artifact the coordinator owns;
- the group goal and dependencies already satisfied;
- its explicit write set and explicit out-of-scope files;
- required focused tests and the pass gate;
- the migration and real-home restrictions;
- a statement that this is a fresh session and that the worker must read every supplied OpenSpec
  context file to understand the overall change rather than assume another worker's context. Full
  context is for understanding only; the owned task ids and explicit write set are the execution
  authority;
- the planner's group-specific candidate repository reads and semantic seams, with an instruction to
  focus on those paths after reading the OpenSpec context rather than repeat broad repository discovery;
- a required handoff containing changed files, tests run and outcomes, unresolved issues, and
  remaining scope.

Use this worker prompt structure:

```text
Implement only this accepted OpenSpec execution group.

Owned task ids: <exact ids>
Group goal: <goal>
Implementation workspace: <exact path>
OpenSpec planning root: <exact path>
Complete OpenSpec context paths to read before editing:
<one path per line>

Write ownership:
<exact files or generated outputs>

Out of scope:
<exact files, groups, and task ids>

Context rule: read the complete OpenSpec context above for overall change understanding, but act only
on the owned task ids, satisfied dependencies, and explicit write ownership in this group.

Repository context:
<planner-supplied candidate reads and semantic seams>

Repository rule: after reading the complete OpenSpec context, focus on the supplied group repository
context. Bounded task-local discovery inside the accepted semantic seam is allowed when needed to
resolve implementation or verification details. Do not perform broad discovery across unrelated
areas. Report a blocker if the work requires an undeclared write, an unrelated area, a material group
change, or a guess.

Dependencies already satisfied:
<accepted commits, groups, or contracts>

Required focused verification:
<commands and pass criteria>

This is a fresh worker session. Read the supplied context and current repository patterns before
editing; do not assume that another worker's reads or conclusions are in your context. Implement
only the owned task ids and their declared supporting changes. Keep the diff minimal and within the
write set. Do not edit the tasks artifact, mark checkboxes complete, start another agent, or absorb
another group's tasks. Do not run live migration or modify a real home.
Report blockers instead of guessing.

Handoff required:
- changed files;
- tests or commands run and their outcomes;
- unresolved issues;
- remaining scope.
```

Workers must not edit the tasks artifact, mark tasks complete, start another agent,
absorb another group's tasks, exceed their write scope, commit, or perform live migration. After each
worker, the coordinator immediately reviews the handoff and diff, runs the focused gate, checks write
scope, and marks only the accepted task checkboxes complete before starting the next group.

### Sequential worker protocol

Delegated workers share the coordinator workspace. Serialize every group, and do not create
worktrees, branches, or parallel waves. Before each worker, confirm that the coordinator diff is
understood and that the group's declared write set does not conflict with unaccepted changes. After
each worker:

1. Review the coordinator diff and worker handoff.
2. Run the focused verification gate.
3. Accept only the declared task ids and write set.
4. Immediately update only the accepted task checkboxes.
5. Re-run `openspec instructions apply --change "<name>" --json [--store <id>]` and confirm the
   expected progress before starting the next group. The resolved standalone store id is mandatory
   whenever Phase 1 selected a store.

The coordinator owns commits. If a worker fails, changes scope, or exposes a shared semantic
conflict, stop before the next group and require a new orchestration decision rather than silently
re-planning. If that decision authorizes a retry, use a fresh `delegate_general` session; never
resume the failed worker. Do not run a live migration or irreversible machine operation through a
worker.

**Completion criterion:** every accepted group has an in-scope diff, passing focused verification, a
complete handoff, and coordinator acceptance before its dependent group starts. Every completed
checkbox is backed by that acceptance, and no parallel or unconfined worker was used.

## 5. Close The Change

After all accepted groups converge, re-run the Apply instruction query:

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

Do not mark a task complete because a worker claims completion. Mark it after coordinator review and
the required focused gate, then use the per-group and final OpenSpec progress checks to reconcile the
coordinator-owned ledger.

Report:

- change and schema;
- tasks completed this run and final `N/M` progress;
- selected mode and worker waves;
- changed files and accepted commits;
- focused and broad verification outcomes;
- unresolved issues or explicit operator gates;
- whether the change is ready for archive or remains blocked.

**Completion criterion:** OpenSpec reports the accepted task state, every required verification
command has an outcome, the final diff is in scope, every remaining boundary is explicit, and the
change is complete or clearly blocked.
