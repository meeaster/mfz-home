---
name: agent-sessions
description: >
  Use for session archaeology across agent harnesses: locating, outlining,
  investigating, reconstructing, auditing, incrementally reading, or calculating
  API cost for a prior session, including its tools, children, compactions,
  failures, guidance, and durable user perspective.
---

# Agent Sessions

Session archaeology turns durable harness records into evidence. Keep the source read-only, establish scope before reading content, and spend transcript tokens in proportion to the requested coverage.

## 1. Select the mode

Choose the least expensive mode that can answer the request:

- **Locate** identifies the session from an ID, title, prompt, project, or recency clue.
- **Outline** returns identity, counts, topology, boundaries, failures, and terminal positions without broad body reads.
- **Investigate** answers one bounded question from targeted records.
- **Reconstruct** follows the smallest relevant timeline needed to explain what happened.
- **Audit** establishes complete coverage for the declared scope and evaluates behavior.
- **Delta** reads accepted append-only evidence after a reusable checkpoint. Unsupported historical change requires a rebuild.
- **Cost** recalculates current-catalog API cost for one session and its recursive descendants without reading content bodies.

Treat `complete`, `fully`, `all`, `audit`, and `refreshable` as exhaustive for the declared scope. Never present sampled evidence as complete.

**Done when:** the selected mode and coverage standard are explicit.

## 2. Identify the source

Use the requested harness, session ID, store root, export, or recency clue. Load only the matching reference:

- [OpenCode](references/opencode.md) for V2 SQLite, the authenticated V2 API, deterministic refresh evidence, cost, and exported JSON.
- [Claude Code](references/claude-code.md) for JSONL stores and nested subagents.

For another harness or a supplied transcript, inspect its current shape and apply the common mode, ledger, and evidence rules. Keep its native locator and checkpoint semantics.

For OpenCode SQLite, resolve an explicit path first, then `OPENCODE_DB`, then the current channel filename under the OpenCode data directory. Open it with `mode=ro` so live WAL and SHM sidecars remain visible. When the path or backend is unknown, use the authenticated V2 API. Report an access gap instead of guessing a path.

**Done when:** the source, read-only access path, artifact identity, and current storage shape are confirmed.

## 3. Establish the coverage ledger

Before reading bodies, record:

- requested deliverables and mode;
- parent, direct-child, descendant, and fork scope;
- record counts and classes;
- compaction, clearing, or interruption boundaries;
- inspected sequence ranges or source positions;
- excluded reasoning, secrets, and irrelevant content;
- unresolved gaps and mutable records.

Keep the ledger compact enough to survive compaction. An incomplete checkpoint remains incomplete and cannot become the final answer.

**Done when:** every requested deliverable has a checkable coverage entry.

## 4. Outline, then drill

Read structure before content: identity, timestamps, counts, record types, tool and status aggregates, child metadata, fork provenance, compactions, terminal positions, and short previews.

For question-driven OpenCode work, compose bounded read-only V2 SQL or authenticated API requests around the question. Order projected messages by `session_message.seq`. Distinguish all durable projected history from active context, which starts at the latest completed compaction sequence. Keep exhaustive SQLite reads in one read transaction when possible. Otherwise pin the terminal sequences and counts, then recheck them before reporting.

Use `scripts/opencode-session-evidence.py snapshot` and `delta` only when a refreshable consumer needs a deterministic parent-and-direct-child checkpoint. A delta is valid only for a structurally verified pure append. Existing-message changes, deletions, replacements, child-set changes, topology changes, source replacement, and active-context movement return `rebuild_required`. Never merge evidence from a rejected delta.

For OpenCode cost, run `scripts/opencode-session-cost.py` directly. It uses only V2 usage records and recursive `parent_id` topology. Transcript evidence is unnecessary.

Read full content only when it can change the answer. Count and locate reasoning records without surfacing their bodies. Enumerate children before reading them, and treat fork provenance separately from ancestry.

For reconstruction, audit, behavior review, or user-perspective mining, use [analysis.md](references/analysis.md).

**Done when:** each ledger item has evidence, an explicit exclusion, or a named gap.

## 5. Verify completion

Compare the evidence with the ledger. For exhaustive modes, account for every session in scope, every bounded page or sequence range, all compaction boundaries, terminal positions, mutable state, and privacy exclusions.

For an active SQLite source, accept only one coherent read boundary. If the source moves beyond that boundary, retry or report movement as a gap. For deterministic refresh, accept only `snapshot` or `delta`; follow `rebuild_required` with a full snapshot or leave the gap visible.

**Done when:** no requested ledger item remains silently unverified.

## 6. Report

State the source and identity, mode, scope, sampled or complete status, findings, native evidence locators, exclusions, mutable states, and gaps. Keep source evidence distinct from interpretation.

A dependent workflow owns its artifact format, synthesis, merge, destination, lifecycle, and authority decisions. This skill does not mutate session stores or create those artifacts on its own.

**Done when:** the consumer can distinguish inspected evidence, interpretation, and uninspected material.

## Boundaries

- Read session sources without writing, migrating, vacuuming, repairing, or deleting them.
- Keep reasoning bodies, secrets, and irrelevant private content out of output.
- Use bounded projections and stable locators instead of transcript dumps.
- Run supporting scripts through their documented interfaces and consume compact stdout.
- When the user names a store root or export, use that artifact instead of a harness default.
