# Session ses_079e814beffeNl4LzJ3kYM1phW — Designing OpenCode session ingestion into OpenWiki

## Thread Relevance

Belongs: designed, researched, implemented, and validated the OpenCode Hub foundation, including ingestion boundaries, runtime topology, Herdr integration, and remote operation.

## Gaps

The dossier provides phase-level coverage and cited findings, but not complete implementation diffs, command output, configuration contents, or the complete details of the compared harnesses.

## Phases

- [2026-07-21 19:12 → 2026-07-22 00:03] Session ingestion prototype — designed OpenCode-session ingestion into OpenWiki, delegated prototypes, debated summarization timing, and documented the work. (prt_f8617f1f1001QWvgO5bkcr2sIY–prt_f8722d85f001rjY9aAvHXH6ofD)
- [2026-07-22 00:16 → 2026-07-22 04:40] Agent-harness research — compared AI SDK Harness, Rivet, Eve, Deep Agents, OpenCode, and subscription/auth options, then chose OpenCode as the preferred harness. (prt_f872dfb6a001XHcEiyHHuHeV17–prt_f88203d91001Awcm6mom4ICbYl)
- [2026-07-22 14:06 → 2026-07-22 18:44] Hub architecture — reconsidered Eve versus OpenCode, persistent servers, configuration, skills, MCP, agents, workflows, and Herdr. (prt_f8a2615950014GQ5a9paOOFj21–prt_f8b242e7e001hrQ45muzVhyaaA)
- [2026-07-22 18:48 → 2026-07-22 19:03] Remote Herdr/Docker experiment — validated Tailscale-to-Windows-to-Docker SSH access and Herdr remote operation. (prt_f8b28c7cf001VeLTaOQ37ituLH–prt_f8b35e20c001tZYKYZn5YLYzpv)
- [2026-07-22 19:05 → 2026-07-22 21:37] Foundation implementation — created the repository, ledger, OpenCode adapter, transcript summarizer, container runtime, persistent server, Herdr integration, and validation tests. (prt_f8b37d4d4002QcO38oi1AGZi6G–prt_f8bc3625b00153BzBX1ITkR3RP)
- [2026-07-22 21:41 → 2026-07-22 22:29] Runtime-topology revision — corrected remote workspace dispatch, moved interactive agents to direct Herdr-hosted OpenCode processes, retained `opencode serve` for background API use, and fixed duplicate plugin discovery. (prt_f8bc6e3440012YIR25UYOB2572–prt_f8bf24f81001wjYKfjNyHWwLco)
- [2026-07-23 00:20 → 2026-07-23 00:44] Provenance/thread organization — created an `opencode-hub` thread, reviewed candidate sessions, and selected only the primary session for ingestion. (prt_f8c58205f001SBvDq0B9uyj4YN–prt_f8c6e05980010J75VJFA02qk0l)

## Decisions

- [2026-07-22 18:43] Chose OpenCode as the preferred harness over Eve to avoid lock-in to the OpenAI system; Eve remains a future option only if durable waits, callbacks, checkpointed multi-day state, compensation, or heterogeneous runtimes are demonstrated as necessary. (ses_079e814beffeNl4LzJ3kYM1phW · prt_f8b242e7e001hrQ45muzVhyaaA)
- [2026-07-22 19:18] Made `/home/mark/workspace/repos/opencode-hub` the independent foundation repository, with an external SQLite ledger as workflow authority; OpenCode sessions remain evidence and conversation state rather than owning jobs or acceptance. (ses_079e814beffeNl4LzJ3kYM1phW · prt_f8b43b619001FpgBeL8wFv4VUA)
- [2026-07-22 19:24] Kept human acceptance separate from execution, validation, and publication, so ingestion cannot create commitments, assignments, deadlines, or authorization. (ses_079e814beffeNl4LzJ3kYM1phW · prt_f8b493960001VmiSNAuL0Vp777)
- [2026-07-22 19:31] Made the transcript summarizer tool-less and directly invocable over caller-supplied transcripts, prohibiting it from inventing decisions, owners, deadlines, completion, authorization, or acceptance. (ses_079e814beffeNl4LzJ3kYM1phW · prt_f8b4f83b0001FMMg7N0SzmBq54)
- [2026-07-22 20:12] Retained one persistent OpenCode server after explicitly reversing the recommendation to demote it. (ses_079e814beffeNl4LzJ3kYM1phW · prt_f8b74fa32001RLcZOS1ID2aDCJ)
- [2026-07-22 20:34] Used legacy `client.session.create` and `client.session.promptAsync` for interactive attached TUIs because OpenCode `1.18.4` attached TUIs did not consume V2 session history. (ses_079e814beffeNl4LzJ3kYM1phW · prt_f8b89b4dc001J0IgSMjnX8rYze)
- [2026-07-22 20:53] Selected digest-pinned `debian:13-slim` instead of Alpine for glibc compatibility and general development tooling. (ses_079e814beffeNl4LzJ3kYM1phW · prt_f8b9b27d7001s0hCur2yLKvfcu)
- [2026-07-22 22:07] Kept `opencode serve`, but only as a background service for now. (ses_079e814beffeNl4LzJ3kYM1phW · prt_f8bdedc4d0027eRBWAsJn0soKJ)
- [2026-07-22 22:20] Settled on direct OpenCode processes in Herdr panes for interactive agents, with background `opencode serve` outside Herdr for optional API/web access; `Hub` contains persistent `Assistant` (`operator`) and `Quick Tasks` contains disposable agents. (ses_079e814beffeNl4LzJ3kYM1phW · prt_f8beac7f4001Sm170IUl1ZDMWd)
- [2026-07-23 00:44] Selected only `opencode:ses_079e814beffeNl4LzJ3kYM1phW` for ingestion into the `opencode-hub` thread. (ses_079e814beffeNl4LzJ3kYM1phW · prt_f8c6e1ac5001tBp0wYVGq6menk)

