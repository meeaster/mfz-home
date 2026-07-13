# Vision: OpenSpec Orchestrate

## Purpose

`openspec-orchestrate` is a standalone, plan-first workflow for implementing an OpenSpec change when
the user wants an explicit, validated execution plan, especially for broad, cross-cutting, or
context-heavy work.

It consumes the standard OpenSpec artifacts as the authoritative change contract and adds a
temporary execution graph for coordination. The graph helps decide how work should be grouped,
ordered, budgeted, delegated, and verified. It must not become a second durable task ledger.

The workflow exists to make implementation safer and more predictable without taking ownership
away from the coordinator or hiding important execution decisions inside an opaque planning call.

The workflow keeps three locations distinct:

- **Implementation workspace:** the current or explicitly selected code repository where source
  changes are made.
- **OpenSpec planning root:** the repository or standalone store selected by OpenSpec for specs,
  changes, and task state.
- **Change root:** the selected change directory under the planning root.

A standalone store is a planning repository, not the implementation workspace. Selecting a store
changes where OpenSpec commands read and write planning artifacts; it does not change the code
workspace in which the coordinator or workers implement the change.

## Intended User Experience

When the user invokes the skill with a change name, the coordinator should:

1. Resolve the correct OpenSpec change, implementation workspace, and standalone store, when
   applicable.
2. Read the status, dynamic Apply instructions, and every exact context path returned by OpenSpec.
3. Show the schema, progress, pending tasks, implementation workspace, planning root, change root,
   and workspace-selection boundaries before implementation begins.
4. Perform a local static preflight without inventing execution groups.
5. Make exactly one read-only planning call through `delegate_general` using
   `openai/gpt-5.6-sol` at `high` reasoning.
6. Validate that every pending task is mapped exactly once and that the proposed groups have explicit
   ownership, dependencies, reads, exact writes, gates, estimates, and uncertainty.
7. Choose either current-session implementation or sequential delegated workers.
8. Coordinate implementation with fresh worker sessions when delegation is chosen.
9. Review each accepted diff, run its gate, reconcile OpenSpec progress, and update the durable task
   checkboxes only after acceptance.
10. Run final verification and report whether the change is complete, blocked, or ready for archive.

The user should be able to see why the workflow chose its execution shape and where it stopped.
The workflow should fail visibly on missing context, invalid authorization, incomplete planning, or
unresolved boundaries rather than silently guessing.

## Core Model

### OpenSpec remains authoritative

The proposal, design, specs, and schema-owned task artifact define requested behavior and completion.
Task headings are hints for grouping, not execution groups. `tasks.md` or the schema's equivalent is
the only durable completion ledger.

### Orchestration is temporary coordination state

The execution graph, ownership map, dependency order, context estimates, and worker routing exist to
coordinate the current run. They are not persisted unless the user explicitly requests that outcome.

### The coordinator owns acceptance

Workers report completion, but the coordinator decides whether work is accepted. Acceptance requires
reviewing the diff, confirming write scope, running the focused gate, checking the declared task ids,
and then updating only the accepted OpenSpec checkboxes.

### Planning is read-only

The coordinator and the initial Sol planning pass both read the complete OpenSpec context returned by
OpenSpec. The planning prompt carries the exact filesystem paths and operational boundaries, not a
duplicated summary of task ids, specs, or proposed seams. The planner must not edit files, run tests
or migrations, delegate, commit, or modify task state. The coordinator performs bounded static
repository preflight; the planner owns broad read-only repository exploration needed to resolve
candidate reads, exact writes, dependencies, semantic seams, and gates.

### Execution is bounded

The workflow uses semantic seams, shared writable files, generated outputs, dependency constraints,
working-set size, repeated reads, and verification breadth to choose an execution shape. Changed LOC
alone is not an adequate estimate. Phase 3 selectively validates the planner's proposed paths and
seams rather than repeating broad repository discovery or silently replanning.

## Execution Shape

### Current-session implementation

Use the current coordinator session only when the coordinator is explicitly running
`openai/gpt-5.6-luna` at `xhigh`, and the work is cohesive, within the working-set budget, and safe
to implement and verify without delegation. If that route cannot be confirmed, choose delegated
execution so every implementation worker uses the required route.

### Implementation workspace and planning root

When OpenSpec resolves a standalone store, the coordinator keeps the current code repository as the
implementation workspace and passes the store root as the planning root. An explicit `--store` flag
does not turn the store into the code workspace. If the coordinator is running from the store itself,
or if more than one code repository is a plausible target, it asks the user to select the affected
repository before implementation. A workset may help discover candidate repositories, but it does
not authorize edits.

