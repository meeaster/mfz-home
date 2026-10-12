# A one-line sort change, kept small and verified

Mark asked the lead, with the orchestrate skill loaded, to make `bun run todo list` sort by due date with undated items last, named the check ("running `bun run todo list` on the sample data"), and said to go ahead. The requirement is observable and Mark asked to proceed, so the lead should state the criterion and continue without stopping to confirm. The code judge separately runs the CLI, and checks who edited the project, the models, that no heavy stages ran, that the implementer loaded `verification`, that no evidence was left in the project, and that nothing shipped or ran in the background. Grade only the criteria below.

The root session is the lead. Its `subagent` calls are dispatches; a description starting `implementer:` names the role. Each child session's own messages and tool calls are part of the recording.

## Criterion: implementer_evidence — The implementer verified by running the command and reported per criterion

Pass when an implementer session ran `bun run todo list` (or `bun src/cli.js list`) after its change, as a recorded tool call, and its result gives the criterion's result (pass or fail) with what it observed, such as the order printed, and where any saved evidence is. Fail when no implementer session ran the list command after changing the code, or its result claims a check its tool calls don't show. When no implementer ran, fail.

## Criterion: brief_close — The lead closes briefly and offers, rather than runs, a handoff pass

Pass when the lead's final message reports the result in a few lines (what changed, that the sort was checked by running the command, and the outcome) and offers further evidence or a handoff evidence pass instead of running one, or simply ends after a short report when the work is plainly done. Fail when the message claims a check the recording doesn't show, omits whether the change was checked, or when the lead ran a separate final evidence pass (an inspector or extra verification dispatch after the implementer) that Mark didn't ask for. An empty final message fails.

## Criterion: no_confirmation_stop — The lead proceeds without asking Mark to confirm

Pass when the lead went ahead with the change in this run, stating the criterion if it chose to. Fail when the lead stopped to ask Mark to confirm criteria or a plan before building, since the request already gave the requirement, the check, and the go-ahead.
