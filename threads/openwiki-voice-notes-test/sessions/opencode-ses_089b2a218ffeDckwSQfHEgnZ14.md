# Session ses_089b2a218ffeDckwSQfHEgnZ14 — OpenWiki Integration Investigation

## Thread Relevance

Yes. The session evaluated OpenWiki for ingesting voice notes, generating and retrieving knowledge, fitting into a wider personal knowledge architecture, and operating durably through Git.

## Gaps

The dossier does not provide the underlying prototype implementations, complete evaluation criteria, or a final adoption/implementation decision beyond the recommended operating model. It does not establish whether OpenWiki will be deployed in production.

## Phases

- [2026-07-18 17:36 → 17:55] Exploration and setup — investigated OpenWiki, authentication, installation, and its possible place in the knowledge system. (prt_f764d5e5c0011nk22w6ciT5Px4–prt_f765e72440025WbRuWUKlQ7HF8)
- [2026-07-18 17:59 → 18:03] Initial prototype — began an isolated prototype and changed execution from mise to direct `openwiki` use. (prt_f7662319f0010Ytvk9GGkuu723–prt_f7665c2c7001VuCiMgl35rq1fT)
- [2026-07-18 18:17 → 18:27] Voice-note input exploration — tested raw, cleaned, and summary-derived inputs, layering, retrieval, and taxonomy generation. (prt_f76723123001YkfUXbTnpV8J2Y–prt_f767be16d001T3nHrioxHucDkl)
- [2026-07-18 18:50 → 18:57] OpenWiki role and replacement design — clarified topic-oriented output and began replacement-oriented prototyping. (prt_f7690b5c6001k4ulXqMjhvfz3O–prt_f76976c200014rda6UihYwYBF6)
- [2026-07-18 19:32 → 20:12] Input and model comparison — compared input layers and models through an end-to-end evaluation. (prt_f76b7143a0025ebkCyTDSXN1lW–prt_f76dc000e001vGAKOFpE26CuBB)
- [2026-07-18 20:33 → 21:13] Sol-only raw-to-wiki and raw-first pivot — tested cleanup-plus-synthesis, then moved away from mandatory cleanup. (prt_f76ef5a4f001oo3cjdshhFCnAr–prt_f7713c99f001RujDl8qvzkr1nx)
- [2026-07-19 00:34 → 08:29] Central knowledge architecture — reframed the system around centralized access and scoped source roles. (prt_f77cba657001SxPLxE8Wj7dl5H–prt_f797e4b15001AcP7dxbkL9MEzV)
- [2026-07-19 18:13 → 21:37] Full-corpus validation and Git operating model — completed validation prototypes and narrowed reliability requirements to Git-gated operation. (prt_f7b95a532001AkIWMKOt2WZNMk–prt_f7c5067b1001cW6R25wrnEoO9W)

## Decisions

- [2026-07-18 18:03] Run `openwiki` directly rather than through mise — the user explicitly overrode the mise-based execution path. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7665c2c7001VuCiMgl35rq1fT)
- [2026-07-18 18:55] Explore OpenWiki as a replacement for the existing voice-note topic, theme, and dictionary workflow — the user wanted to assess whether it could become the knowledge system for all knowledge rather than remain a compact index. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7694f4be001P5aAz4JYK7qffb)
- [2026-07-18 20:33] Use Sol for the broader workflow and test a raw-to-wiki replacement — the user selected Sol after model comparison. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f76ef5a4f001oo3cjdshhFCnAr)
- [2026-07-18 21:12] Abandon mandatory cleaned notes in favor of raw-first ingestion — staged cleanup did not safely produce authoritative unattended cleanup, while the raw-first prototype generated useful synthesis without a cleaned layer. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7713350d0023staC4ENb7uGqt)
- [2026-07-19 00:41] Design for centralized access to knowledge rather than centralized storage — source systems retain their roles: voice notes synthesize, repositories generally reference, and Jira remains operational. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f77d1d4c8001dv5qrUrUwkou2q)
- [2026-07-19 21:39] Use a Git-gated generated wiki rather than OpenWiki-native transactional machinery — serialized writing, a clean worktree, deterministic validation, diff review, and accepted commits contain failures while avoiding deferred rollback, locking, and transactional metadata complexity. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7c517d5b001Bwa6MTgnYwQN0V)

