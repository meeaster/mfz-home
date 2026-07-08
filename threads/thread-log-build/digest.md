# Digest — thread-log-build

## Current State

The thread-log skill is built and has been through several hardening passes, most of them driven by dogfooding — running the skill on real threads (observability-pipelines, thread-log-usage, datadog-cost) and folding the friction back into the skill.

The architecture has settled into its current shape:

- **Two-phase pipeline** — a capable *plan* phase (discover → confirm membership → hand off) and a slim, headless *worker* phase (gather → synthesize → advance watermarks → regenerate views). The worker runs in a stripped runtime so the fat system prompt isn't re-billed as cache-read every turn.
- **Two-stage extraction** — a cheap Haiku **gatherer** (an Explore subagent, read-only, returns text) reads the whole transcript; the capable **synthesizer** (the worker process) reads only that dossier and writes the bucketed session file. Cost stays proportional to *thinking*, not *reading*. The accuracy experiment confirmed this split is sound.
- **Four files per thread** — `manifest.json` (charter + membership ledger + runs[] telemetry), authored `sessions/<id>.md` (the immutable event store), and regenerated `log.md` (flat chronological event stream) and `digest.md` (current-state view).
- **The ARTIFACTS.md / INGEST.md cleave** (most recent session, 8c343e36): ARTIFACTS.md is the contract for *what each file is*; INGEST.md is *how it gets built*; SKILL.md carries the *why* (the lens) and the map. Templates fix structure, never cap content length.

The extraction schema is five event buckets (Decisions, Learnings, Mistakes Fixed, Issues, Open Questions) plus three state sections (Intent & Vision, Artifacts Touched, Sources), Title-Case headers in session files, singular lowercase tags in the log. Session frontmatter is slim (title + thread_relevance + gaps + extracted_by). `runs[]` carries full telemetry. The charter does triple duty — scope, membership criterion, and purpose-as-lens — with `read_subagents` as the executable mechanism for meta/process threads.

## Design

```
manifest.json ── charter + ledger + runs[] ──> WHICH sessions, run telemetry
      │
   PLAN phase (capable)                  WORKER phase (slim, headless)
   discover → confirm → hand off  ──>    gather → synthesize → advance → regenerate
                                              │         │
                              Haiku gatherer ─┘         └─ capable synthesizer
                              (reads transcript,           (reads only the dossier,
                               returns text dossier)        writes the files)
                                              │
                                              ▼
                                   sessions/<id>.md   (event store, immutable)
                                              │  regenerated whole each run
                                   ┌──────────┴──────────┐
                                   ▼                     ▼
                                log.md                digest.md
                            (events, by time)      (current state)

Contract split:  ARTIFACTS.md = what each file is   ·   INGEST.md = how it's built   ·   SKILL.md = why + map
```

## Key Decisions

