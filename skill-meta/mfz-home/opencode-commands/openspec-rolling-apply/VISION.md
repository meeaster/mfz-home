# Vision

## Problem

Large OpenSpec changes need more implementation context than one coordinator should carry, but a
complete up-front orchestration plan duplicates the task ledger, speculates about distant files, and
creates worker maps that become stale. Repeated holistic reviews can then turn low-probability
hardening and future-task concerns into an open-ended remediation loop.

## Intended Behavior

`openspec-rolling-apply` keeps OpenSpec Apply authoritative and delegates only the next bounded batch.
A Sol coordinator reads the current Apply state, selects one to four adjacent tasks that produce one
observable outcome, delegates implementation to a fresh native `worker`, verifies the diff and focused
gate, updates accepted checkboxes, and refreshes Apply state before selecting more work.

No-write verification tasks remain with the coordinator and, when they validate the current batch,
close before its review and checkpoint. They do not become artificial workers, commits, or reasons to
review unchanged implementation twice.

The workflow follows ledger order without inventing a second plan. Explicit operator gates may remain
pending while independent later implementation proceeds, but unresolved dependencies, product
semantics, or missing evidence stop the roll rather than being guessed around.

Apply operation guidance remains a live input rather than being copied into this command. Each Luna
worker loads Apply and resolves the current guidance for the selected store. It may maintain companion
files and reconcile affected OpenSpec artifacts when that guidance requires it, while completion
checkboxes and the run journal remain coordinator-owned.

Each run maintains one Markdown journal beside the OpenSpec change. Its resume contract makes a fresh
or compacted coordinator operational without replaying the transcript; its current state and
append-only activity log make progress auditable; and its code-health register prevents review findings
from being lost between checkpoints. The journal reconciles against OpenSpec, Git, and test evidence and
never replaces those authorities.

At invocation, the human chooses `continuous` or `approval-gated` control. Every accepted checkpoint
produces a product, architecture, code, evidence, and commit brief so progress remains understandable
from both user-value and implementation perspectives. Continuous mode commits accepted work and keeps
rolling; approval-gated mode pauses before the commit and next worker so the human can inspect or
redirect the work.

Independent review is periodic and risk-triggered, not attached to every worker. A fresh native
`reviewer` uses the thermonuclear maintainability lens against a fixed milestone charter supplied with
the relevant diff and validation evidence. It classifies findings instead of making every concern a
blocker. One consolidated `worker` remediation is followed by
coordinator verification, never another automatic review.

Maintainability is handled continuously. An evidenced structural problem introduced or materially
worsened by the current work is repaired at the checkpoint where it is found when the refactor is
bounded; “this is a refactor” is not a reason to defer it. Pre-existing or genuinely cross-cutting
health work remains visible in the journal and requires an explicit owner and disposition before final
verification readiness.

## Success

The task ledger advances through small, independently testable outputs; workers retain enough full
change context to integrate correctly while acting only on their selected tasks; ordinary batches do
not incur independent review; every worker boundary has an understandable committed or approval-gated
checkpoint; and a review cannot expand acceptance criteria or create an infinite implementation-review
loop. A compacted coordinator resumes from one reconciled journal, and no accepted code-health finding
silently ages into an unowned cleanup list. Current Apply guidance reaches every implementation worker
without being disabled by a broad planning-root exclusion.

## Non-Goals

- Producing a complete worker list, dependency DAG, payload estimate, or write inventory up front.
- Replacing OpenSpec artifacts with another durable plan.
- Using the run journal as a competing task ledger or source of repository truth.
- Parallel implementation, worktree orchestration, or cherry-pick coordination.
- Commits outside accepted checkpoints, remote publication, deployment, migrations, production
  operations, or operator approval.
- Committing unrelated pre-existing work or allowing workers and reviewers to own Git history.
- Treating thermonuclear review as the functional acceptance gate for every batch.
- Caching store-specific Apply guidance in the command instead of resolving it for each batch.
- Guaranteeing a command-level OpenCode reasoning variant that OpenCode command metadata cannot set.
