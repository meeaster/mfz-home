# Digest — thread-sweep

## Current State
The mfz thread sweep and review system has moved from design into a shipped, reviewed implementation. Design decisions Q4–Q10 (continuing from an earlier session's Q1–Q3) are all closed — quiescence gating, fixed baseline, single-dispatch triage, the pending-queue/pass-reject/conclude workflow, the sweep/refresh split, and discover's pre-thread-only role. The OpenSpec change `thread-sweep` was implemented end to end (ledger, sweep orchestration, CLI, schema updates, deterministic tests), live-smoke-tested with a real triage dispatch, and put through an independent two-panel adversarial code review (Claude Opus + GPT-5.5) whose 7 confirmed and 3 downgraded findings were all fixed. The `thread-sweep` thread was created and the implementation session itself ingested as its first member, with its changes verified against the design intent.

## Components
- **Detection & quiescence gate** — derives candidate sessions from existing pins plus cheap per-session source signals (file mtime for Claude, `max(time_updated, latest message time_created)` for OpenCode), deferring triage on sessions active within the quiescence window (default 6h, schema field `quiescence_minutes` under `thread.defaults`, bypassable via `--include-hot`) · implemented and live-tested; a watermark-coercion bug (missing member fields defaulting to `0`/empty string and falsely reading as drift) was found and fixed.
- **Triage** — one cheap-model dispatch per candidate session, judging it against every thread charter at once, returning verdicts only (no dossier) · implemented; a live smoke run (`--include-hot --triage-model claude-code:haiku@low --json`) produced exactly 1 dispatch and 1 pending proposal with 0 malformed lines; adversarial review tightened the parser to enforce one-verdict-per-thread (reporting missing/duplicate lines instead of silently mis-pinning), switched verdict persistence to per-dispatch instead of batched-at-sweep-end, and replaced a fake-manifest triage-model lookup with a direct `resolveTriageModel()` call.
- **Verdict ledger & review workflow** — machine-local ledger at `~/.mindframe-z/thread-sweep/` recording fits/no-fit/pass/reject pinned to watermark and charter hash; pending queue is a derived view; `ingest` is the unified join verb; two grades of "no" — implicit `pass` (written only by `conclude`) and sticky explicit `reject` · implemented; adversarial review fixed a false-positive "stale" flag in `pending` (it had reused the backup module's S3-upload-latency `FRESHNESS_MARGIN_MS` as a judgment-freshness threshold) and made `rejectPending` validate the thread slug rather than allow sticky rows against unknown threads. Open question: whether reject rows' sentinel strings (`watermark: "unknown"`, `charter: "human-reject"`) should become a proper discriminated union.
- **Sweep vs. refresh split** — sweep does detect + triage + report only, writing no thread content; a separate human-triggered `refresh <slug>` re-ingests stale members and pushes · design settled and implemented; adversarial review fixed a fidelity leak where sweep's child-session filtering had bled into the shared `listOpencodeItems` (breaking backup), giving sweep its own root-sessions-only enumeration, and collapsed a duplicated hot/deferred partition check into one place at the top of `runSweep`.
- **Cross-cutting** — no new state store is ever added if existing watermarks/ledger can express it (rejected a separate sweep-state ledger, a `discover --thread` mode, and a persisted `--backfill` command on this basis); nothing writes to a thread except an explicit human-initiated command; the parent-session filtering mismatch between the spec's `parent_id` and OpenCode's documented `parent_session_id` was resolved by introspecting the actual `session` table columns rather than committing to one name.

## Direction
OpenSpec change `thread-sweep` (`openspec/changes/thread-sweep/tasks.md`) is fully implemented and adversarially reviewed — all 16 tasks complete, 7 confirmed + 3 downgraded review findings fixed, tests green. What remains: resolve the three still-open minor findings (reject-row sentinel modeling, `concludePending`'s double enumeration, `counts_since_last_sweep`'s misleading naming) and continue exercising the system in normal use via the review skill's `mfz thread sweep` step.

## Open Questions
- Are sentinel strings for reject verdict rows (`watermark: "unknown"`, `charter: "human-reject"`) acceptable long-term, or should rejects be modeled as a discriminated union with no pin fields?
- Does `concludePending` need to enumerate pending proposals twice (once to load, once to update), or can that be collapsed?
- Is the symlink credential-mount strategy used for live smoke testing robust across all mount contexts, including real CI/CD credential handling?
- Should `counts_since_last_sweep` be renamed or reduced to a single true delta, given only the `sessions` count currently reflects one?

## Key Decisions
- Quiescence gate defaults to 6 hours (schema field `quiescence_minutes` under `thread.defaults`), deferring triage on hot sessions; bypassable via `--include-hot`.
- No new watermark ledger — sweep state is fully covered by existing member watermarks (manifest) and judged verdicts (ledger, pinned to watermark + charter hash).
- Candidate sessions are derived by diffing existing pins against cheap per-session source signals (mtime / `max(time_updated, latest message time_created)`), avoiding a transcript read for unchanged sessions.
- First-sweep baseline is a fixed `baseline_at`, auto-set to *now* (or via a `--look-back <days>` flag), gating triage-candidate eligibility only — member refresh still runs; deep history stays reachable only via deliberate `discover`/`ingest`.
- Triage issues one dispatch per candidate session judging all charters at once (cost scales with new sessions, not thread count), and returns verdicts only — never a dossier, since triage runs pre-membership.
- Triage verdicts persist immediately per-dispatch rather than batching until sweep end, so paid triage spend isn't lost on a later failure.
- Pending queue is a derived view of the verdict ledger, not a separate store.
- `ingest` is the single unified verb for joining a thread, regardless of how the session was surfaced (sweep proposal, deliberate history dig, or overriding an old reject).
- Two grades of "no": implicit `pass` (written only by explicit `conclude`, voided and re-proposed if the session grows) and sticky explicit `reject` (survives growth and charter edits).
- Sweep is judgment-only (detect + triage + report) and writes no thread content; member refresh is a separate, human-triggered `refresh <slug>` command — this supersedes the earlier plan for automatic refresh during sweep.
- The verdict ledger, baseline, and `last_sweep_at` live in a machine-local root, `~/.mindframe-z/thread-sweep/`, distinct from the git-pushed thread store at `~/.mindframe-z/threads/`.
- Sweep runs as step one of the review skill for v1 — not a cron job or session-end hook, since a hook would fire exactly when sessions are hottest, fighting the quiescence gate.
- `discover` stays exploratory and ephemeral with no post-thread `--thread` mode — bolting persistence onto it would give one command two unrelated jobs.
- Triage is the sole producer of proposals: creating a thread makes every post-baseline session an automatic candidate against it on the next sweep (no-pin-means-candidate rule).
- `sweep --backfill <slug>` was killed entirely — pre-baseline sessions never become candidates, so persisted backfill verdicts would sit unread forever; deep history digs are served by `discover` or the reviewing agent's own session search.
- Implementation was kept additive — a small `verdicts.ts` ledger module, a `sweep.ts` orchestration module, and CLI wrappers — rather than special-casing the existing ingest/refresh pipeline.
- Live AI dispatch was smoke-tested (isolated home directory plus a symlinked-credentials mount) rather than relying on fixture coverage alone, confirming the dispatch path end to end.
- Adversarial code review (independent Claude Opus + GPT-5.5 panels, chaired merge) is now part of shipping the change: 7 findings confirmed and fixed, 3 downgraded and fixed, 4 rejected as minor.

## Design
```
source signals (mtime / time_updated)
        │
        ▼
 candidate detection (diff vs. pins)
        │
        ▼
   quiescence gate ──(hot, deferred)──> reported, retried next sweep
        │ (quiet)
        ▼
 triage (1 dispatch/session, all charters)
        │
        ▼
  verdict ledger (fits / no-fit / pass / reject)
        │
        ▼
 pending queue (derived: fits ∧ ¬member ∧ ¬human-verdict)
        │
   ┌────┼──────────┐
   ▼    ▼          ▼
 ingest conclude   reject
 (join) (→ pass)  (sticky no)
```

## Intent
The goal is a system that proactively pulls new or changed sessions into their threads instead of requiring manual re-discovery each time, without inventing duplicate bookkeeping — sweep state should ride entirely on watermarks and verdicts that already exist. A recurring constraint throughout is that the CLI's primary caller is an agent (via the `threads` skill), so nothing in the design can assume a blocking interactive human prompt, and token spend must be conserved: reading the pending list must never re-trigger paid triage, and a paid triage verdict must be persisted the moment it's produced rather than risked on a later failure.

## Vision
The system should make sessions reviewable soon after work on them stops, trusting the `--include-hot` bypass and always-reported deferrals to cover the risk of triaging half-finished work rather than waiting out of excess caution; the quiescence default settled at 6 hours, balancing that promptness against `gather`'s cost of re-synthesizing a still-hot session on every pass. Sweep itself should stay cheap, idempotent, and machine-local enough that it needs no scheduling ceremony for v1 — run as step one of the review skill — with a scheduled/cron variant remaining available later as free composition rather than a design change. That vision is no longer purely aspirational: the implementation now demonstrates it end to end, with a live dispatch smoke test and an adversarial review giving concrete evidence the system behaves as intended before wider use.

## Perspective
The user is strongly averse to state duplication: repeated course corrections trace to a single instinct that a second store for anything already expressible via existing watermarks/ledger will only drift (rejecting a separate sweep-state ledger, a persisted `discover --thread` mode, and a persisted `--backfill` command). They hold a firm single-responsibility view of commands — `discover` is pre-thread exploration only, `sweep` is judgment only and must never write thread content, `refresh` is the separate expensive/human-triggered counterpart — explicitly rejecting designs that give one command two unrelated jobs or blend cheap judgment with expensive synthesis. They are skeptical of interaction patterns that assume a human at a blocking prompt, given the primary caller is an agent, and pushed for explicitness over assumption (a first sweep with no baseline should refuse and explain, not silently assume a window). That same rigor carried into implementation: rather than trust fixture coverage alone, they asked for the real live AI dispatch path to be smoke-tested, and drove an adversarial two-panel code review (independent Claude Opus and GPT-5.5 passes) before approving all findings for a fix in one pass — a "trust but verify" habit that treats even a well-designed, well-tested change as needing outside adversarial scrutiny before shipping.

## Sources
- opencode — https://github.com/anomalyco/opencode.git
