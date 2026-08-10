# Session Brief Artifact Contract

Session Brief v2 is a mutable, evidence-backed working view of one source
parent session. The artifact distinguishes what the source was doing at the
pin, what evidence was accepted at that pin, and what moved after the pin.

## Frontmatter

Use this controlled YAML shape. The validator intentionally supports only this
small shape; it is not a general YAML implementation.

```yaml
---
kind: session-brief
state_version: 2
title: <human-readable source title>
source:
  harness: opencode
  session_id: ses_parent
  kind: sqlite-store
  locator: <privacy-approved stable path, alias, or null>
  fingerprint: <adapter identity or null>
  adapter_version: <adapter version or null>
  session_created_at: <ISO timestamp or null>
  project: <project or null>
  directory: <safe source directory or null>
brief:
  created_at: <ISO timestamp>
  updated_at: <ISO timestamp>
  source_activity_at_pin: active
  evidence_state_at_pin: accepted
  post_pin_movement: not-observed
coverage:
  mode: reconstruct
  complete_through: <ISO timestamp or source locator>
  complete: true
  gaps: []
  exclusions: []
extraction:
  adapter_state_json: |-
    {"version":1,"source_identity":"123:456","parent_session_id":"ses_parent","known_child_ids":["ses_child"],"sessions":{"ses_parent":{"cursors":{"message_created":{"time":100,"id":"msg_parent"},"message_updated":{"time":100,"id":"msg_parent"},"part_created":{"time":101,"id":"prt_parent"},"part_updated":{"time":101,"id":"prt_parent"}},"counts":{"messages":1,"parts":1},"terminal_identities":{"message_created":"msg_parent","message_updated":"msg_parent","part_created":"prt_parent","part_updated":"prt_parent"},"prefix_fingerprints":{"message_created":"sha256:0000000000000000000000000000000000000000000000000000000000000000","part_created":"sha256:0000000000000000000000000000000000000000000000000000000000000000"}},"ses_child":{"cursors":{"message_created":{"time":0,"id":""},"message_updated":{"time":0,"id":""},"part_created":{"time":0,"id":""},"part_updated":{"time":0,"id":""}},"counts":{"messages":0,"parts":0},"terminal_identities":{"message_created":null,"message_updated":null,"part_created":null,"part_updated":null},"prefix_fingerprints":{"message_created":"sha256:0000000000000000000000000000000000000000000000000000000000000000","part_created":"sha256:0000000000000000000000000000000000000000000000000000000000000000"}}}}
  guards:
    overall: accepted
    sessions:
      ses_parent:
        status: accepted
      ses_child:
        status: accepted
  compactions: []
  children: []
  nonterminal: []
  final_message: null
  final_part: null
---
```

`kind` is `session-brief` and the artifact `state_version` is exactly `2`.
The source harness and `source.session_id` are required. `source_activity_at_pin`
is the observed source state at the pinned boundary: `active`, `quiescent`, or
`missing`. `evidence_state_at_pin` is the Session Brief acceptance result at that
boundary: `accepted`, `partially-accepted`, or `rejected`. `post_pin_movement`
describes only movement observed after the boundary: `not-observed`, `detected`,
or `unknown`. An active source can therefore have an accepted, consistent pin;
activity is not movement.

For OpenCode Bundle, a non-current source with no reported post-pin gap uses
`not-observed`; the mere possibility of a future write does not make movement
`unknown`. A reported post-pin mutation uses `detected`. Reserve `unknown` for an
adapter that cannot establish a bounded consistency result. The currently
executing OpenCode parent always uses `detected` because Bundle completion and
subsequent artifact work necessarily move it after the pin.

`coverage.mode` is `reconstruct`, `delta`, or `full-rebuild`. `coverage.complete`
is boolean, and `coverage.gaps` is always a list. A detected or unknown
post-pin movement has a visible coverage gap and cannot claim complete coverage.
`coverage.exclusions` is an optional list of privacy or scope exclusions.
Gap entries may remain concise strings or use structured maps with documented
`kind`, `reason`, `locator`, `message`, `type`, `stream`, `session_id`, and
`action` fields. Values under those fields are scalar or null; nested mappings
and lists are not gap field values.

`extraction.adapter_state_json` must be an actual YAML `|-` block containing the
exact compact JSON returned by the adapter as `next_state`. Extract it as text
and, on refresh, pass it as `--state-json '<exact-json>'`; if a temporary file is
used for that input transport, substitute its exact content into the argument.
Bundle does not accept a state-file path. Do not parse the stored state into YAML
or manually serialize it again.
Compactness forbids whitespace outside JSON strings but permits raw Unicode and
legal alternate escapes. Standard JSON constants only are accepted. The JSON is
the sole generic cursor and source-guard payload in the brief.

