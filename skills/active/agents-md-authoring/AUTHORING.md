# agents-md-authoring

## Intent

Help an agent create, revise, or review `AGENTS.md` files, and above all record a preference, convention, or lesson the human states mid-conversation in the right instruction file. Guidance on what to include and how to structure it, not an explanation of what `AGENTS.md` is.

Not for: ordinary implementation that merely reads `AGENTS.md`, or writing scenario and design documents.

Success: each addition changes a decision an agent would otherwise get wrong, sits at the narrowest scope that serves it, and preserves the human's meaning, including exceptions.

## Scenarios

- **Record an established preference**, such as "scenarios must be self-contained": updates the right child file, reconciles an older conflicting rule there, doesn't repeat parent orientation, and doesn't investigate unrelated configuration.
- **Initialize guidance for a multi-package repository** whose README disagrees with a package script: inspects configuration, keeps non-obvious commands and boundaries, trusts executable source for current behavior, omits generic advice and file trees.
- **Review only**: "do these instructions duplicate inherited guidance or contain stale commands?" Returns findings, edits nothing, and separates verified stale facts from deliberately stricter preferences.
- **Add an exception to an existing rule**: places it beside its condition, without making it universal or appending a contradiction.

## Decisions

- **"Record this" is the primary use case** (human, 2026-09-27). Most requests come mid-conversation; an established preference needs focused integration, not a repository-wide investigation.
- **Carries the useful parts of OpenCode's init prompt** (human, 2026-09-27). The human rarely runs init, so its guidance is otherwise absent when instructions get edited.
- **Small and self-contained**: it doesn't chain-load other authoring skills.
- **Human preferences survive verified facts.** Source configuration settles current behavior, but not what the human wants changed.

## Sources

| Source | Revision | Local use |
|---|---|---|
| [OpenCode](https://github.com/anomalyco/opencode) init prompt, `packages/core/src/plugin/command/initialize.txt` | `3d109828` | Kept: the "would an agent likely miss this" test, source-grounded facts, non-obvious commands and boundaries, short topic sections, improving in place. Changed: investigation proportional to the request, non-code folder maintenance, parent and child scope. Dropped: OpenCode-specific tool requirements and the fixed question limit. An upstream change doesn't automatically justify expanding this skill |
