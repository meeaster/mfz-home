# Vision

## Problem

A productive agent session can contain research, decisions, corrections,
implementation, validation, and unfinished state that a later human or agent
needs as one coherent view. Rereading the transcript is expensive, ordinary
summaries lose evidence and refresh position, and heavier forms such as threads,
work units, handoffs, or maintained knowledge impose semantics the user may not
want.

## Intended Behavior

Session Brief creates or refreshes one mutable, evidence-backed working artifact
for one source parent session. It delegates session retrieval to Agent Sessions,
uses Context Transfer to fit the intended consumer and destination, preserves
authority and uncertainty, and stores enough adapter-specific state to refresh
incrementally without routine reprocessing of earlier transcript content.

Evidence acquisition is isolated in a visible read-only exploration child when
the harness supports one. The parent retains destination authority, verifies the
coverage contract, and writes or merges the artifact.

## Portability

The brief format is harness-neutral while extraction state remains adapter-
specific. A workspace or project may declare the destination; this Personal
workspace's ordinary default is `artifacts/session-briefs/`. The skill can run
without a subagent when the harness lacks a suitable read-only child mechanism.

## Success

A cold consumer can understand what happened, distinguish decisions from
proposals and evidence from interpretation, see current and unresolved state,
and use exact locators where needed without routinely reopening the transcript.
A later refresh reads only new or changed evidence when valid adapter state and
source guards exist and does not lose real updates, duplicate children, source
replacement, or silently smoothed corrections.

## Non-Goals

- Replacing a conversational summary when no file is requested.
- Acting as an implementation handoff, multi-session thread, work-unit record,
  issue, specification, Session Capture, Practice, or accepted guidance.
- Storing raw transcripts, hidden reasoning, secrets, or exhaustive tool output.
- Treating every source statement as current truth or human-approved direction.
- Committing, publishing, attaching, or promoting the brief without separate
  user authority.
- Mutating or repairing the source session store.
