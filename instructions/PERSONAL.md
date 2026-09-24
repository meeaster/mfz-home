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

- **Fact:** The Skill Authoring record root is `/home/mark/workspace/knowledge/personal-knowledge/authoring-records`.
- **Behavior:** Follow Skill Authoring's structure beneath that root.
