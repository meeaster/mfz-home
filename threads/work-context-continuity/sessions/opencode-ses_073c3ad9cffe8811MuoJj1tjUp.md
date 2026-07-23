# Session ses_073c3ad9cffe8811MuoJj1tjUp — Work-Unit Context Continuity Design

## Thread Relevance

Belongs to the thread: it identifies the continuity problem, develops a work-unit-centered model and MVP, examines OpenCode and Mindframe-Z integration, and ends by directing formalization before implementation.

## Gaps

The dossier does not provide the full user or assistant transcript, exact turn numbers, the contents of created handoff or work-unit artifacts, or confirmation that the requested thread, unit, and OpenSpec proposal were subsequently created.

## Phases

- [2026-07-22 23:49 → 2026-07-23 00:19] Session review and continuity problem — reviewed recent work and context mechanisms to identify drift and authority problems. (prt_f8c3c50fb001k6yWUtjLFAZ6Et–prt_f8c53bec3001CwINXA5OCKbeN4)
- [2026-07-23 00:43 → 2026-07-23 00:52] External skill research and integration — researched, reviewed, vendored, and enabled `batch-grill-me`; this also supplied the design-interview mechanism. (prt_f8c6d0a170013XZ8aSp2Cc1tIh–prt_f8c75c71d001rg9CJ6MIbGJAbw)
- [2026-07-23 00:59 → 2026-07-23 01:02] Handoff and transition — created a handoff for a fresh context-management design session and preserved an evidence conflict. (prt_f8c7c3580001LafN5J4wbmGId4–prt_f8c7ee1ac001wTqvGYRvtCIudj)
- [2026-07-23 01:03 → 2026-07-23 02:35] Work-Unit Design and Dogfooding Model — used batch grilling to define scope, authority, disclosure, observability, validation, and MVP boundaries. (prt_f8c7f9e41001joPwfPDz5HkEn4–prt_f8cd41e2c001KR1h5C2ym1uE1F)
- [2026-07-23 02:38 → 2026-07-23 02:38] Formalization Before Implementation — chose to create the continuity records and discovery proposal before implementation. (prt_f8cd646dd001uRYlZhKx5MHCe3–prt_f8cd718a9001m1NZmrComFznFy)

## Decisions

- [2026-07-23 00:58] Vendor and enable `batch-grill-me` for OpenCode, Claude Code, and Codex after reviewing its provenance, so it can support structured design interviews across those environments. (ses_073c3ad9cffe8811MuoJj1tjUp · prt_f8c7acbce001m56ub913BM2AS6)
- [2026-07-23 01:03] Keep authority field-specific: vision and constraints belong to `VISION.md`; accepted design to `ARCHITECTURE.md` and ADRs; behavior to code and tests; change state to Git and checkpoints; rationale to threads and sessions; broader perspective to the Personal wiki; and experiments to prototypes and research. (ses_073c3ad9cffe8811MuoJj1tjUp · prt_f8c7fe3f4001EnPy02o0EXMIys)
- [2026-07-23 01:03] Permit automation to write derived checkpoints and receipts, but prohibit it from silently changing vision, architecture, acceptance state, commitments, or prototype verdicts, preserving human authority over consequential fields. (ses_073c3ad9cffe8811MuoJj1tjUp · prt_f8c7fe3f4001EnPy02o0EXMIys)
- [2026-07-23 01:28] Make the core object a fluid unit of work rather than an OpenCode session, Mindframe-Z thread, specification, or repository, so it centralizes navigation and orientation without relocating native artifacts. (ses_073c3ad9cffe8811MuoJj1tjUp · prt_f8c96a78e0015gunwoX7P5KSMY)
- [2026-07-23 01:55] Allow a unit to span repositories and external systems; keep the initial MVP to one active unit per session, no relationships, and non-linear phase history to preserve flexibility without expanding initial scope. (ses_073c3ad9cffe8811MuoJj1tjUp · prt_f8caf2ad00016yF0Gz7ci2h9GV)
- [2026-07-23 01:55] Treat exploration, design, prototype, implementation, and validation as activities or phases of one unit by default, including movement back from implementation to design or prototype. (ses_073c3ad9cffe8811MuoJj1tjUp · prt_f8caf2ad00016yF0Gz7ci2h9GV)
- [2026-07-23 01:57] Keep current orientation separate from append-only segment checkpoints because sessions and compaction intervals are episodes within work rather than the work itself. (ses_073c3ad9cffe8811MuoJj1tjUp · prt_f8cb18d20001JN41sDdXwMHoWc)
- [2026-07-23 01:57] Position Mindframe-Z threads as synthesized historical continuity and work units as live operational continuity; resumption must not depend on refreshing a thread. (ses_073c3ad9cffe8811MuoJj1tjUp · prt_f8cb18d20001JN41sDdXwMHoWc)
- [2026-07-23 02:12] Make the TUI an observability and debugging surface that shows received and loaded model context, retrieval failures, warnings, and receipts rather than only status. (ses_073c3ad9cffe8811MuoJj1tjUp · prt_f8cbf09de001MjHiEOjXmxRsZv)
- [2026-07-23 02:24] Use progressive disclosure rather than repeatedly loading the full work record: retain a small reminder on every request, load current orientation on attachment, resumption, post-compaction, or explicit reload, and route artifacts only when relevant. (ses_073c3ad9cffe8811MuoJj1tjUp · prt_f8cd2b4b3001OaOF5aVoY2T7cX)
- [2026-07-23 02:24] Keep the ordinary TUI compact through a small ambient indicator and provide detailed inspection on demand, accounting for TUI size constraints. (ses_073c3ad9cffe8811MuoJj1tjUp · prt_f8cca085e00169khBn6H5n0C1X)
- [2026-07-23 02:24] Dogfood the system by making this context-management effort its first work unit and inspecting scripted OpenCode CLI sessions afterward. (ses_073c3ad9cffe8811MuoJj1tjUp · prt_f8cca085e00169khBn6H5n0C1X)
- [2026-07-23 02:38] Formalize before implementation by creating a Mindframe-Z thread, bootstrapping the initial work-unit record, and preparing an OpenSpec discovery proposal. (ses_073c3ad9cffe8811MuoJj1tjUp · prt_f8cd646dd001uRYlZhKx5MHCe3)

