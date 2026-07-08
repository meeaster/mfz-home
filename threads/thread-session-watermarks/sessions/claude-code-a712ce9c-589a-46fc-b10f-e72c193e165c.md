# Session a712ce9c-589a-46fc-b10f-e72c193e165c — Per-Session Watermarks and Ingest-Time Auto-Refresh Design

## Thread Relevance

This session is the design origin for per-session watermarks and ingest-time auto-refresh in mindframe-z threads: it works through the watermark's purpose, who computes it, the full-vs-delta re-synthesis strategy, config placement, auto-refresh scope, and watermark shape, grounding the decisions in empirical gather-cost measurements, and closes with a validated OpenSpec change.

## Gaps

The dossier does not include the exact prompt text used in the grill or the full text of the created OpenSpec artifacts (proposal.md, spec.md, design.md, tasks.md) — only their described contents. The two delta-mechanics questions (delta gather prompt phrasing, synthesize revision contract) are explicitly deferred/unresolved per the dossier, not a gap in reporting. Turn numbers for some findings (e.g., failed free+max attempt) are given as ranges rather than single turns.

## Decisions

- [2026-06-29 19:38] Watermark's role is a coarse staleness signal triggering full re-synthesis (option A), not a precise delta cursor (option B) — full re-synthesis lets the synthesizer see the whole session as one coherent whole, while delta synthesis is a summary-of-a-summary that compounds fidelity loss on every refresh. (a712ce9c · turn 4)
- [2026-06-29 19:39] The watermark is computed deterministically by TS reading session stores directly (option A), not reported by the gather agent (option B) — the watermark must gate spend by deciding which sessions merit re-synthesis before paying for dispatch; an agent-reported watermark can't gate anything since gather cost is already paid by the time it reports. (a712ce9c · turn 5)
- [2026-06-29 19:40] Update strategy is full re-synthesis always (option A) plus a loud-fail guardrail, rather than delta-only (B) or hybrid (C) — no measured session definitively breaks full re-read today, so the simple design wins, with a guardrail that fails loudly rather than silently truncating if a gather's measured input exceeds a safe context budget. (a712ce9c · turn 9)
- [2026-06-29 19:45] `update_strategy: full | delta` (default `full`) is placed as a sibling of `defaults` in `profileThreadSchema`, not nested inside it — `defaults` selects which models fill gather/synthesize roles, while `update_strategy` is a behavior mode, a different kind of setting. (a712ce9c · turn 41)
- [2026-06-29 19:45] `update_strategy` is a global config setting only, with no per-run override flag and no per-thread manifest storage — global config plus rule is the single source of truth. (a712ce9c · turn 42)
- [2026-06-29 19:47] Auto-refresh of detected-stale sessions is integrated directly into `ingest` (option A), not left as a separate detect-and-report step (option B) — the digest re-runs on every ingest regardless, so folding refresh into ingest means paying the digest once over already-current session files, making it strictly cheaper than a separate refresh command. (a712ce9c · turn 42)
- [2026-06-29 19:49] Watermark is a content tail signature — `{ message_count, last_message_id, last_activity_at }` — captured right after each session's synthesize succeeds, not file mtime or any other proxy. (a712ce9c · turn 49)
- [2026-06-29 19:49] Vanished or shrunk sessions are treated as not-stale: the session file is left untouched and noted, keeping the thread stable when an underlying session disappears. (a712ce9c · turn 43)

## Learnings

- [2026-06-29 19:41] Across 114 local Claude Code sessions, ~75% are under 0.5 MB, 19 (~17%) exceed 1 MB, and 6 (~5%) exceed 2 MB; the largest is 2.5 MB / 1007 messages (~125k content tokens, ~649k raw file tokens with full metadata) and is not a compaction-workflow session. (a712ce9c · turn 9)
- [2026-06-29 19:41] OpenCode sessions run far larger than Claude Code's: the largest measured session is ~1.44M content tokens, with 49 sessions exceeding 200k tokens and 139 exceeding 100k tokens, meaning full single-context reads are already infeasible for many opencode sessions today, implying gather must already be chunk-reading them via incremental sqlite queries. (a712ce9c · turn 13)
- [2026-06-29 19:52] Gathering the largest Claude session (2.5 MB, ~125k content tokens) with haiku/low cost $0.10, used 192k cumulative input tokens (mostly cache reads), took 54 seconds over 11 turns, with no context blowup. (a712ce9c · turn 16)
- [2026-06-29 20:15] Gathering the largest opencode session (~1.44M content tokens) via the opencode-sessions skill + sqlite3, using the real default gather path (claude+haiku), cost $0.24, took 2.7 minutes over 37 turns (chunk-read via sqlite, heavy cache), with no context blowup. (a712ce9c · turn 38)
- [2026-06-29 19:42] The expensive part of the pipeline is not re-reading raw sessions: `gather` runs on the cheap default model (`claude-code:haiku@low`), while `synthesize` and `digest` run on the expensive model (`sonnet@high`) but only read the bounded gather dossier and session files, never the raw session. (a712ce9c · turn 6)
- [2026-06-29 19:41] Only 3 sessions carry compaction summaries, but even those top out at 2.4 MB; the single largest session (2.5 MB) is not one of them — it's just long, confirming no session definitively breaks full re-read today. (a712ce9c · turn 9)

