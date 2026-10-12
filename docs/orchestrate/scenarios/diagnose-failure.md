# Diagnose a failure

## The ask

"authd is getting OOM-killed on a bunch of laptops since we shipped 2.4.0. ISSUE.md has the helpdesk report and a heap profile. Find out why."

## What should happen

1. The cause isn't evident from the report, so the orchestrator dispatches default triage without asking Mark. The brief names `debugging` to load and points to `ISSUE.md` and the profile rather than restating them.
2. Triage gathers its own evidence: the report, the heap profile, the history between 2.3.2 and 2.4.0, and a run of the repro. It uses 2.3.2 as the comparison case and changes nothing.
3. Triage returns a case: the cause and its confidence, the facts behind it with where each came from, each ruled-out hypothesis with the fact that ruled it out, and the smallest next action.
4. The orchestrator checks the case against the facts and brings Mark the cause and the fix options with their trade-offs. Mark decides the fix.
5. An implementer makes the chosen fix and verifies it against the signal triage found.

When the evidence is too large for one context, spread across systems, or behind access triage shouldn't hold, inspectors or explorers gather it first and return raw facts without conclusions. Triage then reasons over their saved results.

## What must not happen

- The orchestrator reads the heap profile and source itself instead of delegating.
- Triage fixes the code or picks the fix.
- Gatherers return conclusions such as "memory looks normal" instead of the measurements behind them.
- The orchestrator escalates to Sol triage without Mark's agreement.
- An error that already names its cause goes through triage instead of straight to an implementer.

## Done looks like

Mark has the cause with its evidence, chooses a fix, and has the fix verified against the same signal.
