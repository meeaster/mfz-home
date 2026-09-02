# Session Brief artifact contract

Session Brief v2 is a mutable working view of one source parent session. The outer artifact remains harness-neutral. The compact checkpoint and authority locator rules branch by harness and adapter version.

## Frontmatter

Use this controlled shape:

```yaml
---
kind: session-brief
state_version: 2
title: <source title>
source:
  harness: opencode
  session_id: ses_parent
  kind: sqlite-store
  locator: <safe stable path, alias, or null>
  fingerprint: <source identity or null>
  adapter_version: 2
  session_created_at: <ISO timestamp or null>
  project: <project or null>
  directory: <safe directory or null>
brief:
  created_at: <ISO timestamp>
  updated_at: <ISO timestamp>
  source_activity_at_pin: active
  evidence_state_at_pin: accepted
  post_pin_movement: not-observed
coverage:
  mode: reconstruct
  complete_through: seq:4
  complete: true
  gaps: []
  exclusions: []
extraction:
  adapter_state_json: |-
    {"adapter":"opencode-session-evidence","version":2,"source":{"identity":"123:456","database":"/safe/opencode.db","schema":"v2"},"parent_session_id":"ses_parent","known_child_ids":[],"topology_guard":"sha256:0000000000000000000000000000000000000000000000000000000000000000","sessions":{"ses_parent":{"terminal_seq":4,"message_count":4,"max_message_updated":40,"session_updated":50,"latest_completed_compaction_seq":3,"active_context_start_seq":3,"prefix_guard":"sha256:0000000000000000000000000000000000000000000000000000000000000000","metadata_guard":"sha256:0000000000000000000000000000000000000000000000000000000000000000","fork_provenance":null}},"event_watermarks":{"ses_parent":9},"inbox_watermarks":{"ses_parent":5}}
  guards:
    overall: accepted
    sessions:
      ses_parent:
        status: accepted
  compactions: []
  children: []
  nonterminal: []
  final_message: null
  final_part: null
---
```

`kind` is `session-brief` and `state_version` is `2`. `source.harness` and `source.session_id` are required. OpenCode requires `source.adapter_version: 2`; another harness uses its own adapter version.

`brief.source_activity_at_pin` is `active`, `quiescent`, or `missing`. `brief.evidence_state_at_pin` is `accepted`, `partially-accepted`, or `rejected`. `brief.post_pin_movement` is `not-observed`, `detected`, or `unknown`. Activity at the boundary and movement after it are independent.

`coverage.mode` is `reconstruct`, `delta`, or `full-rebuild`. `coverage.complete` is boolean. `coverage.gaps` is always a list. Detected or unknown movement requires a visible gap and incomplete coverage. `coverage.exclusions` lists privacy or scope exclusions.

## Checkpoint state

`extraction.adapter_state_json` is an actual YAML `|-` block with one line of compact standard JSON. It is the only generic source, topology, position, and prefix-guard payload in the brief.

For OpenCode adapter version 2, the JSON is the exact top-level `checkpoint` returned by the evidence adapter. It contains:

- adapter name and version;
- source identity, database path, and `v2` schema marker;
- parent ID, known direct-child IDs, and topology guard;
- per-session terminal sequence, message count, maximum message update, session update, latest completed compaction, active-context start, prefix guard, metadata guard, and fork provenance;
- optional event and inbox watermarks with their actual durability semantics.

The parent is not a known child. Session keys exactly match the parent plus known children. `active_context_start_seq` matches the latest completed compaction sequence. Structural guards use `sha256:<64-hex>`.

Any missing, malformed, legacy, or unsupported OpenCode checkpoint is invalid for incremental refresh. Rebuild from a full V2 snapshot without converting the old state. Preserve valid narrative, original creation time, and useful extraction history.

Other harnesses store their native JSON checkpoint. They use the shared frontmatter and guard truth table without OpenCode fields.

Transport every accepted OpenCode checkpoint with:

```bash
python3 <skill-dir>/scripts/set-adapter-state.py <brief-path> <adapter-output-path>
```

The helper requires one top-level `extraction:` declaration, one adjacent `  adapter_state_json: |-` marker, and one four-space-indented content line. It reads only top-level `checkpoint`, rejects duplicate or malformed controlled keys, refuses symlinks and invalid UTF-8, preserves unrelated bytes and the final newline, skips byte-equal writes, and atomically replaces changed files. Run the validator after transport.

## Controlled keys

The validator rejects unknown keys at controlled mappings. Top-level keys are `kind`, `state_version`, optional `title`, `source`, `brief`, `coverage`, and `extraction`.

`source` permits `harness`, `session_id`, `kind`, `locator`, `fingerprint`, `adapter_version`, `session_created_at`, `project`, and `directory`. `brief` permits timestamps and the three boundary states. `coverage` permits mode, boundary, completeness, gaps, and exclusions.

`extraction` permits `adapter_state_json`, `guards`, `compactions`, `children`, `nonterminal`, `final_message`, and `final_part`. Guard records carry acceptance plus optional reason or locator. Descriptive records remain flat and scalar. This prevents checkpoint maps from appearing outside the controlled JSON block.

## Acceptance truth table

- Overall acceptance is valid only when every scoped session guard is accepted.
- Any rejected session makes overall acceptance rejected, requires a visible reason or gap, and makes coverage incomplete.
- Partial acceptance requires both accepted and rejected sessions, overall rejection, a visible gap, and incomplete coverage.
- Accepted evidence requires all boundary guards accepted. It may coexist with post-boundary movement.
- Complete coverage requires accepted evidence, accepted guards, no visible gaps, and `post_pin_movement: not-observed`.
- A missing parent requires a rejected parent guard, rejected evidence, a visible gap, and incomplete coverage.

## Narrative and authority

The body has non-empty exact level-2 sections `## Purpose And Context`, `## Current State`, and `## Extraction History`. Add other sections only when they help the cold consumer.

Every logical item under `## Decisions` or `## Corrections And Preferences` is a list item with direct parent authority. OpenCode uses:

```text
[source: parent/session=ses_parent;seq=12;message=msg_user]
[source: parent/session=ses_parent;seq=12;message=msg_user;content=content_id]
[source: parent/session=ses_parent;seq=12;message=msg_user;content-index=0]
```

Another harness uses its native parent locator, such as a file and offset. The validator applies the locator syntax for the declared harness. Post-write inspection resolves each locator and verifies a human or user message. Child prompts and reports do not establish human acceptance.

Useful optional sections include `Timeline`, `Research And Findings`, `Implementation`, `Validation`, `Child Sessions`, `Unresolved Questions`, `Context For A Future Agent`, and `Evidence Index`. `Extraction History` contains one concise entry per creation, accepted delta, no-op, or full rebuild.

Exclude transcript copies, secrets, reasoning bodies, broad tool output, and unapproved paths.

## Refresh invariants

- Source harness plus session ID is artifact identity.
- OpenCode creation and rebuild use one full snapshot. Valid refresh uses one delta from the exact stored checkpoint.
- Apply only an accepted append-only delta. A rebuild response contributes no incremental evidence.
- A verified no-op preserves narrative and still transports the returned checkpoint and appends one history entry.
- Preserve original `brief.created_at` and useful history during rebuild.
- Keep post-boundary movement and rejected guards visible.
- Promotion into another durable form requires separate user authority.