## Learnings

- [2026-07-22 19:38] Long transcripts should be retrieved, normalized, pre-redacted, token-budgeted, and split at message boundaries with stable source IDs when needed. (ses_079e814beffeNl4LzJ3kYM1phW · prt_f8b560050001zM2SuAfZAFxpe5)
- [2026-07-22 19:39] OpenCode `1.18.4` local `--file` input is capped at 50 KiB, 2,000 lines, and 2,000 characters per line; remote attachments permit up to 10 MiB, while SDK/API text avoids the Read-tool cap but remains bounded by model context. (ses_079e814beffeNl4LzJ3kYM1phW · prt_f8b575efd001QsuGLwrtt5NV14)
- [2026-07-22 20:49] Agents cannot use the Herdr skill across a separate Herdr-container boundary, so such a container was unnecessary absent an explicit remote-control bridge. (ses_079e814beffeNl4LzJ3kYM1phW · prt_f8b96c823001qCOUcsQKcF73Cb)
- [2026-07-22 21:39] The runtime uses OpenCode `1.18.4`, Herdr `0.7.4`, Node `26.5.0`, pnpm `11.14.0`, and Python `3.13.5` on digest-pinned `debian:13-slim`. (ses_079e814beffeNl4LzJ3kYM1phW · prt_f8bc485800013GL9WEx4CJERNn)
- [2026-07-22 21:45] `herdr --remote` cannot be combined with tab or pane control commands, requiring remote dispatch through `pnpm hub:remote ...` via `docker compose exec`. (ses_079e814beffeNl4LzJ3kYM1phW · prt_f8bca7bdd001zRGdol0H5TjSDA)
- [2026-07-22 22:20] The background server must have zero `HERDR_*` variables, while direct agents inherit genuine Herdr pane context. (ses_079e814beffeNl4LzJ3kYM1phW · prt_f8beac7f4001Sm170IUl1ZDMWd)

## Mistakes Fixed

- [2026-07-22 20:33] Found that `resume: false` admitted durable inbox input without executing it; changed the setting to `resume: true` during testing. (ses_079e814beffeNl4LzJ3kYM1phW · prt_f8b88b103001T3adKNdBhVD97c)
- [2026-07-22 21:56] Replaced the attached-TUI architecture after server-side agents inherited the server pane's Herdr context instead of the operator's visible TUI pane. (ses_079e814beffeNl4LzJ3kYM1phW · prt_f8b4d0f30016n7sR6nRV3U2Ox)
- [2026-07-22 22:29] Reproduced and fixed duplicate Herdr plugin loading by replacing the symlinked `/home/hub/.config/opencode` with a distinct directory. (ses_079e814beffeNl4LzJ3kYM1phW · prt_f8bf24f81001wjYKfjNyHWwLco)

## Issues

- [2026-07-22 19:31] A deterministic validator for transcript-summary artifacts remains unimplemented. (ses_079e814beffeNl4LzJ3kYM1phW · prt_f8b4f83b0001FMMg7N0SzmBq54)
- [2026-07-22 20:40] Interactive sessions remain on legacy endpoints until the TUI consumes V2 history. (ses_079e814beffeNl4LzJ3kYM1phW · prt_f8b8efbd00014E2QXO35oehUKd)
- [2026-07-22 20:49] Cross-process remote Herdr control requires an explicit bridge if agents need that capability. (ses_079e814beffeNl4LzJ3kYM1phW · prt_f8b96c823001qCOUcsQKcF73Cb)
- [2026-07-22 21:28] Remote access depends on `grif.atlas-chicken.ts.net:2223` and persistent authorization of client public key `mark@LAPTOP-QI24P2AC`. (ses_079e814beffeNl4LzJ3kYM1phW · prt_f8bbacc98001LTDJYEgFq1aLGS)

## Intent & Vision

