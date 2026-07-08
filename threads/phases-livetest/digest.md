# Digest — phases-livetest

## Current State
The watermark-driven refresh system for mindframe-z has shipped and been validated live. Session drift is detected against stored watermarks, with both a delta and a full synthesis path kept side-by-side for comparison. The CLI now cleanly separates `ingest` (named session ids, adds sessions) from `refresh --thread <slug>` (reconciles drifted sessions, no new ids), with a `--all` flag on `refresh` to force full re-gather/re-synthesis regardless of watermark state. A store-root path bug that broke dossier generation has been fixed and live-tested end-to-end, including a healed session and a pushed digest.

## Components
- **Watermark & delta/full synthesis** — dual synthesis paths (delta vs. full) kept intentionally so results can be compared directly · live-tested successfully, watermarks advancing correctly on real thread data.
- **Refresh-thread CLI** — `ingest`/`refresh` split plus `--all` force-rebuild flag, resolving the "still ingesting?" ambiguity around drifted sessions · shipped (265 tests passing), PR opened, openspec docs brought in line with shipped behavior.
- **Store-root reliability fix** — consolidated ~15 hardcoded paths into a single `$STORE` resolved from `$CLAUDE_SESSIONS_DIR`, plus enforced source-qualified session id format (`claude-code:<id>` / `opencode:<id>`) and exact-path transcript resolution with a missing-transcript guard · fixed, live-tested via full `--all` rebuild, pushed.
- **Cross-cutting** — regardless of run mode (`ingest`, `refresh`, `refresh --all`), digest synthesis is paid for exactly once per run, and the true mode is recorded in run status/commit messages.

## Direction
- Further ingestion was requested after the refresh/`--all`/ingest split shipped; openspec `spec.md`/`proposal.md`/`tasks.md` in the change directory serve as the resume point for spec-vs-implementation alignment.
- PR https://github.com/meeaster/mindframe-z/pull/2 is the open resume point for the refresh CLI work.
- Working branch `fix/gather-session-store-root` (10 files, 268 tests) is the resume point for the store-root/session-id fix, already pushed to `main` (`c950321..8ece1ce`) on https://github.com/meeaster/threads.git.

## Open Questions
None.

## Key Decisions
- Keep both the delta stack and the full synthesis path rather than replacing one, to allow direct comparison of results.
- Split `ingest` (requires named session ids, auto-refreshes siblings) from `refresh --thread <slug>` (reconciles drifted sessions only, no new ids); both pay for digest synthesis exactly once.
- Add `--all` to `refresh` to force full re-gather/re-synthesis of every present session regardless of watermark status, so never-watermarked sessions aren't invisible to refresh.
- Enforce source-qualified session id format (`claude-code:<id>` / `opencode:<id>`) rather than inferring the source, with improved thread-skill guidance on its use.
- Collapse all hardcoded store-root paths into a single `$STORE` variable resolved from `$CLAUDE_SESSIONS_DIR`, used consistently by skill and runner.

## Design
```
ingest <ids...>          refresh --thread <slug>
  │  requires new ids       │  no new ids, reconciles drift
  │  auto-refreshes         │
  │  siblings               ├── (default) only sessions past watermark
  ▼                         └── --all: force full re-gather + re-synthesis
watermark advanced             of every present session
  │                            ▼
  └──────────► digest synthesized exactly once per run
```

## Intent
The driving motivation was to make session drift detection and refresh trustworthy and unambiguous: keep delta and full synthesis paths side by side to empirically compare them, give the CLI an explicit way to reconcile drifted sessions without conflating it with adding new ones, and close the gap where a session that had never been watermarked would be invisible to a refresh. Underneath the CLI work sat a reliability concern — inconsistent store-root resolution was silently breaking dossier generation, and the user wanted that made explicit and single-sourced (`$STORE`) rather than patched around.

## Vision
The user is steering toward a refresh/ingest system that behaves predictably under real usage: correct semantics for "nothing changed" (success under refresh, not an error), enforced rather than inferred session id formats, and a store-root path that can't silently diverge between skill and runner. The explicit ask to "run live tests to verify... it's ok to spend money" signals the vision has moved from designed-and-shipped to proven-on-real-data as the bar for done.

## Perspective
The user thinks in terms of user experience even for CLI semantics — visibly working through "is this technically still ingesting?" before settling on separate commands, preferring explicit named intents over overloaded ones. They favor enforcement over inference (source-qualified session ids) and want guardrails that fail loudly rather than silently (the missing-transcript guard preventing a fabricated refusal from being watermarked). They're pragmatic about validation cost, explicitly authorizing real spend for live tests rather than trusting design or unit tests alone.

## Sources
- Watermark thread — no address recorded; loaded for design comparison during delta-stack work.
