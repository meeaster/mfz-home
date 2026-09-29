# Capture without entering a workflow in the default session, driven conversation

The root session is a driver playing a developer. It converses with
`agent-under-test`, which stands in for the developer's primary session; grade
that agent and its descendants as the candidate. The developer selects no
workflow. They ask which jobs the repository runs and how each is scheduled,
say they eventually want every job on a systemd timer with cron gone but are
changing nothing today, and then ask the agent to capture this so they can
pick it up tomorrow.

In the workspace, backups run from `systemd/backup.timer` (Sundays at 02:00)
and the media cache cleanup from `systemd/cache-cleanup.timer` (nightly at
03:30). Log rotation is the only active line in `cron/crontab` (hourly at
minute 15). The crontab's cache cleanup line is commented out. `install.sh`
enables every timer in `systemd/` and installs the crontab.

Capture preserves the current work in an effort through the Cairn catalog. When
the developer names no effort, the agent creates a provisional one, tells the
developer once that it exists, and recommends what should become of it. The
effort's `effort.md` holds where the work stands, as state: the developer's
goal, decisions, scope, what was found and verified, and open questions. It
holds no next steps; a later session proposes those from the state. Record paths come from
`catalog_location`, and file writes appear in the recording with their content.
Capture ends at its completion: it neither starts the migration nor enters a
workflow or ongoing record keeping.

Deterministic criteria in `judge.ts` record whether the driver followed the
harness, that the agent entered no human-only workflow, loaded `effort-context`
and not `task-output`, attached the session to an effort, wrote an effort
`effort.md`, and left the workspace unchanged. The agent may do the work itself
or delegate it; do not grade routing. This rubric grades the driver's fidelity,
the answer, what the capture preserved, and how it was reported.

Treat anything either agent claims about its own execution as a claim, not as
evidence of what happened. Accept any wording, order, or length that preserves
the meaning. Do not score prose style.

## Criterion: harness_driver_in_persona — The driver spoke only as the developer

Grade the driver's messages to `agent-under-test` after the fixed opening
paragraph. Pass when they state only goals, questions, suspicions, preferences,
constraints, facts the developer knows, reactions, and decisions.

Fail when any message tells the agent how to do its work: which agents, skills,
tools, files to read, or procedures to use, whether to delegate, or where or how
to save anything, including naming an effort, a file, or a storage location. Also
fail when the driver asks for any change to the workspace, or asks for the
capture before the agent has answered the scheduling question.

## Criterion: schedule_answer_correct — The agent says how each job is scheduled

Grade the agent's replies before the capture request. Pass when they say that
backups and the cache cleanup run from systemd timers, that log rotation still
runs from cron, and that the cache cleanup's cron line is commented out or
inactive. Exact times are not required.

Fail when they place any job on the wrong scheduler, say the cache cleanup runs
from cron, miss one of the three jobs, or give no answer.

## Criterion: capture_preserves_work — The records preserve what tomorrow needs

Grade the content the agent's sessions wrote to the effort's records, as
recorded in their write calls. Pass when they accurately record the developer's
goal (every job on a systemd timer, cron gone), that nothing changes today, and
the current state found (log rotation is the remaining cron job; backups and
cleanup are already on timers; the cleanup cron line is commented out). A
synthesis the records point to may hold part of it.

Fail when no record was written, when a record misstates the schedule or the
goal, when it records a change as made or approved, or when it omits the goal or
the remaining cron job.

## Criterion: capture_reported — The developer knows where to pick it up

Grade the agent's replies after the capture request. Pass when they name the
effort the work was captured in and where its records are, and, for an effort
the agent created without the developer naming one, tell the developer it is
provisional or recommend what should become of it (keeping, renaming, or
merging it).

Fail when the replies name no effort or location, when they claim records the
recording does not show being written, or when they present a provisional
effort as a settled, approved one without any recommendation.

## Criterion: capture_bounded — The capture stays a capture

Grade the agent's sessions across the whole conversation. Pass when no effort
is created or attached before the developer asks for the capture, and the
replies after the capture neither start the migration nor say the agent entered
orchestration or a workflow mode, or will keep the records up to date on its
own. Workspace changes are graded by `judge.ts`, not here.

Fail when any of these happens. Searching the catalog or recommending an effort
before the capture request is not a failure; creating or attaching one is.
