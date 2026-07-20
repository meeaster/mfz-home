# Digest — openwiki

## Current State

OpenWiki `0.2.0` has been validated in personal mode as an experimental central knowledge and retrieval layer. The full-corpus prototype processed all 23 approved immutable raw voice notes with `gpt-5.6-sol`, producing matching summaries and synthesized topics, themes, glossary, dictionary, unresolved-term register, and navigation; deterministic validation covered 43 generated files. Existing cleaned notes remain historical evidence rather than required input.

Retrieval works at two levels: the synthesized wiki handles general questions, while an approved raw projection restores exact-detail retrieval. Prompt guidance produced correct reference-only behavior, but OpenWiki does not enforce source policy at runtime.

The minimum operating model is a clean Git working tree, one serialized writer, deterministic validation, aggregate hashing, diff review, accepted commits, and an external authoritative ledger. This boundary is necessary because OpenWiki writes without transactions or rollback: tests observed partial state after failure, stale-write collisions, self-repairing shared-page collisions, and `LangChainTracer` lifecycle errors.

## Components

- **Raw-note ingestion** — immutable raw transcripts are processed directly with `gpt-5.6-sol`; all 23 approved notes received matching summaries.
- **Knowledge synthesis** — summaries feed topics, themes, glossary, dictionary, unresolved terms, and navigation; contradiction, correction, and terminology-evolution tests behaved as intended.
- **Retrieval and source roles** — wiki synthesis answers general questions while approved raw sources support exact-detail escalation; source-policy enforcement remains prompt-based.
- **Operational acceptance** — Git, serialized writes, deterministic validation, hashing, review, commits, and an external ledger guard against partial or conflicting updates.
- **Cross-cutting** — raw material remains authoritative and immutable, generated knowledge is reviewable and reversible, and operational controls should remain no more complex than demonstrated failures require.

## Direction

Run future updates through the Git acceptance boundary: start from a clean tree, permit one OpenWiki writer, validate generated output deterministically, check aggregate hashes, review the diff, and commit only accepted states. Keep the authoritative processing ledger outside OpenWiki.

Continue treating runtime source restrictions as unenforced and provide only approved raw projections when exact retrieval is required. Monitor stale-write collisions, shared-page gardening behavior, and tracer lifecycle errors during ordinary updates rather than adding transactional infrastructure preemptively.

## Open Questions

None.

## Key Decisions

- Use OpenWiki as an experimental higher-level personal-wiki and chat layer rather than immediately replacing the existing voice-note pipeline.
- Standardize on OpenWiki major version `0`, currently `openwiki@0.2.0`.
- Use personal mode because code mode writes into the source repository.
- Use one layered, read-only Git view because separate Git source instances overwrite the shared `sources/git-repo.md` identity.
- Use `gpt-5.6-sol` for complete processing.
- Treat immutable raw transcripts as authority and derive summaries, topics, themes, and dictionaries from them; retain cleaned notes only as historical evidence.
- Assign explicit source roles and use approved raw projections for exact-detail retrieval.
- Use Git acceptance controls as the minimum reliability boundary; dedicated rollback, transactional metadata, same-path conflict detection, and a processing database are not currently required.

## Design

```text
Immutable raw transcripts
          |
          v
   gpt-5.6-sol summaries
          |
          v
 Topics + themes + glossary
 dictionary + unresolved terms
          |
          v
     OpenWiki synthesis --------> General retrieval
          |
          +----------------------> Approved raw projection
                                      |
                                      v
                                Exact-detail retrieval

External authoritative ledger
          |
          v
One serialized OpenWiki writer
          |
          v
Clean Git working tree
          |
          v
Validation + aggregate hashing
          |
          v
Diff review -> accepted commit
```

## Intent

The work is meant to determine how far OpenWiki can be customized for voice notes and whether raw notes can flow directly into useful synthesized knowledge. The desired role is a central knowledge layer that improves synthesis and retrieval without replacing operational systems prematurely.

## Vision

The direction shifted from evaluating OpenWiki only as an adjunct to validating a raw-first architecture that could eventually replace dedicated voice-note cleanup and synthesis stages. The envisioned system preserves immutable source material, builds compact navigable knowledge from it, and escalates to approved raw evidence when exact detail matters.

## Perspective

The user favors practical evidence over architectural speculation and wants to stress OpenWiki's customization boundaries before committing to it. They prefer raw authority, reversible generated knowledge, and Git-visible changes. Reliability controls should address observed failure modes without becoming an overengineered transaction system; a Git repository and disciplined acceptance workflow are expected to solve most operational risk.

## Sources

- OpenWiki repository, including README, OAuth implementation, docs-only backend, and agent index — https://github.com/langchain-ai/openwiki.git
- OpenAI OAuth authorization endpoint — https://auth.openai.com/oauth/authorize
- OpenAI OAuth token endpoint — https://auth.openai.com/oauth/token
- ChatGPT Codex backend API — https://chatgpt.com/backend-api/codex
- Mise trust documentation — https://mise.en.dev/cli/trust.html