## Mistakes Fixed

- [2026-06-29 19:58] An attempt to measure opencode gather using `deepseek-v4-flash-free` with `--variant max` stalled for 20 minutes producing zero data due to free-tier rate-limiting/queueing, not session size or capacity; the autopsy confirmed the run hung on its first big model call before opencode persisted any work, since haiku later ate the identical 1.44M-token session in 2.7 minutes. Fixed by switching to the real default path — `claude+haiku` reading the opencode session via the opencode-sessions skill + sqlite3 — which is both faster and more faithful to the actual default behavior. (a712ce9c · turn 38)

## Issues

- [2026-06-29 20:20] The digest generated after ingesting this session drifted on specifics despite capturing the decision shape correctly: it hallucinated the watermark as file mtime (actual: content tail signature), hallucinated config fields `watermark`/`refresh`/`delta_optin` (actual: single `update_strategy` enum), and claimed "Open questions: None" (actual: two open delta-mechanics questions exist in design.md). The authoritative source is the OpenSpec change directory, not the digest; the implementer should follow the OpenSpec artifacts. (a712ce9c · turn 60)

## Open Questions

- [2026-06-29 20:05] What is the exact delta gather prompt phrasing to instruct "summarize messages after X" (the cursor/id)? Deferred to build time since `full` is the default and measurements suggest delta may never be needed. (a712ce9c · turn 51)
- [2026-06-29 20:05] What is the synthesize revision contract — how should the agent revise an existing session file from (prior file + delta dossier) without quality loss? Deferred to build time for the same reason. (a712ce9c · turn 51)

## Intent & Vision

- [2026-06-29 19:38] "If quality is the objective, the answer to Q1 is unambiguously (A). Full re-synthesis lets the synthesizer see the entire session as one coherent whole; delta synthesis revises a summary using only the new tail — it's a summary-of-a-summary. Every refresh compounds fidelity loss." (a712ce9c · turn 4)
- [2026-06-29 19:39] "Your instinct to loop back is right — the mega-session case is exactly where Q1's 'full re-synthesis' assumption strains." (a712ce9c · turn 6)
- [2026-06-29 19:42] "Settle it empirically, or accept the estimate and go simple? ... My recommendation: run one real gather ... Costs ~$1–2 and needs docker, but gives ground-truth." — griller's framing that prompted the user's insistence on measuring before deciding. (a712ce9c · turn 9)
- [2026-06-29 19:45] "Done — global config setting only, no flag. ... Simplest possible: one knob, one source of truth." (a712ce9c · turn 42)
- [2026-06-29 19:47] "Your token-cost reasoning is exactly right — the digest re-runs on every ingest anyway. Folding refresh into ingest means you pay the digest once over already-current session files. So auto-refresh-on-ingest isn't just convenient, it's strictly cheaper than a separate command." (a712ce9c · turn 42)
- [2026-06-29 19:49] "Keeps the thread stable when an underlying session disappears." — on treating vanished/shrunk sessions as not-stale. (a712ce9c · turn 43)
- [2026-06-29 20:20] "This is a good live demonstration that the digest is a lossy synthesis — the authoritative spec is `openspec/changes/add-thread-session-watermarks/` (which is correct and validated). The implementer should follow the OpenSpec artifacts, not the digest." (a712ce9c · turn 60)

## Artifacts Touched

- [2026-06-29 20:00] Created `openspec/changes/add-thread-session-watermarks/proposal.md` — capability description for thread watermarks + auto-refresh, one new capability `thread-session-watermarks`, impact on schema, config, and ingest. (a712ce9c · turn 51)
- [2026-06-29 20:00] Created `openspec/changes/add-thread-session-watermarks/specs/thread-session-watermarks/spec.md` — 5 requirements with scenarios covering watermark capture, staleness detection, auto-refresh, configurable strategy, and vanished/shrank handling. (a712ce9c · turn 51)
- [2026-06-29 20:00] Created `openspec/changes/add-thread-session-watermarks/design.md` — full Q1–Q6 decision tree with rationale, empirical findings, risks, and migration notes, including the two deferred delta-mechanics questions. (a712ce9c · turn 51)
- [2026-06-29 20:00] Created `openspec/changes/add-thread-session-watermarks/tasks.md` — 6 task groups in dependency order (schema → host reader → capture → detection/auto-refresh → strategy → docs), mirroring existing test style. (a712ce9c · turn 51)
- [2026-06-29 20:05] Wrote handoff `/tmp/handoff-thread-watermarks-impl.md` — implementation-focused, points at the OpenSpec change as source of truth, suggests skills (openspec-apply-change, threads, code-review). (a712ce9c · turn 58)
- [2026-06-29 20:05] Wrote handoff `/tmp/handoff-thread-prompt-fidelity.md` — for a future session optimizing synthesis prompts to match spec, addressing the digest drift issue. (a712ce9c · turn 58)
- [2026-06-29 20:30] Created thread `thread-session-watermarks` on the `personal` destination and ingested this session into it for $0.038. (a712ce9c · turn 59)
