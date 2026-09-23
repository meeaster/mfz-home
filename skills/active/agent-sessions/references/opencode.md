# OpenCode sessions

Use one of four OpenCode evidence paths:

- Read-only SQLite for question-driven archaeology when the database path is known.
- The authenticated service API when the path or backend is unknown, or when service-owned semantics matter.
- The deterministic snapshot and delta adapter for refreshable consumers.
- The cost calculator for current-catalog estimates and persisted context-delivery lengths.

The storage and API facts below are pinned to OpenCode source revision `7c5a4d01aa2a8144a81b6261aad220cf5a84c107` (`v2.0.2`). Internal table names and API operation IDs still contain `v2`; treat those as implementation identifiers, not the product name.

## Resolve read-only SQLite

Resolve the database in this order:

1. Use the caller's explicit absolute path.
2. Otherwise run `opencode debug paths db`. It resolves `OPENCODE_DB`, the data root, and the release-channel filename without starting the service or opening the database.

When none of these identifies the active backend, use the authenticated API. Do not invoke a database command to discover or query the store because service startup and database commands can apply migrations.

Open a filesystem source with SQLite URI read-only mode:

```bash
sqlite3 -json 'file:/absolute/path/opencode.db?mode=ro' "SELECT ..."
```

Keep live `-wal` and `-shm` files beside the database. Do not use immutable mode for an active store.

Validate `session_v2` and `session_message` plus the columns needed by the query. A database without that contract is unsupported. Ignore unrelated legacy-named tables if they coexist.

## Query the current projection

`session_v2` stores session metadata. `parent_id` defines ancestry. `fork_session_id` and JSON `fork_boundary` define fork provenance separately. Session rows include aggregate cost and token counts, created and updated times, compaction state, archive state, and the execution-claim timestamp stored in `time_suspended`.

`session_message` stores `id`, `session_id`, `type`, `seq`, timestamps, and JSON `data`. The unique `(session_id, seq)` index defines transcript order. Message updates preserve `seq` and update the row timestamp.

On a large store, bounded SQL text does not guarantee bounded execution. For recursive or fixed multi-session work, favor a shape that lets the known session scope and relevant message predicates reduce rows before JSON extraction. Runtime that barely changes with scope size can indicate that SQLite is scanning much more of `session_message` than intended. Query-plan inspection is one useful diagnostic when observed performance warrants it; choose the final query shape from the current schema, indexes, scope, and planner behavior.

Start with bounded structure:

```sql
SELECT id, parent_id, fork_session_id, fork_boundary, title, directory,
       time_created, time_updated, time_compacting, time_archived,
       time_suspended, idle_outcome
FROM session_v2
WHERE id = :session_id;

SELECT type, count(*) AS message_count, min(seq) AS first_seq, max(seq) AS last_seq,
       max(time_updated) AS max_message_updated
FROM session_message
WHERE session_id = :session_id
GROUP BY type
ORDER BY type;

SELECT id, parent_id, fork_session_id, fork_boundary, title,
       time_created, time_updated
FROM session_v2
WHERE parent_id = :session_id
ORDER BY time_created, id;
```

Project message fields rather than returning whole JSON documents. User, synthetic, system, and skill text is at `$.text`. Assistant content is the `$.content` array. Exclude reasoning before selecting text:

```sql
SELECT seq, id, type, time_created, time_updated,
       substr(json_extract(data, '$.text'), 1, :preview_chars) AS text_preview
FROM session_message
WHERE session_id = :session_id
  AND type IN ('user', 'synthetic', 'system', 'skill')
  AND seq > :after_seq
  AND seq <= :through_seq
ORDER BY seq
LIMIT :limit;

SELECT m.seq, m.id AS message_id, CAST(item.key AS INTEGER) AS content_index,
       json_extract(item.value, '$.id') AS content_id,
       json_extract(item.value, '$.type') AS content_type,
       json_extract(item.value, '$.name') AS tool,
       json_extract(item.value, '$.state.status') AS tool_status,
       CASE WHEN json_extract(item.value, '$.type') = 'text'
            THEN substr(json_extract(item.value, '$.text'), 1, :preview_chars)
       END AS text_preview
FROM session_message AS m, json_each(m.data, '$.content') AS item
WHERE m.session_id = :session_id
  AND m.type = 'assistant'
  AND json_extract(item.value, '$.type') != 'reasoning'
  AND m.seq > :after_seq
  AND m.seq <= :through_seq
ORDER BY m.seq, CAST(item.key AS INTEGER)
LIMIT :limit;
```

