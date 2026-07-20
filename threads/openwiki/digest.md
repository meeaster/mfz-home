# Digest — openwiki

## Current State

OpenWiki is positioned as a synthesis and retrieval layer rather than a replacement for the authoritative voice-note workflow. Immutable raw transcripts remain the source of truth; OpenWiki-generated summaries, topics, themes, dictionaries, navigation, and other knowledge are derived, reviewable outputs. Transcript cleanup is excluded because model testing produced attribution and uncertainty errors.

The current architecture separates Core, Personal, and Work wikis. Core contains reviewed, non-sensitive reusable knowledge and is consumed read-only by Personal and Work. Work may synthesize against accepted Core knowledge while remaining isolated, and Work voice notes stay inside the enterprise boundary. External systems remain authoritative, with only selective read-only Markdown projections entering Git.

A synthetic prototype validated separate wiki homes, Core projection, workstreams, decisions, aliases and renames, session watermarks, selective artifact projection, task-context compilation, and human-approved feedback loops. Fresh-runtime retries also completed Workstream B ingestion, changed-Core ingestion, and Personal propagation with accepted Git checkpoints.

Git is the principal safety boundary: writes are serialized, validated deterministically, reviewed as diffs, and accepted as checkpoints. Residual risks remain around partial writes, connector-state advancement after model failures, same-file collisions, stale Core propagation, incomplete multi-workstream relationships, lifecycle policies, and non-transactional acceptance helpers.

## Components

- **Core wiki** — reviewed, non-sensitive reusable knowledge · validated as a read-only projection consumed by Personal and Work.
- **Personal wiki** — personal synthesis and retrieval over authoritative sources plus accepted Core knowledge · topology and Core propagation validated synthetically.
- **Work wiki** — enterprise-contained voice notes, workstreams, and synthesis with optional Core context · ingestion and checkpoint retries succeeded.
- **Source processing** — immutable raw transcripts produce summaries, topics, themes, dictionaries, navigation, and other derived knowledge · raw-first corpus tests passed.
- **Session continuity** — individual sessions preserve exact evidence while threads provide continuity · mutable sessions use stable watermarks rather than inactivity as completion.
- **External projections** — selected GitHub, Jira, and Confluence material enters Git as read-only Markdown while the originating systems remain authoritative · selective projection was validated.
- **Supervised actions** — agents compile task-specific context, propose bounded actions, obtain approval, execute through existing workflows, and return evidence · prototyped using replaceable OpenCode CLI execution.
- **Cross-cutting** — authoritative sources remain whole and immutable, relationships and classifications live in the wiki layer, and generated changes pass through inspectable Git acceptance controls.

## Direction

Turn the validated synthetic architecture into an operational workflow while preserving the existing authoritative repositories and enterprise boundary. Harden failure handling so model errors cannot leave partial writes or advance connector state, serialize colliding writes, make acceptance helpers transactional, and verify reliable Core propagation and multi-workstream relationships.

Define retention, deletion, and access-revocation policy before broader ingestion. Continue with Windows Sound Recorder and the local Handy CLI path for Work rather than building a custom recorder prematurely.

Resume from `analysis/wiki-architecture-vision.md` and the portable prototype evidence under `prototype/wiki-architecture/`, including the recorded model-failure retries.

## Open Questions

None.

## Key Decisions

