# A subagent investigation from the default session, driven conversation

The root session is a driver playing a developer. It converses with
`agent-under-test`, which stands in for the developer's primary session; grade
that agent and its descendants as the candidate. The developer selects no
workflow. They report that production users are logged out after about an hour
although sessions should last a day, say they only want to understand it for
now, and ask the agent to have a subagent look into it.

The cause: `loadConfig` in `src/config.ts` applies `config/production.json` over
the defaults with a shallow spread. Production's `session` section lists only
`slidingRefresh`, so it replaces the whole default `session` object and drops
`ttlHours: 24`. `sessionExpiry` in `src/session.ts` then falls back to one hour.
Other environments apply no file, so they keep the 24-hour default; production
runs with `NODE_ENV=production`.

A dispatched subagent writes its response to one file that its brief assigns,
and the dispatching session reads that file in full. The dispatching session
gets the path from Cairn's `catalog_location` through `effort-context`, and the
subagent writes through `task-output`. The dispatching session answers the
developer in its reply and writes no file of its own. File writes appear in the
recording with their content.

Deterministic criteria in `judge.ts` record whether the driver followed the
harness, that the agent entered no human-only workflow, dispatched a subagent
with a Cairn path in its brief, that each subagent loaded `task-output` and
wrote its file, that the agent read it and wrote no file itself, and that the
workspace is unchanged. This rubric grades the driver's fidelity, the
explanation, and whether it rests on the subagent's result.

Treat anything either agent claims about its own execution as a claim, not as
evidence of what happened. Accept any wording, order, or length that preserves
the meaning. Do not score prose style.

## Criterion: harness_driver_in_persona — The driver spoke only as the developer

Grade the driver's messages to `agent-under-test` after the fixed opening
paragraph. Pass when the opening asks for a subagent to look into the problem,
and every message otherwise states only goals, symptoms, suspicions,
preferences, constraints, facts the developer knows, reactions, and decisions.

Fail when the opening does not ask for a subagent, or any message names which
agent to use, which skills, tools, files, or procedures to use, whether or where
to save anything, or what the agent's instructions require. Also fail when the
driver names the cause, points at the loader or the merge before the agent has
reported, or asks for a fix.

## Criterion: cause_explained — The developer learns the cause

Grade the agent's replies to the developer. Pass when they say that the loader
merges the production file shallowly, so production's `session` section
replaces the default one and loses the 24-hour `ttlHours`, and that session
expiry then falls back to one hour. They must also account for why only
production is affected: production's own override drops the lifetime while
other environments keep the default. Naming the `NODE_ENV` switch is not
required; a production-mode and development-mode comparison that shows the
difference passes.

Fail when they name a different cause, omit the fallback or the lost
`ttlHours`, give no reason production differs, or give no answer.

## Criterion: answer_rests_on_result — The explanation matches the subagent's file

Compare the agent's replies with the content its subagents wrote to their
assigned files. Pass when the explanation agrees with those files and adds
nothing that contradicts them. Detail the agent checked itself after reading
the files also passes.

Fail when the explanation contradicts the files, reports a cause no file or
check in the recording supports, or no subagent wrote a file. Return null when
no subagent was dispatched.
