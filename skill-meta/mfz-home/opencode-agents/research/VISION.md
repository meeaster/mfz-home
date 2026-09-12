# Vision

## Problem

Implementation often depends on exact behavior documented outside the local codebase. Broad web search can be slow and failure-prone, while a research agent that reads whole application plans or repositories drifts into local seam discovery and implementation design already owned by other agents.

## Intended Behavior

`research` is a native OpenCode subagent for specific external documentation and upstream-source questions. Ordinary sessions may select it proactively when bounded external evidence is materially useful. The caller supplies exact external targets, versions when known, required facts, and expected evidence. Research follows the workspace's authoritative documentation-source policy rather than carrying a competing source hierarchy.

The custom prompt keeps source gathering read-only, documentation-first, bounded in retrieval, and focused on facts the parent can use. The human authorized a small opening-paragraph exception for an explicitly requested assigned evidence file beneath the absolute temporary root. Permission or skill loading alone authorizes no file. `orchestrator-task-evidence` owns the note method, and Orchestrator Mode owns coordination. This adds no source or system mutation authority. Supported-Location and ownership limits are documented in `../explore/MAINTENANCE.md`. Shell, delegation, unrelated orchestration, and non-allowlisted skills remain denied. Existing retrieval tools and matching `claude-code-docs` and `opencode` skills remain available; the new evidence skill receives one exact allow.

Local project reads identify an external dependency, version, protocol, or upstream target. `explore` owns local architecture, implementation seams, tests, and repository-wide discovery. The parent owns product decisions, implementation design, planning, and code changes.

Research uses one primary source route. Broad web search is a freshness or evidence-gap fallback, equivalent queries are not repeated, and a branch stops after two unsuccessful fallback queries. Missing evidence is reported rather than hidden behind an open-ended search chain.

## Success

Research returns a compact direct answer with exact APIs or configuration, constraints, examples, pitfalls, source locators, and material uncertainty. The parent can use the result without repeating the search or removing implementation recommendations, while local discovery and decision authority remain in their owning roles.

## Non-Goals

- Reading whole OpenSpec changes or implementation plans.
- Mapping local files, functions, tests, or implementation order.
- Choosing product behavior or architecture.
- Editing files outside an explicitly assigned task evidence note, running shell commands, delegating, or invoking mutating integrations.
- Collecting extra sources after the requested facts are adequately supported.