Use `(session_id, seq, message_id)` as the message locator. Add `content_id` or `content_index` for one assistant content item. Bound tool input, output, error, provider metadata, and text to records that can change the answer. Start with projected fields and bounded previews, then expand a relevant locator when more detail can change the answer. Count reasoning items by type and owning message without selecting their text.

Compaction is a `session_message` with `type = 'compaction'`. A completed compaction has `json_extract(data, '$.status') = 'completed'`. All-history analysis uses the requested durable sequence range. Active-context analysis starts at the greatest completed compaction sequence, inclusive. Compaction does not delete earlier projected rows.

For exhaustive active-store work, prefer one coherent read transaction when practical. Before issuing many similar reads, consider whether grouping known sessions would avoid repeated setup and inconsistent boundaries. Iterative follow-up reads remain appropriate when earlier evidence determines the next question. If one transaction is not practical, capture terminal sequence, message count, maximum update, and session update state before paging. Apply the terminal sequence to every page, then recheck the boundary. Report movement instead of mixing boundaries.

## Use the authenticated API

Use the service API through the configured authenticated client. Do not read service credentials or construct an unauthenticated request.

```bash
opencode api get /api/session
opencode api get /api/session/<session-id>
opencode api get '/api/session/<session-id>/message?order=asc&limit=200'
```

Session listing returns metadata plus an opaque cursor. Message listing returns `data` and `cursor.previous` or `cursor.next`; the default page size is 50 and the maximum explicit limit is 200. A message cursor already carries order and direction, so do not combine it with `order`.

The API preserves projected message order across pages. Retain native IDs and content identities as locators. Project only fields needed for the question, and keep reasoning and unrelated bodies out of the conversation. API evidence has its own pagination and movement limits; do not claim SQLite transaction guarantees for it.

The process-local active-session route describes current execution, not durable completion. Durable execution evidence comes from projected messages, inbox state, and execution claims. Persisted event payloads are optional and cannot serve as a complete mutation stream.

## Use deterministic snapshot and delta

Resolve the script from the loaded skill directory. Create a parent and direct-child snapshot:

```bash
python3 <skill-dir>/scripts/opencode-session-evidence.py \
  --db /absolute/path/opencode.db \
  snapshot ses_parent
```

Refresh from the exact top-level `checkpoint` object:

```bash
python3 <skill-dir>/scripts/opencode-session-evidence.py \
  --db /absolute/path/opencode.db \
  delta ses_parent \
  --checkpoint-json '<exact-compact-checkpoint-json>'
```

Use `--checkpoint-file` when a controlled consumer retained the exact JSON in a file. The adapter exposes only `snapshot` and `delta`; locate, outline, investigate, reconstruct, and audit remain adaptive SQL or API work.

The checkpoint records adapter and source identity, the parent and direct-child set, topology, and per-session terminal sequence, message count, maximum message update, session update, latest completed compaction, active-context start, fork provenance, metadata guard, and structural prefix guard. Event and inbox watermarks are supplemental. Event payloads are never treated as complete delta evidence.

`delta` accepts only a verified pure append. It returns `rebuild_required` without mixed evidence when the source, an existing projected message, count, prefix, child set, topology, fork provenance, or active-context boundary changed. Take a new snapshot before continuing. A legacy or unsupported checkpoint cannot drive delta.

Snapshot and delta output include bounded user text, assistant text and tool structure, compactions, nonterminal locators, inbox structure, sequence locators, coverage, and the next checkpoint. Reasoning records retain type and locator only. Tool bodies, event payloads, reasoning text, and secrets are excluded from output. Raise the explicit message or output ceiling only when the declared scope requires it.

