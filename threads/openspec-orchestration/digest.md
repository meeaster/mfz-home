# Digest — openspec-orchestration

## Current State
OpenSpec tooling is upgraded and reconfigured end-to-end: the CLI runs 1.6.0 under a persistent per-tool mise exclusion (replacing the earlier one-off override), specs live outside the project repo in a shared private GitHub store, the legacy `gpt-5-5-flow` schema is gone, and a fixed model split has been set for orchestration — Sol high for planning, Luna xhigh for implementation — after an empirical benchmarking panel. The `openspec-orchestrate` skill has since been rewritten again: it is now a standalone workflow (not an Apply overlay or handoff) that retains Apply's full preparation contract, runs a mandatory read-only Sol-high planning phase with dry-run branching removed, and hands implementation to serialized, freshly-spawned `delegate_general` workers grouped by context-window/file-overlap, with the orchestrator alone updating task checkboxes after confirmation. The rewritten skill has been synced to the installed copy via `mfz skills upgrade --agent opencode` and passes the full validation suite (build, lint, format, tests), after an out-of-scope engine-side change to `mfz skills sync` was caught and reverted. One CLI planning-only test run's outcome (timeout vs. genuine completion) remains unconfirmed, and a request to fold this work into the persistent "openspec-orchestration" thread was made at session close with no recorded outcome.

## Components
- **Mise / Tool Version Management** — per-tool `minimum_release_age` handling for OpenSpec, now via mise's persistent backend exclusion mechanism; CLI upgraded to 1.6.0, skills refreshed, `mfz` relinked/rebuilt, opt-in `update` workflow added. Done.
- **Store Architecture** — specs externalized from the project repo into a shared private GitHub store (`mindframe-z-specs`) used by both the personal-home and engine repos as one planning domain; project repo reduced to a `store:` config pointer; legacy schema removed. Done.
- **Orchestration Model Benchmarking** — flat-task-list diagnosis, an Explorer-agent trial, and a controlled Luna/Terra/Sol panel with cost analysis, concluding in a fixed model split: Sol high for planning, Luna xhigh for implementation. Done.
- **Orchestration Skill** — rewritten through several designs (ambient static-triage → Apply/Orchestrate handoff → its current form): a standalone workflow that retains Apply's full preparation contract, runs a mandatory read-only Sol-high planning phase (no dry-run branch), and serializes freshly-spawned `delegate_general` implementation workers grouped by context-window/file-overlap, with the orchestrator alone updating task checkboxes. Installed via `mfz skills upgrade --agent opencode` and passing full validation. In progress — one CLI planning-phase test's outcome is unconfirmed.
- **Session Threading (off-charter)** — a request, made at the close of the implementation session, to fold that session's work into this persistent "openspec-orchestration" thread; no completion recorded within the sessions. Open.
- **Cross-cutting** — prefer the narrowest-scope config/tooling change over a broad one (mise per-tool exclusion, `mfz skills upgrade` rather than manual edits or sync-side changes); ground model and architecture choices in empirical benchmarking rather than assumption; keep the skill portable and user-invoked — no project-specific file reads baked in, `delegate_general` as its only tool-specific dependency.

## Direction
- Confirm whether the OpenCode CLI planning-only test run (gpt-5.6-luna xhigh) actually completed or timed out, per the advisor's git-status comparison guidance, before drawing conclusions about the planning phase.
- Continue validating the rewritten skill in real orchestration runs now that dry-run branching is removed — OpenCode invocations must explicitly halt after Phase 3 to inspect the plan before implementation proceeds automatically.
- The two pre-existing `pnpm test:skills` profile-inheritance failures remain open but are unrelated and out of scope for this thread.
- Future OpenSpec planning work resumes against the `mindframe-z-specs` store, with the skill's source of truth at the personal-home `openspec/openspec-orchestrate/SKILL.md` (the installed copy is rendered output and must not be edited directly).

## Open Questions
- Whether the OpenCode CLI test run (gpt-5.6-luna xhigh, planning-only) actually completed or genuinely timed out is unconfirmed.
- The exact mechanics of when the orchestrator updates task checkboxes relative to subagent completion, beyond "after confirmation," are not fully specified.