## Learnings

- [2026-07-18 18:27] The initial layered design positioned OpenWiki as an upper knowledge and retrieval layer over a generated read-only Git view, with escalation to raw sources for exact detail. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f767be16d001T3nHrioxHucDkl)
- [2026-07-18 18:50] OpenWiki can generate topic pages, themes, glossaries, and retrieval material, although its default personal mode favors compact synthesis with optional topic pages. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7690cfe7001d7Kf3kLAO172rR)
- [2026-07-18 19:33] In separate tests, cleaned-only input had the strongest fidelity and uncertainty handling, de-linked summaries produced strong compact taxonomy, and raw-only was weaker at ambiguity handling. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f76b8368e001bk8vSuNRERNdjz)
- [2026-07-18 20:30] Sol performed better for complete ingestion, but neither tested model safely produced authoritative unattended cleanup. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f76ec714e0017cFpxB3Hmjbvyz)
- [2026-07-18 21:56] The raw-first five-note prototype generated five summaries, four topics, one theme, glossary and dictionary material, raw-source escalation, and byte-stable unchanged reruns without a cleaned layer. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f773ac206001mTQAmSGkGx8aRw)
- [2026-07-19 20:39] Wiki-only output can answer synthesis questions but cannot preserve exact wording; an approved raw projection restores exact retrieval. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7c1aa01b001rKKcrnA0No4Rcj)
- [2026-07-19 20:42] Full-corpus ingestion validated 23 raw notes and 23 summaries across 43 files; corrections and contradictions behaved appropriately, and terminology evolution retained historical uncertainty. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7c1d60a2001hH511ERnvvcWyF)

## Mistakes Fixed

- [2026-07-18 19:59] The initial conclusion that Terra was worse was narrowed after the user noted it was based on only one example; the comparison could not establish which model was better from that result. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f76d056c40022ue1vvd7KW6xp9)

## Issues

- [2026-07-18 21:09] Staged cleanup was unreliable: ordinary review under-marked uncertainty on one note, while a bounded retry added ten excessive markers on another. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f770fdd89001ip2SCp9st64nzs)
- [2026-07-18 21:53] The taxonomy garden corrected over-compression but encountered concurrent shared-page collisions. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f77385e70001zS8idOH6vy9w8Y)
- [2026-07-19 20:21] A forced failure could partially edit `quickstart.md`, fail to write `.last-update.json`, and still pass structural validation. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7c0abd90001r1G0euOiRHVJNw)
- [2026-07-19 20:36] Reference-only behavior was prompt guidance rather than runtime enforcement in OpenWiki `0.2.0`. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7c180b09001UmIQnvTW12ztmN)

## Intent & Vision

- [2026-07-18 18:50] "I thought open wiki is supposed to ... create like topics." — the user expected a topic-oriented knowledge system, not only compact output. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7690b5c6001k4ulXqMjhvfz3O)
- [2026-07-18 19:35] "It would be nice if ... that cleaning up process could happen with OpenWiki." — the user wanted the system to absorb note cleanup rather than require a separate cleanup boundary. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f76ba297d001lJMpqbj0JIU3y6)
- [2026-07-18 19:35] The user asked to test `gpt-5.6-sol` and push OpenWiki's customization limits. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f76ba297d001lJMpqbj0JIU3y6)
- [2026-07-18 21:12] "Do you think we should even bother with the cleaned version or just use the raw versions?" — the user questioned whether cleanup justified its cost and reliability risk. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7713350d0023staC4ENb7uGqt)
- [2026-07-19 00:34] The user explored a central knowledge layer connecting voice notes, AI sessions, messages, calendars, repositories, and project context while keeping project-management systems operationally separate. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f77cbfaa70010i1aFVMYqjPl5w)
- [2026-07-19 21:33] "are these things actually needed and not just overengineering." — the user challenged reliability mechanisms that exceeded the practical need. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7c4bec02001y02SQmrh28tV1G)
- [2026-07-19 21:35] "we would definitely want the wiki to be a git repo so i feel it solves most of that." — the user preferred Git as the practical containment boundary. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7c4e951f001ZxE01gtml5u2kq)

