# Digest — thread-session-watermarks

## Current State

Per-session watermarks and ingest-time auto-refresh for mindframe-z threads are designed, implemented, code-reviewed, and merged into a PR awaiting review. The OpenSpec change `add-thread-session-watermarks` (proposal, spec, design, tasks) is complete and archived, all 265 tests pass, and `openspec --strict` validates clean. A profile-inheritance bug found during code review (parse-time `.default("full")` silently clobbering a parent profile's `delta` setting) has been fixed. A separate, still-open thread of work exists: a fidelity audit of the gather→synthesize→digest pipeline itself found that a generated digest of the original design session hallucinated several specifics (watermark mechanism, config field names, open-question status); the root cause ("confident gap-filling") is identified but the prompt fix is not yet done.

## Components

- **Per-session watermarks & auto-refresh** — deterministic TS-computed watermark plus ingest-time drift detection and full/delta update strategy · implemented, code-reviewed, bug-fixed, tests passing, OpenSpec change archived, draft PR open (`github.com/meeaster/mindframe-z` PR #2, branch `feat/thread-session-watermarks`).
- **Digest/synthesis pipeline fidelity** — quality-control audit of whether gather→synthesize→digest preserves exact identifiers, field names, and decision specifics from source sessions · root cause found ("confident gap-filling"); prompt revision to fix it not yet executed.
- **Cross-cutting** — the OpenSpec change directory is the authoritative source of truth over any generated digest, since the digest itself is a lossy synthesis prone to confidently inventing plausible-but-wrong specifics.

## Direction

- Resume implementation review/merge at PR #2 (`feat/thread-session-watermarks` → `master` on `meeaster/mindframe-z`); the archived change `openspec/changes/archive/2026-07-01-add-thread-session-watermarks/` holds the requirements, design rationale, and completed task list.
- No live delta-vs-full A/B has been run against a genuinely growing session — both sessions used for delta testing so far are closed/static, so delta's read-past-cursor branch is verified only by unit tests; a real comparison needs a session that keeps growing after watermarking.
- The prompt-fidelity fix for gather/synthesize/digest (to preserve exact identifiers and mark unknowns as unspecified rather than inventing values) is planned as an iteration loop — repeatedly re-ingesting the same design session (~$0.04, ~1 min/cycle) — but has not been carried out yet.

## Open Questions

- How should the gather/synthesize/digest personas and prompts be revised to preserve exact identifiers, field names, enum values, and decision specifics verbatim, and mark unknowns as unspecified instead of inventing plausible values?
- Should the changed-session set print pre-dispatch (restoring an early Ctrl-C opportunity) or post-run as it currently does? The spend-gating drift detection itself remains pre-dispatch either way.

## Key Decisions

- Watermark is a deterministic, TS-computed content-tail signature — `{message_count, last_message_id, last_activity_at}` — read directly from the session store (Claude Code JSONL, OpenCode SQLite via `node:sqlite`) rather than agent-reported, so it can gate spend before any dispatch cost is paid; captured into the manifest right after each session's synthesize succeeds.
- Full re-synthesis is the default update strategy, since no measured session breaks full re-read and delta synthesis is a summary-of-a-summary that compounds fidelity loss on every refresh. `update_strategy: delta` remains as an opt-in escape hatch — kept alive despite a code-review recommendation to delete it entirely — specifically to enable an empirical full-vs-delta comparison, gated on requiring both a prior watermark and a prior session file.
- Delta needed no skill/code changes, only prompt-shaping: a gather-prompt addition to read only messages after the cursor id, and a synthesize-prompt addition supplying the prior session file with a "revise this" instruction instead of "build new."
- `update_strategy` is a sibling of `defaults` in `profileThreadSchema` — a behavior mode distinct from model-selection defaults — set only at global/profile level (no per-run flag, no per-thread manifest storage). The field is `.optional()`, with the `full` default resolved at the point of consumption, after the earlier parse-time `.default("full")` was found to silently clobber a parent profile's `delta` setting during inheritance.
- Auto-refresh is folded into `ingest` rather than kept as a separate detect-and-report step, because the digest re-runs on every ingest regardless — folding pays that digest cost once over already-current session files. Pre-dispatch drift detection (recompute + classify unchanged/changed/vanished-or-shrank) is free and adds only genuinely changed sessions to the synthesis work set.
- A dedicated `refresh` subcommand (with `--all`) was added alongside `ingest`: bare `ingest` without ids now errors ("Nothing to ingest"), while `refresh` succeeds on an empty work set and `--all` forces re-synthesis of every present session, backfilling watermarks for previously-unwatermarked ones. Both commands still auto-refresh drifted siblings as a pre-digest step.
- Vanished-or-shrunk sessions are treated as not-stale — left untouched and noted — to keep the thread stable when an underlying session disappears; unwatermarked sessions are likewise skipped by default drift-only refresh, only gaining a watermark when explicitly named in an ingest or captured via `refresh --all`.

## Design

```
ingest <thread> [ids...]          refresh <thread> [--all]
        │                                  │
        └──────────────┬───────────────────┘
                        ▼
      pre-dispatch watermark recompute (free, TS host reader)
      classify each existing session: unchanged | changed | vanished/shrank
                        │
      changed ∪ named-ids  →  synthesis work set
                        │
        full (default) ──────────── delta (opt-in, update_strategy: delta)
   read whole session, resynthesize     read past cursor, revise prior file
                        │
                        ▼
               single digest pass (once per run)
```

## Intent

The problem: mindframe-z threads accumulate sessions that change over time, and re-synthesizing every session on every ingest is wasteful. The goal is a zero-cost, pre-dispatch way to know which specific sessions actually changed since last ingest, so paid synthesis work only happens where it's needed — without sacrificing synthesis quality by defaulting to a lossier delta strategy.

## Vision

Delta remains a hedge against a future mega-session that could break full-context re-read, but that case hasn't materialized in measurement yet — full is expected to remain the workhorse strategy unless a live, growing-session A/B someday shows otherwise. Separately, there's an aspiration to make the gather→synthesize→digest pipeline itself faithful enough that a digest (like this one) never needs to be second-guessed against the OpenSpec artifacts it's meant to summarize.

## Perspective

The user consistently favors empirical measurement over estimation before locking in a design — insisting on a real gather run against the largest sessions rather than accepting a cost guess, and later insisting on keeping the `delta` strategy alive (against a code-reviewer's efficiency argument to delete it) specifically so a real full-vs-delta comparison remains possible. At the same time the user is pragmatic under blockers: when a Docker TLS failure threatened to stall live testing, they overrode the assistant's separation-of-concerns advice and bumped the base image immediately to unblock progress, then later made sure the resulting change shipped as its own separate commit rather than staying tangled with the feature. The user treats generated digests with explicit distrust relative to the OpenSpec artifacts, having personally seen a digest confidently invent wrong specifics, and is willing to fund an iterative, low-cost loop to fix that fidelity gap rather than let it stand.

## Sources

- Claude Code JSONL session store format and OpenCode SQLite `message` table schema, researched via an Explore agent to determine watermark field derivation.