- Use OpenWiki as a synthesis and retrieval layer rather than a complete voice-note-workflow replacement because the existing workflow remains authoritative.
- Preserve `/home/mark/code/voice-notes` and its canonical raw, cleaned, summary, topic, theme, dictionary, and ledger data unchanged during prototypes.
- Do not use OpenWiki to clean transcripts because cleanup acceptance tests showed unreliable attribution and uncertainty behavior.
- Treat immutable raw transcripts as authority, then derive per-note summaries, topics, themes, dictionaries, navigation, and periodically gardened knowledge with deterministic validation.
- Separate Core, Personal, and Work wikis; keep reviewed, non-sensitive reusable knowledge in Core and expose it read-only to Personal and Work.
- Permit Work synthesis to read accepted Core material without merging the Work and Core wikis.
- Keep Work voice notes within the enterprise boundary using Windows Sound Recorder, local audio, Handy CLI, the Work source repository, and enterprise-model synthesis.
- Start with Windows Sound Recorder instead of immediately building a custom recorder.
- Classify projects, workstreams, and topics at the wiki layer so authoritative raw sources remain untouched and relationships can evolve.
- Represent selected external artifacts as read-only Markdown projections in Git while GitHub, Jira, and Confluence remain authoritative.
- Use OpenCode CLI as the current replaceable execution substrate for supervised wiki-driven actions.
- Require Git-gated writes, serialized writers, deterministic validation, accepted checkpoints, and inspectable rejected diffs because Git is the principal safety boundary.

## Design

```text
                         Reviewed, non-sensitive knowledge
                                      |
                                      v
                                +-----------+
                                | Core wiki |
                                +-----------+
                                  /       \
                        read-only/         \read-only
                                v           v
                       +---------------+  +-------------+
Immutable personal --->| Personal wiki |  |  Work wiki  |<--- Enterprise sources
sources                 +---------------+  +-------------+
                                               ^
                                               |
                                  Read-only projections
                                  from GitHub/Jira/Confluence

Immutable authoritative sources
              |
              v
 Summaries + topics + themes
 dictionaries + navigation
              |
              v
      Wiki-layer relationships
              |
              v
 Task-specific context compilation
              |
              v
 Human approval -> existing workflow -> returned evidence

One serialized writer
          |
          v
Deterministic validation
          |
          v
Inspectable Git diff
          |
          v
Accepted checkpoint or retained rejection
```

## Intent

The work aims to determine how OpenWiki can turn authoritative voice notes, sessions, and external material into useful synthesized knowledge without modifying source evidence or prematurely replacing established workflows. It also seeks continuity across sessions and workstreams while preserving clear Personal, Core, Work, and enterprise boundaries.

## Vision

The direction shifted from evaluating OpenWiki chiefly for voice-note synthesis toward a broader, separated knowledge architecture. The envisioned system preserves exact evidence in authoritative sources, derives navigable knowledge into purpose-specific wikis, shares reviewed Core material safely, and lets supervised agents compile context and propose bounded actions without turning the wiki into a project manager or autonomous executor.

## Perspective

The user favors practical evidence over speculative safeguards and expects a disciplined Git repository to address most operational risk. Controls should respond to demonstrated failure modes without becoming an overengineered transaction system.

Raw evidence should remain untouched, while classifications and many-to-many relationships evolve in the wiki layer. External operational systems should retain authority, generated knowledge should remain inspectable and reversible, and agent actions should stay bounded, replaceable, and human-approved.

## Sources

- OpenWiki repository and agent prompt — https://github.com/langchain-ai/openwiki.git
- Voice-notes repository — `/home/mark/code/voice-notes`
- Cleaned voice-note transcript — `/home/mark/code/voice-notes/cleaned/20260711_013533_40a330836496.md`
- Microsoft Sound Recorder FAQ — https://support.microsoft.com/en-us/windows/apps/sound-recorder-app-for-windows-faq
- FFmpeg DirectShow device documentation — https://ffmpeg.org/ffmpeg-devices.html
- FFmpeg downloads — https://ffmpeg.org/download.html
- AutoHotkey v2 hotkeys — https://www.autohotkey.com/docs/v2/Hotkeys.htm
- NAudio WASAPI recorder — https://github.com/naudio/NAudio/blob/main/Docs/WasapiRecorder.md
- Microsoft microphone permissions — https://support.microsoft.com/en-us/windows/fix-microphone-problems-5f230348-106d-bfa4-1db5-336c6bd1d6
