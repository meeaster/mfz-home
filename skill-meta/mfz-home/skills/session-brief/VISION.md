# Vision

## Problem

A productive agent session can contain research, decisions, corrections, implementation, validation, and unfinished state that a later consumer needs as one coherent view. Transcript rereads are expensive. Ordinary summaries lose evidence and refresh position. Heavier forms such as threads, work units, handoffs, or maintained knowledge impose semantics the user may not want.

## Intended behavior

Session Brief creates or refreshes one mutable, evidence-backed artifact for one source parent session. It delegates retrieval to Agent Sessions, uses Context Transfer to fit the consumer and destination, preserves authority and uncertainty, and stores one compact native checkpoint for reuse.

The outer artifact remains `state_version: 2`. Validation branches by source harness and adapter version. OpenCode adapter version 2 uses a deterministic parent-and-direct-child checkpoint with sequence, topology, compaction, prefix, and source guards. Another harness retains its own checkpoint and locator semantics.

OpenCode refresh accepts only a verified append-only delta. Historical projection change, topology change, source replacement, active-context movement, malformed state, or unsupported adapter state triggers full snapshot rebuild. Rebuild converts no old cursor state. It preserves valid narrative, original creation time, and useful extraction history while replacing stale claims and checkpoint state.

The controlled helper transports only the adapter envelope's top-level checkpoint. The validator checks structure, adapter version, guard truth, harness-specific locator syntax, and required narrative sections. The parent agent verifies that authority locators resolve to human or user messages.

## Invocation and authority

The model invokes Session Brief only when the user asks to create or refresh the local artifact. That request authorizes the artifact and a missing destination directory, not a commit, publication, promotion, work-unit attachment, or source mutation.

Only parent human or user messages establish accepted decisions and corrections. Child results and tools support findings and outcomes.

## Success

A cold consumer can understand what happened, distinguish decisions from proposals, see current and unresolved state, verify consequential claims, and refresh from the stored checkpoint without routine transcript rereads. Unsupported state rebuilds visibly and safely. Non-OpenCode briefs remain valid under their native adapter rules.

## Non-goals

- Replacing a conversational summary, handoff, thread, work unit, Session Capture, Practice, issue, or specification.
- Storing transcripts, reasoning bodies, secrets, or broad tool output.
- Treating every source statement as accepted direction.
- Publishing, committing, attaching, or promoting without separate authority.
- Mutating or repairing the source store.
