# Orchestrate

`orchestrate` is how Mark does software work with AI in OpenCode. The orchestrator is a design partner that thinks and decides with him and gets the work done by delegating to role-based subagents.

- [Design](design.md): the primitives, roles, models, and what this replaced.
- [Scenarios](scenarios/README.md): how Mark actually uses it, and what the skill is checked against.
- The skill: [`packages/cairn/skills/orchestrate`](../../packages/cairn/skills/orchestrate/SKILL.md), which composes [`design-partner`](../../packages/cairn/skills/design-partner/SKILL.md).

The previous orchestrator design, including Chief, is in [`docs/archive/orchestrator`](../archive/orchestrator/architecture.md), and its skills are in `skills/archive/`.
