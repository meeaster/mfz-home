---
name: session-brief
description: Create or refresh a local Session Brief for one current or prior AI session so a human or agent can reuse what happened without rereading the transcript. Use when explicitly asked to extract a session into a refreshable working artifact or update an existing Session Brief. Do not use for a conversational summary, handoff, thread digest, work-unit checkpoint, Session Capture, or maintained Practice.
---

# Session Brief

A Session Brief is a mutable, evidence-backed working view of one source session.
It preserves the session's useful context and refresh position without promoting
that material into accepted guidance or an ongoing work container.

Load `agent-sessions` for evidence acquisition and `context-transfer` for the
artifact's consumer and destination contract. This skill owns the brief's form,
refresh merge, storage, acceptance, lifecycle, and validation. Follow the
OpenCode Bundle contract in the Agent Sessions reference when the source is
OpenCode.

## 1. Establish The Brief

Resolve the source harness and session from an explicit ID, title, current-session
request, project, or recency clue. Resolve the destination in this order:

1. Use a path selected by the user.
2. Use a destination declared by the current project.
3. Use `<workspace-root>/artifacts/session-briefs/` when applicable workspace
   guidance declares `artifacts/` as mutable output storage.
4. Ask one focused question when no destination is authoritative.

An explicit request to create or refresh a brief authorizes its local file and
missing destination directory. It does not authorize a commit, publication,
knowledge promotion, work-unit attachment, or source-session mutation.

Name a new brief `<title-slug>--<source-session-id>.md`. Find an existing brief by
its source harness and session ID rather than title alone; refresh that file even
if the source title changed.

**Done when:** one source session, destination, existing-or-new artifact, intended
consumer, and edit authority are explicit.

## 2. Pin The Evidence Scope

Use Agent Sessions Locate only when an explicit source ID is not already known.
For OpenCode, use one Bundle call for the parent and its direct children; do not
run separate Outline, Delta, or topology calls for this workflow. Creation and
explicit full rebuild call Bundle once with no prior state. A refresh with valid
v2 state extracts the exact `extraction.adapter_state_json` text and passes it
as `--state-json '<exact-json>'`. If a temporary file is used for transport,
substitute its exact content into that argument; Bundle does not accept a state
file path. Bundle traverses the bounded pages, pins the four streams, and
returns the reusable `next_state`.

Use the reference's bounded Bundle invocation as written instead of guessing
larger ceilings or probing the CLI. Treat `sessions` as an ID-keyed object and
use its documented metadata and four observation arrays directly. Save a large
tool result only when the harness does so automatically; do not issue repeated
shape-discovery queries for documented fields.

Retain each returned Bundle JSON object in harness-managed tool output or, for
OpenCode, in a temporary path outside the artifact destination only until its
state has been injected. The controlled adapter-state transport is:

```bash
python3 <skill-dir>/scripts/set-adapter-state.py <brief-path> <bundle-output-path>
```

The helper reads top-level `.next_state`, serializes that object compactly, and
owns the only transport into `extraction.adapter_state_json`. It refuses brief
symlinks, invalid UTF-8, and ambiguous controlled-key shapes. It provides exact
transport integrity, not semantic validation; the validator remains required.

Bundle owns generic source identity, topology, cursor, count, terminal-identity,
creation-prefix, pagination, and pin guards. Session Brief owns the acceptance
result, synthesis, lifecycle, and visible coverage decision. Use targeted reads
only for consequential evidence absent from Bundle's bounded previews, and keep
those reads within the same privacy and pin boundary.

Mark source activity at the pin as `active`, `quiescent`, or `missing`; mark
accepted evidence at that pin separately as `accepted`, `partially-accepted`, or
`rejected`; and record post-pin movement separately as `not-observed`, `detected`,
or `unknown`. An active source may have an accepted consistent pin. Never use
post-pin movement as the source activity value at the pin.

Map Bundle results deterministically. A present session with complete coverage
and no session gaps has an accepted pin guard; `requires_repin`,
`rebuild_required`, missing state, or session gaps reject that session guard.
For a source other than the currently executing parent, record post-pin movement
as `detected` only when Bundle reports it and otherwise as `not-observed`.
Reserve `unknown` for an adapter that cannot establish a bounded consistency
result, not merely because arbitrary future writes remain possible.

For a non-OpenCode harness, use its equivalent bounded adapter operation and
preserve its exact adapter state in the same v2 field. A Session Brief
`state_version: 1`, missing, malformed, or otherwise invalid state cannot drive
Delta: use full rebuild from empty state with no compatibility conversion,
preserving the brief's original creation time and useful extraction history. A
valid nested OpenCode Bundle `version: 1` is adapter state, not an old Session
Brief. Treat a Bundle gap or failed pin as visible incomplete evidence rather
than silently accepting a narrative.

Count and locate reasoning records without reading or surfacing their bodies.
Keep secrets and irrelevant private content out of both child results and the
brief.

**Done when:** the extraction mode, one bounded adapter result, pinned boundary,
source topology, coverage ledger, exclusions, mutable states, and exact reusable
adapter state are known.

## 3. Acquire Evidence In Isolation

If the source is the currently executing OpenCode parent, do not launch an
evidence Explore child. Bundle itself pins the source, and Bundle itself plus any
later work necessarily moves that source after the pin. Interpret the
bounded Bundle result directly, record `post_pin_movement: detected`, add a
visible movement gap, and set `coverage.complete: false`. The bounded evidence
may still have `evidence_state_at_pin: accepted` and accepted pin guards; this
known movement is not a rejection of the accepted pin. Use `unknown` only when
post-pin movement is genuinely unobservable.

