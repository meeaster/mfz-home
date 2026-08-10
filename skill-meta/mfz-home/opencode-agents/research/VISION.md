# Vision

## Problem

Implementation often depends on exact behavior documented outside the local codebase. Broad web search can be slow and failure-prone, while a research agent that reads whole application plans or repositories drifts into local seam discovery and implementation design already owned by other agents.

## Intended Behavior

`research` is a native OpenCode subagent for specific external documentation and upstream-source questions. The caller supplies exact external targets, versions when known, required facts, and expected evidence. Research follows the workspace's authoritative documentation-source policy rather than carrying a competing source hierarchy.

The custom system prompt replaces the general provider prompt because this is a durable specialist role. It keeps the agent read-only, documentation-first, bounded in retrieval, and focused on facts the parent can use. Agent permissions explicitly deny mutation, shell, delegation, and unrelated orchestration while allowing local evidence lookup, FFF, approved read-only documentation tools, bounded web retrieval, and the Claude Code documentation skill. Global configuration remains authoritative for path policy.

Local project reads identify an external dependency, version, protocol, or upstream target. `explore` owns local architecture, implementation seams, tests, and repository-wide discovery. The parent owns product decisions, implementation design, planning, and code changes.

Research uses one primary source route. Broad web search is a freshness or evidence-gap fallback, equivalent queries are not repeated, and a branch stops after two unsuccessful fallback queries. Missing evidence is reported rather than hidden behind an open-ended search chain.

## Success

Research returns a compact direct answer with exact APIs or configuration, constraints, examples, pitfalls, source locators, and material uncertainty. The parent can use the result without repeating the search or removing implementation recommendations, while local discovery and decision authority remain in their owning roles.

## Non-Goals

- Reading whole OpenSpec changes or implementation plans.
- Mapping local files, functions, tests, or implementation order.
- Choosing product behavior or architecture.
- Editing files, running shell commands, delegating, or invoking mutating integrations.
- Collecting extra sources after the requested facts are adequately supported.
