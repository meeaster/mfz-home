# Log

## 2026-08-08 - Initial Session Brief Design

- Chose a model-invoked skill because users may request the artifact naturally and
  because the workflow needs reusable references and dependencies.
- Defined one parent session as the artifact identity; relevant child sessions
  remain topology rather than independent primary sources.
- Kept the brief mutable and evidence-backed without promoting it into guidance,
  a work container, or a multi-session thread.
- Made Agent Sessions the sole owner of retrieval, coverage, topology, privacy,
  and cursor mechanics and Context Transfer the owner of consumer fit.
- Preferred a fresh visible read-only Explore child for evidence acquisition while
  retaining file writes and coverage acceptance in the parent.
- Selected workspace `artifacts/session-briefs/` only when workspace guidance
  supplies that mutable-output convention; user and project destination authority
  take precedence.
- Required exhaustive pinned reconstruction for creation and structural Delta for
  refresh, with full rebuild for missing or invalid state.
- Required adapter-specific refresh semantics: OpenCode cross-page creation and
  update observations merge by record ID and greatest update time, while
  append-only sources preserve and validate file identity and position.
- Added source fingerprints, adapter versions, counts, terminal identities, child
  sets, and nonterminal locators as guards against unsafe Delta refresh.
- Required targeted content reads to retain the structural pin and a final
  same-bound consistency probe before creation, rebuild, or refresh evidence is
  accepted.
- In the v1 design, kept adapter-specific cursors in generic frontmatter rather
  than forcing every harness into OpenCode's schema; v2 replaces that map with
  the exact adapter-state JSON block.
- Preserved one concise extraction-history entry per run and avoided append-only
  summaries that would make the brief drift into a transcript or event log.

## 2026-08-08 - Session Brief V2 Contract And Validator

- Moved the artifact schema to `state_version: 2`; a Session Brief
  `state_version: 1`, missing, malformed, or incompatible state now forces a
  full rebuild from empty adapter state without compatibility conversion, while
  preserving original creation time and useful extraction history.
- Made OpenCode Bundle the single parent-plus-direct-child acquisition for
  creation, rebuild, and valid refresh. Refresh reuses the exact compact generic
  `next_state` JSON; Bundle remains the owner of source and cursor guards while
  Session Brief owns acceptance, synthesis, and lifecycle.
- Kept the current OpenCode generic state `version: 1` distinct from the v2 brief
  version and required all four cursor objects, counts, terminal identities, and
  creation-prefix fingerprints for every stored session.
- Split observed source activity at the pin, accepted evidence at the pin, and
  movement after the pin because an active source can still provide a consistent
  accepted pin; movement is not source state at the boundary.
- Kept overall and per-session guard acceptance outside generic adapter state so
  a source guard failure remains a brief-owned acceptance decision with a visible
  reason or locator.
- Required direct parent-session locators for Decisions and Corrections because
  child task prompts are delegated assistant direction and child reports or tool
  success cannot establish human acceptance on their own.
- Added a dependency-free narrow frontmatter validator and repeatable stdlib
  tests for OpenCode state invariants, acceptance/guard combinations, authority
  locators, and a non-OpenCode v2 artifact.

## 2026-08-08 - V2 Review Remediation

- Made the Bundle transport explicit: refresh passes the exact JSON content as
  `--state-json '<exact-json>'`; a temporary file is only read and substituted,
  never passed as a Bundle path.
- Distinguished the currently executing OpenCode parent from other active
  sources. The current-parent branch skips Explore, interprets the bounded Bundle
  result directly, records detected post-pin movement and a visible gap, and may
  retain accepted evidence and guards at the pin.
- Enforced one guard/evidence/coverage truth table so overall acceptance exactly
  reflects scoped guards, rejected sessions cannot look accepted or complete, and
  movement alone does not retroactively reject a valid pin.
- Restricted frontmatter mappings to documented keys, including optional source
  descriptors and coverage exclusions, so generic Bundle state cannot be copied
  outside `adapter_state_json`.
- Preserved YAML scalar style to require an actual `|-` block and replaced
  Python-canonical JSON comparison with standard-JSON parsing plus lexical
  compactness, allowing raw Unicode and legal alternate escapes.
