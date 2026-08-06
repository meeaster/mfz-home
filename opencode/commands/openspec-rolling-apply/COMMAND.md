---
description: Apply an OpenSpec change in bounded Luna-max batches with periodic Sol-high review
model: openai/gpt-5.6-sol
subtask: false
---

Run a rolling delegated Apply for the OpenSpec change named in `$ARGUMENTS`, or infer the change only
when the current context or active-change list makes it unambiguous.

Use the `openspec-apply-change` skill as the authoritative Apply procedure. Do not create an up-front
execution plan, worker map, payload forecast, or full-change file inventory. Let the OpenSpec task
ledger and current Apply instruction determine what comes next.

## Choose The Control Mode

Before reading or changing the project, resolve one control mode from `$ARGUMENTS`. When no mode is
provided, ask the user to choose and stop until they answer:

- `continuous`: after each accepted checkpoint, present the checkpoint brief, create a local commit,
  and continue to the next batch without waiting for approval;
- `approval-gated`: after each accepted checkpoint, present the same brief and wait. Create the local
  commit and continue only after the user approves or says to continue.

The selected mode applies for the command run unless the user changes it. Neither mode permits push,
deployment, migration, production access, or another operator-gated action.

## Prepare

Resolve the change, store, planning root, and implementation workspace through the Apply procedure.
Read every returned context path. Preserve the distinction between the planning root and the code
workspace. Stop for a blocked or all-done state as the Apply procedure requires.

Inspect the current Git status before delegation. Preserve unrelated changes and include the dirty
baseline in every worker brief. A checkpoint commit may contain only files and task-ledger changes
accepted in this command run. If an intended batch overlaps a pre-existing modification that cannot be
staged independently, stop for the user rather than including or overwriting it. Workers and reviewers
never commit. Never push, deploy, migrate, enable scheduling, access live credentials, or perform
another operator-gated action unless the user separately authorizes it.

## Select The Next Batch

Starting with the earliest pending implementation task, select one small coherent batch, normally one
to four adjacent task IDs. A batch must produce one observable outcome with one focused acceptance
gate. Include an adjacent task only when it is part of the same implementation-and-test loop.

Follow ledger order. Skip an explicit operator-only gate only when the OpenSpec contract makes clear
that later implementation is independent; retain and report the gate as pending. Stop rather than
jumping ahead when a dependency, product decision, external authority, or missing evidence blocks the
next implementation task.

Do not derive an exact full-change plan. Use bounded repository inspection only to identify the next
batch's relevant seams, likely writes, exclusions, and focused tests. If the task text is too broad to
yield one observable outcome, narrow the batch rather than delegating the whole heading.

An explicit no-write verification task that only runs established local gates or inspects existing
metadata is coordinator-owned, not a Luna batch. When it directly follows and verifies the current
implementation batch, run and accept it before that batch's review, brief, and checkpoint commit. Do
not create a separate worker or checkpoint for ledger-only acceptance.

## Delegate The Batch

Use one fresh `delegate_general` call with:

- model `openai/gpt-5.6-luna`;
- variant `max`;
- no `task_id`.

The worker brief must require the worker to load `openspec-apply-change`, read every supplied OpenSpec
context path, and implement only the selected task IDs. Include:

- exact task IDs and descriptions;
- the observable batch outcome and acceptance criteria;
- implementation workspace and planning root;
- complete OpenSpec context paths;
- relevant repository seams and the dirty baseline;
- expected writes or the narrow writable area, plus explicit exclusions;
- focused verification commands and pass conditions;
- satisfied dependencies and unresolved operator gates; and
- a handoff listing changed files, tests and outcomes, blockers, and remaining scope.

The worker uses Apply for context and implementation discipline but leaves the task ledger unchanged.
The coordinator owns acceptance checkboxes. The worker must preserve unrelated changes, avoid broad
discovery, and report a blocker before widening scope or inventing behavior.

## Accept The Batch

After the worker returns:

1. Inspect the handoff and complete diff against the brief and dirty baseline.
2. Confirm changed files belong to the selected batch and no unrelated change was overwritten.
3. Run the focused acceptance gate independently.
4. Mark only task IDs whose observable criteria pass.
5. Refresh `openspec instructions apply` with the selected store and reconcile progress.