For Bundle output, inject that state with the stdlib-only helper rather than
manually transporting JSON:

```bash
python3 <skill-dir>/scripts/set-adapter-state.py <brief-path> <bundle-output-path>
```

The helper requires exactly one top-level `extraction:` declaration and one
nested `  adapter_state_json: |-` line in frontmatter, immediately adjacent, with
exact formatting and exactly one four-space-indented content line. It detects
malformed, duplicated, commented, alternate-marker, and wrongly indented
declarations before writing. It also refuses a symlink brief path and a
non-UTF-8 brief. It reads only top-level `.next_state`, preserves insertion order,
serializes it with `json.dumps(..., separators=(",", ":"))`, and replaces only
that content line. It reports exact equality as `unchanged` and atomically writes
changed briefs in the same directory while preserving all other bytes and the
final newline. This is transport integrity, not semantic validation; run the
validator after it on every Bundle result, including a verified no-op. Keep
retained OpenCode Bundle output in harness-managed output or outside the artifact
destination only until the helper has consumed it. Adapter JSON is never copied,
pasted, retyped, patched, regex-replaced, or hand-edited.

For OpenCode, the current valid nested Bundle state has `version: 1` even though
the Session Brief artifact has `state_version: 2`. It contains `source_identity`, `parent_session_id`,
`known_child_ids`, and `sessions`. Each session entry contains exactly the four
cursor objects `message_created`, `message_updated`, `part_created`, and
`part_updated`, `counts.messages` and `counts.parts`, all four matching
`terminal_identities`, and `prefix_fingerprints.message_created` and
`prefix_fingerprints.part_created` in `sha256:<64-hex>` form. The parent is not a
known child, and the session keys are exactly the parent plus known children.

`extraction.guards` is brief-owned acceptance, not adapter state. It has an
overall `accepted` or `rejected` result and one such status for every scoped
session. Overall `accepted` means every scoped status is `accepted`; overall
`rejected` means at least one scoped status is `rejected`. Every rejected scoped
status carries a visible `reason` or `locator`, and rejected evidence exposes a
coverage gap or rejection reason. These statuses are not passed back to Bundle.
Do not duplicate cursor, count, terminal, prefix, source-identity, parent,
known-child, or session maps elsewhere in frontmatter.

Other harnesses may store a harness-specific JSON object in
`adapter_state_json`; they do not have to use the OpenCode four-stream shape.
They still use the v2 frontmatter, brief-owned guards, and source session guard.

## Controlled Keys

The validator rejects unknown keys at every controlled mapping. The top-level
keys are `kind`, `state_version`, optional `title`, `source`, `brief`, `coverage`,
and `extraction`. `source` permits `harness`, `session_id`, `kind`, `locator`,
`fingerprint`, `adapter_version`, `session_created_at`, `project`, and
`directory`; only `harness` and `session_id` are required. `brief` permits its
five timestamp and pin-state fields. `coverage` permits `mode`, optional
`complete_through`, `complete`, `gaps`, and optional `exclusions`.

`extraction` permits `adapter_state_json`, `guards`, optional `compactions`,
`children`, `nonterminal`, `final_message`, and `final_part`. Guard mappings
permit only `overall`, optional `reason` and `locator`, and `sessions`; each
scoped guard permits only `status`, optional `reason`, and optional `locator`.
Guard `reason` and `locator` values are strings or null. Descriptive extraction
records may use only bounded identity, locator, timestamp, type, status, state,
title, update, and compaction-tail fields, with scalar or null values. Final
record maps use the same flat shape. This keeps
generic Bundle state out of every frontmatter mapping outside the JSON block.

## Narrative

The body must contain non-empty exact level-2 `## Purpose And Context`,
`## Current State`, and `## Extraction History` sections. The validator permits
level-2 `Decisions` and `Corrections And Preferences` to be omitted or empty.
When either section has content, all nonblank semantic content must be unordered
or numbered logical list items. Ordinary indented Markdown continuations belong
to the preceding item, including across a blank line; unindented prose after a
blank starts no continuation. Every logical item must contain a direct
parent-session evidence locator. Supplemental child locators may appear in the
same item but cannot replace the parent locator:

```text
[source: parent/msg_x]
[source: parent/prt_x]
```

For example:

```markdown
## Decisions
- The parent user accepted the smaller refresh scope. [source: parent/msg_123]
```

