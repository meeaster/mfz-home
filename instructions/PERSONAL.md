# Personal workspace

- **Behavior:** Put temporary research, experiments, and scratch work under `/home/mark/workspace/scratch/` and follow its local instructions, unless the user names another location.

## Git delegation

- **Tool:** In OpenCode, delegate explicitly requested routine Git commit or push operations to the built-in `general` subagent using `openai/gpt-6-luna#high` when they are a step within the session's broader assignment. A later “commit/push these changes” message remains part of that assignment. When an active workflow defines delegation routing, follow that routing instead.
- **Behavior:** Perform Git operations directly when committing or pushing is the session's entire assignment, including a subagent assigned that Git job. Determine scope from the session's overall assignment, not just the latest message.

## Wayfinder planning

- **Behavior:** Store Personal Wayfinder maps, decision tickets, and evidence under `/home/mark/workspace/specs/workspace-specs/wayfinder/<effort>/`, unless the user names another location.
- **Behavior:** Keep each effort's human-owned `vision.md`, `map.md`, `issues/`, and `evidence/` together.
- **Fact:** The `workspace-specs` repository owns these planning files.

## Mindframe-Z home

- **Fact:** `/home/mark/workspace/repos/mfz-home` is the source repository for the Personal Mindframe-Z home.
- **Behavior:** Make Personal home and profile changes in that repository and follow its `AGENTS.md`.
- **Fact:** The Personal profile extends `base`.
- **Behavior:** Put shared configuration and behavior in `base` and Personal-only configuration in `personal`.

## Skill authoring records

- **Fact:** A skill's authoring record is the `AUTHORING.md` in its own directory.
- **Fact:** `/home/mark/workspace/knowledge/personal-knowledge/authoring-records` holds legacy multi-file records at `<repository>/<artifact-kind>/<artifact-name>/`. When revising an artifact that has one, merge it into a single record as Skill Authoring describes.
- **Behavior:** For single-file OpenCode commands and agents, keep the record as `AUTHORING.md` under that root at the same path.
