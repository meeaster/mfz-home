# Evaluations

These are expected scenarios for the recorded source contract, not current-runtime passes. [MAINTENANCE.md](MAINTENANCE.md) records unresolved availability and dependency compatibility. [LOG.md](LOG.md) retains the observed failures that motivated packing and review limits; neither observation establishes that the revised behavior passed. No live tests were run for this record update.

## Plan-Only Contract Regression

Given an isolated fixture with at least two pending hierarchical tasks and more than one plausible execution group:

- the coordinator copies the planner prompt template without compressing, renaming, reordering, or omitting fields;
- the planning result states `Read all <N> context paths` with the supplied count or names every unreadable path in an incomplete report;
- every pending hierarchical task ID appears exactly once;
- every execution group includes explicit out-of-scope paths;
- every context-budget estimate uses characters, with any token equivalent separately labeled and derived from that estimate;
- candidate reads may remain candidate paths, but proposed writes are exact paths; and
- the coordinator rejects a result missing any required field without implementing, changing task state, or repairing the plan locally.

Inspect the loaded skill path, exact planner prompt, planner result, coordinator validation, fixture diff, task ledger, model route, and available session cost metadata.

### Historical result: 2026-07-13

An installed-skill run used parent session `ses_0a552a001ffefeyXdyrbQDxSSJ` with a Sol/high planning child, `ses_0a550ffa0ffeAR7VVrQDlgHZuZ`. The planner attested that it read all 10 context paths, mapped all 32 tasks once, included six out-of-scope sections, and used character estimates. Phase 3 correctly rejected the plan because deterministic schema gates omitted the generate/hash/regenerate/hash-compare protocol and most exclusions named semantic categories instead of exact paths. The implementation clone and planning ledger remained unchanged.

This evidence predates later source revisions and does not establish that the current prototype passes. The run used an isolated implementation clone with a real standalone planning change mounted read-only; unreadable-context and deliberately malformed-plan branches remain untested.

## Large Cross-Cutting Change

Given an OpenSpec change with 20-30 tasks spanning configuration, command behavior, migration,
documentation, verification, PR publication, and cleanup:

- the planner maps every task exactly once;
- it derives cohesive work packages before assigning workers;
- it normally returns two to five implementation workers rather than one worker per heading;
- PR approval, merge waiting, real-home apply, and cleanup approval appear as checkpoints, not
  implementation workers;
- each fresh-worker boundary identifies a substantially different file/semantic area, repository
  authority boundary, or mandatory context split;
- the report leads with the actual sequential worker list.

## Overlapping Core Files

Given several task sections that all modify the same command, storage, and fixture files:

- the planner prefers one worker for the overlapping implementation loop when payload remains safe;
- it does not split solely because task headings or verification phases differ;
- it reports the duplicated-read cost if it chooses multiple workers.

## Disjoint Areas

Given one package in a parser subsystem and another in an unrelated renderer subsystem:

- the planner may assign fresh workers when the second session can avoid reading the first subsystem;
- each worker has an exact write set and focused gate;
- workers remain sequential.

## Small Change

Given a bounded change that fits one Luna/xhigh working set:

- a Luna/xhigh coordinator selects current-session execution;
- another coordinator route selects one delegated worker;
- the planner does not manufacture multiple sessions.

## Excessive Split Rejection

Given a plan with more than six implementation workers:

- validation requires a concrete context, file-area, or repository-authority justification for every
  boundary;
- mechanical heading, documentation-only, operator-only, and verification-only workers are rejected;
- the coordinator reports the plan blocked rather than silently repacking it.

## Bounded Review And Remediation

Given a change with a material immutable-data or authority boundary and an independently reproduced
acceptance failure:

- the plan uses one chartered read-only review checkpoint rather than another implementation worker;
- the finding cites an exact owned task, artifact anchor, observed failure, and ordinary execution
  impact;
- the coordinator batches accepted blockers into one remediation and verifies only those blockers and
  directly changed lines;
- a newly noticed generic quality concern is recorded as a follow-up, not added to the batch; and
- another remediation or broader review stops for an explicit user decision unless urgent risk is
  evidenced.

Given a `coordinator-only` route whose diff review or focused gate exposes an anchored acceptance
failure:

- the coordinator uses the same disposition and one-batch remediation limit;
- a retry is not created before the failure is classified as an accepted blocker; and
- a passing closure updates the held task IDs and refreshes Apply progress.

## Future-Task Boundary

Given a reviewer concern about a capability assigned to a later OpenSpec task:

- the concern identifies that future task and remains a `future task` unless the current task cannot
  meet an anchored acceptance criterion without it;
- the coordinator does not reopen accepted current tasks merely because the later capability shares a
  contract or storage seam; and
- a small ordinary change retains `coordinator-only` review with no independent reviewer.
