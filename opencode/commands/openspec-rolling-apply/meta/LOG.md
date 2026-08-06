# Log

## 2026-08-06 - Initial Rolling Apply Design

- Chose a new `/openspec-rolling-apply` command rather than replacing `/apply-spec` or revising the
  generated `openspec-apply-change` skill.
- Kept OpenSpec Apply and its task ledger authoritative instead of generating a complete execution
  plan, worker map, dependency DAG, or payload forecast.
- Selected fresh Luna/max implementation workers because observed cost was dominated by repeated Sol
  review, not Luna implementation.
- Made a batch one to four adjacent tasks with one observable outcome, while allowing a narrower batch
  whenever evidence or semantic boundaries require it.
- Retained coordinator-owned task acceptance even though workers load Apply for context and execution
  discipline.
- Chose periodic, fixed-charter Sol/high thermonuclear review after three batches, at subsystem
  boundaries, for material risk, or before final verification; ordinary batches use coordinator
  review only.
- Limited review fallout to one consolidated Luna remediation followed by coordinator verification.
  A second reviewer or automatic review-until-clean loop is outside the command.
- Classified speculative hardening and later-task behavior separately from blockers while preserving
  a stop for credible authority, security, or likely irreversible-data risk.
- Packaged the command with four `meta/` artifacts and required Mindframe-Z to render only
  `COMMAND.md`, preserving the development contract without runtime context load.

## 2026-08-06 - Human Control And Checkpoint Commits

- Added `continuous` and `approval-gated` invocation modes instead of the ambiguous hands-off label.
- Required the same product, architecture, code, evidence, and commit brief after every accepted worker
  checkpoint, including checkpoints that pass through periodic review and remediation.
- Made checkpoint commits coordinator-owned. Workers and reviewers remain unable to commit or alter
  Git history.
- In continuous mode, the coordinator commits accepted files and proceeds automatically. In
  approval-gated mode, it pauses with an uncommitted checkpoint and commits only after the user says to
  continue.
- Required exact staging against the dirty baseline and a stop when accepted work cannot be separated
  from pre-existing modifications.
- Kept pushes and operational actions outside both modes; control mode changes implementation cadence,
  explanation, and local commit approval only.

## 2026-08-06 - Collapse Verification Into Its Implementation Checkpoint

- A live continuous-mode evaluation completed correctly but delegated a fourth Luna worker solely to
  run the full suite and inspect empty dependency sections after three implementation batches.
- The same run then commissioned a second Sol review because final readiness fired immediately after a
  comprehensive third-batch milestone review, despite no intervening implementation change.
- Made explicit no-write verification tasks coordinator-owned and required adjacent verification to
  complete before the implementation batch's review, brief, and commit.
- Reset review cadence after an independent review and excluded coordinator-only verification and
  ledger edits from unreviewed implementation, preventing duplicate final review of the same code.

## 2026-08-06 - Defer Near-Final Boundary Review

- The aligned rerun correctly removed the verification worker and ledger-only commit but still
  reviewed the library boundary immediately before the final CLI batch, then reviewed the CLI boundary
  at completion.
- Kept subsystem transitions as review triggers for larger changes, but deferred them when only one
  bounded implementation batch plus coordinator verification remains.
- Required one final review over the complete accepted change in that case, unless material risk
  justifies both checkpoints.
