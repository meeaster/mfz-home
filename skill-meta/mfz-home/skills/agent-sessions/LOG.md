# Log

## 2026-08-08 - General Evidence Layer And Efficient Extraction

- Defined Locate, Outline, Investigate, Reconstruct, Audit, and Delta as distinct
  modes so narrow questions do not pay complete-audit cost.
- Replaced claim-centered sufficiency with a requested-deliverable coverage
  ledger and completion gate after a live Explore run returned an accurate but
  incomplete first report.
- Required incomplete post-compaction work to remain a checkpoint rather than a
  final answer.
- Separated harness-neutral workflow from lowercase disclosed OpenCode, Claude
  Code, and analysis references.
- Renamed the former `CLAUDE.md` reference to avoid treating a skill branch as
  directory-level agent instructions.
- Made SQLite archaeology strictly read-only; `opencode db path` locates the
  standard store, while queries use SQLite read-only URI mode.
- Added a deterministic OpenCode outline and delta extractor to replace repeated
  schema, count, topology, cursor, and mutable-state queries.
- Distinguished a resumed task invocation from a new child through the supplied
  `task_id` and persisted child-session metadata.
- Preserved separate message-created, message-updated, part-created, and
  part-updated cursors so incremental consumers can detect both append-only
  evidence and changed assistant or tool state.
- Made Delta structural and paginated by default, with content previews requiring
  explicit opt-in, hard per-record bounds, and a total output ceiling.
- Wrapped each extraction in one read transaction and advanced Delta cursors only
  through records actually scanned so concurrent writes cannot be skipped.
- Added inclusive upper bounds for all four OpenCode Delta streams so active
  sessions can be pinned consistently across separate paginated transactions.
- Added post-pin mutation detection because SQLite cannot reconstruct a prior row
  version; inconsistent pages now require re-pin and leave cursors unchanged.
- Added store identity and bounded-count guards so final probes also detect source
  replacement, deletion, or shrink without relying on update rows.
- Kept Session Brief and other artifact semantics outside Agent Sessions; this
  skill supplies evidence while dependent workflows own synthesis and lifecycle.

## 2026-08-08 - Multi-session Bundle

- Added one generic OpenCode Bundle call for a parent and its direct children to
  replace repeated Outline, Delta, and topology extraction calls.
- Defined reusable state as source identity, parent ID, known child IDs, and four
  per-session cursors with generic count, terminal-identity, and creation-prefix
  fingerprint guards; artifact-specific state remains outside the adapter.
- Pinned every existing session in one read-only transaction, traversed all
  Delta pages to each pin, and merged creation/update observations by ID and
  greatest `time_updated`.
- Kept text previews SQL-bounded by default, retained structural tool metadata,
  and made tool body previews an explicit bounded opt-in while continuing to
  exclude reasoning bodies.
- Preserved missing known children and incomplete pin states as visible gaps,
  and made per-record, per-collection, and total-output ceilings fail clearly
  instead of silently truncating complete coverage.
- Directed Session Brief and other dependent workflows to prefer Bundle for
  multi-session structural acquisition and reserve targeted reads for
  consequential tool evidence absent from the generic bundle.

## 2026-08-08 - Bundle State Guard Remediation

- Added historical creation-prefix count checks and per-stream terminal-identity
  existence checks, then added collision-resistant structural creation-prefix
  fingerprints so compensated nonterminal replacement cannot advance a refresh
  cursor without a rebuild-required gap.
- Made Bundle state strict: the parent cannot be a known child, `version` cannot
  be boolean, and all cursors must be `{time, id}` objects rather than string
  shortcuts; count, terminal-identity, and prefix-fingerprint guards are
  required per session, with nonempty cursor IDs matching non-null identities.
- SQL-bounded direct-child discovery and direct parent/child projections removed
  the unbounded child scan and metadata `IN` list.
- Made session metadata canonical under `sessions` and reduced topology to ID and
  status references, including parent compaction and size checks; strengthened
  fixtures for all four no-op streams, complete small-page traversal, conflicting
  merge versions, genuine nonterminal in-prefix replacement, malformed state,
  ceilings, missing-child state preservation, and option placement.

## 2026-08-08 - Incomplete Bundle State Fingerprint Fix

- Bound every emitted session prefix fingerprint to the creation cursor stored in
  that state entry: terminal prefixes for complete entries and starter prefixes
  for incomplete initial entries.
- Preserved prior state unchanged for incomplete refreshes and verified that an
  initial `requires_repin` state can be reused after transient movement settles
  without a false fingerprint regression.

## 2026-08-09 - Bundle Live Evaluation

- Ran Bundle read-only against OpenCode 1.18.15 for a historical parent and three
  direct children. One call traversed all internal pages and emitted complete
  initial evidence; exact `next_state` reuse returned zero observations and a
  stable state.
- Observed approximately 443 KB of bounded initial evidence and 18 KB for the
  same-source no-op with 500-character text previews and documented ceilings.
- Confirmed model-driven current-parent extraction uses one Bundle call and no
  interpretation child, while a historical full rebuild uses one Bundle plus one
  read-only interpretation child.
- Confirmed a one-character stored prefix-fingerprint corruption is rejected as a
  rebuild-required gap, then confirmed empty-state recovery and a subsequent
  exact-state no-op.
- Documented the bounded canonical invocation and exact ID-keyed result paths to
  avoid option guessing and repeated shape probes in dependent workflows.

## 2026-08-09 - End-to-End Efficiency And Cost Attribution

- Tested Locate, narrow running-tool investigation, and parent-plus-three-child
  reconstruction through fresh OpenCode sessions. Bundle acquisition worked, but
  reconstruction still repeated Outline, shape probes, grouped queries, and broad
  content reads; narrow investigation selected 35 recent parts instead of the
  known tool and request.
- Added a reconstruction Bundle view that preserves canonical structure and state
  while projecting deduplicated text plus task and non-completed tool evidence
  with explicit omission counts and truncation markers.
- Compressed routine completed-tool evidence into tool-grouped exact part IDs and
  added one pinned `tool-context` command for the exact tool, owning message, and
  nearest preceding multipart user request.
- A final aligned reconstruction trace removed Outline and Delta calls, broad
  SQLite exports, and task-file redirection, but exposed avoidable source reading,
  projection probes, and invalid content bounds; moved executable opacity to a
  hard boundary and documented one cross-session preview projection plus limits.
- Added additive UTC ISO metadata so ordinary reporting no longer needs shell date
  conversions, and made normal runtime use execute adapters without reading their
  implementation source.
- Made one reconstruction-view Bundle the complete structural pass and reserved
  exact-ID reads for consequential truncated content, followed by one state-reuse
  consistency call.
- Added a dependency-free OpenCode cost calculator that recursively traverses the
  requested session tree and prices each persisted step-finish against the exact
  assistant provider/model/variant using a bounded models.dev catalog.
- Preserved OpenCode's stored token normalization while applying current
  models.dev pricing semantics: non-cached input and cache categories remain
  separate, exact variant mode overrides and context rates are selected per turn,
  and reasoning uses an explicit catalog rate or falls back to output. Current
  catalog estimates remain distinct from stored cost and provider invoices.
