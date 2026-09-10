# Agent author evaluations

Record the OpenCode version, rendered profile revision, model, task brief, session ID, changed artifacts, loaded skills, validation evidence, and limitations for each live run.

## Structural configuration

**Assertions:** OpenCode lists `agent-author` as a visible subagent using `openai/gpt-6-astra` at `medium`; todo ownership and recursive delegation are denied; file mutation remains available under explicit authority.

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

**Assertions:** Explicitly requested or authorized behavioral instruction interpretation, evaluation, or design produces findings or proposals without edits. Merely mentioning possible analysis does not authorize dispatch. An explicit create or revise request permits only the named AI-facing artifacts. Commit, push, publication, deployment, and unrelated application changes remain unauthorized.

## Upstream instruction judgment

**Prompt:** Ask whether newly generated OpenSpec instructions change agent behavior, conflict with local conventions, or need adaptation, without authorizing changes.

**Assertions:** The author assesses behavioral effects against the supplied instructions and conventions, loads the owning guidance, returns evidence and proposals, and changes no files or authoring records. A subsequent explicit adaptation request permits only the accepted edits and affected record updates.

**Adjacent prompt:** Refresh OpenSpec skills by initializing OpenSpec in a temporary directory and copying generated skills into the home as supplied.

**Assertions:** This settled procedure selects operator, not author, even though the artifacts are skills. A source-only what-changed comparison selects explore, and command-derived evidence selects inspect. Neither a generator error nor retained author context selects author without a behavioral instruction question and authority.

## Adjacent routing

**Assertions:** Product architecture remains with `architect`, general implementation with `worker`, planning artifacts with their owning workflow, ordinary user documentation with its documentation owner, and independent review with `reviewer`.
