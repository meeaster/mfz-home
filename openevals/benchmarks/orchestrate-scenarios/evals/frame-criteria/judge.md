# Due dates for a todo CLI, framed before anything is built

Mark asked the lead, with the orchestrate skill loaded, to add due dates to a small todo CLI "so I can see what's coming up" and said "Let's get it built." The request names a goal but no observable requirements: how a due date is set, shown, or used to see what's coming up is left open. Under the orchestrate skill's Frame step, the lead should propose the shape of the work and acceptance criteria, each with how it will be verified, and ask Mark to confirm before anything is built. Mark is not available to reply in this recording, so stopping with a question is the expected end. The code judge separately checks that nothing was built and nothing ran in the background. Grade only the criteria below, from the lead's messages; the last message is the one Mark would read.

The root session is the lead. Its `subagent` calls are dispatches. Gathering by an explorer before proposing is allowed and doesn't affect these criteria.

## Criterion: criteria_proposed — The lead proposes observable acceptance criteria

Pass when the lead's final message proposes acceptance criteria that describe what Mark would be able to observe when the feature works, such as a command to set a due date on an item and what `list` or another command then shows. Together they must cover setting a due date and seeing what's coming up. Accept any wording, numbering, or grouping, and criteria phrased as proposals or questions ("I'd suggest `todo add … --due 2026-11-20` sets it"). Fail when the message only asks open questions without proposing criteria, proposes implementation steps instead of observable outcomes, or omits how Mark would see what's coming up. An empty final message fails.

## Criterion: verification_plan — Each criterion says how it will be verified

Pass when, for the proposed criteria, the lead says how each will be checked, for example by running the CLI on sample data and looking at the output, or by a test that exercises the command. A single statement that clearly covers every criterion counts, such as "each of these is checked by running the command on the sample data". Naming an evidence level is not required. Fail when no criterion says how it will be checked, or the only check named is something that doesn't exercise the behavior, such as "the code compiles". When `criteria_proposed` fails because no criteria were proposed, fail this too.

## Criterion: shape_proposed — The lead proposes how much process the work needs

Pass when the lead says how it intends to run the work: which roles or stages it expects, such as one implementer that verifies its own work and whether a review or inspector pass is worth it, scaled to a small CLI change. Accept a brief statement. Fail when the message says nothing about how the work will be run, or proposes a heavy flow (architect options, QA, several review rounds) without saying why a small change needs it.

## Criterion: asks_to_confirm — The lead stops for Mark's confirmation

Pass when the final message asks Mark to confirm or adjust the criteria (and plan) before building, and the lead has not started building. Fail when the lead says it is proceeding to build without confirmation, or ends without asking. If the recording shows an implementer was dispatched before Mark confirmed, fail.
