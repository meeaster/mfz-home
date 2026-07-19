# Digest — openwiki-voice-cluster-test

## Current State
The canonical voice-note workflow remains operational: Windows completes transcripts atomically, invokes a WSL importer, and a native WSL watcher serializes OpenCode processing. The pipeline preserves raw inputs, creates cleaned notes and source-linked summaries, updates topics, themes, indexes, the processing ledger, and log, validates the corpus, then conditionally commits and pushes corpus-owned changes. Its latest recorded validation found no pending transcripts, `0 new, 23 unchanged`, complete provenance and hashes, and 881 valid relative links.

A separate raw-first OpenWiki prototype is testing whether this preprocessing pipeline can be simplified. It keeps authoritative raw transcripts immutable and private, prohibits cleaned transcripts, performs one OpenWiki ingestion per note, and derives summaries, topics, themes, terminology context, unresolved candidates, and navigation under deterministic validation. Prior five-note evidence showed matching raw files and summaries, no provenance, link, or duplicate-heading errors, successful escalation to raw sources, and byte-stable unchanged ingestion.

The fresh full-corpus prototype remains isolated from canonical directories. Despite its name, only the oldest note had been staged when its first ingestion was launched. That command was still running at the latest session cutoff, so no validation result or gate verdict exists and later prototypes have not begun. Known risks include shared-page collisions, catch-all topic compression, stale or duplicated content, lossy summaries, terminology drift, repeated `LangChainTracer` lifecycle errors, incomplete coverage reporting, and unnecessary model invocation for unchanged Git inputs.

## Components
- **Windows-to-WSL handoff** — atomically completed Windows transcripts are copied through a WSL importer rather than cloud infrastructure or permanent `/mnt/c` polling · implemented and tested.
- **Canonical processing pipeline** — serialized OpenCode cleanup and synthesis maintain summaries, topics, themes, navigation, provenance, and coordinator records · operational, validated, and still authoritative.
- **Raw-first OpenWiki prototype** — direct per-note ingestion derives knowledge from immutable raw transcripts without cleaned copies · prior small-corpus evidence passed, but the fresh first ingestion has no recorded outcome.
- **Validation and publication** — deterministic corpus checks precede guarded Git commit and push · operational for the canonical workflow; prototype gating awaits its first result.
- **Retrieval** — layered navigation from titles or indexes through summaries to transcripts, with search across synthesized and source material · direction selected tentatively; QMD remains unevaluated.
- **Cross-cutting** — raw transcripts are authoritative and private; derived processing is non-authoritative; uncertainty must be preserved rather than guessed; provenance, idempotence, and source escalation are required.

## Direction
Check whether the first raw-first ingestion completed, capture its output and checkpoint, run deterministic validation, and record the gate verdict. Continue the remaining dependent prototypes in order only if each acceptance gate passes; on failure, preserve the candidate and checkpoint and stop later gates. Use the resulting evidence and outstanding OpenWiki capability research to decide whether direct raw ingestion should replace the canonical cleanup stage. Investigate the unresolved playable-but-untranscribable audio archive if it needs recovery, and evaluate QMD before adopting it for local Markdown retrieval.

## Open Questions
- Did the fresh prototype's first ingestion complete successfully and satisfy its deterministic validation gate?
- Can OpenWiki directly absorb raw voice notes well enough to replace the separate cleanup and preprocessing pipeline?
- Should QMD provide local Markdown search for the layered retrieval model?
- Why did `20260713_220241.m4a` play for 27:13 in Windows Player while transcription reported `moov atom not found`, and can its retained archive be recovered reliably?

## Key Decisions
- Keep the canonical cleanup pipeline in service until the isolated raw-first approach passes its gated evaluation.
- Use direct Windows-to-WSL invocation after atomic transcript completion rather than permanent `/mnt/c` polling or S3, SQS, and cloud processing.
- Serialize OpenCode processing through the native WSL watcher.
- Automatically commit and push only corpus-owned changes; refuse unrelated dirty worktrees and stop when upstream has advanced.
- Keep cleanup and synthesis isolated per note while coordinator-owned work updates indexes, themes, ambiguity references, the ledger, and `LOG.md`.
- Preserve unresolved transcription as candidates or explicit uncertainty markers rather than canonicalizing guesses.
- Structure the raw-first prototype around immutable private transcripts, one ingestion per note, source-linked summaries, incremental topic and theme updates, terminology context, navigation, and deterministic validation; do not create cleaned transcripts.
- Run the five dependent prototypes sequentially, stopping later gates after an acceptance failure while retaining failed candidates and checkpoints.
- Keep prototype work isolated from canonical raw and derived directories, with telemetry disabled and the prescribed provider and model.
- Use layered retrieval from titles or indexes to summaries and then full transcripts, with search spanning synthesized knowledge and source notes.
- Retain the problematic audio archive while deleting only its Fossify staging copy.

