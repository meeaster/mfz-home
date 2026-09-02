## 1. V2 Evidence Contract

- [x] 1.1 Replace the evidence test fixture with complete `session_v2`, `session_message`, topology, inbox, event-watermark, compaction, and assistant-content fixtures; verify the focused evidence test imports and creates the database successfully.
- [x] 1.2 Add failing contract tests for V2 snapshot envelopes, checkpoint fields, sequence ordering, reasoning exclusion, parent versus fork topology, active-context boundaries, and bounded output; verify each test fails against the V1 adapter for the expected reason.
- [x] 1.3 Add failing delta tests for pure append, existing-message update, deletion, replacement, child addition or removal, topology change, source replacement, and active movement; verify only pure append expects an accepted delta and all unsupported historical changes expect `rebuild_required`.

## 2. V2 Evidence Adapter

- [x] 2.1 Rewrite `opencode-session-evidence.py` with V2-only schema and source validation, read-only SQLite transactions, and deterministic `snapshot` output; verify snapshot tests pass without querying V1 tables.
- [x] 2.2 Implement compact structural prefix guards, checkpoint validation, and append-only `delta`; verify append, no-op, wrong-source, stale-checkpoint, mutation, deletion, topology, and movement tests pass.
- [x] 2.3 Project bounded V2 user, assistant, tool, compaction, nonterminal, inbox, and optional event evidence with stable message/content locators while excluding reasoning bodies; verify privacy, ceiling, and projection tests pass.
- [x] 2.4 Remove V1 Bundle, four-stream, `tool-context`, V1 locate/outline, and V1 schema command surfaces from the adapter; verify its help and command tests expose only the accepted V2 snapshot and delta contract.

## 3. V2 Cost Calculator

- [x] 3.1 Convert cost fixtures and helpers to V2-only `session_v2` and `session_message` usage records; verify pricing, recursion, model-switch, tier, mode, malformed JSON, cycle, and body-exclusion tests use no V1 tables.
- [x] 3.2 Remove V1 schema detection, step-finish parsing, ambiguity handling, and V1 output wording from `opencode-session-cost.py`; verify the complete focused cost suite passes and a database without the V2 contract fails clearly.

## 4. Agent Sessions Skill

- [x] 4.1 Rewrite `agent-sessions/SKILL.md` so OpenCode selects only V2 SQLite or authenticated V2 API evidence and uses adaptive bounded analysis for locate, outline, investigate, reconstruct, and audit; verify no active V1, Bundle, part-table, or `opencode db path` instruction remains.
- [x] 4.2 Rewrite `references/opencode.md` as a V2 SQL, API, snapshot, delta, compaction, topology, consistency, and cost reference pinned to current source behavior; verify every named table, JSON field, API operation, and command against the inspected OpenCode revision.
- [x] 4.3 Preserve and reconcile harness-neutral analysis and Claude guidance without introducing OpenCode checkpoint assumptions; verify cross-references resolve and non-OpenCode routing remains intact.

## 5. Session Brief V2 Consumer

- [x] 5.1 Replace OpenCode Session Brief acquisition and refresh instructions with V2 snapshot, delta, checkpoint, rebuild, and locator behavior while retaining outer `state_version: 2`; verify the skill describes no V1 Bundle or four-stream workflow.
- [x] 5.2 Update the artifact contract and validator to branch on harness and OpenCode adapter version, validate V2 checkpoints and V2 parent-message locators, and preserve non-OpenCode controlled state; verify focused validator tests cover both OpenCode V2 and non-OpenCode artifacts.
- [x] 5.3 Update the controlled transport helper to consume the V2 adapter checkpoint envelope without manual JSON handling while preserving atomic replacement and safety checks; verify helper tests cover exact transport, no-op equality, missing checkpoint, malformed marker, symlink, and UTF-8 failures.
- [x] 5.4 Implement full V2 rebuild for legacy or unsupported OpenCode checkpoint state while preserving valid narrative, creation time, and extraction history; verify creation, no-op refresh, append refresh, rebuild, rejected delta, movement, and old-checkpoint tests pass.

## 6. Authoring Records And Rendering

- [x] 6.1 Reconcile the complete Agent Sessions authoring record with V2-only runtime behavior, tests, source revision, maintenance commands, and removal rationale; verify current VISION, EVALS, and MAINTENANCE contain no active V1 contract while LOG preserves historical entries.
- [x] 6.2 Reconcile the complete Session Brief authoring record with the V2 OpenCode checkpoint, rebuild rule, per-harness validation, and retained non-OpenCode behavior; verify evaluation and maintenance procedures match the implemented tests and commands.
- [x] 6.3 Run Python compilation and both focused Agent Sessions and Session Brief test suites, then run `mfz apply`, `mfz skills list`, and `mfz doctor`; verify source and rendered skills/scripts are byte-identical and healthy.

## 7. Live V2 Verification

- [x] 7.1 Run a read-only snapshot against the resolved live OpenCode V2 SQLite database with WAL state visible and compare bounded metadata and message evidence with the authenticated V2 API; verify identities, sequence ordering, compaction boundaries, and topology agree or expose documented gaps.
- [x] 7.2 Run a V2 snapshot and no-op delta on a quiescent fixture or disposable session, then append normal evidence and run delta again; verify the checkpoint advances only through accepted append state and never mutates the source.
- [x] 7.3 Create and refresh one disposable OpenCode V2 Session Brief through the documented workflow; verify validator acceptance, exact checkpoint transport, bounded narrative, reusable refresh state, and visible movement semantics.
- [x] 7.4 Search active source, tests, authoring records, and rendered output for `opencode db path`, V1 table queries, Bundle, four-stream cursors, V1 part locators, and dual-schema detection; verify no active OpenCode V1 behavior remains outside preserved historical logs or disabled archives.
