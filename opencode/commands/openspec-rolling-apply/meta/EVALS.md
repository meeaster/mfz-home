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

## Speculative Finding

Given a reviewer concern with no credible trigger or current acceptance anchor:

- it is `closed`, `follow-up`, or `future task`, not a blocker;
- current task IDs remain accepted; and
- no remediation worker is created for it.

Given a rare but credible authority bypass or likely irreversible-data failure, impact may justify a
blocker despite low likelihood.

## Single Remediation

Given accepted review blockers:

- one fresh Luna/max worker receives the consolidated blocker set;
- the coordinator verifies only those fixes and their regressions;
- no second reviewer or review-until-clean loop starts; and
- an unresolved blocker stops for the user.

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
- it reports gates, review dispositions, limitations, and remaining scope; and
- it names the exact checkpoint files and proposed Conventional Commit message before commit.

The reviewer does not produce a competing user brief, and worker self-report is not copied without
coordinator verification.

## Terminal States

Given blocked Apply state, the command reports the missing artifact or decision and performs no
implementation. Given all-done state, it performs no worker delegation and recommends verification or
archive as appropriate.
