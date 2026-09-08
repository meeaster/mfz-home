# Maintenance

Read when refreshing adapted guidance or changing dependency composition. The snapshots below are the previously recorded source revisions; this refactor did not reverify upstream state.

## Sources and local adaptations

| Source | Adopted or surveyed revision | Local use |
|---|---|---|
| [Writing for Agents](https://github.com/mattpocock/skills), `skills/productivity/writing-for-agents` | `0986ebaf5d29e812162702b2633a2942c30200d2` | Separately managed runtime writing guidance and skill mechanics. |
| [OpenAI Skill Creator](https://github.com/openai/skills), `skills/.system/skill-creator` | `49f948faa9258a0c61caceaf225e179651397431` | Bundled agent-neutral adaptation for concrete examples, freedom, resource planning, and layered validation. Omits Codex tooling, the competing lifecycle, and package restrictions. |
| [Anthropic Skill Creator](https://github.com/anthropics/skills), `skills/skill-creator` | `9d2f1ae187231d8199c64b5b762e1bdf2244733d` | Optional no-skill or previous-revision comparison. Its runner, viewer, grading agents, and optimizer are not dependencies. |
| [OpenCode](https://github.com/anomalyco/opencode), command documentation and implementations | Local source surveyed 2026-08-06 | Conditional command format and invocation reference. Recheck version-sensitive mechanics when changing command support. |

Writing guidance was previously alternated between bundled and separate forms because of cross-harness loading concerns. The current composition uses the separately managed `writing-for-agents` skill to avoid maintaining a duplicate. Reconsider that choice if supported harnesses cannot load the dependency reliably; historical reasoning is in `LOG.md`.

## Refresh

Compare upstream changes with the recorded revision and the local role before adopting them. Preserve intentional adaptations, update the source revision, and evaluate affected branches. Writing for Agents owns writing quality; Skill Authoring owns intent, authority, selective records, and evidence. A source update must not silently restore a competing lifecycle or mandatory document set.

Keep harness commands and session-store details in environment guidance. When changing live evaluation support, check the testing reference's capture, isolation, and comparison requirements against the available capabilities.