The validator checks this locator syntax only. Post-write inspection must resolve
each locator in the accepted pinned parent evidence and verify that it is a human
or user turn; that authority cannot be inferred from Markdown text. The locator
must point to a parent `msg_` or `prt_` message or part. A child task prompt is
delegated direction from the parent assistant, even when the child transcript
represents it as `role=user`; it is not human authority. Child reports can
support findings, proposals, and implementation evidence, but cannot alone
establish an accepted user decision. If only child evidence survived, place the
direction under `Child Sessions`, `Research And Findings`, or `Implementation`
with an explicit authority caveat rather than under `Decisions`. Tool or
implementation success proves an observed action or outcome, not user
acceptance of broader direction.

Use content-shaped depth for the remaining sections:

- `Timeline`: phases and consequential turns.
- `Research And Findings`: learned facts, source limits, and effects.
- `Decisions`: accepted direction with direct parent authority.
- `Corrections And Preferences`: user overrides, rejected framings, and durable
  boundaries with direct parent authority.
- `Implementation`: observed work, changed artifacts, and design consequences.
- `Validation`: checks, outcomes, and untested surfaces.
- `Child Sessions`: child purpose, result, parent use, and authority caveats.
- `Unresolved Questions`: remaining decisions or evidence.
- `Context For A Future Agent`: minimum context and exact recovery locators.
- `Evidence Index`: consequential locators not already clear inline.
- `Extraction History`: one concise entry per create, Delta refresh, or rebuild.

Do not store transcript text, secrets, reasoning bodies, unapproved local paths,
or exhaustive tool output.

## Acceptance Truth Table

- `guards.overall: accepted` is valid only when every scoped session guard is
  `accepted`; `rejected` is valid only when at least one scoped guard is
  `rejected`.
- Every rejected scoped guard has a `reason` or `locator`, makes the overall
  guard rejected, exposes a visible gap or rejection reason, makes coverage
  incomplete, and prevents `evidence_state_at_pin: accepted`.
- `evidence_state_at_pin: accepted` requires all pin guards accepted. It may
  coexist with detected or unknown post-pin movement because that movement is
  after the accepted boundary.
- `evidence_state_at_pin: partially-accepted` requires both accepted and rejected
  scoped guards, overall rejection, a visible gap, and incomplete coverage.
- `evidence_state_at_pin: rejected` requires overall rejection, a visible gap or
  rejection reason, and incomplete coverage.
- `coverage.complete: true` requires accepted evidence, accepted guards,
  `post_pin_movement: not-observed`, and no visible gaps. Any visible gap or
  detected or unknown movement makes coverage incomplete.
- `source_activity_at_pin: missing` requires a rejected parent guard, rejected
  overall and evidence states, a visible gap, and incomplete coverage.
- A post-pin movement gap alone does not reject guards or evidence at the pin.

## Refresh Invariants

- Source harness plus session ID is the artifact identity.
- Creation and explicit rebuild start Bundle with no prior state. A refresh
  extracts the stored `adapter_state_json` text exactly and passes it through
  `--state-json '<exact-json>'`; a temporary file is only a transport source
  whose content must be substituted into that argument, never a Bundle path.
- For OpenCode, prefer one Agent Sessions Bundle call for the parent and direct
  children. Bundle owns generic source identity, topology, cursor, count,
  terminal, prefix, pagination, and pin guards. Session Brief owns acceptance,
  synthesis, storage, and lifecycle.
- One Bundle call replaces separate Outline, Delta, and topology calls for this
  workflow. Use targeted reads only for consequential evidence absent from the
  bounded Bundle previews, within the same privacy and pin boundary.
- A verified no-op Bundle refresh has complete incremental coverage for every
  session, four empty observation arrays per session, unchanged topology and
  descriptive ledgers, and no gaps. It does not need an interpretation child;
  preserve narrative and update only state, boundary fields, and history.
- A Session Brief `state_version: 1`, missing, malformed, or otherwise invalid
  stored state cannot drive Delta. Perform a full rebuild from empty state with
  no compatibility conversion, preserving the brief's original `created_at` and
  useful extraction history. A valid nested OpenCode Bundle `version: 1` is not a
  Session Brief `state_version: 1`.
- If the source is the currently executing OpenCode parent, do not launch the
  evidence Explore child. Bundle itself and any later work move the source after
  the pin; record `post_pin_movement: detected`, a visible movement gap, and
  `coverage.complete: false` (`unknown` is reserved for genuinely unobservable
  movement). The pin may retain accepted evidence and guards; movement after the
  pin is not a pin guard rejection.
- A Bundle gap, rejected brief guard, incomplete coverage, or post-pin movement
  remains visible and cannot be smoothed into a complete accepted snapshot.
- Promotion into a Practice, Session Capture, work unit, thread, issue, or spec is
  a separate user-authorized workflow.
