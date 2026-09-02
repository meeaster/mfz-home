# Maintenance

## Dependencies and provenance

The runtime skill has disclosed references for OpenCode, Claude Code, and shared analysis. OpenCode filesystem archaeology requires SQLite JSON support. API fallback requires the configured authenticated `opencode2 api` client. Claude Code extraction uses `jq` against current JSONL layouts.

The OpenCode storage, path, compaction, projection, API, and event semantics are pinned to source revision `5ee7f19875e0c1ec2877ead7e4642c5b5461ac00` in `/home/mark/workspace/references/opencode`:

- `packages/core/src/session/sql.ts`
- `packages/core/src/database/schema.gen.ts`
- `packages/core/src/database/database.ts`
- `packages/util/src/global-roots.ts`
- `packages/cli/src/server-process.ts`
- `packages/core/src/session/history.ts`
- `packages/core/src/session/projector.ts`
- `packages/protocol/src/groups/session.ts`
- `packages/protocol/src/groups/message.ts`
- `packages/server/src/handlers/message.ts`
- `packages/core/src/bus.ts`

Refresh these claims before changing table names, columns, path resolution, API pagination, compaction boundaries, update semantics, event durability, or fork behavior.

## Deterministic adapter contract

`scripts/opencode-session-evidence.py` is a narrow V2 refresh adapter. It exposes `snapshot` and `delta`; ordinary archaeology remains adaptive SQL or API work.

The checkpoint version is `2`. It owns source identity, parent and direct-child scope, topology, per-session terminal sequence, message count, maximum update, session update, completed compaction, active-context start, structural prefix and metadata guards, fork provenance, and optional event and inbox watermarks.

Delta is append-only. Validate the old projected prefix before returning new messages. Any historical, topology, source, or active-context change returns `rebuild_required` without mixed evidence. Optional persisted events supplement projected-state validation but never replace it.

The adapter output excludes reasoning bodies, tool bodies, event payloads, and secrets. Keep message and output ceilings fail-closed. Preserve deterministic compact JSON and one SQLite read transaction.

## Cost contract

`scripts/opencode-session-cost.py` accepts only V2 stores. It reads complete assistant usage, follows recursive `parent_id` descendants, guards cycles, and excludes content. Preserve exact provider, model, and variant attribution. Keep current models.dev pricing distinct from stored cost and provider billing.

## Change procedure

1. Read the runtime package, this record, dependent Session Brief state handling, and current OpenCode source.
2. Define the affected behavior, authority boundary, failure cases, adjacent cases, and observable evaluations.
3. Change tests and implementation together. Preserve the split between adaptive analysis and deterministic refresh.
4. Run focused compilation and suites.
5. Run a bounded read-only live check when a current V2 database is available. Compare API metadata without exposing message bodies when authenticated API access is available.
6. Reconcile runtime prose, this record, and rendered output.
7. Add consequential decisions or reversals to `LOG.md`; preserve historical entries.

## Verification

Run:

```bash
python3 -m py_compile skills/active/agent-sessions/scripts/opencode-session-evidence.py skills/active/agent-sessions/scripts/opencode-session-cost.py skill-meta/mfz-home/skills/agent-sessions/test_opencode_session_evidence.py skill-meta/mfz-home/skills/agent-sessions/test_opencode_session_cost.py
python3 skill-meta/mfz-home/skills/agent-sessions/test_opencode_session_evidence.py
python3 skill-meta/mfz-home/skills/agent-sessions/test_opencode_session_cost.py
python3 skills/active/agent-sessions/scripts/opencode-session-evidence.py --help
```

Static review confirms valid frontmatter, working disclosed-reference links, V2-only active OpenCode behavior, Claude routing, native locator rules, and no artifact lifecycle in the shared evidence skill.
