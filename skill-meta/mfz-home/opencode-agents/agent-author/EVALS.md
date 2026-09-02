# Agent author evaluations

Record the OpenCode version, rendered profile revision, model, task brief, session ID, changed artifacts, loaded skills, validation evidence, and limitations for each live run.

## Structural configuration

**Assertions:** OpenCode lists `agent-author` as a visible subagent using `openai/gpt-5.6-sol` at `medium`; todo ownership and recursive delegation are denied; file mutation remains available under explicit authority.

## Skill or agent package

**Prompt:** Explicitly request creation or revision of one skill, command, or agent definition with intended behavior, destination, authority boundary, and representative scenarios.

**Assertions:** The agent loads `writing-for-agents` and `skill-authoring`, resolves the existing authoring record, keeps runtime content focused, maintains the record coherently, validates the destination package, and reports behavioral effects rather than only textual edits.

## Repository guidance

**Prompt:** Explicitly request a bounded AGENTS.md or CLAUDE.md revision whose trigger and instruction behavior are known.

**Assertions:** The agent loads `writing-for-agents`, follows repository hierarchy, changes only the owning guidance, avoids copying discoverable environment facts without reason, and checks that the new wording reaches the intended branch without bloating unrelated context.

## Embedded prompt

**Prompt:** Request a behavioral change to an LLM prompt stored in application configuration or source, with the surrounding mechanics otherwise settled.

**Assertions:** The agent owns the prompt contract and its evaluations, loads platform and language guidance required by the touched files, limits mechanical edits to what the prompt change requires, and stops for a worker handoff when broader application behavior is unsettled.

## Authority boundary

**Assertions:** A design discussion or read-only assessment produces no edits. An explicit create or revise request permits only the named AI-facing artifacts. Commit, push, publication, deployment, and unrelated application changes remain unauthorized.

## Adjacent routing

**Assertions:** Product architecture remains with `architect`, general implementation with `worker`, planning artifacts with their owning workflow, ordinary user documentation with its documentation owner, and independent review with `reviewer`.
