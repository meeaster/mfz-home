# Session ses_089b2a218ffeDckwSQfHEgnZ14 — OpenWiki Architecture And Prototype

## Thread Relevance

This session investigated OpenWiki's role in voice-note synthesis and retrieval, then developed and validated a separate Core, Personal, and Work wiki architecture with Git-gated ingestion and supervised agent actions.

## Gaps

The dossier does not provide the original transcript, exact phase turn ranges, implementation status after the requested thread refresh, or resolutions for the remaining prototype risks.

## Phases

- [2026-07-18 17:36 → 2026-07-19 18:13] OpenWiki exploration and voice-note prototyping — evaluated OpenWiki, voice-note processing, cleanup, model behavior, retrieval, provenance, and raw-first synthesis. (prt_f764d5e5c0011nk22w6ciT5Px4 → prt_f7b95a532001AkIWMKOt2WZNMk)
- [2026-07-19 21:33 → 2026-07-20 04:50] Reliability concerns and right-sized architecture — reconsidered transactional safeguards around Git, ingested the session into a thread, and committed related work. (prt_f7c4bec02001y02SQmrh28tV1G → prt_f7ddc2cfe001SXp8lRRlOqo34M)
- [2026-07-20 07:01 → 2026-07-20 08:41] Connectors, source topology, and Personal/Core/Work design — defined source policies, separate wiki roles, session processing, workstreams, and external projections. (prt_f7e541aa4001YzHlR0GU59bcNW → prt_f7eb04550001FUSwOu2ViY02MO)
- [2026-07-20 08:47 → 2026-07-20 14:02] Architecture handoff and synthetic prototype — produced architecture materials, ran synthetic topology and workflow tests, and documented residual risks. (prt_f7eb597240010t5L9hfkfNK72y → prt_f7fd5d33f001Psx3xqnHlUXck5)
- [2026-07-20 14:03 → 2026-07-20 15:16] Artifact packaging, failure retries, and thread refresh — moved prototype evidence, reran failed scenarios successfully, and requested a thread refresh. (prt_f7fd70a2c001aMc6rV7xI3uD7z → prt_f80199d35001gbTiyA75uR9E0N)

## Decisions

- [2026-07-18 18:14] Use OpenWiki as a synthesis and retrieval layer rather than a complete voice-note-workflow replacement because the existing workflow remained the tested authority. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f76703a39001wtqfEt2h186vFY)
- [2026-07-18 18:57] Preserve `/home/mark/code/voice-notes` as authoritative and leave its canonical raw, cleaned, summary, topic, theme, dictionary, and ledger data unmodified during prototypes. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f76970c1b001gruC3Ac44ezrZ1)
- [2026-07-18 21:13] Stop using OpenWiki to generate cleaned transcripts because cleanup acceptance tests showed unreliable behavior across models. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f77135823001gaaHROL0v7Cx6G)
- [2026-07-18 21:56] Adopt immutable raw transcripts followed by Sol/OpenWiki per-note summaries, topics, themes, dictionary, navigation, periodic gardening, and deterministic validation. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f773ac206001mTQAmSGkGx8aRw)
- [2026-07-20 07:22] Separate Core, Personal, and Work environments; keep reviewed non-sensitive reusable knowledge in Core, with Personal and Work consuming it read-only. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7e675c8c001lH0PzbP5gdC46R)
- [2026-07-20 07:31] Allow Work synthesis to read accepted Core material when work depends on Core knowledge while keeping Work and Core as separate wikis. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7e6fb0e100180HG7kWF1yYusr)
- [2026-07-20 07:37] Keep Work voice notes inside the enterprise boundary through Windows Sound Recorder, local audio, Handy CLI, the Work source repository, and enterprise-model synthesis. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7e75471a001sbkVVTx2QN2rZy)
- [2026-07-20 07:44] Start with Windows Sound Recorder instead of immediately building a custom recorder. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7e7c21ce001ka5VvapmJchXnw)
- [2026-07-20 08:26] Classify workstreams at the wiki layer so raw voice notes remain untouched and classifications can evolve. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7ea1eeca001ESXEiOeJiVrvtZ)
- [2026-07-20 08:37] Represent external artifacts as selective, read-only Markdown projections in Git while GitHub, Jira, and Confluence remain authoritative. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7eac0f550012yEqCayP9cS399)
- [2026-07-20 08:54] Use OpenCode CLI as the current replaceable execution substrate for wiki-driven actions. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7ebbbfb1001rto9eU04Gngo1w)
- [2026-07-20 08:56] Use Git-gated writes, serialized writers, deterministic validation, accepted checkpoints, and inspectable rejected diffs after Git was identified as the principal safety boundary. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7ebd9ca1001Agmp1EMZDNuac1)

## Learnings

