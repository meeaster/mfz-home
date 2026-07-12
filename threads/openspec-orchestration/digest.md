# Digest — openspec-orchestration

## Current State
OpenSpec tooling is upgraded and reconfigured end-to-end: the CLI runs 1.6.0 (with a narrow mise override rather than a global one), specs have moved out of the project repo into a shared private GitHub store, the legacy `gpt-5-5-flow` schema is gone, and a fixed orchestration-planning model (`openai/gpt-5.6-sol@high`) has been chosen after an empirical benchmarking panel. A user-invoked OpenSpec orchestration skill implementing this (static triage → escalate to Sol high) has been written, installed, and validated (tests/typecheck/doctor all pass), but its own review surfaced three unresolved gaps. A side effort to archive this session into an mfz thread was started and left incomplete.

## Components
- **Mise / Tool Version Management** — per-tool `minimum_release_age` override plus the 1.5.0→1.6.0 OpenSpec upgrade, skills refreshed, opt-in `update` workflow added. Done.
- **Store Architecture** — specs externalized from the project repo into a standalone private GitHub store (`mindframe-z-specs`), shared by the personal-home and engine repos as one planning domain; project repo reduced to a config pointer; legacy schema removed. Done.
- **Orchestration Model Benchmarking** — Explorer-subagent and controlled panel runs (Luna/Terra/Sol) plus cost analysis to pick the orchestration-planning model. Concluded — Sol high selected.
- **Orchestration Skill** — user-invoked OpenSpec orchestration skill (static triage, escalates ambiguous/large changes to Sol high). Implemented, installed, and passing home validation; review found gaps still open (see Direction).
- **Session Threading (off-charter)** — injecting this session into an mfz thread named "openspec-orchestration". Incomplete.
- **Cross-cutting** — prefer the narrowest-scope config change over a global one (mise per-tool override, not a blanket rule); decide model/architecture choices empirically (benchmark panels, cost-plugin analysis) rather than by default; keep the orchestration skill user-invoked, not ambient, to avoid ambient context cost.

## Direction
- Close the three gaps the skill review found: add an explicit dry-run path (JSON-only plan, no side effects before commit); define a concrete commit/cherry-pick protocol for parallel worktrees editing the same spec; resolve the sync mismatch between the skill's source and installed copies.
- Finish session threading: use the session-archaeology workflow to locate this session's ID (not available in the shell environment) and complete the mfz `threads` injection into "openspec-orchestration".
- Future OpenSpec planning work resumes against the `mindframe-z-specs` store (shared by personal-home and engine repos) and the installed orchestration skill.

## Open Questions
None.

## Key Decisions
- Applied a narrowest-scope mise fix (`npm:@fission-ai/openspec` per-tool `minimum_release_age = "0s"`) instead of a global override, to avoid loosening the 3-day rule for other tools.
- Used a one-time CLI override (`mise install -- --minimum-release-age 0s openspec`) to force the 1.6.0 upgrade, since the "1" major-version pin otherwise blocks `mise install` from upgrading an already-satisfying install.
- Switched to OpenSpec's store model: specs live in standalone private GitHub repo `mindframe-z-specs`; the project repo holds only a `store:` config pointer — chosen because specs should not live in the repo.
- One shared store serves both the personal-home and engine repos, since they form one planning domain despite being separate implementation repos.
- Removed the unused `gpt-5-5-flow` spec schema, keeping `spec-driven` as the sole canonical schema.
- Selected `openai/gpt-5.6-sol@high` as the fixed orchestration-planning model: it produced the strongest safety-oriented plan; `sol@medium` scored equivalently on task coverage/risk detection at ~46% lower cost ($0.728 vs $1.344), but the user explicitly chose to pay the premium for the marginal safety-analysis edge rather than optimize cost-per-value.
- Designed the OpenSpec orchestration skill as user-invoked (not ambient), using static triage first and escalating ambiguous/large changes to Sol high, to avoid ambient context cost.

## Intent
The user wants OpenSpec kept current without loosening version-safety rules elsewhere, wants planning artifacts (specs, tasks) out of individual project repos and centralized where multiple repos in one product domain can share them, and wants orchestration-plan generation backed by an empirically chosen model rather than a guess — then packaged into a reusable, user-invoked skill so the choice doesn't have to be re-litigated per run.

## Vision
The user is building toward a repeatable OpenSpec orchestration workflow: a shared store spanning related repos, a benchmarked default model for plan generation, and a skill that triages work and escalates only when needed — with room to grow into safer execution (explicit dry-run, a defined multi-worktree commit protocol) and into archiving planning sessions as durable mfz threads rather than one-off transcripts.

## Perspective
The user favors the narrowest change that solves the immediate problem (a per-tool mise override over a global one) and distrusts specs living inside implementation repos. They want model/architecture decisions grounded in real measurement — benchmark panels, cost-plugin numbers — rather than assumption, but when cost and quality are close, they're willing to explicitly pay a premium for a qualitative edge (Sol high's safety analysis) rather than default to the cheaper option. They also want automation kept lean: the orchestration skill should only engage the expensive model path when genuinely warranted, not run ambiently.

## Sources
- mise `minimum_release_age` configuration model — https://github.com/jdx/mise.git
- OpenSpec upstream reference (1.6.0 plus 2 post-release commits) — https://github.com/Fission-AI/OpenSpec.git
- Home docs folder on model comparisons (Luna/Terra/Sol tiers)
- Home's `session-cost-tui` plugin (models.dev/api.json rates)
