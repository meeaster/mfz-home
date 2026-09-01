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

For OpenCode, choose the evidence source from the task and live backend. When an
explicit filesystem SQLite path is available, use read-only SQL as the normal
interface for locating, outlining, investigating, and reconstructing sessions.
Use the service API when the path or backend is unknown, or when the question
depends on service-owned semantics. Use bundled adapters when their validation,
pinning, traversal, or attribution invariants matter. The V1 evidence extractor
remains V1-only; V2 uses `session_v2` and JSON-backed `session_message` rather
than the V1 `session`, `message`, and `part` contract.

Treat requests containing `complete`, `fully`, `all`, `audit`, or `refreshable`
as exhaustive for their declared scope. Do not silently downgrade them to a
sampled investigation.

**Done when:** the selected mode and its coverage standard are explicit.

## 2. Identify The Source

Use the requested harness, session ID, store root, export, or recency clue. Load
only the matching adapter:

- [OpenCode](references/opencode.md) for V1 and V2 SQLite, the V2 service API,
  bundled adapters, and exported OpenCode JSON.
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
short previews. For an explicit OpenCode SQLite store, inspect its schema once,
then compose bounded read-only SQL around the question instead of translating
every investigation into fixed CLI commands. Query extracted JSON fields and
short previews; count and locate reasoning without selecting its text.

For V2 SQLite, order messages by `seq`, distinguish all history from the active
context after the latest completed compaction, and keep one read transaction when
the requested coverage needs a stable snapshot. For exploratory questions, let
SQL joins, grouping, JSON projection, and subqueries follow the evidence rather
than imposing a predetermined extraction shape.

For V1 model-driven reconstruction or audit of a parent plus direct children,
use one compact Bundle `reconstruction` view as the first and only structural
pass. It owns Outline, topology discovery, grouped counts, compactions,
mutable-state checks, and internal Delta pagination for that pin. Use exact
record IDs for consequential content missing from the projection; do not repeat
those structural queries. A dependent artifact workflow that consumes the four
raw streams uses Bundle `full` instead.

For a narrow V1 OpenCode tool question, Outline identifies the part and one
`tool-context` call returns that exact tool, its owning message, and the nearest
preceding multipart user request under one pin. Do not re-read those records.

For an OpenCode API-cost request, use the bundled cost calculator. It detects V1
or V2 from the validated schema and requested root session, then recursively
attributes each persisted model step without reading transcript bodies. Do not
acquire Bundle or transcript evidence first.

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

For an exhaustive SQL read of an active store, keep the evidence in one read
transaction or recheck the terminal sequence and scoped counts before finalizing;
report movement as a gap rather than mixing snapshots. After any post-Bundle
content read, reuse the original exact Bundle state once before finalizing. A
session-wide text or tool query after Bundle is not a targeted read: follow exact
record IDs and correct any broader query before reporting.

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