Do not accept a task from worker self-report alone. If the batch fails, classify the concrete failure
before retrying. Use at most one fresh Luna/max remediation for that batch; unresolved product,
authority, security, or likely irreversible-data risk stops for the user.

## Periodic Review

Coordinator review is sufficient after ordinary batches. Run one fresh read-only Sol/high review only
when one of these triggers occurs:

- three accepted implementation batches have accumulated since the previous independent review;
- a coherent subsystem or vertical milestone is complete and the next batch moves to another seam;
- the accepted work materially affects authority, security, concurrency, irreversible state, or
  immutable evidence; or
- the change is ready for final verification and implementation changes remain unreviewed.

Do not review merely because one worker finished. Do not resume a prior reviewer.
An independent review resets the accumulated-batch count. A later no-write verification task or
ledger-only update does not trigger another review when the previous review already covered every
implementation change and the coordinator's verification passes.

For the independent review, use one fresh `delegate_general` call with `openai/gpt-5.6-sol` at `high`
and no `task_id`. Require it to load `thermo-nuclear-code-quality-review`, then review only the
accepted task IDs, changed paths, OpenSpec anchors, and observable criteria accumulated since the
last review checkpoint. The review is read-only and may not delegate.

Every finding must state a concrete trigger and be classified as:

- `blocker`: an accepted criterion is false or there is evidenced authority, security, likely
  irreversible-data, or ordinary-path correctness risk;
- `follow-up`: useful hardening that does not invalidate acceptance;
- `future task`: behavior owned by an unimplemented task or separate change; or
- `closed`: unsupported, duplicate, preference-only, or already covered.

Low likelihood alone does not dismiss a high-impact authority or irreversible-data risk, but a
hypothetical concern without a credible trigger does not block. The reviewer cannot add acceptance
criteria or reopen previously reviewed work merely to improve it.

Consolidate accepted blockers into one fresh Luna/max remediation. The coordinator verifies the
specific fixes and gates without commissioning a second review. Record follow-ups and future tasks
without implementing them. If a blocker remains after remediation, stop for the user rather than
starting a review loop.

## Brief And Commit The Checkpoint

After coordinator acceptance and any triggered review or remediation, present one checkpoint brief
before continuing. Explain the work for a human following the product and the implementation:

- **Product:** what behavior or capability now exists, why it matters, and how it advances the final
  OpenSpec outcome;
- **Architecture:** affected components, boundaries, data flow, important decisions, and how this
  checkpoint fits the intended end-state architecture;
- **Code:** changed files and the important functions, types, adapters, tests, or infrastructure,
  described at a useful code-review level rather than as a raw file list;
- **Evidence:** focused gates, independent-review dispositions when present, known limitations, and
  remaining tasks or operator gates; and
- **Commit:** the exact files intended for the checkpoint and a proposed Conventional Commit message.

Then follow the selected mode:

- In `continuous`, inspect status and diff, stage only the accepted checkpoint files, create the local
  commit, report its hash, and continue.
- In `approval-gated`, leave the checkpoint uncommitted and stop after the brief. Incorporate requested
  changes if any. On approval or `continue`, recheck the diff, commit only the accepted checkpoint,
  report its hash, and resume batch selection.

Never combine unrelated pre-existing changes with a checkpoint. A failed commit or hook stops the run
for repair and a new commit attempt; do not amend, skip hooks, or continue with an uncommitted accepted
checkpoint.

## Continue Or Finish

Repeat batch selection, delegation, acceptance, and triggered review until Apply reports all done, an
operator gate or design decision blocks progress, or the user interrupts.

At each pause or completion, report:

- task IDs accepted in this run and current progress;
- implementation batches and their observable outcomes;
- focused gates and results;
- whether an independent review ran, its dispositions, and any remediation;
- pending operator gates, follow-ups, future tasks, or blockers; and
- checkpoint commit hashes or the approval-gated uncommitted checkpoint; and
- whether the change is ready for verification or archive.