- [2026-07-21 23:47] "i worry thst the deep agents ingest is optimixed for it so we should have our agent runner." The user wanted session export retained and summarized at ingest, but wanted control over the runner rather than relying on Deep Agents. (ses_079e814beffeNl4LzJ3kYM1phW · prt_f87143207001VcRcyEqm9zQ6wD)
- [2026-07-22 18:43] "i still want to build this for opencode because then i won't get locked into the openai system." (ses_079e814beffeNl4LzJ3kYM1phW · prt_f8b242e7e001hrQ45muzVhyaaA)
- [2026-07-22 20:05] "the server that runs open code, should that be separate than Herder?" (ses_079e814beffeNl4LzJ3kYM1phW · prt_f8b6f1537001J1aUBLkob0P9Vs)
- [2026-07-22 21:43] "we need the TUI CLI to create it in the remote one." (ses_079e814beffeNl4LzJ3kYM1phW · prt_f8bc8efd2002C0hzHORlxlmx9s)
- [2026-07-22 21:51] "why does the server still need a herdr pane". (ses_079e814beffeNl4LzJ3kYM1phW · prt_f8bd027b3001NREXBMcjnbHmqw)
- [2026-07-22 22:04] "I have a Hub space with a pane that default opens My AI Assistant agent ... then can have a space for the quick tasks agents ... longer development tasks." (ses_079e814beffeNl4LzJ3kYM1phW · prt_f8bdbd8402001r72BzaNOhwt7KU)

## Artifacts Touched

- [2026-07-22 19:18] `/home/mark/workspace/repos/opencode-hub` — created as the independent foundation repository with the SQLite job/attempt ledger, validation evidence, retries, source identity and watermarks, OpenCode adapter, digest-pinned container, documentation, and `AGENTS.md`. (ses_079e814beffeNl4LzJ3kYM1phW · prt_f8b43b619001FpgBeL8wFv4VUA)
- [2026-07-22 19:23] `/home/mark/workspace/repos/opencode-hub/VISION.md` — maintained vision document. (ses_079e814beffeNl4LzJ3kYM1phW · prt_f8b482f61001W1bmeavQTKKd5U)
- [2026-07-22 19:23] `/home/mark/.mindframe-z/scratchpad/2026-07-22-opencode-hub-working-log.md` — maintained working log. (ses_079e814beffeNl4LzJ3kYM1phW · prt_f8b482f61001W1bmeavQTKKd5U)
- [2026-07-22 21:37] Remote runtime — completed a summarizer using `opencode/deepseek-v4-flash-free` in `w1:tG` / `w1:pG`. (ses_079e814beffeNl4LzJ3kYM1phW · prt_f8bc2eaed001ZN98YYJo2brNK5)

## Sources

- [2026-07-22 21:39] OpenCode installation documentation — https://opencode.ai/install (ses_079e814beffeNl4LzJ3kYM1phW · prt_f8bc485800013GL9WEx4CJERNn)
- [2026-07-22 21:39] Herdr `0.7.4` Linux release — https://github.com/ogulcancelik/herdr/releases/download/v0.7.4/herdr-linux-x86_64 (ses_079e814beffeNl4LzJ3kYM1phW · prt_f8bc485800013GL9WEx4CJERNn)
- [2026-07-22 22:27] Herdr configuration documentation — https://herdr.dev/docs/configuration/ (ses_079e814beffeNl4LzJ3kYM1phW · prt_f8beb9537001UXNeR10rNjobF5)
- [2026-07-22 19:18] AI Harness SDK. (ses_079e814beffeNl4LzJ3kYM1phW · prt_f8b43b619001FpgBeL8wFv4VUA)
- [2026-07-22 19:18] Rivet. (ses_079e814beffeNl4LzJ3kYM1phW · prt_f8b43b619001FpgBeL8wFv4VUA)
- [2026-07-22 19:18] Eve. (ses_079e814beffeNl4LzJ3kYM1phW · prt_f8b43b619001FpgBeL8wFv4VUA)
- [2026-07-22 19:18] Deep Agents. (ses_079e814beffeNl4LzJ3kYM1phW · prt_f8b43b619001FpgBeL8wFv4VUA)
- [2026-07-22 19:18] Claude Cowork. (ses_079e814beffeNl4LzJ3kYM1phW · prt_f8b43b619001FpgBeL8wFv4VUA)
- [2026-07-22 19:18] ChatGPT Work. (ses_079e814beffeNl4LzJ3kYM1phW · prt_f8b43b619001FpgBeL8wFv4VUA)
- [2026-07-22 19:18] Codex app server. (ses_079e814beffeNl4LzJ3kYM1phW · prt_f8b43b619001FpgBeL8wFv4VUA)
- [2026-07-22 19:18] Herdr reference materials — `/home/mark/.mindframe-z/references/herdr` (ses_079e814beffeNl4LzJ3kYM1phW · prt_f8b43b619001FpgBeL8wFv4VUA)
- [2026-07-22 19:18] OpenCode reference materials — `/home/mark/.mindframe-z/references/opencode` (ses_079e814beffeNl4LzJ3kYM1phW · prt_f8b43b619001FpgBeL8wFv4VUA)
