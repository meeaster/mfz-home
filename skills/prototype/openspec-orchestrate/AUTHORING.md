# openspec-orchestrate

## Intent

An explicitly invoked, standalone alternative to OpenSpec Apply: turn a completed change into the smallest practical sequential list of bounded workers, with cohesive work packages decided before workers are assigned. The coordinator keeps task checkboxes and acceptance; planning stores and implementation repositories stay separate authority boundaries.

Not for: parallel implementation, implicit worktrees, worker-owned completion ledgers, or open-ended review cycles.

Success: every task has exactly one owner, the user can see why the plan has the shape it has and where it stopped, and missing context or authority produces a visible blocker instead of guessed progress.

## Scenarios

- **Plan-only regression** on a fixture with several pending tasks: the planner prompt is copied without changes; every task maps once; every group has explicit out-of-scope paths; budgets are in characters; writes are exact paths; a plan missing any field is rejected without implementing.
- **Cross-cutting change of 20–30 tasks**: two to five workers, with PR approval, merges, real-home apply, and cleanup as checkpoints, not workers.
- **Several sections editing the same core files**: one worker unless payload forces a split.
- **Disjoint subsystems**: fresh sequential workers with exact write sets.
- **Small change**: no manufactured multiple sessions.
- **Plan with more than six workers**: each boundary justified, or the plan is reported blocked.
- **An anchored acceptance failure**: one chartered review, one consolidated remediation, scope-locked closure; further reopening needs the user.

## Decisions

- **Work packages first, then the smallest worker list** (2026-07-29). A 28-task change came out as fifteen groups, including operator and verification checkpoints, which hid the real delegation plan and multiplied rereads.
- **Coordinator review by default; independent review is chartered and bounded** (2026-08-05). One implementation went through ten remediation passes because each closure review reopened the whole change and promoted generic hardening and future-task behavior to blockers.
- **Parked as a prototype** (human, 2026-09-14). The human created it but didn't use it; it's out of every profile and kept only for a possible redesign. It still assumes OpenCode `delegate_general`, Sol/high planning, Luna/xhigh workers, and OpenSpec's `status` and `instructions apply` JSON; recheck all of these before reviving it.
- **Worker budget bands are empirical, not model limits.** Revisit them if workers run out of useful context or fresh sessions keep rereading the same core files.

## Sources

| Source | Revision | Local use |
|---|---|---|
| OpenSpec CLI `status` and `instructions apply` JSON | unverified since 2026-09-15 | Change selection, store resolution, context files |
