# Evaluations

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
