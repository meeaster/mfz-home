# Orchestrate

`orchestrate` is Cairn's orchestration part: how Mark does software work with AI in OpenCode. The orchestrator is a design partner that thinks and decides with him and gets the work done by delegating to role-based subagents.

- [Cairn vision](../../packages/cairn/VISION.md): what orchestration is for, as part of Cairn.
- [Design](design.md): the primitives, roles, models, and what this replaced.
- [Scenarios](scenarios/README.md): how Mark actually uses it, and what the skill is checked against.
- The skill: [`packages/cairn/skills/orchestrate`](../../packages/cairn/skills/orchestrate/SKILL.md), the lead's playbook, which loads [`design-partner`](../../packages/cairn/skills/design-partner/SKILL.md) and [`roles`](../../packages/cairn/skills/roles/SKILL.md). `roles` defines the roles and loads the profile's `role-models` skill; any session can load it to delegate one piece of work or to act as a role.
- Personal model bindings: [`skills/active/role-models`](../../skills/active/role-models/SKILL.md). Work selects its own routing skill from the Work home.

The previous orchestrator design, including Chief, is in [`docs/archive/orchestrator`](../archive/orchestrator/architecture.md), and its skills are in `skills/archive/`.