## Key Decisions
- Use mise's persistent backend exclusion mechanism for OpenSpec's `minimum_release_age`, replacing the earlier one-off per-tool CLI override, to keep the config declarative.
- Specs live in a shared private GitHub store (`mindframe-z-specs`) used by both the personal-home and engine repos as one planning domain; the project repo holds only a `store:` config pointer.
- Removed the unused `gpt-5-5-flow` spec schema, leaving `spec-driven` as the sole schema.
- Selected `openai/gpt-5.6-sol@high` as the fixed orchestration-planning model — chosen over `sol@medium`, which was ~46% cheaper with comparable task coverage/risk detection, because the user judged Sol high's safety-analysis edge worth the premium; Luna xhigh is the default implementation-worker model.
- The orchestration skill is a standalone workflow, not an overlay or handoff on top of `openspec-apply-change` — that skill stays unchanged for ordinary direct implementation, while the new skill retains Apply's full preparation contract (its tested prompt fields) so it works without Apply loaded.
- Delegated implementation workers run serialized, one at a time via `delegate_general`, rather than in parallel, because `delegate_general` cannot currently isolate directories/worktrees to guarantee real parallel safety.
- Every delegated group runs as a brand-new `delegate_general` session, never resumed, to manage context windows; grouping mixes context-window limits with file/context overlap, with discipline against uncached re-reads across sessions.
- Dry-run branch logic was removed entirely; only the mandatory read-only Sol planning phase remains, and loading the skill now proceeds automatically into implementation.
- Task checkboxes are updated by the orchestrator only, after subagent completion is confirmed — not automatically by each delegate subagent.
- The skill stays portable: no reads of project-specific files (e.g. `docs/plans`), no advisor/dev-specific details baked in — such guidance is supplied via the CLI prompt, keeping `delegate_general` as the only tool-specific dependency.
- Skill updates are applied via `mfz skills upgrade --agent opencode` against the personal-home source, not manual edits to the rendered copy; an engine-side change to `mfz skills sync` was reverted as overreach, keeping only the requested `mfz skills upgrade` local-skill-refresh fix.
- Fixed a skill-profile resolver bug that treated every declared agent key — including one set to `false` — as enabled, which had leaked the OpenCode-only orchestration skill into Claude/Codex; added a regression test.

## Design
```
openspec-orchestrate (standalone skill, retains Apply's prep contract)
        │
        ▼
Phase 1-3: Sol-high planning (read-only, mandatory, no dry-run branch)
        │   groups tasks by context-window limits + file/context overlap
        ▼
   [Group A] → new delegate_general session → Luna-xhigh worker
        │   (serialized, one at a time — no worktree isolation available)
        ▼
   [Group B] → new delegate_general session → Luna-xhigh worker
        │
        ▼
  orchestrator confirms completion → updates task checkboxes
```

## Intent
The user wants OpenSpec kept current without loosening version-safety rules elsewhere, wants planning artifacts centralized in a shared store across related repos rather than duplicated per-repo, and wants the orchestration-planning model choice grounded in real measurement rather than assumption. Beyond that, the user wants a genuinely useful orchestration skill — not a thin wrapper that just asks a model for a plan, but one that encodes real orchestration know-how (context-window-aware grouping, serialized delegation, portability) while staying aligned with the existing Apply skill's preparation contract and remaining lean and user-invoked rather than ambient.

## Vision
The user is building a repeatable, portable OpenSpec orchestration workflow: a shared store spanning related repos, a benchmarked model split (Sol plans, Luna implements), and a standalone skill that plans once (a mandatory Sol phase, no dry-run branching) before serializing delegated implementation across freshly-scoped worker sessions — with an eye toward folding this work into a durable "openspec-orchestration" thread rather than leaving it in one-off transcripts. This narrowed from an earlier vision that included an explicit dry-run path and a parallel-worktree commit/cherry-pick protocol; both were dropped in favor of a simpler, fully serialized model once `delegate_general`'s isolation limits became clear.

## Perspective
The user favors the narrowest-scope change that solves the immediate problem — a per-tool mise exclusion over a global rule, `mfz skills upgrade` over manual edits or broader sync-side changes — and distrusts specs or ad hoc scripts standing in for a properly authored skill. They insist on empirical grounding for model choice (benchmark panels, cost-plugin numbers) but, when cost and quality are close, are willing to explicitly pay a premium for a qualitative edge (Sol high's safety analysis) rather than default to cheaper. They pushed back hard against summarizing away implementation detail needed for the skill to work, and against shallow delegation — the skill must "contain actual orchestration guidance, not just 'ask Sol for a plan.'" They also distrust a first design instinct on workflow shape, correcting the Apply/Orchestrate relationship more than once until it matched their mental model, and want automation kept portable rather than ambient or over-scoped beyond what was asked.

## Sources
- mise `minimum_release_age` / release-age exclusion documentation — https://github.com/jdx/mise.git
- models.dev pricing data, used via the home's `session-cost-tui` plugin for cost calculations — models.dev
- OpenCode extension/plugin surface providing `sessionID` and SDK client for session telemetry — https://github.com/anomalyco/opencode.git
