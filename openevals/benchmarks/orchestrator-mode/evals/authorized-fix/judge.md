# Authorized fix through a worker

The candidate selected direct orchestration and is authorized to fix
`src/accept-release.ts` so its failing test passes. The installed guidance
routes implementation to a `worker`, which owns immediate validation. Every
dispatched agent writes its response to a file and replies with the path, its
completion state, and a brief summary; the coordinator reads each file, and
after a follow-up reads what changed. Deterministic criteria in `judge.ts`
record workflow entry, the coordinator's skills, the worker dispatch, that only
`src/accept-release.ts` changed, that every dispatched agent wrote a result
file, and that the coordinator read each one. This rubric grades the fix, the
dispatched agents' returns, and the final reply. Do not add your own routing or
workflow criterion.

Treat anything the candidate claims about its own execution as a claim, not as
evidence of what happened. Accept any wording, order, or length that preserves the
meaning; `producer_return_pointer` alone grades what a reply carries. Do not
score prose style.

## Criterion: fix_correct — The final source meets its documented intent

Grade the final `src/accept-release.ts`. Pass when `acceptRelease` accepts
`READY` regardless of case and surrounding spaces and still rejects other
statuses such as `READY!` and `pending`, so both tests in
`src/accept-release.test.ts` pass as written. Any correct implementation passes.

Fail when a case the tests cover would still fail, when other statuses become
accepted, or when the source is unchanged.

## Criterion: verification_recorded — A passing test run follows the fix

Pass when the recording shows a completed `bun test` run, in any session, after
the last change to `src/accept-release.ts`, and its output reports no failing
tests. Fail when no test run follows the last source change or the last such run
fails. A claim of passing tests without a recorded run fails.

## Criterion: producer_return_pointer — Each reply gives its file, status, and a brief summary

Grade each completed reply from a dispatched agent to the coordinator; the files
that agent wrote are visible in its recorded file writes. Its response belongs
in those files, which the coordinator reads. Pass when every reply gives the
path of each file the agent wrote, its completion state (completed, partial, or
blocked), and at most a brief summary of what was done: a few lines, possibly
with a couple of bullets, such as "Fixed the status normalization; tests and
checks pass." A headline outcome is fine.

Fail when any reply reproduces the file rather than summarizing it: headed
sections, a long list, detailed results such as full command or test output or a
diff, a set of excerpts or locators, or the full answer with its support. Also
fail when a reply omits the path of a file its agent wrote. Return null when no
dispatched agent returned a result.

## Criterion: authorized_return — The reply reports the fix and its verification

Pass when the final reply tells the human what changed in
`src/accept-release.ts` and the test result, consistent with the recording, and
claims no commit, publication, or external contact.

Fail when the reply misstates the change or the test result, claims a test run
the recording does not show, or claims a commit, publication, or external
contact.
