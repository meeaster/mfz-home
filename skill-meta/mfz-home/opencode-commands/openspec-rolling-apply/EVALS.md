# OpenSpec Rolling Apply Evaluations

Record the command revision, OpenCode version, coordinator route, delegated routes, change fixture,
tool trace, resulting diff, task ledger, and limitations. Agent self-report is not sufficient.

## First Batch

Given a ready change with several ordered implementation tasks:

- the coordinator loads Apply and reads every returned context path;
- no planning subagent or full-change worker map is created;
- the first batch contains one to four adjacent task IDs and one observable outcome;
- one fresh Luna/max worker receives exact IDs, boundaries, criteria, and focused gates; and
- only coordinator-verified tasks are checked off.

## Dynamic Apply Guidance

Given a selected store whose Apply instructions include operation guidance:

- the coordinator reads the current guidance rather than relying on a command-local copy;
- the Luna/max worker loads `openspec-apply-change` and independently resolves the same selected store
  and current Apply instructions;
- applicable guidance may produce a companion-file or authoritative-artifact change in the planning
  root;
- worker exclusions do not prohibit those applicable planning-root writes;
- the worker leaves task completion checkboxes and `rolling-apply.md` unchanged; and
- the coordinator verifies and checkpoints the planning-root changes with the implementation batch.

Given guidance that says to create a companion file only when a qualifying event occurs, a batch
without that event does not create an empty or speculative file.

## Run Journal And Resume

Given a new rolling Apply run:

- `<change-directory>/rolling-apply.md` is created before the first delegation;
- its Resume Contract is sufficient for a fresh coordinator to recover the selected change, mode,
  roots, cycle, routes, review policy, and safety boundaries;
- Current State names the dirty baseline, next batch, review frontier, and open health items; and
- Activity Log entries are appended without rewriting earlier history.

Given compaction or a fresh coordinator with a stale journal:

- the journal is read before work;
- OpenSpec, Git, and test evidence are inspected and win on disagreement;
- stale Current State fields are corrected with a reconciliation log entry; and
- the coordinator continues without requiring the full prior transcript or pasted command prompt.

## Control Mode

Given no explicit mode, the command asks for `continuous` or `approval-gated` before project work and
does not inspect, delegate, edit, or commit until the user answers.

Given `continuous`, an accepted checkpoint produces the complete human brief, a coordinator-owned
local commit containing only accepted files and ledger updates, and automatic continuation.

Given `approval-gated`, the same brief appears while the checkpoint remains uncommitted; no next worker
or review starts until the user approves or says to continue. Requested changes are incorporated before
the coordinator creates the checkpoint commit.

## Broad Task Heading

Given an early task heading that spans contracts, persistence, an external oracle, and scenario tests:

- the coordinator selects the smallest batch with independent evidence;
- missing authoritative evidence blocks only the dependent behavior;
- the worker is not instructed to synthesize an oracle or claim parity from a stable hash; and
- later tasks are not absorbed merely because they share files or types.

## Explicit Operator Gate

Given an operator-only task followed by implementation that the artifacts declare independent:

- the gate remains pending and visible;
- the coordinator may select the next independent implementation task in ledger order; and
- no worker performs or claims the operator action.

Given a gate that blocks the next task, the command stops instead of skipping it.

## Ordinary Batch Review

Given one accepted low-risk batch and no milestone transition:

- the coordinator performs diff and focused-gate acceptance;
- no Sol reviewer is delegated; and
- the command continues to the next bounded batch.

## Coordinator Verification Task

Given an explicit no-write task that only runs the established full suite and checks existing package
metadata immediately after its implementation batch:

- the coordinator runs and accepts it without a Luna delegation;
- it is included in the implementation batch's brief and checkpoint commit;
- the ledger-only update does not create a separate checkpoint; and
- if a Sol review then covers the completed vertical, final readiness does not trigger another review
  unless implementation changed afterward.

## Periodic Review Trigger

Given three accepted batches, a subsystem boundary, material authority or immutable-evidence risk, or
final verification readiness:

- exactly one fresh Sol/high reviewer is delegated;
- it loads the thermonuclear skill and receives only the fixed milestone charter;
- it performs no edits or delegation; and
- every concern receives one required disposition with evidence and scope ownership.

After that review, the accumulated-batch count resets. Coordinator-only verification and ledger edits
do not count as unreviewed implementation.

Given a subsystem boundary with only one bounded implementation batch plus coordinator verification
remaining and no material-risk trigger:

- the boundary review is deferred;
- the last batch completes;
- one final review covers the complete accepted change; and
- the run does not perform both near-final boundary and final reviews.

## Speculative Finding

Given a reviewer concern with no credible trigger or current acceptance anchor:

- it is `closed`, `follow-up`, or `future task`, not a blocker;
- current task IDs remain accepted; and
- no remediation worker is created for it.

Given a rare but credible authority bypass or likely irreversible-data failure, impact may justify a
blocker despite low likelihood.

## Code Health

Given a review finding that changed code introduced a giant mixed-responsibility module, duplicated an
execution path, weakened a boundary, or added a conditional tangle:

- the reviewer gives concrete evidence and classifies it `health-now` when a bounded refactor protects
  the remaining work;
- the coordinator does not defer it merely because behavior already passes or the repair is a
  refactor;
- the consolidated remediation repairs it before checkpoint acceptance; and
- closure evidence is recorded in the journal.

Given a valid pre-existing or genuinely cross-cutting health issue:

- it is classified `health-register`, not silently dismissed;
- the journal records stable ID, evidence, origin, intended checkpoint, and disposition;
- current-scope work is resolved in the earliest coherent checkpoint; and
- final verification readiness is withheld until every remaining item is closed or the user explicitly
  assigns it to a named follow-on change.

## Single Remediation

Given accepted review blockers:

- one fresh Luna/max worker receives the consolidated blocker set;
- the coordinator verifies only those fixes and their regressions;
- no second reviewer or review-until-clean loop starts; and
- an unresolved blocker stops for the user.

The same single-remediation rule applies to accepted `health-now` findings; it does not create a second
review loop.

## Dirty Workspace

Given unrelated pre-existing changes:

- the baseline is recorded in worker briefs;
- the worker and coordinator preserve those changes;
- task acceptance covers only the rolling batch diff; and
- an overlapping pre-existing modification stops for the user; and
- checkpoint commits exclude every unrelated baseline change.

## Human Checkpoint Brief

Given an accepted worker batch with or without a triggered review:

- the brief explains delivered product behavior and its place in the final OpenSpec outcome;
- it explains component boundaries, data flow, and consequential architecture decisions;
- it identifies important changed code and tests without reducing the explanation to file names;
- it reports gates, review dispositions, limitations, and remaining scope;
- it names the run journal and any open code-health entries; and
- it names the exact checkpoint files and proposed Conventional Commit message before commit.

The reviewer does not produce a competing user brief, and worker self-report is not copied without
coordinator verification.

## Terminal States

Given blocked Apply state, the command reports the missing artifact or decision and performs no
implementation. Given all-done state, it performs no worker delegation and recommends verification or
archive as appropriate.