## Sources

- [2026-07-18 17:36] OpenWiki reference — `/home/mark/.mindframe-z/references/openwiki`. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f764d5e5c0011nk22w6ciT5Px4)
- [2026-07-18 17:36] Voice-notes repository — `/home/mark/code/voice-notes`. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f764d5e5c0011nk22w6ciT5Px4)
- [2026-07-18 17:59] OpenWiki prototype handoff — `/tmp/opencode/openwiki-prototype-handoff.md`. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7662319f0010Ytvk9GGkuu723)
- [2026-07-18 18:50] OpenWiki agent prompt — `/home/mark/.mindframe-z/references/openwiki/src/agent/prompt.ts`. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7690cfe7001d7Kf3kLAO172rR)
- [2026-07-18 18:50] Layered profile instructions — `/tmp/opencode/openwiki-layered-profile/.openwiki/INSTRUCTIONS.md`. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7690cfe7001d7Kf3kLAO172rR)
- [2026-07-18 18:50] Layered profile onboarding configuration — `/tmp/opencode/openwiki-layered-profile/.openwiki/onboarding.json:15`. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7690cfe7001d7Kf3kLAO172rR)
- [2026-07-18 18:57] OpenWiki replacement prototype handoff — `/tmp/opencode/openwiki-replacement-prototype-handoff.md`. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f76976c200014rda6UihYwYBF6)
- [2026-07-18 20:30] End-to-end model comparison — `/tmp/opencode/openwiki-end-to-end-model-comparison/evaluation/comparison.md`. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f76ec714e0017cFpxB3Hmjbvyz)
- [2026-07-18 20:33] Sol raw-to-wiki replacement handoff — `/tmp/opencode/openwiki-sol-raw-to-wiki-replacement-handoff.md`. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f76ef5a4f001oo3cjdshhFCnAr)
- [2026-07-18 21:56] Sol replacement prototype verdict — `/tmp/opencode/openwiki-sol-replacement-prototype/evaluation/replacement-verdict.md`. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f773ac206001mTQAmSGkGx8aRw)
- [2026-07-19 00:34] Latest raw voice note — `/home/mark/code/voice-notes/raw/20260718_165427_68fbd26ead08.md`. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f77cbfaa70010i1aFVMYqjPl5w)
- [2026-07-19 08:21] Raw-first next-prototypes handoff — `/tmp/opencode/openwiki-raw-first-next-prototypes-handoff.md`. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f79775d72001GOk3PiaGZ4VuX5)
- [2026-07-19 20:36] OpenWiki docs-only backend — `/home/mark/.mindframe-z/references/openwiki/src/agent/docs-only-backend.ts`. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7c180b09001UmIQnvTW12ztmN)
- [2026-07-19 20:36] OpenWiki agent index — `/home/mark/.mindframe-z/references/openwiki/src/agent/index.ts`. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7c180b09001UmIQnvTW12ztmN)
- [2026-07-19 21:39] Git-gated operating model evaluation — `/tmp/opencode/openwiki-raw-first-full-corpus/evaluation/git-gated-operating-model.md`. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7c517d5b001Bwa6MTgnYwQN0V)
- [2026-07-19 20:36] Reference-policy source — `/tmp/opencode/openwiki-reference-policy/reference-source/reference.md`. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7c180b09001UmIQnvTW12ztmN)
