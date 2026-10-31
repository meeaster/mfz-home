---
name: pstack-how
description: Use for code walkthroughs, subsystem architecture, runtime flow, and ownership or layering questions. Explains how the system works before critiquing it.
---

# How

Build a senior-engineer mental model of the requested code. Trace actual callers, data flow, state, and effects. Do not infer behavior from filenames.

## Choose the path

- For one module or symbol, inspect it directly and follow its immediate callers and dependencies.
- For a subsystem or cross-cutting flow, split discovery into two to four non-overlapping angles and launch `explore` subagents in parallel.
- For critique, complete the explanation first. Criticism without a traced model is speculation.

## Explore

Each exploration lane receives one specific angle and `references/explorer-prompt.md`. Stop when the lane can describe the path from trigger to effect without skipping a decision or boundary. Return components, flow, files read, and surprises.

For a simple question, one `explore` subagent may inspect and explain in a single pass using `references/explainer-prompt.md`.

## Synthesize

Reconcile overlaps and contradictions against source. Explain:

1. What the subsystem does and why it exists.
2. The few types and services needed to understand it.
3. The runtime path from input to output or trigger to effect.
4. The files that own each part.
5. Non-obvious constraints and sharp edges.

Use file and symbol references. Include code only when prose cannot explain the mechanism precisely.

## Critique

When the user asks for problems or improvements, give the traced explanation to independent `general` subagents with `references/critic-prompt.md` and `references/critique-rubric.md`. Judge their findings against the code. Classify each as act on, consider, noted, or dismissed. Present the explanation before the verdict.
