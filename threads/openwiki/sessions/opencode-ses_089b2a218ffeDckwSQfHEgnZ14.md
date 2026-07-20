# Session ses_089b2a218ffeDckwSQfHEgnZ14 — OpenWiki Investigation and Prototypes

## Thread Relevance

Belongs: this session investigated, configured, tested, and defined an operating model for OpenWiki as a knowledge synthesis and retrieval layer.

## Gaps

The dossier does not provide exact OpenCode turn ranges, complete configuration file paths, or the full contents of prototype reports and handoffs.

## Phases

- [2026-07-18 17:36 → 17:42] OpenWiki fit investigation — assessed its architecture and fit alongside the voice-note system. (parts prt_f764de...–prt_f764fa...)
- [2026-07-18 17:43 → 17:52] Authentication, configuration, and installation — configured OAuth, Mise, and release-age exceptions. (parts prt_f76537...–prt_f765c1...)
- [2026-07-18 17:55 → 18:17] Prototype handoff and initial execution — established isolated testing constraints and repaired installation/provider defects. (parts prt_f765f1...–prt_f767374...)
- [2026-07-18 18:17 → 18:57] Layered voice-note prototype — compared source views and clarified OpenWiki's synthesis role. (parts prt_f767231...–prt_f7697c...)
- [2026-07-18 19:32 → 20:12] Input and model comparisons — tested raw, cleaned, and summary inputs and refined the evaluation goal. (parts prt_f76b714...–prt_f76dc000...)
- [2026-07-18 20:33 → 2026-07-19 08:29] Raw-first Sol replacement prototype — shifted to raw-first ingestion and designed gated larger-scale tests. (parts prt_f76ef5...–prt_f797e6...)
- [2026-07-19 18:14 → 20:42] Full-corpus reliability, federation, and portability tests — completed content, source-policy, terminology, and failure-mode evaluations. (parts prt_f7b95d...–prt_f7c1d60...)
- [2026-07-19 21:33 → 21:38] Git-gated operating model — narrowed operational controls to a Git acceptance boundary. (parts prt_f7c4bec...–prt_f7c517...)
- [2026-07-20 04:50 → 04:51] Thread ingestion — created the broad OpenWiki thread and invoked session ingestion. (parts prt_f7ddc635...–prt_f7ddd3...)

## Decisions

- [2026-07-18 17:39] Keep the existing voice-note pipeline and evaluate OpenWiki experimentally as a higher-level personal-wiki and chat layer, rather than replacing the pipeline immediately. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f764fcb...)
- [2026-07-18 17:46] Use OpenWiki major version `0` at the user's direction; it resolved to `openwiki@0.2.0`. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7655e...)
- [2026-07-18 18:42] Use personal mode rather than code mode because code mode writes into the source repository; use one read-only layered Git view rather than separate Git source instances because they overwrite shared `sources/git-repo.md` identity. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f76896...)
- [2026-07-18 20:39] Use Sol for complete OpenWiki processing after end-to-end evidence, while recognizing dedicated cleanup remained unreliable. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f76f4d...)
- [2026-07-18 21:13] Prefer immutable raw transcripts through Sol summaries into topics, themes, and dictionaries; retain existing cleaned notes as historical evidence rather than required new input. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f771358...)
- [2026-07-19 08:25] Use `gpt-5.6-sol`, raw authority, explicit source roles, and deterministic validation for the full-corpus plan. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f797ae...)
- [2026-07-19 21:35] Use a clean Git working tree, one serialized OpenWiki writer, deterministic validation, diff review, accepted commits, and an external authoritative ledger as the minimum operating model; dedicated rollback, same-path conflict detection, transactional metadata, and a processing database were not initially required. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7c4ea...)

## Learnings

- [2026-07-18 17:39] OpenWiki was described as a CLI for agent-maintained code or personal wikis that uses connectors or Git repositories to synthesize local Markdown knowledge, including compact pages and optional topic/entity directories. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f764fcb...)
- [2026-07-18 18:50] Personal mode creates a compact synthesis by default and creates topic pages only when the agent judges them worthwhile. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f769115...)
- [2026-07-18 18:11] Wiki-level retrieval answers stay in the synthesis, while omitted details can escalate to the configured Git source. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f766d462...)
- [2026-07-18 19:33] The initial input comparison found cleaned notes strongest for authoritative input, de-linked summaries best for compact taxonomy, and raw-only weakest. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f76b836...)
- [2026-07-18 21:54] Raw-source escalation recovered an exact Git detail; unchanged ingestion was byte-stable; provenance, links, headings, and uncertainty checks passed. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f77390...)
- [2026-07-18 21:56] The five-note raw-only prototype produced five summaries, four focused topics, one cross-topic theme, glossary, researched dictionary, unresolved-term register, navigation, and no `cleaned/` directory. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f773ac...)
- [2026-07-19 20:01] All 23 approved raw notes received matching summaries, and deterministic validation covered 43 generated files. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7bf8ad...)
- [2026-07-19 20:11] Correction handling was focused and reversible. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7c01d...)
- [2026-07-19 20:19] Contradiction handling presented the later view first while preserving earlier history. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7c085...)
- [2026-07-19 20:31] Terminology evolution preserved earlier uncertainty and updated dictionary/topic relationships without rewriting the historical summary. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7c13ce...)
- [2026-07-19 20:35] The reference-only fixture returned port `4319` and ignored embedded instructions under prompt guidance. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7c177...)
- [2026-07-19 20:36] A wiki-only bundle could not answer exact wording, but an approved raw projection restored exact retrieval. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7c1a5...)

