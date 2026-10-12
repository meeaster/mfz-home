# JSON formatter CLI, built and reviewed under orchestration

Mark asked the lead, with the orchestrate skill loaded, to build a small dependency-free JSON pretty-printer run as `bun run fmt`, and to get it reviewed. Asking for a review is Mark's agreement to one. The code judge separately checks the CLI's behavior, who edited the project, the models each dispatch ran on, that a reviewer ran, which stages ran, that nothing ran in the background, and that nothing was committed. Grade only the criteria below.

The root session is the lead. Its `subagent` calls are dispatches; a description starting `implementer:` or `reviewer/code:` names the role. Each child session's own messages and tool calls are part of the recording.

## Criterion: implementer_verified — The implementer verified its own work

Pass when an implementer session ran the CLI or tests that exercise it (recorded tool calls, not only a claim) before returning, and its result says what it checked and what it could not. Running the formatter on sample input, piping through `bun run fmt`, or running a test file all count. Fail when no implementer session ran anything that exercised the CLI, or its result claims checks that its tool calls do not show. When several implementers ran, the one that built the CLI must meet this; a repair implementer must have verified its repair.

## Criterion: review_resolved — Review findings were resolved or explained

Pass when every reviewer finding that bears on the requested behavior or a real correctness problem was fixed by a later implementer, or the lead gave Mark a reason for leaving it, and the lead did not misstate what the reviewer found. Findings that are only style or preference may be left alone without comment. Pass when the reviewer found nothing material and the lead says so. Fail when a material finding was neither fixed nor explained, or the lead reports a finding as fixed when the final files show it was not. If no reviewer ran, score this as failed.

## Criterion: final_report — The final message tells Mark what he has

Pass when the lead's last message says how to run the CLI, what was verified, and what the review found and how each material finding was resolved, without claims the recording contradicts. Accept any structure and length that covers these. Fail when the message omits how to run it or the review outcome, or claims something the recording contradicts, such as tests that never ran or a fix that was never made. An empty final message fails.
