# Vision

## Problem

A productive agent session can contain research, decisions, corrections, implementation, validation, and unfinished state that a later consumer needs as one coherent view. Transcript rereads are expensive. Ordinary summaries lose evidence and refresh position. Heavier forms such as threads, work units, handoffs, or maintained knowledge impose semantics the user may not want.

## Intended behavior

Session Brief creates or refreshes one mutable, evidence-backed artifact for one source parent session. It delegates retrieval to Agent Sessions, uses Context Transfer to fit the consumer and destination, preserves authority and uncertainty, and stores one compact native checkpoint for reuse.

Refresh safety takes priority over cursor compatibility. Unsupported or changed historical state requires a rebuild that preserves valid narrative, original creation time, and useful history while replacing stale claims. Each harness retains its native checkpoint and authority semantics.

Exact checkpoint transport matters because structurally valid, manually copied state has already caused a refresh failure. Human authority requires source-role verification, not merely a locator that passes syntax validation.

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
