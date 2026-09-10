# Maintenance

Extracted from `orchestrator-mode` by explicit human request on 2026-09-09. Keep one lightweight SKILL.md. The V2 path-derived ID is `orchestrator-task-evidence`; the display name is `Orchestrator Task Evidence`. Preserve `slash: false` and `metadata.opencode/autoinvoke: false` so the skill is absent from automatic discovery and slash invocation but loadable by explicit ID. MFZ catalog and base profile enable it for OpenCode only.

The V2-specific explicit-ID mechanism is documented at `https://opencode.ai/v2/docs/skills`; generic user-invocation guidance does not describe it. Explore and Research require exact skill allows after their denials. Inspect and Triage already permit skill use and need no broader policy changes. Validate materialized agent fields alongside existing Personal model overrides, not only frontmatter in isolation.

For upstream Explore provenance, permission matching, supported Location/project placement, and the unresolved source of the reported Inspect live refusal, read `../../opencode-agents/explore/MAINTENANCE.md`. Runtime prompts carry only requested-write allowances; keep the detailed note method here rather than expanding those prompts.
