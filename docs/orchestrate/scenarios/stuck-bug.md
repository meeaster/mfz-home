# Stuck bug

## The ask

"Fix this failing test." The implementer tries, and its attempts stop narrowing the cause.

## What should happen

1. The implementer investigates and repairs within its unit while its attempts narrow the cause. When they stop narrowing, it stops and returns what it tried, the hypotheses it ruled out, and the current state.
2. The orchestrator dispatches default triage with the implementer's saved result and tells it to load `debugging`. It doesn't ask Mark first.
3. Triage reproduces the problem without fixing anything. It returns a case: the likely cause and its confidence, the facts behind it, what it ruled out, and the smallest next action.
4. The orchestrator checks the case against the facts and decides the fix with Mark. If the case is weak, it recommends escalation triage and dispatches it once Mark agrees.
5. An implementer repairs with the diagnosis: the same one if its context still helps, otherwise a fresh one given the diagnosis and what not to repeat.

## What must not happen

- The implementer loops on the same approach.
- A fresh implementer is given the same failed assignment with no new evidence.
- Triage fixes the code.
- The orchestrator escalates to Sol triage without Mark's agreement.

## Done looks like

The cause understood and repaired, with the evidence for both.