## Design
```text
Windows transcription task
          |
          | atomic completion + WSL invocation
          v
     WSL importer
          |
          v
  Immutable raw transcript
          |
          v
 Serialized OpenCode watcher
          |
          +--> Canonical pipeline
          |      cleanup -> summary -> topics/themes
          |              -> indexes/ledger/log
          |              -> validation
          |              -> guarded commit/push
          |
          `--> Isolated raw-first prototype
                 one OpenWiki ingestion per note
                          |
                          v
                 summaries/topics/themes
                 terminology/navigation
                          |
                          v
                 deterministic gate
                          |
                    pass / fail-stop
```

## Intent
The goal is a dependable, increasingly automatic path from voice capture to durable knowledge without losing the original words, commitments, provenance, or uncertainty. The workflow should execute pending work end to end rather than stop at planning, remain local where practical, and avoid unnecessary infrastructure. The wiki should retain useful knowledge from project-management sources without becoming the place where project management itself is conducted.

## Vision
The direction has shifted from validating a conventional raw-to-cleaned-to-synthesized pipeline toward testing whether OpenWiki can understand authoritative raw notes directly and eliminate an over-engineered preprocessing layer. Adoption remains evidence-driven rather than settled: the raw-first design must prove deterministic validation, idempotence, provenance, privacy, and failure handling across gated prototypes. Longer term, the corpus should support layered retrieval that exposes hidden relationships without forcing every model invocation to consume full transcripts.

## Perspective
The user prefers a flexible knowledge system shaped by content rather than rigid fields and is wary of architecture that becomes elaborate merely to compensate for assumptions about OpenWiki. They object to confident capability claims made without broad research and expect uncertainty, configuration options, and extension mechanisms to be investigated explicitly. They favor local Windows-to-WSL integration over cloud services when it is sufficient, want autonomous execution rather than plans alone, and expect transcription ambiguity to remain visible rather than be guessed away. Test material should not pollute topics or themes, raw sources should remain authoritative and private, and model-authored pages should be treated as useful interpretations rather than ground truth.

## Sources
- Amazon Bedrock pricing — https://aws.amazon.com/bedrock/pricing/
- AWS Lambda pricing — https://aws.amazon.com/lambda/pricing/
- Amazon S3 pricing — https://aws.amazon.com/s3/pricing/
- Amazon SQS pricing — https://aws.amazon.com/sqs/pricing/
- AWS Transcribe pricing — https://aws.amazon.com/transcribe/pricing/
- Bun
- ChatGPT Plus help — https://help.openai.com/en/articles/6950777-what-is-chatgpt-plus
- Claude Code — https://github.com/anthropics/claude-code
- Claude pricing — https://claude.com/pricing
- Anthropic model pricing — https://platform.claude.com/docs/en/about-claude/pricing
- DeepSWE — https://deepswe.datacurve.ai/
- Herdr — https://github.com/ogulcancelik/herdr.git
- Meetily — https://github.com/Zackriya-Solutions/meetily
- OpenAI latest-model guide — https://developers.openai.com/api/docs/guides/latest-model.md
- OpenAI Terms of Use — https://openai.com/policies/terms-of-use/
- OpenClaw — https://github.com/openclaw/openclaw
- OpenCode — https://github.com/anomalyco/opencode.git
- OpenSpec — https://github.com/Fission-AI/OpenSpec.git
- OpenWhispr — https://github.com/openwhispr/openwhispr
- OpenWiki — https://github.com/langchain-ai/openwiki.git
- QMD — https://github.com/tobi/qmd
- Resilio Help Center — https://help.resilio.com/hc/en-us
- Resilio Sync — https://www.resilio.com/sync/
- Scale SWE-bench Pro — https://scale.com/blog/swe-bench-pro
- SWE-bench — https://github.com/SWE-bench/SWE-bench
- Vercel Skills — https://github.com/vercel-labs/skills.git
