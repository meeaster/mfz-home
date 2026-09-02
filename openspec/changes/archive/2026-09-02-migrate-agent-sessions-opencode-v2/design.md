## Context

See `proposal.md` for motivation. OpenCode V2 projects sessions into `session_v2` and `session_message`; `session_message.seq` is transcript order. Related inbox and event tables expose pending work and durable watermarks, but event payload persistence is optional and does not form a complete mutation stream. The existing Agent Sessions evidence adapter and OpenCode Session Brief checkpoint use V1 `session`, `message`, `part`, and four-stream Bundle state.

The active Session Brief workflow is the only known consumer that requires deterministic refresh state. Ordinary session archaeology benefits from adaptive SQL and API queries instead of a fixed all-purpose Bundle.

## Goals / Non-Goals

**Goals:**

- Remove every active OpenCode V1 runtime and test path.
- Optimize analysis for current V2 SQLite projection, ordering, topology, compaction, and API behavior.
- Keep one deterministic checkpoint boundary for refreshable OpenCode Session Briefs.
- Preserve non-OpenCode Agent Sessions and Session Brief behavior.
- Fail closed when V2 projection history changes outside the supported append path.

**Non-Goals:**

- Convert V1 checkpoint cursors into V2 state.
- Preserve OpenCode V1 Session Brief refresh.
- Use optional event persistence as the source of truth for exact deltas.
- Migrate disabled archived thread-log material.
- Replace adaptive analyst judgment with one universal extraction command.

## Decisions

### Split adaptive analysis from deterministic refresh

`session-analyst` will use bounded read-only SQL or authenticated V2 API operations for locate, outline, investigate, reconstruct, and audit. The rewritten evidence executable will serve only refreshable snapshot and delta consumers.

This avoids recreating the V1 Bundle as a large abstraction while retaining deterministic acquisition where Session Brief needs it. Removing the executable entirely would push snapshot pinning, pagination, privacy projection, topology reconciliation, and mutation detection into a prompt-driven artifact workflow.

### Resolve SQLite explicitly and fall back to the service API

The skill will resolve an explicit path first, then `OPENCODE_DB`, then the current channel filename under the OpenCode data directory. It will open SQLite through a read-only URI with WAL and SHM files visible. It will not use immutable mode for a live database or invoke a database command that can migrate the store.

When the path or backend is unknown, service-owned semantics matter, or the server is not filesystem-backed, the analyst will use the authenticated V2 API. API evidence will retain its own pagination and consistency limits rather than claiming SQLite-equivalent snapshot guarantees.

### Use a narrow V2 snapshot and checkpoint envelope

The evidence adapter will expose `snapshot` and `delta` operations. Its envelope will separate source identity, scope, topology, per-session evidence, coverage, gaps, and checkpoint state.

The checkpoint will include:

- Adapter version and source identity.
- Parent session ID and known direct-child IDs.
- Per-session terminal sequence, message count, maximum observed message update, session update state, latest completed compaction, and a projected-prefix guard.
- Topology and fork provenance needed to detect boundary changes.
- Supplemental event and inbox watermarks when available.

Locators will use `(session_id, seq, message_id)` and an optional content ID or index. The adapter will not expose V1 part locators, four cursor streams, or Bundle-compatible field names.

### Optimize the append path and rebuild on historical change

An initial snapshot will run in one read transaction. Delta will validate the source, topology, previous terminal state, and structural projection through the prior terminal sequence.

If the prior prefix remains valid, delta will return appended messages and newly discovered direct children. If an existing message, content status, topology, or prefix changes, the adapter will return `rebuild_required` without a mixed delta.

This conservative rule is required because event payload persistence defaults to false, message updates retain their original sequence, reverts can delete ranges without tombstones, forks and imports can copy messages without per-message events, and session deletion removes event history. A compact prefix guard costs less than storing an unbounded revision ledger in every brief.

### Preserve all-history and active-context views

Snapshot evidence will retain durable all-history ordering while reporting the latest completed compaction and the active-context starting sequence separately. Compaction does not delete projected history.

The adapter will distinguish current projected state, durable execution claims, inbox work, optional retained events, and process-local activity. It will not infer durable execution from `/api/session/active` alone.

### Keep Session Brief artifact version 2 with per-harness adapter state

The outer `kind: session-brief` and `state_version: 2` contract will remain. The validator will branch on the source harness and adapter version inside the compact state block.

OpenCode V2 will receive a new checkpoint version and V2 locator rules. Claude Code and other adapters will retain their common frontmatter and adapter-specific state. The migration will also remove the current global requirement that every authority locator look like an OpenCode `msg_*` or `prt_*` ID.

A global artifact version 3 would invalidate non-OpenCode artifacts without buying a shared semantic change.

### Rebuild old OpenCode briefs without checkpoint conversion

An OpenCode brief containing V1 Bundle state will not drive delta. The workflow will preserve valid narrative, original creation time, and useful extraction history, then acquire a full V2 snapshot and replace the incompatible checkpoint through the controlled helper.

The helper will consume the new adapter's explicit top-level checkpoint field. It will preserve its atomic replacement, UTF-8, marker, symlink, and byte-integrity protections. Models will never serialize checkpoint JSON manually.

### Make cost attribution V2-only

The cost calculator will remove V1 schema detection, V1 step-finish parsing, and ambiguity behavior. It will retain recursive `parent_id` traversal, complete assistant usage validation, exact stored model attribution, body-free reads, cycle guarding, current-catalog tier selection, and pricing caveats.

## Risks / Trade-offs

- [Large coordinated change across two skills] -> Implement the evidence contract first, then migrate the consumer before removing old runtime paths; keep focused fixture suites independently runnable.
- [Prefix validation can make refresh slower as history grows] -> Hash only structural projection fields in bounded chunks and optimize the normal append path; prefer safe rebuild over an incorrect delta.
- [Active sessions can move during acquisition] -> Use one SQLite read transaction for the accepted snapshot and report post-snapshot movement separately.
- [Existing OpenCode briefs cannot refresh incrementally] -> Perform one explicit full V2 rebuild and preserve valid brief-owned narrative and history.
- [API fallback cannot prove every SQLite mutation invariant] -> Use full bounded snapshots or expose incomplete coverage instead of claiming deterministic delta.
- [V2 schema and API are still changing] -> Pin source-sensitive evaluations to the inspected OpenCode revision and fail clearly on schema drift.
- [Claude Session Brief support lacks strong live coverage] -> Preserve the shared v2 artifact branch and add focused per-harness validation before changing global locator rules.

## Migration Plan

1. Define V2 SQLite fixtures, adapter envelope, checkpoint schema, and expected mutation outcomes in tests.
2. Rewrite the evidence adapter for V2 snapshot and delta; validate read-only, append, rebuild, topology, compaction, privacy, and movement behavior.
3. Remove V1 from the cost calculator and convert its tests to V2-only fixtures.
4. Rewrite Agent Sessions runtime and OpenCode reference guidance around adaptive V2 SQL/API and the narrow checkpoint adapter.
5. Update Session Brief acquisition, state contract, helper, validator, locator rules, and tests for the V2 checkpoint.
6. Remove remaining active V1 fixtures and instructions only after the V2 Session Brief path passes.
7. Update both complete authoring records, run `mfz apply`, and verify rendered skills contain no active V1 contract.

Rollback uses the repository change as one unit. Restore both skill sources, scripts, tests, and records together, then run `mfz apply`. Do not roll back only the producer or consumer side of the checkpoint contract.
