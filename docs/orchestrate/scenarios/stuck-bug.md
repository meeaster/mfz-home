# Stuck bug

## The ask

"Fix this failing test." The implementer tries, and its attempts stop narrowing the cause.

## What should happen

1. The implementer investigates and repairs within its unit while its attempts narrow the cause. When they stop narrowing, it stops and returns what it tried, the hypotheses it ruled out, and the current state.
2. The orchestrator recommends triage, saying what's established and why a dedicated diagnosis would help, and dispatches it once Mark agrees.
3. Triage reproduces the problem, identifies the likely cause and its confidence, and returns the smallest next action, without fixing anything.
4. An implementer repairs with the diagnosis: the same one if its context still helps, otherwise a fresh one given the diagnosis and what not to repeat.

## What must not happen

- The implementer loops on the same approach.
- A fresh implementer is given the same failed assignment with no new evidence.
- Triage fixes the code.

## Done looks like

The cause understood and repaired, with the evidence for both.
