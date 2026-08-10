---
description: Load OpenSpec with codebase and external research context
subtask: false
---

Load the openspec apply skill and the thermo-nuclear-code-quality-review skill, then read the "$1" spec.

Use the thermo-nuclear skill only as pre-implementation quality guidance: understand how the finished work will be reviewed, and apply those standards while planning and coding. Do not run a review or report review findings unless the user explicitly asks for one.

Then launch `explore` as a fact-finding assistant for current codebase state. Also launch `research` in parallel only when the spec identifies an external library, API, SDK, CLI, integration, protocol, or upstream repository whose documented behavior matters to implementation. If the spec presents no concrete external question, do not launch Research.

Their purpose is to gather evidence, not to decide implementation direction. In the prompt you pass to each invoked subagent, explicitly say:

- Do not make judgment calls about what should be built or how the primary agent should implement it.
- Do not rank options, choose an approach, or present recommendations unless asked for a purely factual tradeoff from source material.
- Report observed facts with file paths, code references, docs references, and uncertainties.
- Separate facts from assumptions.
- Leave final design and implementation decisions to the primary agent.

Use `explore` for architecture, existing patterns, conventions, seams, tests, and relevant files. Ask it to read the spec itself, specify the desired thoroughness, and return concise, source-grounded findings only.

For `research`, first extract the exact external questions and identifiers from the spec. Pass those questions, relevant versions, and the expected evidence as a self-contained brief; do not ask Research to read the OpenSpec change or discover local implementation seams. Require source-grounded documentation facts, exact constraints, and unresolved uncertainty only.

Try to front-load documentation lookups so context is ready for implementation, but don't block on it if gaps appear later.
