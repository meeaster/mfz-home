## Why

`agent-sessions` still centers OpenCode V1 tables and Bundle state even though this home supports only OpenCode V2. The active `session-brief` workflow consumes that V1 contract, so both skills must move together to avoid broken refreshes and misleading analysis.

## What Changes

- **BREAKING** Remove OpenCode V1 table detection, queries, adapters, CLI guidance, fixtures, and runtime support from `agent-sessions`.
- Make `session_v2`, `session_message`, and related V2 state the only SQLite contract for OpenCode session analysis.
- Resolve an explicit V2 SQLite path and open it read-only with live WAL state visible. Use the authenticated V2 API when the path or backend is unknown.
- Keep adaptive bounded SQL and API analysis for one-off archaeology. Replace the V1 Bundle with a narrow deterministic V2 snapshot and checkpoint adapter for refreshable consumers.
- Require conservative rebuild when an existing projected message, topology, or validated prefix changes because V2 does not persist a complete mutation stream by default.
- Make the cost calculator V2-only while preserving recursive descendant attribution and current-catalog pricing.
- Migrate OpenCode Session Brief creation and refresh to the V2 checkpoint and message-content locator contract.
- Preserve Session Brief `state_version: 2` and non-OpenCode behavior. Reject old OpenCode Bundle checkpoints and rebuild from V2 evidence without converting V1 cursor state.
- Preserve historical authoring logs and disabled archives as history rather than active compatibility behavior.

## Capabilities

### New Capabilities

- `opencode-v2-session-evidence`: Locate, inspect, reconstruct, refresh, and price OpenCode V2 sessions through bounded read-only SQLite or authenticated API evidence.
- `opencode-v2-session-brief`: Create and refresh OpenCode Session Briefs from deterministic V2 snapshots and checkpoints without changing non-OpenCode artifact behavior.

### Modified Capabilities

None.

## Impact

- Rewrites `skills/active/agent-sessions/`, its Python adapters, focused tests, and complete authoring record.
- Rewrites the OpenCode acquisition, checkpoint, locator, validator, and helper paths under `skills/active/session-brief/`, with corresponding tests and authoring records.
- Removes active dependencies on `session`, `message`, `part`, `opencode db path`, V1 Bundle, four-stream cursors, part locators, prefix fingerprints, and dual-schema cost detection.
- Existing OpenCode Session Brief checkpoint state cannot refresh incrementally. The first V2 refresh performs a full rebuild while preserving valid narrative and brief-owned history where the artifact contract permits it.
- Claude Code and other non-OpenCode session analysis remain supported through their existing harness branches.
