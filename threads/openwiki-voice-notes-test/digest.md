# Digest — openwiki-voice-notes-test

## Current State
The evaluation has converged on a recommended operating model, but production adoption is not established. Raw voice notes would be ingested directly using Sol, without an authoritative cleaned-note layer, to generate summaries, topics, themes, glossary material, and retrieval pages. Full-corpus testing covered 23 raw notes and 23 summaries across 43 files, with useful handling of corrections, contradictions, and evolving terminology.

The generated wiki can answer synthesis questions but does not preserve exact wording, so exact retrieval requires an approved raw-source projection. Reliability should come from serialized generation into a clean Git worktree, deterministic validation, diff review, and accepted commits rather than OpenWiki-native transactional machinery. This is necessary because testing exposed shared-page collisions and partial edits that could pass structural validation. Reference-only behavior remains prompt guidance rather than runtime enforcement in OpenWiki `0.2.0`.

## Components
- **Voice-note ingestion** — raw notes feed the synthesis pipeline without mandatory cleanup · validated on the full corpus.
- **Generated knowledge** — summaries, topics, themes, glossary, and dictionary material provide synthesis and retrieval · useful and stable on unchanged reruns.
- **Exact retrieval** — an approved raw projection preserves wording unavailable from wiki-only output · validated as necessary.
- **Knowledge architecture** — centralized access connects knowledge while source systems retain distinct responsibilities · role boundaries are defined.
- **Reliability boundary** — serialized Git-gated generation contains partial writes and concurrent page collisions · recommended but not productionized.
- **Cross-cutting** — preserve source authority, escalate to raw material for exact detail, and avoid reliability machinery beyond the practical containment Git provides.

## Direction
Decide whether to adopt and deploy the recommended model. If adopted, implement the serialized Git-gated pipeline with a clean-worktree requirement, deterministic validation, diff review, and commit acceptance; retain the approved raw projection for exact retrieval. Determine whether reference-only behavior needs runtime enforcement rather than prompt guidance, and define the complete production evaluation criteria.

## Open Questions
None.

## Key Decisions
- Run `openwiki` directly rather than through mise.
- Evaluate OpenWiki as a replacement for the existing voice-note topic, theme, and dictionary workflow, not merely as a compact index.
- Use Sol for complete ingestion and the broader raw-to-wiki workflow.
- Ingest raw notes first and omit mandatory cleaned notes because unattended cleanup did not handle uncertainty reliably.
- Centralize access to knowledge rather than storage: voice notes are synthesized, repositories are generally referenced, and Jira remains operationally separate.
- Use a Git-gated generated wiki instead of OpenWiki-native locking, rollback, or transactional metadata.

## Design
```text
Voice notes (raw) ──synthesis──> Sol + OpenWiki ──> Generated Git wiki
       │                                      ├── summaries
       └──approved raw projection             ├── topics and themes
                    │                         └── glossary/dictionary
                    └──────── exact wording retrieval

Repositories ───────── references ───────────> Central knowledge access
Jira ─────────── remains operational ─────────> Central knowledge access

Generated-wiki write gate:
serialized run -> clean worktree -> deterministic validation -> diff review -> commit
```

## Intent
The user wants voice notes to become durable, topic-oriented knowledge without maintaining a separate, unreliable cleanup stage. The system should support both broad synthesis and retrieval of exact source detail while connecting personal and project context through one access layer. It should reduce workflow boundaries rather than introduce machinery whose operational cost exceeds its value.

## Vision
The vision shifted from treating OpenWiki as a possible store for all knowledge to using it as a generated synthesis and retrieval layer within a federated architecture. Source systems keep their authoritative roles, while the wiki provides centralized access across voice notes, repositories, AI sessions, messages, calendars, and project context. Git supplies the durable containment boundary if the approach moves into production.

## Perspective
The user expects a knowledge system to create substantial topic-oriented material rather than only compact personal summaries. They initially hoped OpenWiki could absorb note cleanup, but questioned whether cleaning justified its reliability risk; testing supported the simpler raw-first approach. They prefer practical controls over elaborate transactional designs and view a Git repository as sufficient protection for most generated-wiki failures. Model judgments should rest on meaningful comparative evidence rather than a single example.

## Sources
- OpenWiki — https://github.com/langchain-ai/openwiki.git
- Voice-notes repository — `/home/mark/code/voice-notes`
- Latest raw voice note — `/home/mark/code/voice-notes/raw/20260718_165427_68fbd26ead08.md`
