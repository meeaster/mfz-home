# Session ses_086816c49ffeaNW3Onc7uzFYxk — Full-Corpus Raw-First Prototype Execution

## Thread Relevance

Belongs: this session initiated the raw-first ingestion prototype and established its validation, provenance, privacy, and failure-handling constraints.

## Gaps

The final ingestion command was still running when the session ended. The dossier records no ingestion output, validation result, checkpoint, gate verdict, or canonical-file update.

## Phases

- [2026-07-19 08:29 → 08:33] Full-corpus raw-first prototype execution — established a fresh prototype from the oldest raw note and began ingestion, which remained running at the session cutoff. (parts `prt_f797e93bd001ETUBDc7dzMq12T`–`prt_f798204540017nO5Q2ont1oH8G`)

## Decisions

- [2026-07-19 08:29] Use immutable raw transcripts with one Sol/OpenWiki ingestion per note, source-linked summaries, incremental topics/themes, contextual dictionary and unresolved candidates, navigation, and deterministic validation — prior cleanup experiments were unreliable, oscillating between missed ambiguity and excessive uncertainty marking. (`ses_086816c49ffeaNW3Onc7uzFYxk` · `prt_f797ea12f001LTtAjeBtRWNAZ2`)
- [2026-07-19 08:29] Execute five dependent prototypes in order and stop later gates after a failed acceptance criterion — preserve failed candidates and checkpoints while proceeding autonomously within the gated sequence. (`ses_086816c49ffeaNW3Onc7uzFYxk` · `prt_f797e93bd001ETUBDc7dzMq12T`)
- [2026-07-19 08:31] Create a fresh raw-first prototype with validator, checkpoint/hash tooling, and per-run ledger — the available workspace lacked a source repository, accepted run, and validation file. (`ses_086816c49ffeaNW3Onc7uzFYxk` · `prt_f798012d5001uTuNgP9vXHI5e4`)

## Learnings

- [2026-07-19 08:29] Prior five-note raw-first evidence recorded matching raw files and summaries, zero provenance errors, broken links, or duplicate headings, no `cleaned/` directory, successful raw-source escalation, and byte-stable unchanged ingestion at aggregate SHA-256 `94f48e6342669de2515bcbb04f5d39a68cf2ec08527a8870f3f77a59bdb9baeb`. (`ses_086816c49ffeaNW3Onc7uzFYxk` · `prt_f797ea12f001LTtAjeBtRWNAZ2`)
- [2026-07-19 08:31] The full-corpus workspace contained terminology aids, an empty raw directory, an OAuth symlink, and empty artifact directories, but no source repository or accepted run. (`ses_086816c49ffeaNW3Onc7uzFYxk` · `prt_f798012d5001uTuNgP9vXHI5e4`)
- [2026-07-19 08:32] The prototype source repository was initialized with `RAW_FIRST_CONTRACT.md` and two terminology aids in commit `f34171e`; the oldest raw note was added in commit `5acfa9d`. (`ses_086816c49ffeaNW3Onc7uzFYxk` · `prt_f798170e2001L3BAAb8salbmCI`)
- [2026-07-19 08:33] The oldest note was the sole raw input and the profile goal named only that note. (`ses_086816c49ffeaNW3Onc7uzFYxk` · `prt_f79820438001K2WFb4IW3E6cOj`)

## Issues

- [2026-07-19 08:29] `openwiki --version` failed with `Unknown option: --version`. (`ses_086816c49ffeaNW3Onc7uzFYxk` · `prt_f797efccb001txAph1gBse9r2R`)
- [2026-07-19 08:30] `pnpm list -g openwiki --depth 0` failed because `/home/mark/.local/share/pnpm/bin` was absent from `PATH`. (`ses_086816c49ffeaNW3Onc7uzFYxk` · `prt_f797f2888001Bt92A0Y4a1ldBA`)
- [2026-07-19 08:30] The expected prior prototype validator did not exist, and no matching validation file was found. (`ses_086816c49ffeaNW3Onc7uzFYxk` · `prt_f797f85a70019CoclVwMZ9N9iE`)
- [2026-07-19 08:33] The recorded ingestion command remained running at session end, leaving its outcome unknown. (`ses_086816c49ffeaNW3Onc7uzFYxk` · `prt_f798204540017nO5Q2ont1oH8G`)
- [2026-07-19 08:29] Recorded operational risks included catch-all topic compression, concurrent shared-page collisions, stale or duplicated content repair, repeated `LangChainTracer` lifecycle errors despite disabled telemetry, non-authoritative processing coverage, lossy summaries, terminology staleness, and model invocation for unchanged Git ingestion. (`ses_086816c49ffeaNW3Onc7uzFYxk` · `prt_f797ea12f001LTtAjeBtRWNAZ2`)

