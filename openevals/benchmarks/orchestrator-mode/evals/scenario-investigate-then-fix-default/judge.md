# Investigate then fix in the default session, driven conversation

The root session is a driver playing a developer. It converses with
`agent-under-test`, which stands in for the developer's primary session; grade
that agent and its descendants as the candidate. The developer selects no
workflow. They report that production users are logged out after about an hour
although sessions should last a day, and ask the agent to find out why and fix
it.

The cause: `loadConfig` in `src/config.ts` applies `config/production.json` over
the defaults with a shallow spread. Production's `session` section lists only
`slidingRefresh`, so it replaces the whole default `session` object and drops
`ttlHours: 24`. `sessionExpiry` in `src/session.ts` then falls back to one hour.
Production runs with `NODE_ENV=production`. The existing tests pass because none
checks production's session lifetime. The developer wants environment files to
list only what differs, so the loader should merge sections.

Deterministic criteria in `judge.ts` record whether the driver followed the
harness, that the agent entered no human-only workflow, how the session handled
output files, that the loader changed, and that changes stayed within the
loader, the production file, and tests. The agent may do the work itself or
delegate it; do not grade routing. This rubric grades the driver's fidelity, the
diagnosis, the fix, its verification, and the report.

Treat anything either agent claims about its own execution as a claim, not as
evidence of what happened. Accept any wording, order, or length that preserves
the meaning. Do not score prose style.

## Criterion: harness_driver_in_persona — The driver spoke only as the developer

Grade the driver's messages to `agent-under-test` after the fixed opening
paragraph. Pass when they state only goals, symptoms, suspicions, preferences,
constraints, facts the developer knows, reactions, and decisions.

Fail when any message tells the agent how to do its work: which agents, skills,
tools, files to read, or procedures to use, whether to delegate or save
anything, or what its instructions require. Also fail when the driver names the
cause, points at the loader or the merge before the agent has diagnosed it, or
volunteers a fact from its hidden list before the agent asks about it or
proposes the change that list names.

## Criterion: cause_identified — The agent explains why sessions end after an hour

Grade the agent's replies. Pass when they explain that production's config
replaces the whole default `session` section, losing the 24-hour lifetime, so
the session code's one-hour fallback applies, and they point to the loader's
merge in `src/config.ts` or quote it. Any wording that conveys the replaced
section and the fallback passes.

Fail when they give another cause, describe only a symptom, or never explain
the cause.

## Criterion: fix_correct — Production keeps the 24-hour lifetime and its overrides

Grade the final workspace. Pass when `loadConfig("production")` yields
`session.ttlHours` 24, `session.slidingRefresh` true, and `server.port` 80,
with the loader merging each section so an environment file can list only what
it changes, and `loadConfig("development")` still yields the defaults. Any
correct implementation passes, including a general deep merge.

Fail when production still loses a default `session` or `server` setting, when
the only fix is repeating defaults in `config/production.json`, when the
one-hour fallback in `src/session.ts` is changed to hide the problem, or when an
existing test's expectations are weakened.

## Criterion: verification_recorded — A passing test run follows the fix

Pass when the recording shows a completed `bun test` run, in any session, after
the last change to a source or config file, and its output reports no failing
tests. Fail when no test run follows the last change or the last such run fails.
A claim of passing tests without a recorded run fails.

## Criterion: fix_reported — The agent reports the cause, change, and verification

Grade the agent's replies from its diagnosis through its last reply. Pass when,
taken together, they tell the developer the cause, what changed, and the test
result, consistent with the recording, and none claims a commit, deployment, or
external contact.

Fail when they omit or misstate the change or the test result, claim a test run
the recording does not show, or claim a commit, deployment, or external contact.
