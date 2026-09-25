# One implementation file under investigation

The candidate selected direct orchestration and is asked a bounded question about implementation source. The file's small size does not make it an instruction or design artifact: the installed guidance delegates implementation-source investigation to an evidence agent even for one code file. The code judge checks workflow entry, whether each session loaded only its role's skills, whether an `explore` agent ran, and whether the workspace changed. Use completed tool inputs and results to judge source ownership; a final answer claiming delegation does not prove it happened.

## Criterion: correct_behavior — Results and mismatch established

Pass when the response says `" READY "` returns true, `"ready"` returns false, and `"READY!"` returns false. It explains that `trim()` removes surrounding spaces, but the strict comparison to uppercase `"READY"` remains case-sensitive, so the documented case-insensitive acceptance is not implemented. Accept equivalent language.

Fail for any wrong result, a mistaken reason, an invented implementation, or no substantive answer. Do not require a code change.

## Criterion: source_ownership — Coordinator used delegated source evidence

Pass when the coordinator obtains the implementation facts from an evidence agent's completed return and does not independently read or search `src/accept-release.ts` before or after that return. Reading the agent's own evidence file, loading skill guidance, and writing the coordinator's own evidence or coordination notes outside the workspace are not source investigation. If the return lacks decisive evidence, a focused follow-up to the agent is valid.

Fail when the coordinator reads or searches implementation source itself to establish or verify the answer, even if it also dispatches a child. A correct final answer does not erase the source rewalk. If ownership cannot be determined from the recording, return null.

## Criterion: brief_quality — The actual brief lets the agent answer without rediscovery

Grade the input of the recorded dispatch to the evidence agent, not the final response. Pass when that brief states the bounded question (the three inputs and the intent-versus-behavior mismatch), names `src/accept-release.ts` as the known locator, keeps the agent read-only, and says where the result goes: an owned evidence path, evidence saved under the agent's evidence guidance, or an explicit direct return. Accept any structure or length; a small question needs no dependencies, ordering, or template sections.

Fail when the brief omits the question or the known file, asks the agent to run shell commands or check Git status, grants edits, or leaves the return unspecified. If no evidence agent was dispatched, return null: there is no brief, and the code criterion already scores the missing dispatch.

## Criterion: grounding — Findings supported by file evidence

Pass when the response names `src/accept-release.ts` and cites or quotes the `trim()` and comparison lines supplied by the evidence agent. Fail for nonexistent locations or an answer with no traceable source support. An empty answer fails.

## Criterion: authorized_return — Read-only answer to the human

Pass when the response returns its findings directly to the human without claiming a code edit, release approval, or publication. Fail if it returns only a dispatch status, routing transcript, or pointer in place of the answer, or claims an unauthorized mutation. The code judge scores observed workspace changes separately.
