# OpenCode Sessions

OpenCode session archaeology has these evidence surfaces:

- OpenCode V2: the running background service API, accessed through `opencode2`.
- OpenCode V1 or a supplied legacy store: SQLite or an exported JSON transcript.
- OpenCode V1 or V2 cost: a validated read-only SQLite store supplied to the
  body-free cost calculator.

Identify the active surface before reading content. V2 session records do not use
the V1 `session`, `message`, and `part` table contract.

## OpenCode V2 Service API

Use the service API first when `opencode2` is installed or the user identifies a
V2 session. The API uses the managed service's authentication and location
context; do not read service passwords or construct unauthenticated requests.

List sessions without reading transcript bodies:

```bash
opencode2 api get /api/session
```

The response is an object whose `data` array contains session metadata and whose
`cursor` can be used for the next page. Relevant metadata includes `id`,
`parentID`, `title`, `location.directory`, `time.created`, `time.updated`,
`agent`, `model`, and `tokens`. Preserve V2 field names when reporting locators;
map them to common concepts only in the synthesis.

Read one session's metadata:

```bash
opencode2 api get /api/session/<session-id>
```

Read messages only after locating the relevant session:

```bash
opencode2 api get /api/session/<session-id>/message
opencode2 api get /api/session/<session-id>/message/<message-id>
```

The message list is paginated and may contain user text, assistant content,
tool calls, tool results, metadata, snapshots, and reasoning. Project only the
fields needed for the question, exclude reasoning bodies, and avoid dumping the
full API response into the conversation. The V2 API also exposes session export
at `/api/session/<session-id>/export` when an export is explicitly requested.

V2 filesystem servers select their database from the server's explicit database
option or `OPENCODE_DB`; otherwise they use an `opencode*.db` file under the
configured data root. This is not the primary transcript interface: the active
service may use a wrapper, channel-specific name, runtime-managed location, or a
non-filesystem database. Resolve the actual path from supplied or launcher
configuration instead of guessing it. Do not use `opencode db path` as a V2 probe
when the installed V2 CLI does not provide that command.

The bundled evidence extractor targets the V1-compatible schema and must not run
against V2. The cost calculator is separate: it detects and validates either the
V1 `session`/`message`/`part` schema or the V2
`session_v2`/`session_message` schema before reading body-free usage fields.

## SQLite Store

Locate the standard database without opening it for queries:

```bash
opencode db path
```

`opencode db <SQL>` may enable WAL mode and apply migrations. Session archaeology
instead opens the returned path through SQLite's read-only URI:

```bash
sqlite3 -json 'file:/path/to/opencode.db?mode=ro' "SELECT ..."
```

Use `immutable=1` only for a read-only snapshot without live WAL or SHM sidecars.
For a user-supplied store root, use that artifact rather than the harness default.

## Efficient Outline

Resolve script paths from the loaded skill's base directory. The bundled script
validates the live `session`, `message`, `part`, and optional `session_message`
tables and emits compact structural evidence without transcript bodies:

```bash
python3 <skill-dir>/scripts/opencode-session-evidence.py \
  --db /path/to/opencode.db outline ses_xxx
```

Its output includes session identity, counts, role/type/tool aggregates,
compactions, child metadata, task invocations and resumptions, terminal cursors,
and running tools. Lists are bounded and report whether more records exist. Use
`--pretty` only for human inspection; compact JSON costs fewer transcript tokens.
Session metadata includes both raw epoch milliseconds and additive UTC ISO fields,
so timestamp reporting does not require separate shell conversions. Invoke the
documented interface directly; inspect the script source only to debug an adapter
failure or schema behavior.

Compare `state.input.task_id` with `state.metadata.sessionId`: no requested ID
with a persisted child is `new`; matching IDs are `resume`; differing IDs are
`fallback-new`; and missing child metadata is `unresolved`. Preserve both IDs,
the persisted child's parent, task part, call ID, timestamps, and status.

When any Outline collection reports `has_more`, rerun with its matching
`--children-after`, `--tasks-after`, `--compactions-after`, `--running-after`, or
`--nonterminal-after` continuation cursor. Aggregate categories are returned as
complete grouped counts and remain subject to the total output ceiling.

## Efficient Bundle

For model-driven reconstruction or audit of a parent and its direct children,
prefer one reconstruction-view Bundle over repeated Outline, Delta, and topology
queries:

```bash
python3 <skill-dir>/scripts/opencode-session-evidence.py \
  bundle --db /path/to/opencode.db ses_parent \
  --view reconstruction \
  --max-output-bytes 1000000 \
  --limit 100 \
  --max-records-per-stream 10000 \
  --max-record-bytes 5000 \
  --max-text-chars 250
```

