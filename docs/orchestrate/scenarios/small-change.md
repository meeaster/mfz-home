# Small change

## The ask

"The `list` command should sort by due date instead of creation date."

## What should happen

1. **Propose the shape.** The orchestrator says it's a small change: one acceptance criterion with its check ("`list` shows items in due-date order; checked by running it on the fixture data"), one implementer that verifies its own work, no inspector or review. Mark can ask for more.
2. **Build and verify.** An implementer makes the change, loads `verification`, and returns the criterion's result with its evidence.
3. **Close.** The orchestrator reports the result in a line or two and offers a handoff evidence pass rather than running one. If Mark asks for a PR, the PR gets the final pass.

## What must not happen

- The full flow runs anyway: architect, inspector, reviewer, or QA for a one-line change nobody asked to have reviewed.
- The change is reported done on "tests pass" without running the command.
- An evidence pass runs for work Mark watched and didn't ask to publish.

## Done looks like

The change made and checked, in a short report Mark can accept at a glance.