- Made section and list checks fence-aware and exact level-2, with numbered and
  multiline authority items. Syntax validation still cannot establish that a
  parent locator is a human or user turn; post-write inspection owns that check.
- Expanded the focused validator suite to 23 test cases and additional assertions
  covering truth-table branches,
  current-parent movement, missing source, controlled keys, JSON correctness,
  Markdown authority parsing, and non-OpenCode behavior. Privacy-content remains
  a live workflow scenario rather than an unsupported validator-test claim.

## 2026-08-08 - Session Brief Validator Boundary Remediation

- Constrained flat descriptive records, structured gaps, and guard reason or
  locator fields so allowed keys cannot carry nested generic Bundle mappings or
  lists; retained scalar flat records as valid.
- Made a blank line end an unindented authority continuation while retaining
  appropriately indented Markdown continuations.
- Kept direct parent evidence mandatory while allowing supplemental child
  locators in the same logical authority item; child-only evidence remains
  insufficient.
- Split rejected-session truth-table regression assertions and synchronized the
  focused evaluation and maintenance claims with the expanded 25-case suite.

## 2026-08-08 - Exact Adapter-State Transport Remediation

- Recorded the observed live defect: a model manually copied `.next_state` from a
  large Bundle output into `adapter_state_json` and transposed one hex character
  in a source fingerprint.
- The validator accepted that structurally valid but source-inexact state; the
  next refresh correctly reported a prefix mismatch. The failed no-op attempt is
  not recorded as a successful no-op.
- Added a small stdlib-only helper that reads top-level `next_state`, emits the
  extractor's compact insertion-ordered JSON, validates one controlled block, and
  replaces only its content atomically.
- Required the helper for every returned Bundle state, including no-op refreshes,
  before the validator; retained OpenCode output stays outside the artifact
  destination only until injection is complete.
- Added static focused transport tests for exact bytes, no-write equality,
  malformed inputs, block-shape rejection, Unicode and escapes, fingerprint
  correction, and actionable CLI failure.
- Exact-state transport was initially statically tested; the following live
  evaluation confirmed recovery and no-op behavior.

## 2026-08-08 - Final Review Remediation

- Made the helper refuse symlink brief paths before reading or replacing them,
  preserving both the link and its target.
- Tightened frontmatter detection to count syntactic `extraction` and
  `adapter_state_json` declarations, then require one exact adjacent controlled
  shape rather than allowing malformed variants to hide beside a valid marker.
- Made the helper reject non-UTF-8 briefs and made validator path reads report
  actionable UTF-8 errors instead of surfacing a traceback.
- Corrected the historical-creation evaluation contract: initial Bundle has no
  `--state-json`; the returned state is injected by the helper, and later refresh
  passes that stored exact JSON through `--state-json`.
- Added static regressions for symlinks, syntactic key variants, and helper and
  validator UTF-8 failures.

## 2026-08-09 - OpenCode V2 Live Evaluation

- Ran a historical v1-to-v2 full rebuild, current-parent creation, corrupted-state
  guard rejection, empty-state recovery, and exact-state no-op refresh with
  OpenCode 1.18.15 and Sol/medium.
- Reduced multi-session acquisition from the v1 baseline's 54 extractor calls to
  one Bundle call. The current-parent and no-op paths correctly skipped an
  interpretation child; full rebuild used one read-only Explore child.
- Clarified that a non-current source with no Bundle movement gap uses
  `post_pin_movement: not-observed`; arbitrary possible future writes do not make
  every historical snapshot `unknown`.
- Added a bounded canonical Bundle command and documented its ID-keyed session,
  observation, content-settings, and state paths after live runs exposed avoidable
  option and result-shape probing.
- Confirmed current-parent semantics live: accepted active pin, detected
  workflow-induced movement, visible gap, incomplete coverage, and no child.
- Confirmed guard rejection live when a manually copied fingerprint differed by
  one character, then confirmed helper-based empty-state recovery with all four
  guards accepted and complete coverage.
- Confirmed the final no-op live: one incremental Bundle, no child, empty
  observations for all sessions, unchanged topology and ledgers, exact-state
  helper `unchanged`, preserved narrative, one history entry, and validator pass.
- Historical creation without an existing artifact, privacy-sensitive live
  content, Claude JSONL refresh, and other non-OpenCode adapters remain unrun.