Bundle opens one SQLite read-only transaction, outlines the parent and every
current direct child once, and includes prior known child IDs so removed or
missing children remain visible. It pins each existing session to its current
message-created, message-updated, part-created, and part-updated terminal
cursors plus bounded message and part counts. Every Delta page from the supplied
cursors, or `0:` for an initial extraction, is traversed to that pin. The
result includes `source`, `parent_session_id`, `topology`, `sessions`, `gaps`, and
a reusable `next_state` object. Each session reports its state, canonical
metadata, counts, compactions, task invocations, running tools, nonterminal
messages, grouped structural metadata, projected evidence or raw observations,
starting and ending cursors, terminal record IDs, and reasoning exclusion counts.
Creation and update observations are merged by
record ID, retaining the greatest `time_updated` before they are returned.
Topology contains child IDs and status references rather than repeating session
metadata or counts. Direct-child discovery is SQL-bounded to one record beyond
the configured ceiling and fails rather than materializing an unbounded child
list.

Use `--view reconstruction` for model-driven reconstruction or audit. It is the
first and only structural pass for the parent and its direct children: do not run
Outline before or after it, and do not repeat topology, grouped-count, compaction,
running-tool, nonterminal-message, or error-status queries already represented by
the result. The default `--view full` preserves the four raw observation streams
for generic consumers and refresh-state workflows.

`sessions` is an object keyed by session ID, not a list. Session metadata is in
`metadata`; there is no nested `session` field. Every result declares `view`.
In `full`, each session's `observations` has `messages_created`,
`messages_updated`, `parts_created`, and `parts_updated`. In `reconstruction`,
those streams are replaced by `evidence.text_records`, `evidence.tool_records`,
`evidence.completed_tool_locators`, and `evidence.selection`. Text records use
the exact fields `message_role`, `text_preview`, and `text_truncated`, are
deduplicated at their greatest `time_updated`, identify their owning message role,
and disclose preview truncation. Tool records include task tools and non-completed
tools. Every omitted routine completed tool remains available as an exact
body-free locator grouped as `{tool, part_ids}`, and selection counts reconcile
both categories while disclosing omitted message observations. Canonical grouped summaries, compactions, task
invocations, running tools, nonterminal messages, coverage, gaps, and reusable
state remain available in both views. The top-level `content` only reports
preview settings and bounds. Use these stable paths directly instead of probing
alternate shapes. Extract reusable state with
`jq -c '.next_state' <bundle-output>` when `jq` is available.

Run Bundle directly and let the harness capture compact stdout; do not redirect it
to task files or `/tmp`. If the harness stores oversized output in its managed
tool-output path, use that path without copying it. Consume the result with at
most one structural projection and one cross-session text projection; do not run
separate per-session preview scans or shape probes. This cross-session preview
scan is part of consuming the original Bundle, not a new store query:

```bash
jq -c '[.sessions | to_entries[] as $session |
  $session.value.evidence.text_records[] |
  {session_id:$session.key,id,message_id,time_created,time_updated,
   message_role,text_preview,text_truncated}]' <managed-bundle-output>
```

A follow-up store query must
name explicit IDs from `text_truncated`, `tool_records`, or grouped `part_ids`.
Selecting all text or tools by session ID and type is a broad reread and does not
satisfy the reconstruction contract.

The state passed with `--state` or `--state-json` is compact JSON with this exact
shape. Bundle rejects unsupported fields so artifact-specific state cannot be
carried into the generic extractor:

```json
{"version":1,"source_identity":"<source-identity>","parent_session_id":"ses_parent","known_child_ids":["ses_child"],"sessions":{"ses_parent":{"cursors":{"message_created":{"time":0,"id":""},"message_updated":{"time":0,"id":""},"part_created":{"time":0,"id":""},"part_updated":{"time":0,"id":""}},"counts":{"messages":0,"parts":0},"terminal_identities":{"message_created":null,"message_updated":null,"part_created":null,"part_updated":null},"prefix_fingerprints":{"message_created":"sha256:8db4af25d20af50f47a3716d44e8bd344b4c963738c2e97bea89cb76a732c2f6","part_created":"sha256:8db4af25d20af50f47a3716d44e8bd344b4c963738c2e97bea89cb76a732c2f6"}},"ses_child":{"cursors":{"message_created":{"time":0,"id":""},"message_updated":{"time":0,"id":""},"part_created":{"time":0,"id":""},"part_updated":{"time":0,"id":""}},"counts":{"messages":0,"parts":0},"terminal_identities":{"message_created":null,"message_updated":null,"part_created":null,"part_updated":null},"prefix_fingerprints":{"message_created":"sha256:8db4af25d20af50f47a3716d44e8bd344b4c963738c2e97bea89cb76a732c2f6","part_created":"sha256:8db4af25d20af50f47a3716d44e8bd344b4c963738c2e97bea89cb76a732c2f6"}}}}
```

