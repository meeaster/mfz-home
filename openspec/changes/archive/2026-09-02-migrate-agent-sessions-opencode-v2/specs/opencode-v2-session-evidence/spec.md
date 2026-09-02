## Purpose

Defines bounded, read-only analysis and refresh evidence for current OpenCode V2 sessions without retaining OpenCode V1 storage or adapter behavior.

## ADDED Requirements

### Requirement: OpenCode analysis uses only the V2 storage contract
The system SHALL treat `session_v2` and `session_message` as the required projected OpenCode SQLite tables. It SHALL NOT query, detect, or route through OpenCode V1 `session`, `message`, or `part` tables.

#### Scenario: Valid V2 database
- **WHEN** the selected SQLite database contains the required V2 tables and columns
- **THEN** the system analyzes the requested session with V2 ordering, topology, message, and usage semantics

#### Scenario: Database lacks the V2 contract
- **WHEN** the selected SQLite database lacks a required V2 table or column
- **THEN** the system reports an unsupported or invalid V2 source without attempting a V1 fallback

#### Scenario: Legacy tables coexist with V2 tables
- **WHEN** a valid V2 database also contains legacy table names
- **THEN** the system ignores the legacy tables and uses only the V2 contract

### Requirement: SQLite access is explicit and read-only
The system SHALL resolve an explicit database path, `OPENCODE_DB`, or the current V2 channel path before opening SQLite. It SHALL open the database in read-only mode with live WAL and SHM files visible and SHALL NOT invoke an OpenCode database command that can migrate or mutate the store.

#### Scenario: Explicit database path
- **WHEN** the caller supplies an absolute SQLite path
- **THEN** the system opens that path with `mode=ro` and validates the V2 schema before reading session evidence

#### Scenario: Active WAL database
- **WHEN** the selected database has live WAL or SHM state
- **THEN** the system reads with those sidecars visible and does not use immutable mode

#### Scenario: Database path is unknown
- **WHEN** the active database path or backend cannot be established safely
- **THEN** the system uses the authenticated OpenCode V2 service API or reports the access gap instead of guessing a filesystem path

### Requirement: Analysis is bounded by the requested mode
The system SHALL support locate, outline, investigate, reconstruct, audit, delta, and cost intents through the least expensive evidence path that satisfies the requested coverage. Adaptive analysis SHALL use bounded V2 SQL or authenticated API queries rather than forcing every request through a fixed snapshot adapter.

#### Scenario: Bounded investigation
- **WHEN** the caller asks one question about a known session
- **THEN** the system reads only the metadata, messages, content items, children, or state that can change the answer

#### Scenario: Reconstruction across compaction
- **WHEN** relevant work crosses one or more completed compactions
- **THEN** the system distinguishes all durable history from active context and reconstructs the smallest relevant phase in `session_message.seq` order

#### Scenario: Exhaustive audit
- **WHEN** the caller requests complete scoped coverage
- **THEN** the system pins or transacts the requested scope, reports movement and exclusions, and does not present sampled evidence as complete

### Requirement: Evidence preserves V2 identity and privacy
The system SHALL identify transcript evidence by session ID, message sequence, message ID, and content identity or index when needed. It SHALL count or locate reasoning records without reading or returning reasoning bodies and SHALL bound user, assistant, and tool content to the approved question.

#### Scenario: Assistant content inspection
- **WHEN** assistant content is material to the question
- **THEN** the system projects only the required non-reasoning content items and preserves their owning session, sequence, and message locators

#### Scenario: Reasoning records exist
- **WHEN** assistant messages contain reasoning items
- **THEN** the system reports their counts or locators without selecting or exposing their text

### Requirement: Topology distinguishes children from forks
The system SHALL use `parent_id` for session ancestry and SHALL represent fork provenance separately through the V2 fork fields. Recursive descendant analysis SHALL be cycle-guarded and SHALL NOT treat a fork as a child unless the stored parent relationship says so.

#### Scenario: Direct child exists
- **WHEN** a session row names the requested parent through `parent_id`
- **THEN** the system includes it in direct-child topology and may traverse it within the requested descendant scope

#### Scenario: Fork exists
- **WHEN** a session records fork provenance without a parent relationship
- **THEN** the system reports the fork source and boundary separately from child topology

### Requirement: Refreshable consumers receive deterministic V2 checkpoints
The system SHALL provide deterministic V2 snapshot and delta operations for refreshable consumers. A checkpoint SHALL identify the source, parent, known direct children, per-session terminal sequence and count, relevant update and compaction state, topology, and a structural guard over the validated projected prefix.

#### Scenario: Initial snapshot
- **WHEN** a refreshable consumer has no valid V2 checkpoint
- **THEN** the adapter returns one stable parent-and-direct-child snapshot, coverage and movement state, and a new V2 checkpoint

#### Scenario: Pure append
- **WHEN** the prior source, topology, and projected prefix remain valid and messages were appended after each terminal sequence
- **THEN** the adapter returns the bounded appended evidence and advances the checkpoint

#### Scenario: Existing projection changed
- **WHEN** an earlier message, content status, topology, or validated projected prefix changed or disappeared
- **THEN** the adapter returns `rebuild_required` and does not claim a complete incremental delta

#### Scenario: Active source moves during acquisition
- **WHEN** the requested session changes beyond the accepted snapshot boundary
- **THEN** the adapter exposes post-snapshot movement as a coverage gap rather than mixing evidence from different boundaries

### Requirement: Checkpoints do not depend on durable event payloads
The system SHALL NOT require persisted V2 event payloads for correct offline refresh because event persistence is optional and some projection changes lack a complete retained mutation stream. Event and inbox evidence MAY supplement a snapshot when available but SHALL retain their actual durability semantics.

#### Scenario: Event persistence is disabled
- **WHEN** `event_sequence` advances but durable event payloads are unavailable
- **THEN** the adapter uses projected-state validation and requires rebuild for unsupported mutation rather than inferring a complete event delta

#### Scenario: Event evidence is available
- **WHEN** retained events or inbox rows clarify current activity
- **THEN** the system reports them as supplemental evidence without replacing projected-prefix validation

### Requirement: Cost analysis is V2-only and body-free
The cost calculator SHALL recursively traverse V2 descendants, attribute each complete assistant usage record to its stored provider, model, and variant, and calculate current-catalog estimates without reading transcript, tool, or reasoning bodies.

#### Scenario: Mixed-model descendant tree
- **WHEN** a root and its descendants contain complete V2 usage from multiple models
- **THEN** the calculator reports per-session, per-model, and total token and current-price estimates with cycle guarding

#### Scenario: Incomplete assistant usage
- **WHEN** a persisted assistant record contains partial usage that cannot be priced safely
- **THEN** the calculator reports the validation failure instead of silently undercounting it
