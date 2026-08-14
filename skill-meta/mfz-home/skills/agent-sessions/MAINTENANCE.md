# Maintenance

## Dependencies

The runtime skill has harness-specific disclosed references. OpenCode V2
archaeology additionally requires a running `opencode2` service and its `api`
command. OpenCode V1 structural extraction additionally requires Python 3 with
the standard-library `sqlite3` module and a SQLite store compatible with the live schema checks in
`scripts/opencode-session-evidence.py`. OpenCode cost estimation additionally
uses standard-library `urllib`, `decimal`, and `hashlib` with either the live
`https://models.dev/api.json` endpoint or a bounded local snapshot. Claude Code
extraction uses `jq` against live JSONL layouts.

OpenCode Bundle state is generic: it stores the source identity, parent ID,
known child IDs, four cursors, counts, and terminal identities per session. A
refresh also stores `sha256` prefix fingerprints for the message-created and
part-created streams. It compares those historical creation prefixes and
terminal identities before advancing state. Every fingerprint must correspond to
the creation cursor in its emitted state entry; incomplete initial state uses
the starter-prefix fingerprint. Do not add artifact-specific fields to that
state or to the extractor output contract.

The cost calculator is current-price estimation, not stored billing authority.
It prices each `step-finish` from the joined assistant message model, recursively
includes descendants, uses exact provider/model keys or an explicit OpenCode
model-mode suffix, and fails when a consumed required token category lacks
published pricing. Exact catalog models take precedence over explicit synthetic
mode IDs; context tiers and legacy over-200K rates are applied per turn;
optional cache rates default to zero and explicit reasoning rates override the
output-rate fallback. Preserve local-catalog SHA-256 metadata for reproducible
evaluations; the live endpoint is unversioned.

Dependent skills may rely on the shared mode, coverage, topology, locator, and
cursor semantics. They must retain their own synthesis, storage, merge, privacy,
authority, and lifecycle behavior.

## Change Procedure

1. Read the runtime package and authoring record.
2. Classify the change as invocation, common coverage semantics, analysis,
   OpenCode adaptation, Claude Code adaptation, or deterministic extraction.
3. Inspect known dependent skills before changing shared evidence or cursor
   semantics.
4. Confirm current harness storage shapes from live or fixture evidence. For
   OpenCode, check V2 service API availability before selecting the V1 SQLite
   adapter.
5. Make the smallest change and update affected evaluation scenarios.
6. Run the extractor against a fixture and a read-only live store when available.
7. Verify positive and adjacent-negative invocation when the description changes.
8. Record consequential decisions or reversals in `LOG.md`.

## Efficiency Review

Measure efficiency by evidence obtained per record body read, not by minimizing
coverage. Prefer one multi-session Bundle transaction, aggregate queries, keyset
pages, bounded previews, selective child traversal, and reasoning exclusion.
Model-driven reconstruction uses the reconstruction view directly; surrounding
Outline calls, result-shape probes, and repeated grouped structural queries are
defects. Normal use executes bundled scripts without reading their source. Narrow
tool investigation follows the known ID rather than selecting a recent window.
The deterministic `tool-context` branch owns that exact tool/request read and
must remain single-transaction, dual-pinned, multipart-aware, and body-bounded.
Bundle must traverse every Delta page to its pin, merge independent observations,
check historical prefixes and terminal identities, and fail on per-record or
total-output ceilings rather than silently omitting coverage. Direct-child
discovery must be SQL-bounded and avoid oversized metadata `IN` lists. Investigate
large repeated query sequences or output truncation as skill defects before
adding more prose.

## Schema Drift

The OpenCode extractor must fail with a precise missing-table or missing-column
message rather than guessing. Update its schema assumptions only after inspecting
the new live schema and preserving read-only access. Claude Code instructions
must continue treating layout descriptions as maps to confirm, not guarantees.

## Verification

Static review confirms valid frontmatter, lowercase disclosed references, working
links, coherent package and authoring records, and no artifact-specific behavior
in the shared runtime. The fixture suite covers Locate, topology classification,
output-level structural privacy, Delta truncation signaling, consecutive
small-page refreshes with an intervening update, compaction fields, reasoning
exclusion, inclusive active-source pins, hard output limits, and schema failure.
It also covers initial parent-plus-child Bundle extraction, generic state no-op
refresh, missing known children with preserved state, compensated historical
replacement with a nonterminal in-prefix row and unchanged terminal/count,
strict malformed-state rejection including terminal identity shape, merged
creation/update observations including conflicting versions, complete `limit=1`
page traversal, canonical compacted parent metadata and record-size coverage,
default text-only privacy, per-stream and total-output ceilings, initial
requires-repin starter-state reuse, root output-option placement, and `--db`
after the subcommand. Reconstruction-view fixtures cover deduplication, selection
counts, task and non-completed tool filtering, truncation markers, explicit view
identity, and additive UTC ISO metadata. Grouped completed-tool locator fixtures
preserve exact part IDs without the verbose per-record projection. Tool-context
fixtures cover ownership, dual pins,
equal timestamps, multipart requests, post-target exclusion, content opt-in,
privacy, ceilings, option placement, wrong-role rejection, and ISO metadata. Cost
fixtures cover recursive topology, per-turn attribution, model changes, synthetic
mode IDs distinct from reasoning variants, context tiers, reasoning fallback and
explicit rates, cache categories, stored-cost comparison, missing pricing,
malformed JSON, null agents, deterministic local catalogs, and body exclusion.
The active-pin fixture mutates message and part rows between `limit=1` pages and
expects an unchanged-cursor re-pin response. A final-probe fixture deletes a
pinned row and expects bounded-count guard failure. Live-store checks cover
current OpenCode V1 schema compatibility and mutable running tools. V2
source-selection checks cover API-first routing, V2 metadata names, message
endpoints, pagination, reasoning exclusion, and the documented database fallback.
Reusable
local checks begin with:

```bash
python3 -m py_compile skills/active/agent-sessions/scripts/opencode-session-evidence.py
python3 skill-meta/mfz-home/skills/agent-sessions/test_opencode_session_evidence.py
python3 skills/active/agent-sessions/scripts/opencode-session-evidence.py --db <db> locate <query>
python3 skills/active/agent-sessions/scripts/opencode-session-evidence.py --db <db> outline <session-id>
python3 skills/active/agent-sessions/scripts/opencode-session-evidence.py --db <db> bundle <parent-id> --view reconstruction
python3 skills/active/agent-sessions/scripts/opencode-session-cost.py --db <db> --models-file <api.json> <session-id>
python3 skill-meta/mfz-home/skills/agent-sessions/test_opencode_session_cost.py
```

Live behavioral evaluation inspects the resulting session trace rather than
relying on the evaluated agent's self-report.