`version`, `source_identity`, `parent_session_id`, `known_child_ids`, and
`sessions` are required. The parent ID must not appear in `known_child_ids`.
`sessions` must contain the parent and every ID in `known_child_ids`; every entry
must contain all four cursor objects, `counts`, and `terminal_identities`.
It must also contain `prefix_fingerprints` with exactly `message_created` and
`part_created`, each formatted as `sha256:<64-hex>`. Bundle computes each digest
by streaming the ordered `(time_created, id)` rows through the prior creation
cursor with length-framed UTF-8 fields and the fixed `opencode-bundle-prefix-v1`
domain marker. These guards use only structural identity/order fields, never
message, tool, or reasoning bodies.
Cursor values are objects containing only a nonnegative integer `time` and string
`id`; string shortcuts such as `"0:"` are rejected. An empty stream is
`{"time":0,"id":""}`. Bundle compares each prior creation-prefix count and
requires every nonempty cursor ID to have a non-null matching terminal identity,
while empty cursors require null identities. It checks each persisted terminal
identity before advancing state. A mismatch
returns a rebuild-required gap and preserves that session's prior state. The
prefix fingerprints in every emitted state entry correspond to that entry's
creation cursors: complete entries use terminal prefixes, while incomplete
initial entries use their starter prefixes so their next state can be reused
after the source settles.
next state keeps the union of prior and current child IDs, so a missing child
remains detectable on later runs. The state has no brief, artifact, synthesis,
or lifecycle fields.

Bundle returns SQL-bounded `text_preview` fields for text parts by default. It
does not select tool input, output, or error bodies, and never selects reasoning
bodies. Use `--include-tool-content` only when a bounded tool preview is
consequential; `--max-tool-chars` bounds each such preview. `--max-text-chars`
and `--max-record-bytes` bound individual returned records, while
`--max-records-per-stream` bounds each collection. The extractor fails rather
than silently omitting records when a ceiling is exceeded, and the root
`--max-output-bytes` ceiling is enforced after compact JSON encoding. Root
options such as `--pretty` and `--max-output-bytes` work before or after the
subcommand.

Session Brief and other dependent workflows should prefer one `full` Bundle when
their artifact contract consumes the four raw streams. They own synthesis,
storage, and lifecycle; use targeted bounded reads only for consequential tool
evidence that Bundle does not contain.

After any targeted post-Bundle content reads, reuse the original result's exact
`next_state` in one compact Bundle call. Empty raw observations or projected
evidence confirm the same structural state; gaps require rebuild handling, while
returned records are post-pin movement rather than evidence from the accepted pin.

## Incremental Evidence

OpenCode has independent message and part streams. Preserve four cursors from
the outline:

- message creation `(time_created, id)`;
- message update `(time_updated, id)`;
- part creation `(time_created, id)`;
- part update `(time_updated, id)`.

Fetch additions and changed parts with:

```bash
python3 <skill-dir>/scripts/opencode-session-evidence.py \
  --db /path/to/opencode.db delta ses_xxx \
  --message-after 1786210000000:msg_xxx \
  --message-updated-after 1786210000000:msg_xxx \
  --part-after 1786210000000:prt_xxx \
  --updated-after 1786210000000:prt_xxx
```

Use `0:` as the cursor for an empty or initial stream. Delta output is structural
by default, excludes reasoning bodies, uses bounded pages, and returns continuation
cursors plus `has_more`. Add `--include-content` only after establishing that its
bounded text and tool previews fit the privacy boundary. Use record IDs for any
narrow full-content reads. Re-outline when child topology may have changed.

Creation and update pages are independent observation streams. Collect every
page, then merge observations by record ID and retain the greatest `time_updated`
before reading content or synthesizing. A record can appear once through each
stream when their order differs; this structural duplication prevents a real
between-page update from being lost.

For an active source, pin the four terminal cursors from Outline and pass them on
every page as `--message-through`, `--message-updated-through`, `--part-through`,
and `--updated-through`. Each page first detects a record created within the pin
but updated beyond its update bound. If found, it returns `requires_repin: true`,
no evidence rows, and unchanged cursors; discard that Delta and re-outline rather
than mixing post-pin mutable state into the brief.

After targeted content reads, run a final consistency probe with all four lower
cursors equal to their corresponding upper bounds and the same four `--through`
values. Also pass the initial page's source identity and bounded counts as
`--expected-source-identity`, `--expected-message-count`, and
`--expected-part-count`. No evidence rows are expected. Accept content only when
the probe returns `pin_consistent: true`; mutation, deletion, shrink, or source
replacement returns `requires_repin` with unchanged cursors.

Creation time alone is not a stable cursor: use `id` as the tie-breaker. Creation
cursors find appended records; update cursors detect existing messages or tools
whose finish, status, or output later changed.

## Locate

Search exact IDs and bounded title matches without transcript bodies:

```bash
python3 <skill-dir>/scripts/opencode-session-evidence.py \
  --db /path/to/opencode.db locate "subagent progress"
```

Continue a truncated descending result with `--before <time_updated>:<id>`. Use
bounded metadata queries over project, directory, parent, agent, or recency to
resolve remaining ambiguity. Search prompt or tool evidence only when metadata
cannot resolve the candidate, project the minimum relevant JSON field, and limit
the result before reading any matched body.

## Targeted Reads

Use `(time_created, id)` ordering and keyset pagination rather than `OFFSET`:

```sql
SELECT id, message_id, time_created, time_updated,
       json_extract(data, '$.type') AS type,
       json_extract(data, '$.tool') AS tool,
       json_extract(data, '$.state.status') AS status
FROM part
WHERE session_id = :session_id
  AND json_extract(data, '$.type') != 'reasoning'
  AND (time_created > :time OR (time_created = :time AND id > :id))
  AND (time_created < :created_through OR
       (time_created = :created_through AND id <= :created_through_id))
  AND (time_updated < :updated_through OR
       (time_updated = :updated_through AND id <= :updated_through_id))
ORDER BY time_created, id
LIMIT :limit;
```

Query extracted fields instead of full `data`. High-value fields include part
type, text, tool name, tool status, input paths or commands, errors, compaction
metadata, and task metadata. Count and locate reasoning parts without selecting
their bodies.

For a narrow tool investigation, Outline already supplies the consequential part
ID. Use one `tool-context` call instead of ad hoc SQL or a descending record
window:

```bash
python3 <skill-dir>/scripts/opencode-session-evidence.py \
  tool-context --db /path/to/opencode.db ses_xxx prt_xxx \
  --include-tool-content \
  --max-text-chars 2000 \
  --max-tool-chars 500
```

The command establishes one current four-stream pin and returns canonical session
metadata, bounded counts, the exact tool, its owning assistant message, and every
preceding text part of the nearest user request. Tool content is opt-in and
bounded. `--max-text-chars` accepts `1..4000`; `--max-tool-chars` accepts
`1..1000`. Reasoning and unrelated bodies are never selected. This result completes
the narrow read, so do not query the same tool or message again.

When targeted text or tool content is required, add only SQL-bounded projections
for selected record IDs while retaining both upper-bound predicates. An absent
row may have moved beyond the pin; the final consistency probe decides whether to
discard and re-pin.

Enumerate children before reading them:

```sql
SELECT id, title, agent, model, time_created, time_updated
FROM session
WHERE parent_id = :session_id
ORDER BY time_created, id;
```

Read a child transcript only when its result, behavior, or coverage is material.

## Session API Cost

Calculate current-catalog API cost for one OpenCode V1 or V2 session and every
recursive descendant without reading transcript, tool, or reasoning bodies:

```bash
python3 <skill-dir>/scripts/opencode-session-cost.py \
  --db /path/to/opencode.db \
  ses_parent
```

The calculator selects V1 or V2 only after validating the schema and finding the
requested root session in exactly one supported session table. It reports the
selection as `source.schema` and fails on unknown or ambiguous stores. V1 usage
comes from step-finish parts joined to assistant messages. V2 usage comes from
assistant `session_message` rows with complete `cost` and `tokens`; incomplete
running messages are excluded, while partial usage records fail validation.

The calculator fetches `https://models.dev/api.json` by default. Use
`--models-file /path/to/api.json` for a reproducible offline pricing snapshot and
`--pretty` only for human inspection. It opens SQLite read-only, traverses the
cycle-guarded descendant tree through the selected schema's `parent_id`, and
prices every persisted model step from its exact `providerID`, model ID, and
variant; it never prices an entire session from the session's latest model.

An exact catalog model ID wins. Otherwise an OpenCode synthetic
`<base-model>-<mode>` ID resolves the matching
`experimental.modes[mode].cost`; assistant `variant` remains attribution rather
than pricing mode selection. Each turn then selects the highest models.dev context tier whose size is
strictly below that turn's input context; when no tier matches, legacy
`context_over_200k` applies above 200,000 tokens. Stored input, cache read, cache
write, visible output, and reasoning are priced separately. Missing optional cache
rates are zero; reasoning uses an explicit models.dev reasoning rate when present
and otherwise the selected output rate. The JSON reports `total` plus per-session and per-model breakdowns,
including recursive depth, tokens, estimated current-price cost, and stored
OpenCode cost for comparison. Treat the result as an estimate from an unversioned
current catalog, not a provider invoice or historical price record.

## Exported JSON

`opencode export <id>` produces one hydrated JSON object with `info` and
chronological `messages`. When given that path, inspect it with `jq`; do not open
it as SQLite. Confirm its live keys, count messages and part types, outline child
or tool markers, then apply the same selected mode and coverage ledger.