## Calculate cost

The bundled calculator handles current-catalog cost for a parent and all recursive `parent_id` descendants:

```bash
python3 <skill-dir>/scripts/opencode-session-cost.py \
  --db /absolute/path/opencode.db \
  --summary \
  ses_parent
```

The calculator reads complete assistant and completed-compaction usage from `session_message`. It attributes each priced step to its stored provider, model, and variant, guards recursive cycles, and excludes forks that are not descendants. Partial usage fails validation instead of undercounting.

The JSON result includes `session_tree` with ownership, nesting, own totals, and subtree totals. The flat `sessions` list provides detailed request cycles and compaction windows. An `idle` record followed by a user message starts a new request cycle; a synthetic notification after idle starts a continuation cycle. Additional messages during active work stay in the current cycle. Matched subagent calls assign child request and continuation costs to a parent cycle; `attribution.unmatched_child_cycles` lists gaps. Each window includes its own usage, per-cycle portions, and checkpoints at 25,000-token context thresholds. A completed compaction's recorded usage belongs to the closing window. Checkpoints report the first observed context size that crosses each threshold; they do not interpolate a price at the exact threshold.

Each measured total, session, request cycle, compaction window, and model breakdown includes `cost_components_usd` for uncached input, output, cache reads, cache writes, and reasoning. A cycle also reports its first assistant request's usage and cache-read percentage, the ending and maximum observed assistant context, and the idle gap before its trigger when both timestamps exist. The percentage is cache-read tokens divided by input plus cache-read plus cache-write tokens. Compaction usage belongs to the closing window but is excluded from assistant context extrema.

`--summary` keeps assignment costs, first-request boundaries, aggregate token and cost components, condensed checkpoints, and session-level delivery totals. The default format retains full per-cycle and per-window partitions. Individual named delivery entries are omitted in both formats unless `--delivery-details` is passed. `--request-ledger` adds one entry per priced model step in session and sequence order, with timestamp in epoch milliseconds, cycle and window indexes, model and variant, selected catalog model and tier, applied rates per million tokens, usage, and dollar components. Its compaction entry belongs to the closing window. Use `--models-file` to keep comparisons tied to the same pricing snapshot.

`context_deliveries` reports character lengths and a rough token estimate using `ceil(characters / 4)` for persisted user messages, notifications, recorded system messages, `skill` results, explicit `read` results, subagent prompts, and subagent results. An explicit read of a loaded skill's `SKILL.md` counts as a skill-document delivery; other reads under its directory count as supporting files. The `skill` tool's full returned text also counts as a skill-document delivery, including its wrapper. Explicit reads of `AGENTS.md` have separate global and project categories. Each scope has category totals, per-skill document and supporting-file totals, and delivery details. The calculator reads only selected message and tool text to count characters; reasoning text is excluded and no content bodies appear in its output. Opaque tool calls and startup-injected instructions are not reconstructed. Context-delivery estimates are not additive to recorded token usage and do not assign cache or dollar cost to particular sources.

The calculator fetches `https://models.dev/api.json` by default. Use `--models-file /path/to/api.json` when a reproducible pricing snapshot matters. For several calculations in one task, consider reusing a retained catalog and narrowing the roots first; repeated catalog fetches or one fresh process per root can dominate a bulk comparison. Choose batching or separate calls according to the requested scope and failure isolation. Exact catalog model IDs win; an explicit `<base-model>-<mode>` ID may use `experimental.modes[mode].cost`. Context tiers apply per turn. Missing optional cache rates are zero, and reasoning uses its explicit rate or the selected output rate. The result is a current-catalog estimate, not historical billing or a provider invoice.

## Read an export

When the user supplies an OpenCode export, inspect its current JSON shape with bounded `jq` projections. Confirm identity and message ordering, then apply the same coverage ledger and privacy rules. Do not open an export as SQLite or assume that it has deterministic checkpoint semantics.
