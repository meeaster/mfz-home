---
name: evidence-gathering
description: Use for a deliberate investigation of a factual question, cause, alternative, or compatibility concern whose findings should support a decision or later work. Nearby code inspection during an edit is not by itself an investigation.
---

# Evidence Gathering

## Bound the question

- Identify the question, why it matters, relevant sources, applicability or version needs, and the smallest useful answer. Reuse sound existing findings before gathering more.
- Choose methods that can resolve the uncertainty. Stop when the answer has sufficient support, the remaining choice is a preference, or investigation no longer narrows. Return the actual gap rather than researching to fill a template.
- Work directly or delegate according to the active session's instructions and authority. This skill neither selects orchestration nor grants delegation.
- For source selection or a delegated investigation, read [investigation and routing](references/investigation-and-routing.md).

## Preserve the result

- When you carry out the investigation, load `task-evidence` and save one coherent investigation result with support, applicability, contradictions, and limits. Return the substantive answer and its file pointer.
- When you delegate it, require `task-evidence` in the producer's brief. The producer saves the result and returns the answer with its pointer; the output contract stays in the producer's context, and this session keeps only the bounded question and the return.
- An incidental file read, a routine preflight, or a bounded continuity check does not need a separate investigation artifact. A helper within one investigation can return to its producer, who preserves the combined attributed findings.
- If findings contradict an accepted assumption, surface the consequence. Facts do not authorize a changed design, project mutation, or publication.

This operation ends with the supported result or a concrete unresolved question. It creates no ongoing effort-maintenance obligation.
