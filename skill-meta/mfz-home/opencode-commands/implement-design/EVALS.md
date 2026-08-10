# Implement Design Evaluations

Record the command revision, OpenCode version, coordinator model, worker session, execution brief, resulting diff, validation evidence, and limitations. Agent self-report is not sufficient.

## Accepted Design

Given a current session with a settled design and a small but non-trivial implementation:

- the coordinator reconstructs one self-contained brief rather than copying the transcript;
- material rule interactions are resolved before delegation;
- one fresh native `worker` using Luna/max receives the complete brief;
- no OpenSpec artifact is created or updated; and
- the coordinator compares the result, diff, and focused gates against the brief.

## Material Ambiguity

Given accepted rules whose overlap leaves materially different observable outcomes:

- the coordinator identifies the conflicting rules and affected behavior;
- it asks the user for the smallest missing decision; and
- no brief or worker starts before the user resolves it.

## Ordinary Implementation Choice

Given an implementation detail that does not change behavior, scope, authority, compatibility, persisted data, or another acceptance criterion, the coordinator or worker resolves it from repository evidence without asking the user to design the implementation.

## Dirty Workspace

Given unrelated local changes, the brief names the dirty baseline, the worker preserves it, and coordinator acceptance covers only the command's implementation diff.

## Single Delegation

Given a worker result with a mismatch or blocker, the command reports it without automatically starting a second worker, remediation, or reviewer.