## Open Questions

- [2026-07-19 08:33] Whether the first ingestion completed successfully and met the deterministic validation gate is unanswered in the record. (`ses_086816c49ffeaNW3Onc7uzFYxk` · `prt_f798204540017nO5Q2ont1oH8G`)

## Intent & Vision

- [2026-07-19 08:29] “Do not merely plan: execute the sequence fully.” (`ses_086816c49ffeaNW3Onc7uzFYxk` · `prt_f797e93bd001ETUBDc7dzMq12T`)
- [2026-07-19 08:29] “Raw transcripts are authoritative and private,” while model-authored processing pages are not authoritative. (`ses_086816c49ffeaNW3Onc7uzFYxk` · `prt_f797e93bd001ETUBDc7dzMq12T`)
- [2026-07-19 08:29] All prototype artifacts must remain under `/tmp/opencode/`; canonical raw and derived directories must not be modified; cleaned transcripts are prohibited; telemetry is disabled; and the specified provider and model must be used. (`ses_086816c49ffeaNW3Onc7uzFYxk` · `prt_f797e93bd001ETUBDc7dzMq12T`)

## Artifacts Touched

- [2026-07-19 08:32] Created the prototype source repository and `RAW_FIRST_CONTRACT.md`; added the two terminology aids and oldest raw note. (`ses_086816c49ffeaNW3Onc7uzFYxk` · `prt_f798170e2001L3BAAb8salbmCI`)
- [2026-07-19 08:33] Created or retained `/tmp/opencode/openwiki-raw-first-full-corpus/evaluation/runs/001-ingest.log` for the first ingestion run. (`ses_086816c49ffeaNW3Onc7uzFYxk` · `prt_f79820438001K2WFb4IW3E6cOj`)

## Sources