When the harness provides a suitable read-only exploration subagent, use one
fresh child to interpret the already-pinned adapter result. In OpenCode, use a
fresh native `explore` task so progress and the child transcript remain visible;
do not delegate file writing or a second broad acquisition. Give the child the
complete extraction contract:

- source harness, session ID or locator, store root when nonstandard, and mode;
- privacy-approved source kind, stable locator or fingerprint, adapter version,
  and the bounded Bundle result;
- existing brief path and exact adapter state for refreshes;
- pinned parent and child scope, compactions, observations, and gaps;
- required evidence: purpose, timeline, research, findings, decisions, user
  corrections, implementation, changed files, validation, child contributions,
  current state, unresolved questions, and future-agent context;
- required locators, coverage declaration, privacy exclusions, and synthesis
  evidence; the parent, not the child, owns final acceptance and state storage;
- instruction to synthesize evidence for the parent without writing files.

Skip the interpretation child for a verified no-op Bundle refresh: every session
has complete incremental coverage, all four observation arrays are empty,
topology and stored descriptive ledgers are unchanged, and there are no gaps.
Preserve the existing narrative, run the helper for the returned state even when
its compact text is already identical, update the brief-owned boundary fields,
and append one concise no-op history entry directly. An `unchanged` helper result
is the exact-equality outcome; it is not permission to bypass the transport.

If the child reports incomplete coverage, continue that child only with the exact
unverified ledger entries. Do not accept a narrative summary as complete evidence.
When no suitable subagent exists, interpret the bounded adapter result directly.

Treat a parent human or user turn as the authority for a decision or correction.
A child task prompt is delegated direction from the parent assistant, even if it
appears as `role=user` in the child. Child reports support findings, proposals,
and implementation evidence but cannot alone establish accepted user direction.
Tool or implementation success proves an observed action or outcome, not broader
user acceptance. If only child evidence survived, keep the direction under Child
Sessions, Research And Findings, or Implementation with an authority caveat.

**Done when:** every requested evidence class is supported, excluded, or named as
an unresolved gap, every consequential targeted read is bounded, authority is
classified, and the adapter result's pin status is explicit.

## 4. Create Or Refresh The Artifact

Follow [the artifact contract](references/artifact-contract.md). On creation,
synthesize from the pinned evidence. On refresh, treat the existing brief as the
baseline and merge only material changes:

- revise claims whose source evidence changed;
- add new decisions, corrections, findings, work, validation, and unresolved
  state in their semantic sections rather than appending a second summary;
- preserve still-valid earlier context without rereading it from the transcript;
- distinguish user direction, source facts, assistant proposals, observed
  outcomes, and uncertainty;
- store the adapter's exact compact `next_state` JSON in
  `extraction.adapter_state_json`; do not duplicate its cursor, count, terminal,
  prefix, source, or child-set maps elsewhere in frontmatter;
- keep source activity at pin, accepted evidence at pin, post-pin movement, and
  overall/per-session guard acceptance in separate brief-owned fields;
- advance extraction state through every scanned observation, including records
  that produced no narrative change;
- preserve bounded nonterminal locators and statuses for every session in scope
  until later evidence makes them terminal;
- append one concise extraction-history entry describing scope, mode, and
  meaningful changes or a verified no-op.

Write the artifact skeleton or narrative first with exactly one controlled
`extraction.adapter_state_json: |-` marker and one indented content line. Then
run `set-adapter-state.py` for every returned Bundle output, including no-op
refreshes, and only then run `validate-session-brief.py`. The model may update
brief-owned fields and history separately, but adapter state always comes through
the helper: never copy, paste, retype, patch, regex-replace, or hand-edit its
JSON.

Do not turn the brief into a transcript, event log, implementation plan, or
maintained knowledge document. Keep exact evidence locators where they support
verification, refresh, or recovery; omit mechanical citations that serve none of
those uses. A bullet under Decisions or Corrections And Preferences requires a
direct parent-session locator in the form `[source: parent/msg_x]` or
`[source: parent/prt_x]`; supplemental child locators may appear in the same
item but cannot replace that parent locator. The validator checks locator syntax only. After writing,
resolve every locator in the accepted pinned parent evidence and verify that it
is a human or user turn; that authority cannot be inferred from the Markdown.
Only a parent human or user turn can support accepted human direction there.

**Done when:** the brief is a coherent current view through the pinned boundary,
its state can drive the next refresh, and earlier meaning has not drifted during
the merge.

## 5. Validate And Report

After writing or refreshing, use this fixed order before reporting:

1. Write or merge the skeleton and narrative without manually transporting
   adapter JSON.
2. Run `set-adapter-state.py` with the brief path and the retained Bundle output
   path. Resolve an `unchanged` result as exact equality, and keep any temporary
   Bundle output outside the artifact destination only for this step.
3. Run the dependency-free validator:

```bash
python3 <skill-dir>/scripts/validate-session-brief.py <brief-path>
```

Fix every validator error before continuing. Then inspect the final artifact and
diff or new file, including the exact adapter-state block, guard statuses,
privacy boundary, required narrative sections, parent authority locators, and
destination instructions. Resolve every decision/correction locator in the
accepted pinned parent evidence and verify its human or user role; the validator
cannot infer that authority from text. Run the cold-consumer test: given the brief, its
declared host context, and reachable references, the intended consumer can
understand what happened, what was decided or merely proposed, what changed,
what remains unresolved, and how to continue without routinely reopening the
transcript.

Report the brief path, source session, extraction mode and boundary, material
changes, activity/evidence/movement states, guard result, coverage gaps, and
validation. Leave commit, rendering, application, or publication unperformed
unless the user separately requests it.

**Done when:** the artifact is locally usable and refreshable and every limitation
is visible.