- [2026-07-18 18:06] OpenWiki performed well for uncertainty-aware synthesis, source retrieval, topic and theme generation, and source-grounded navigation. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f766894ac001jgAoiJbDsn17Ad)
- [2026-07-18 19:54] Terra and Sol failed cleanup acceptance differently: Sol introduced an attribution error in one test and later overmarked uncertainty. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f76cb28b6001voFsLLBx4KwKhy)
- [2026-07-19 20:42] Full-corpus raw-first testing passed content, provenance, correction, terminology, reference-source, and portability checks. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7c1d60a2001hH511ERnvvcWyF)
- [2026-07-20 07:52] Session records provide individual-session coverage, threads provide cross-session continuity, and original sessions remain exact evidence. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7e82f1d7001xTn34PuSj3INmQ)
- [2026-07-20 07:57] Mutable sessions should be summarized through a stable watermark rather than considering inactivity completion. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7e8771cb0015MQ4rC8OOR7A1D)
- [2026-07-20 08:17] Workstreams can track meetings, AI sessions, designs, reviews, feedback, decisions, Jira items, implementation, pull requests, and validation. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7e9a03ad001BGeByxBCLkruOD)
- [2026-07-20 08:21] Sources can belong to multiple projects, workstreams, and topics while authoritative sources remain whole and their relationships evolve. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7e9e084d001b79TqsRH0xlskP)
- [2026-07-20 10:17] The prototype validated separate wiki homes, Core projection, workstreams, decisions, aliases, rename behavior, session watermarks, selective artifact projection, OpenCode context compilation, and human-approved feedback loops. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7f07c8ac001oS4js0ZKMW1Psq)
- [2026-07-20 14:40] Fresh-runtime retries successfully completed Workstream B ingestion, changed-Core ingestion, and Personal propagation with accepted Git checkpoints; the earlier failures appeared transient or run-dependent. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7ff87630001RIT90jsXbQPG5e)

## Issues

- [2026-07-19 20:42] The first failure-recovery run left a partial edit without rollback despite otherwise passing raw-first tests. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7c1d60a2001hH511ERnvvcWyF)
- [2026-07-20 10:17] Remaining prototype risks included partial writes and connector-state advancement after model failures, same-file collisions, stale Personal Core propagation, incomplete multi-workstream relationships, retention/deletion/access-revocation policy, and non-transactional acceptance helpers. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7f07c8ac001oS4js0ZKMW1Psq)

## Intent & Vision

- [2026-07-18 21:13] “I would **stop trying to make OpenWiki generate cleaned transcripts**.” (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f77135823001gaaHROL0v7Cx6G)
- [2026-07-19 21:33] “are these things actuslly needed and not just overengerring”. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7c4bec02001y02SQmrh28tV1G)
- [2026-07-19 21:35] “we would definitely want the wiki to be a git repo so i feel it solves most of that”. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7c4e951f001ZxE01gtml5u2kq)
- [2026-07-20 08:00] The wiki should not be a project manager or automatic action executor; agents should compile task-specific context, propose bounded actions, obtain human approval, execute through existing workflows, and return results as evidence. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7e8aa5010016WINo3W4Q7EIKR)

## Artifacts Touched

- [2026-07-20 08:55] `analysis/wiki-architecture-vision.md` was created as the architecture vision. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7ebd33ca0012tkCHAkssSCiHl)
- [2026-07-20 08:55] `/tmp/opencode/wiki-architecture-prototype-handoff.md` was created as the prototype handoff. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7ebd33ca0012tkCHAkssSCiHl)
- [2026-07-20 14:10] Portable prototype evidence was moved to `prototype/wiki-architecture/`. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7fdd33ae001QWvn6LMlPIovIh)
- [2026-07-20 14:40] Retry evidence was recorded in `prototype/wiki-architecture/evaluation/model-failure-retries.md` and `prototype/wiki-architecture/evaluation/model-failure-retries.json`. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7ff87630001RIT90jsXbQPG5e)

## Sources

- [2026-07-18 17:36] OpenWiki reference repository — `/home/mark/.mindframe-z/references/openwiki`. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f764d5e5c0011nk22w6ciT5Px4)
- [2026-07-18 17:36] Voice-notes repository — `/home/mark/code/voice-notes`. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f764d5e5c0011nk22w6ciT5Px4)
- [2026-07-18 17:55] Cleaned voice-note transcript — `/home/mark/code/voice-notes/cleaned/20260711_013533_40a330836496.md`. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7?)
- [2026-07-18 18:50] OpenWiki agent prompt — `/home/mark/.mindframe-z/references/openwiki/src/agent/prompt.ts:38`, `:172`, and `:352`. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7691150a001zzW0oxzdu1df0w)
- [2026-07-20 07:41] Microsoft Sound Recorder FAQ — https://support.microsoft.com/en-us/windows/apps/sound-recorder-app-for-windows-faq. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7e795ea6001uMnDkUB6aTP3ao)
- [2026-07-20 07:41] FFmpeg DirectShow device documentation — https://ffmpeg.org/ffmpeg-devices.html. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7e795ea6001uMnDkUB6aTP3ao)
- [2026-07-20 07:41] FFmpeg downloads — https://ffmpeg.org/download.html. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7e795ea6001uMnDkUB6aTP3ao)
- [2026-07-20 07:41] AutoHotkey v2 hotkeys — https://www.autohotkey.com/docs/v2/Hotkeys.htm. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7e795ea6001uMnDkUB6aTP3ao)
- [2026-07-20 07:41] NAudio WASAPI recorder — https://github.com/naudio/NAudio/blob/main/Docs/WasapiRecorder.md. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7e795ea6001uMnDkUB6aTP3ao)
- [2026-07-20 07:41] Microsoft microphone permissions — https://support.microsoft.com/en-us/windows/fix-microphone-problems-5f230348-106d-bfa4-1db5-336c6bd1d6. (ses_089b2a218ffeDckwSQfHEgnZ14 · prt_f7e795ea6001uMnDkUB6aTP3ao)