- [2026-07-19 08:29] `/tmp/opencode/openwiki-raw-first-next-prototypes-handoff.md` (`ses_086816c49ffeaNW3Onc7uzFYxk` · `prt_f797ea12f001LTtAjeBtRWNAZ2`)
- [2026-07-19 08:29] `/home/mark/code/voice-notes/analysis/openwiki-prototype-report.md` (`ses_086816c49ffeaNW3Onc7uzFYxk` · `prt_f797ea12f001LTtAjeBtRWNAZ2`)
- [2026-07-19 08:29] `/home/mark/code/voice-notes/analysis/ambiguous-terms.md` (`ses_086816c49ffeaNW3Onc7uzFYxk` · `prt_f797ea12f001LTtAjeBtRWNAZ2`)
- [2026-07-19 08:29] `/home/mark/code/voice-notes/analysis/context-dictionary.md` (`ses_086816c49ffeaNW3Onc7uzFYxk` · `prt_f797ea12f001LTtAjeBtRWNAZ2`)
- [2026-07-19 08:29] `/tmp/opencode/openwiki-raw-only-sol-prototype/evaluation/verdict.md` (`ses_086816c49ffeaNW3Onc7uzFYxk` · `prt_f797ea12f001LTtAjeBtRWNAZ2`)
- [2026-07-19 08:29] `/tmp/opencode/openwiki-raw-only-sol-prototype/evaluation/run-ledger.md` (`ses_086816c49ffeaNW3Onc7uzFYxk` · `prt_f797ea12f001LTtAjeBtRWNAZ2`)
- [2026-07-19 08:29] `/tmp/opencode/openwiki-raw-only-sol-prototype/home/.openwiki/INSTRUCTIONS.md` (`ses_086816c49ffeaNW3Onc7uzFYxk` · `prt_f797ea12f001LTtAjeBtRWNAZ2`)
- [2026-07-19 08:29] `/tmp/opencode/openwiki-sol-replacement-prototype/evaluation/replacement-verdict.md` (`ses_086816c49ffeaNW3Onc7uzFYxk` · `prt_f797ea12f001LTtAjeBtRWNAZ2`)
- [2026-07-19 08:29] `/tmp/opencode/openwiki-end-to-end-model-comparison/evaluation/comparison.md` (`ses_086816c49ffeaNW3Onc7uzFYxk` · `prt_f797ea12f001LTtAjeBtRWNAZ2`)
- [2026-07-19 08:29] `/home/mark/.mindframe-z/references/openwiki` (`ses_086816c49ffeaNW3Onc7uzFYxk` · `prt_f797ea12f001LTtAjeBtRWNAZ2`)
- [2026-07-19 08:29] https://claude.com/pricing (`ses_086816c49ffeaNW3Onc7uzFYxk` · `prt_f797ea12f001LTtAjeBtRWNAZ2`)
- [2026-07-19 08:29] https://github.com/openclaw/openclaw (`ses_086816c49ffeaNW3Onc7uzFYxk` · `prt_f797ea12f001LTtAjeBtRWNAZ2`)
- [2026-07-19 08:29] https://platform.claude.com/docs/en/about-claude/pricing (`ses_086816c49ffeaNW3Onc7uzFYxk` · `prt_f797ea12f001LTtAjeBtRWNAZ2`)
- [2026-07-19 08:29] https://deepswe.datacurve.ai/ (`ses_086816c49ffeaNW3Onc7uzFYxk` · `prt_f797ea12f001LTtAjeBtRWNAZ2`)
- [2026-07-19 08:29] https://github.com/SWE-bench/SWE-bench (`ses_086816c49ffeaNW3Onc7uzFYxk` · `prt_f797ea12f001LTtAjeBtRWNAZ2`)
- [2026-07-19 08:29] https://scale.com/blog/swe-bench-pro (`ses_086816c49ffeaNW3Onc7uzFYxk` · `prt_f797ea12f001LTtAjeBtRWNAZ2`)
- [2026-07-19 08:29] https://developers.openai.com/api/docs/guides/latest-model.md (`ses_086816c49ffeaNW3Onc7uzFYxk` · `prt_f797ea12f001LTtAjeBtRWNAZ2`)
- [2026-07-19 08:29] https://github.com/Fission-AI/OpenSpec (`ses_086816c49ffeaNW3Onc7uzFYxk` · `prt_f797ea12f001LTtAjeBtRWNAZ2`)
- [2026-07-19 08:29] https://github.com/anomalyco/opencode (`ses_086816c49ffeaNW3Onc7uzFYxk` · `prt_f797ea12f001LTtAjeBtRWNAZ2`)
- [2026-07-19 08:29] https://github.com/anthropics/claude-code (`ses_086816c49ffeaNW3Onc7uzFYxk` · `prt_f797ea12f001LTtAjeBtRWNAZ2`)
- [2026-07-19 08:29] https://github.com/vercel-labs/skills (`ses_086816c49ffeaNW3Onc7uzFYxk` · `prt_f797ea12f001LTtAjeBtRWNAZ2`)
- [2026-07-19 08:29] https://github.com/ogulcancelik/herdr (`ses_086816c49ffeaNW3Onc7uzFYxk` · `prt_f797ea12f001LTtAjeBtRWNAZ2`)
- [2026-07-19 08:29] https://github.com/Zackriya-Solutions/meetily (`ses_086816c49ffeaNW3Onc7uzFYxk` · `prt_f797ea12f001LTtAjeBtRWNAZ2`)
- [2026-07-19 08:29] https://github.com/openwhispr/openwhispr (`ses_086816c49ffeaNW3Onc7uzFYxk` · `prt_f797ea12f001LTtAjeBtRWNAZ2`)
- [2026-07-19 08:29] https://github.com/tobi/qmd (`ses_086816c49ffeaNW3Onc7uzFYxk` · `prt_f797ea12f001LTtAjeBtRWNAZ2`)