## Mistakes Fixed

- [2026-07-18 18:04] A stale pnpm-global `v0.1.1` binary conflicted with the intended Mise `v0.2.0`; installation was repaired so plain `openwiki` resolved to `v0.2.0`. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f766687...)
- [2026-07-18 17:52] Layered Mise and npm release-age restrictions initially blocked installation; `npm:openwiki` and `deepagents` exceptions were added while retaining the three-day policy for other dependencies. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f765c1...)

## Issues

- [2026-07-18 18:03] The first OAuth-backed run still requested `OPENAI_API_KEY`, and selecting OAuth exposed a missing `better-sqlite3` native binding. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f766570...)
- [2026-07-18 21:56] Shared-page gardening collisions occurred and self-repaired, becoming the primary operational caveat. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f773ac...)
- [2026-07-19 20:21] A forced failure changed `quickstart.md` before failing to write `.last-update.json`; structural validation passed, but aggregate hashing detected the partial state. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7c0abd...)
- [2026-07-19 20:24] Source inspection found direct local-shell writes without transaction, rollback, optimistic path version, or write-set commit. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7c0d9...)
- [2026-07-19 20:36] OpenWiki `0.2.0` had no runtime source-policy enforcement, despite correct reference-only behavior under prompt guidance. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7c180...)
- [2026-07-19 21:37] Three ordinary updates reported stale-write collisions, and a second garden emitted `LangChainTracer` lifecycle errors despite telemetry being disabled. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7c509119...)

## Intent & Vision

- [2026-07-18 18:17] "all the ways we could get voice notes to work with it." (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f767231...)
- [2026-07-18 19:35] "That's why I'm trying to like, I'm trying to stress the boundary, the bounds of how much we can customize OpenWiki." (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f76ba51...)
- [2026-07-18 20:00] The user wanted to determine whether raw notes could be processed directly into the wiki, separately from choosing a model for complete ingestion. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f76d150...)
- [2026-07-18 20:33] "we probably should start using, we should just use Sol for everything," with raw-to-wiki testing for topics, themes, dictionary, and voice-note replacement. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f76ef5...)
- [2026-07-19 00:40] The user's architectural preference was a central knowledge layer, rather than a replacement for operational systems. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f77d1d...)
- [2026-07-19 21:33] "are these things actuslly needed and not just overengerring". (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7c4bec...)
- [2026-07-19 21:35] "we would definitely want the wiki to be a git repo so i feel it solves most of that". (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7c4e951...)
- [2026-07-20 04:50] "I want this thread to scope to just any openwiki work." (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7ddc635...)

## Artifacts Touched

- [2026-07-18 17:57] Created the initial prototype handoff at `/tmp/opencode/openwiki-prototype-handoff.md`. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f76609...)
- [2026-07-18 18:57] Requested the replacement prototype handoff at `/tmp/opencode/openwiki-replacement-prototype-handoff.md`. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f76976...)
- [2026-07-18 18:42] Created and tested the layered read-only Git view at `/tmp/opencode/openwiki-voice-views/layered`. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f76896...)
- [2026-07-19 21:38] Updated prototype report and evaluation artifacts to document the Git-gated operating model and retain failure evidence. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7c517...)
- [2026-07-20 04:51] Created thread `openwiki` and invoked ingestion for `opencode:ses_089b2a218ffeDckwSQfHEgnZ14`. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7ddd3d...)

## Sources

- [2026-07-18 17:43] OpenWiki OAuth implementation — `/home/mark/.mindframe-z/references/openwiki/src/agent/openai-chatgpt-oauth.ts`. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7653a6...)
- [2026-07-18 17:43] OpenAI OAuth authorization endpoint — `https://auth.openai.com/oauth/authorize`. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7653a6...)
- [2026-07-18 17:43] OpenAI OAuth token endpoint — `https://auth.openai.com/oauth/token`. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7653a6...)
- [2026-07-18 17:43] ChatGPT Codex backend API — `https://chatgpt.com/backend-api/codex`. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7653a6...)
- [2026-07-18 17:48] Mise trust documentation — `https://mise.en.dev/cli/trust.html`. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f765861...)
- [2026-07-18 18:58] OpenWiki README — `/home/mark/.mindframe-z/references/openwiki/README.md`. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f769847...)
- [2026-07-19 20:24] OpenWiki docs-only backend — `/home/mark/.mindframe-z/references/openwiki/src/agent/docs-only-backend.ts`. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7c0d9...)
- [2026-07-19 20:24] OpenWiki agent index — `/home/mark/.mindframe-z/references/openwiki/src/agent/index.ts`. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7c0d9...)