## Learnings

- [2026-07-23 00:19] OpenCode exposes `experimental.session.compacting`, `session.compacted`, and `experimental.chat.system.transform` hooks; Mindframe-Z supports delta and watermark refresh but has no OpenCode-compaction trigger. (ses_073c3ad9cffe8811MuoJj1tjUp · prt_f8c575c2f00166MesW5YsZ8XB2)
- [2026-07-23 00:56] `batch-grill-me` was reviewed from Matt Pocock's skills repository at commit `ed37663cc5fbef691ddfecd080dff42f7e7e350d`. (ses_073c3ad9cffe8811MuoJj1tjUp · prt_f8c793727001t1cvtak2sL4Q1v)
- [2026-07-23 00:58] `mfz doctor` passed after vendoring and applying `batch-grill-me`, and the rendered skill was verified at `/home/mark/.agents/skills/batch-grill-me`. (ses_073c3ad9cffe8811MuoJj1tjUp · prt_f8c7acbce001m56ub913BM2AS6)
- [2026-07-23 00:58] `batch-grill-me` requires explicit invocation and is not configured for implicit activation. (ses_073c3ad9cffe8811MuoJj1tjUp · prt_f8c7acbce001m56ub913BM2AS6)

## Issues

- [2026-07-23 01:00] The `opencode-hub` thread digest claimed session ingestion existed while the repository README said ingestion and deterministic validation were deferred; the conflict was preserved for surfacing rather than silent resolution. (ses_073c3ad9cffe8811MuoJj1tjUp · prt_f8c7ca42b001DTJFM71NVy7t8I)
- [2026-07-23 01:03] Automation changing authoritative intent or acceptance information without notice was identified as a continuity-system authority risk. (ses_073c3ad9cffe8811MuoJj1tjUp · prt_f8c7fe3f4001EnPy02o0EXMIys)

## Open Questions

- [2026-07-23 01:27] Whether threads should refresh after compaction remained unresolved. (ses_073c3ad9cffe8811MuoJj1tjUp · prt_f8c960f790018w6nKfy4UhsoN7)
- [2026-07-23 02:12] Whether commits and PRs should load active work context, and whether implementation activity should be logged, remained unresolved. (ses_073c3ad9cffe8811MuoJj1tjUp · prt_f8cbec860001ql4VC1blbkIWUh)

## Intent & Vision

- [2026-07-22 23:49] "I feel like I am all over the place and need to get organized." (ses_073c3ad9cffe8811MuoJj1tjUp · prt_f8c3c50fb001k6yWUtjLFAZ6Et)
- [2026-07-23 01:27] Work should be fluid: it can be "really something really big or ... something really small" and could potentially exist "in two things at once." (ses_073c3ad9cffe8811MuoJj1tjUp · prt_f8c960f790018w6nKfy4UhsoN7)
- [2026-07-23 02:24] "I think this is fine but I will have more opinions after implementation." (ses_073c3ad9cffe8811MuoJj1tjUp · prt_f8cc9a8c7001QhwKrbmcrfqDrf)
- [2026-07-23 02:35] "I am getting a bit burnt out on the design phase and keeping track of everything." (ses_073c3ad9cffe8811MuoJj1tjUp · prt_f8cd41e2c001KR1h5C2ym1uE1F)
- [2026-07-23 02:38] "before starting we should create a thread ... and create any of the initial unit of work ... then after we should create an OpenSpec proposal." (ses_073c3ad9cffe8811MuoJj1tjUp · prt_f8cd646dd001uRYlZhKx5MHCe3)

## Artifacts Touched

- [2026-07-23 00:58] Updated `catalog/skills.yml` to add `batch-grill-me`. (ses_073c3ad9cffe8811MuoJj1tjUp · prt_f8c7acbce001m56ub913BM2AS6)
- [2026-07-23 00:58] Updated `profiles/base/profile.yml`, lock and vendored-skill state, and applied the skill to OpenCode, Claude Code, and Codex. (ses_073c3ad9cffe8811MuoJj1tjUp · prt_f8c7acbce001m56ub913BM2AS6)
- [2026-07-23 00:58] Rendered `batch-grill-me` at `/home/mark/.agents/skills/batch-grill-me`. (ses_073c3ad9cffe8811MuoJj1tjUp · prt_f8c7acbce001m56ub913BM2AS6)
- [2026-07-23 00:59] Created a handoff for a fresh context-management design session. (ses_073c3ad9cffe8811MuoJj1tjUp · prt_f8c7c3580001LafN5J4wbmGId4)

## Sources

- [2026-07-23 00:56] Matt Pocock skills repository — https://github.com/mattpocock/skills, `skills/in-progress/batch-grill-me`, commit `ed37663cc5fbef691ddfecd080dff42f7e7e350d`. (ses_073c3ad9cffe8811MuoJj1tjUp · prt_f8c793727001t1cvtak2sL4Q1v)
- [2026-07-23 01:00] `opencode-hub` thread digest and repository README. (ses_073c3ad9cffe8811MuoJj1tjUp · prt_f8c7ca42b001DTJFM71NVy7t8I)
