# Capture and resume

## The ask

Partway through an orchestrated session: "This is worth coming back to. Capture it into an effort." Days later, in a new session: "Resume the VPN monitoring effort."

## What should happen

1. Until Mark asks, the session has no effort. Subagent results are still saved in the session's folder by Cairn.
2. On "capture", the orchestrator loads `effort-context`, recommends an existing effort or a new one named for the outcome, and, once Mark answers, records where the work stands. A writer can do the write-up from the conversation export and the saved results.
3. On "resume", `effort-context` finds the effort, reads its records, and attaches the new session.

## What must not happen

- An effort is created when orchestration starts.
- Records hold next steps or to-do lists.

## Done looks like

An effort that a later session can pick up without Mark re-explaining the work.
