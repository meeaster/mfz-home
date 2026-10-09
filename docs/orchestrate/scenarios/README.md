# Orchestrate scenarios

These are the ways Mark uses AI across the software development lifecycle. The [orchestrate skill](../../../packages/cairn/skills/orchestrate/SKILL.md) is checked against them: a change to the skill should keep every scenario working, and a scenario it can't handle is a reason to change it. Each one doubles as a test: run its ask through `opencode run` with orchestrate selected, then compare the session against **What should happen** and **What must not happen**.

Cairn's storage design has its own scenario in [docs/cairn](../../cairn/scenario-observability-pipeline.md).

Each scenario has four parts:

| Part | Holds |
| --- | --- |
| The ask | What Mark would actually say |
| What should happen | Stages, roles, what runs in the background, where Mark approves |
| What must not happen | The mistakes that would make the run wrong or wasteful |
| Done looks like | What Mark has at the end |

| Scenario | Shape |
| --- | --- |
| [Design doc](design-doc.md) | Gather, write up knowledge, architect options, writer builds the doc |
| [Feature delivery](feature-delivery.md) | Units built and verified one at a time, review, repair, PR |
| [Infrastructure change](infra-change.md) | One implementer edits, plans, and applies after approval |
| [Quick question](quick-question.md) | One explorer, no ceremony |
| [External research](external-research.md) | Researcher answers a version-sensitive question |
| [Live investigation](live-investigation.md) | Inspector reads live systems through MCP and the shell |
| [Stuck bug](stuck-bug.md) | Implementer stops narrowing, triage diagnoses |
| [Prototype question](prototype-question.md) | Settle a design question by building something throwaway |
| [Capture and resume](capture-and-resume.md) | Opt into an effort mid-session, pick it up later |
