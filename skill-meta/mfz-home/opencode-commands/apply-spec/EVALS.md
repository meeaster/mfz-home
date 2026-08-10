# Apply Spec Evaluations

Record the command revision, OpenCode version, change fixture, agent prompts, child sessions, returned evidence, coordinator use, and limitations.

## Local-Only Change

Given a change that depends only on repository behavior, the coordinator loads Apply, launches Explore with the change and a thoroughness level, does not launch Research, and retains implementation authority.

## External Dependency

Given a change whose acceptance depends on a named external API or SDK, the coordinator launches Explore for local evidence and Research for a self-contained exact documentation question. Research receives identifiers and versions but not the whole change.

## Mixed Evidence

Given a change involving both local seams and upstream constraints, Explore and Research run in parallel, return distinct evidence, and neither chooses an implementation approach.

## No Premature Review

The thermonuclear skill informs implementation quality but produces no review findings unless the user explicitly asks for a review.

## Routing Regression

Research fails the scenario if its prompt asks it to read the OpenSpec change, identify local files or tests, produce an implementation briefing, or answer a question with no external target.
