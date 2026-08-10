---
name: agent-sessions
description: >
  Use for session archaeology across agent harnesses: locating, outlining,
  investigating, reconstructing, auditing, incrementally reading, or calculating
  API cost for a prior session, including its tools, children, compactions,
  failures, guidance, and durable user perspective.
---

# Agent Sessions

Session archaeology turns durable harness records into evidence. Keep the store
read-only, establish scope before reading content, and spend transcript tokens in
proportion to the requested coverage.

## Hard Boundaries

- Run bundled adapters as opaque executables. Never read their source before a
  documented command fails; a large or truncated result is not adapter failure.
- Keep extractor output in harness capture. Never redirect it to task files.
- Use documented result paths directly. Do not probe shape or repeat evidence
  already present in Bundle.

## 1. Select The Mode

Choose the least expensive mode that can answer the request:

- **Locate** identifies the right session from an ID, title, prompt, project, or
  recency clue.
- **Outline** returns identity, counts, topology, boundaries, failures, and
  cursors without reading transcript bodies broadly.
- **Investigate** answers a bounded question from targeted records.
- **Reconstruct** follows the relevant timeline and evidence needed to explain
  what happened.
- **Audit** establishes complete requested coverage and evaluates behavior.
- **Delta** returns structural records created or changed after supplied cursors
  for a dependent workflow; content previews require a privacy-scoped request.
- **Cost** recalculates current-catalog API cost for one session and its recursive
  descendants without reading transcript bodies.

Treat requests containing `complete`, `fully`, `all`, `audit`, or `refreshable`
as exhaustive for their declared scope. Do not silently downgrade them to a
sampled investigation.

**Done when:** the selected mode and its coverage standard are explicit.

## 2. Identify The Source

Use the requested harness, session ID, store root, export, or recency clue. Load
only the matching adapter:

- [OpenCode](references/opencode.md) for SQLite stores and exported OpenCode JSON.
- [Claude Code](references/claude-code.md) for JSONL stores and nested subagents.

For another harness or supplied transcript, inspect its live shape and apply the
same mode, ledger, and evidence rules without forcing it into either adapter's
schema.

**Done when:** the source, read-only access path, artifact identity, and live
storage shape are confirmed rather than inferred.

## 3. Establish The Coverage Ledger

Before reading transcript bodies, record:

- requested deliverables and selected mode;
- parent and child scope;
- row or record counts and classes;
- compaction, clearing, or interruption boundaries;
- invocation and resumption topology;
- ranges or cursors inspected;
- intentionally excluded reasoning, secrets, or irrelevant content;
- unresolved gaps and mutable running records.

Keep the ledger compact enough to survive compaction. If compaction interrupts
the work, continue from the ledger. An incomplete checkpoint must identify itself
as incomplete and must not become the final answer.

**Done when:** every requested deliverable has a checkable coverage entry.

## 4. Outline, Then Drill

Pull structural summaries before content: identity, timestamps, counts, record
types, tool/status aggregates, child metadata, boundaries, final records, and
short previews. Prefer bundled extractors or structured queries over repeated
ad hoc reads.

For model-driven reconstruction or audit of an OpenCode parent plus direct
children, use one compact Bundle `reconstruction` view as the first and only
structural pass. It already owns Outline, topology discovery, grouped counts,
compactions, mutable-state checks, and internal Delta pagination for that pin.
Use exact record IDs for consequential content missing from the projection; do
not repeat those structural queries. A dependent artifact workflow that consumes
the four raw streams uses Bundle `full` instead.

For a narrow OpenCode tool question, Outline identifies the part and one
`tool-context` call returns that exact tool, its owning message, and the nearest
preceding multipart user request under one pin. Do not re-read those records.

For an OpenCode API-cost request, use the bundled cost calculator. Its recursive
session scope and per-turn model attribution are separate from transcript
reconstruction, so do not acquire Bundle or transcript evidence first.

Read full content only for records that can change the answer. Count and locate
reasoning records but never read or surface their bodies. Enumerate child sessions
first; read a child transcript only when its result or behavior matters.

For reconstruction, audit, behavior review, or user-perspective mining, use
[analysis.md](references/analysis.md).

**Done when:** each ledger item is supported by a locator, explicitly excluded,
or named as an unresolved gap.

## 5. Verify Completion

Before reporting, compare the evidence against the ledger. For exhaustive modes,
verify every requested session and relevant child, every bounded page, every
boundary, terminal cursor, and mutable running state. Do not equate a supported
narrative with complete requested coverage.

After any post-Bundle content read, reuse the original exact Bundle state once
before finalizing. A session-wide text or tool query is not a targeted read:
follow explicit record IDs and correct any broader query before reporting.

**Done when:** no requested ledger item remains silently unverified.

## 6. Report

State the source and identity, selected mode, inspected scope, sampled versus
complete status, findings, evidence locators, exclusions, mutable states, and
gaps. A dependent workflow may consume this evidence to create its own artifact;
that workflow owns its synthesis, storage, merging, and lifecycle.

**Done when:** the consumer can distinguish source evidence, interpretation, and
uninspected material.

## Rules

- Treat session stores as read-only. This skill never writes, edits, migrates,
  vacuums, repairs, or deletes session artifacts; route mutation to a separate
  maintenance workflow.
- Do not surface secrets or private transcript content beyond what answers the question.
- Prefer deterministic extraction and structured queries over raw transcript dumps.
- Execute bundled scripts through their documented interface and consume compact
  stdout. Do not redirect extraction output into task or temporary files.
- When the user names a store root, read that path instead of the harness default.