- Two-phase pipeline (capable plan + slim headless worker) with a stripped runtime to avoid re-billing the system prompt every worker turn.
- Two-stage extraction: cheap Haiku gatherer reads; capable synthesizer judges and writes — confining the cheap model to retrieval.
- Sources is a first-class external-only state bucket with a dedicated home (no digest-time scavenging).
- Intent & Vision is one state bucket capturing the user's own voice — the *why* and the *vision* — kept near-verbatim.
- Subagent-read depth is the consumer's policy, expressed via the per-thread `read_subagents` floor; a session that exercises a skill reads deep regardless.
- Default mode is incremental-from-watermark; full refresh (re-read from offset 0) is an explicit escape hatch.
- The charter does triple duty: scope + membership criterion + purpose-as-lens.
- Always jq, never Read on full JSONL transcripts (Read's size cap).
- Capture subagent I/O from the parent's Agent/tool_result pair by default; drill into nested `<session-id>/subagents/agent-*.jsonl` only for deep reads.
- Extraction subagents must "load via the Skill tool" (not "read the SKILL.md"), so the Skill tool_use is detectable.
- ARTIFACTS.md / INGEST.md cleave (what vs how); ARTIFACTS.md read is worker-phase only.
- Strict canonical log-line template; flat chronological stream, no grouping headers.
- Title-Case session headers; slim frontmatter; terse `extracted_by` model id; no new bucket types.
- Digest keeps empty sections with explicit "None" (except ## Design, omitted when nothing is spatial).
- Default to Sonnet-max for most extractions; reserve Opus-max for high-value/durable/high-rationale-density sessions (effort is the dominant lever; model only matters at max effort).

## Open Questions

- Should narrow-scope discovery accept an explicit sessionId and skip the ~5-query phrase hunt? (685e7813)
- Should the extraction contract live in a shared reference instead of being inlined into every Agent prompt? (685e7813)
- Is "load via the Skill tool" the universal canonical phrasing, and should it live in a central reference? (e915cf55)
- Should thread-log support explicit archival/versioning of experiment runs, rather than the manual `threads-archive/` copy? (0a64f481)

## Intent

The skill exists to solve one problem the user states over and over: a unit of work sprawls across many sessions in two tools, and the decisions, learnings, mistakes, and — most importantly — the user's own *rationale* and *thinking-aloud* scatter and get lost. The recurring fear, stated most sharply in the accuracy experiment: "I want to make sure that the threads is surfacing enough of the rationales around things... so that way when we do add more sessions that we're just not losing this information."

Two principles govern almost every decision. First, **cost-consciousness** — "be considerate of how much tokens we are reading," which drives the slim worker runtime, the Haiku gatherer, jq-not-Read, and per-run model/effort configurability. Second, **single source of truth** — every fact has exactly one home (the ARTIFACTS/INGEST cleave, the dedicated sources bucket, slim frontmatter, runs[] as the one process ledger). Templates should fix *structure* but never *cap content* — "the goal is not to cap for the sake of it."

A strong secondary intent is **dogfooding**: the skill is hardened by running it and studying the runs. Several of its most important features (read_subagents, the growth-scan step, the jq rule, the find-session ordering fix, the skill-load wording) came directly from watching a real extraction underperform.

## Vision

The user is building toward a *family* of read-only store-inspection skills (opencode-sessions, claude-code-sessions) that thread-log composes over — and toward thread-log as a cost-optimized extraction system where cheap models gather, capable models synthesize, and effort/model are tuned per session's value. The aspiration that recurs: pick up a multi-session unit of work months later from a single digest without re-reading raw transcripts, with the *why* preserved, not just the settled outcomes. The charter-as-lens idea points further — threads that don't just log work but log *feedback on the process itself*, closing a loop where using the skill improves the whole skill stack. (Cross-thread membership — scoring a session against every thread's charter — is named as a future direction, deferred until more than one thread exists.)

## Direction

- Resolve the open questions above — especially whether the inlined extraction contract should move to a shared reference, and whether discovery should accept an explicit sessionId.
- Consider first-class archival/versioning of experiment runs (currently a manual `threads-archive/` copy).
- The 8c343e36 changes were applied to the in-repo skill copy only; the user planned to sync to `~/.claude` themselves — confirm that landed.
- Continue dogfooding: each real run is the source of the next round of hardening.

## Sources

- `writing-great-skills` skill (+ GLOSSARY.md) — the craft reference: leading words, outline-first, completion criteria, sprawl/sediment.
- `grilling` skill — used to interrogate the ARTIFACTS.md design fork-by-fork.
- `~/references/mattpocock-skills` — exemplar skills surveyed for structure and voice.
- `claude-code-docs` skill and Claude Code official docs — API surface and Explore subagent model defaults.
- `claude-code-sessions` / `opencode-sessions` skills and their specs — the dependent session-reading skills.
- Live `opencode db` CLI and opencode source — to recover the current schema.
- Real dogfood subjects: observability-pipelines, thread-log-usage, datadog-cost threads; source session `7b8f7306` (the jira/confluence/pr-writer design session used as the fixed accuracy target).