### Sequential delegated workers

Use delegated workers when the plan benefits from bounded fresh contexts. Each group runs sequentially
in the coordinator workspace because `delegate_general` does not currently provide a tested
directory or worktree contract.

Every worker starts a fresh session through `delegate_general`. A retry also starts a fresh session
and receives the current diff, failure, and corrected scope. A worker must not resume the planner or
another worker.

Every worker receives and reads the complete OpenSpec context path list before editing. Its group
prompt narrows execution authority to accepted task ids, dependencies, exact write ownership, and
verification gates; full context remains available for understanding the overall change. After that
read, the worker focuses on the planner-supplied group repository context and does not repeat broad
discovery across unrelated areas. A missing path is a blocker, not permission to expand scope.

Grouping should amortize the fixed full-context read across cohesive tasks while respecting semantic
seams, write conflicts, dependencies, generated outputs, operational gates, and the worker payload
budget. Using a session fully means giving it enough cohesive implementation, test, and iteration
work, not filling its context window or merging unrelated tasks.

Current routing:

- `openai/gpt-5.6-sol` at `high` performs the single initial planning pass.
- `openai/gpt-5.6-luna` at `xhigh` is the implementation worker.
- Every implementation group uses `openai/gpt-5.6-luna` at `xhigh`. Sol is reserved for the single
  initial planning pass.

Parallel workers and worktrees are not part of the current runtime contract. They remain tooling
opportunities until directory isolation and integration semantics are explicitly tested.

## Required Planning Output

The planning result uses one compact plan envelope. State global defaults once, then provide one
record per execution group. It must include:

- a contract summary with boundaries, non-goals, and operator-gated actions;
- a one-to-one mapping from every pending task id to a group or the current session;
- execution groups with goals, exact task ids, reasons for grouping, candidate reads and exact
  proposed write paths,
  ownership, exclusions, seams, dependencies, gates, estimates, model routing, and uncertainty;
- a dependency and conflict model covering shared files, generated outputs, semantic contracts,
  migrations, stores, repositories, and operational sequencing;
- a context-budget assessment covering unique reads, repeated reads, duplicated payload, patch
  payload, command output, and iteration buffer;
- an execution recommendation of `current-session` or sequential `delegated` mode;
- a worker contract covering workspace, write scope, forbidden actions, gates, acceptance, handoff
  data, role requirements, the complete OpenSpec context read set, and group-specific repository
  reads and discovery boundaries;
- an uncertainty register that does not silently resolve underspecified paths, implementation details,
  external interfaces, migration procedures, destinations, or lifecycle actions.

An unresolved write path is a blocker, not permission to name a directory or use a speculative path.
Generated outputs belong to the gate that writes them or are explicitly coordinator-owned. The
envelope must stay concise enough for the coordinator to validate and report in the same run; do not
repeat the global worker contract in every group.

## Safety Boundaries

- Do not depend on loading `openspec-apply-change` first. This workflow is a standalone alternative
  that performs the stable Apply preparation contract because skills do not provide a reliable call
  stack.
- Do not start implementation before the plan has been checked against the preparation output.
- Keep Phase 3 validation coordinator-local. Do not make another planning or implementation call, or
  an open-ended discovery call, after the planning result. The unchanged advisor review may inspect
  the completed result but cannot change it. The coordinator always selectively inspects proposed
  paths and reports the validation result immediately. Phase 4 workers start only after validation
  succeeds.
- Do not normalize, shorten, reconstruct, or substitute an OpenSpec context path.
- Do not allow a worker to edit the task artifact, mark tasks complete, absorb another group, exceed
  its write set, commit, or perform a live migration.
- Do not run migrations or other irreversible machine or environment operations through workers.
- Preserve unrelated worktree changes and report conflicts instead of overwriting them.
- Keep standalone store flags on follow-up OpenSpec commands whenever the initial preparation selected
  a store.
- Keep uncertainty visible. An incomplete or blocked plan is an acceptable result; guessed certainty
  is not.
- Treat OpenSpec's planning-root `allowedEditRoots` as planning-scope metadata. Do not use a selected
  store's root as proof that it is the implementation workspace.

## Non-Goals

- It is not a replacement for OpenSpec's artifact schema or task ledger.
- It is not an overlay that assumes `openspec-apply-change` is active.
- It is not a generic project-management system or permanent execution database.
- It is not permission to implement an unauthorized cross-repository change.
- It is not a promise of parallel worker isolation.
- It is not a reason to read unrelated planning artifacts or session history during a normal run.
