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
