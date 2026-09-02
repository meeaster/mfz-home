## Purpose

Defines creation and refresh behavior for OpenCode Session Briefs backed by deterministic V2 evidence while preserving the shared non-OpenCode artifact contract.

## ADDED Requirements

### Requirement: OpenCode briefs use a versioned V2 checkpoint
An OpenCode Session Brief SHALL store an exact, compact, versioned V2 checkpoint produced by the V2 evidence adapter. The shared Session Brief artifact SHALL retain `state_version: 2`, and the validator SHALL select checkpoint rules by harness and adapter version.

#### Scenario: New OpenCode brief
- **WHEN** a brief is created from an accepted V2 snapshot
- **THEN** it stores the exact V2 checkpoint and separate brief-owned activity, evidence, movement, guard, and coverage decisions

#### Scenario: Non-OpenCode brief
- **WHEN** the source harness is Claude Code or another supported adapter
- **THEN** the validator preserves the existing shared artifact contract without applying OpenCode checkpoint fields

### Requirement: Legacy OpenCode checkpoints rebuild without conversion
The workflow SHALL NOT translate V1 Bundle cursors, part state, terminal identities, or prefix fingerprints into V2 checkpoint state. An OpenCode brief with missing, malformed, unsupported, or legacy adapter state SHALL perform a full V2 evidence rebuild before it can refresh.

#### Scenario: Existing V1 Bundle checkpoint
- **WHEN** an OpenCode brief contains the previous Bundle checkpoint shape
- **THEN** the workflow preserves valid narrative and brief-owned history where allowed, discards the incompatible checkpoint for acquisition, and rebuilds from an empty V2 checkpoint

#### Scenario: Unsupported checkpoint version
- **WHEN** an OpenCode brief contains an unknown adapter version
- **THEN** validation rejects incremental refresh and reports that a full supported rebuild is required

### Requirement: Brief refresh follows adapter coverage
The Session Brief workflow SHALL accept a V2 snapshot or delta only when the adapter reports valid source and checkpoint guards. It SHALL preserve visible movement, mutation, truncation, missing-child, and rebuild gaps rather than smoothing them into complete coverage.

#### Scenario: No-op refresh
- **WHEN** the V2 delta validates the prior checkpoint and returns no material evidence or topology changes
- **THEN** the workflow preserves the narrative, advances the exact checkpoint when needed, and records one concise no-op extraction entry

#### Scenario: Material append refresh
- **WHEN** the adapter returns accepted appended evidence and an advanced checkpoint
- **THEN** the workflow merges only material decisions, findings, work, validation, and unresolved state into their semantic sections

#### Scenario: Adapter requires rebuild
- **WHEN** the adapter reports an existing projection, topology, or prefix change
- **THEN** the workflow performs a full V2 rebuild or leaves a visible incomplete gap and SHALL NOT apply the rejected delta

### Requirement: OpenCode brief locators use V2 message identity
OpenCode evidence and parent-authority locators SHALL use V2 session, message sequence, message ID, and content identity or index as required. New OpenCode briefs SHALL NOT require V1 part IDs.

#### Scenario: Parent user decision
- **WHEN** a decision or correction is attributed to the parent user
- **THEN** the brief records a locator that resolves to a parent V2 user message in the accepted snapshot

#### Scenario: Child evidence contribution
- **WHEN** a child session supports a finding without establishing user authority
- **THEN** the brief records the child session and message locator under findings, implementation, or child contributions rather than treating it as a parent decision

#### Scenario: Non-OpenCode authority locator
- **WHEN** a non-OpenCode harness uses file, record, offset, or adapter-specific identity
- **THEN** validation applies that harness's locator contract instead of requiring an OpenCode message or part prefix

### Requirement: Checkpoint transport is exact and bounded
The workflow SHALL transport adapter checkpoint JSON through a controlled helper that reads only the expected top-level checkpoint field, serializes it compactly, and replaces only the controlled artifact block. The model SHALL NOT hand-edit checkpoint JSON.

#### Scenario: Valid adapter output
- **WHEN** the helper receives a valid V2 adapter envelope and a regular UTF-8 brief
- **THEN** it injects the exact compact checkpoint while preserving all other artifact bytes and the final newline

#### Scenario: Invalid transport target
- **WHEN** the brief is a symlink, contains ambiguous checkpoint markers, or the adapter envelope lacks the expected checkpoint
- **THEN** the helper fails without modifying the artifact

### Requirement: Briefs exclude transcript and reasoning bodies
An OpenCode Session Brief SHALL remain a current working view rather than a transcript, event log, or raw evidence store. It SHALL exclude reasoning bodies, secrets, broad tool output, and source text that is not required for continuation or verification.

#### Scenario: Large source history
- **WHEN** the source session contains extensive pre-compaction history and child evidence
- **THEN** the brief synthesizes only continuation-relevant meaning and preserves exact recovery locators for omitted detail

### Requirement: Refresh state remains reusable
After each accepted creation, delta, no-op, or full rebuild, the Session Brief SHALL contain one valid checkpoint that can drive the next V2 refresh and one concise extraction-history entry that states the mode, boundary, and material change.

#### Scenario: Successful refresh
- **WHEN** the workflow completes checkpoint transport and artifact validation
- **THEN** a later refresh can use the stored checkpoint without rereading unrelated historical evidence
