# Session Brief Evaluations

**Status:** The live v1 baseline and representative OpenCode v2 evaluation are
complete. V2 live runs covered a historical `state_version: 1` rebuild, the
currently executing parent, a rejected corrupted guard, exact-state recovery,
and a verified no-op refresh. Historical creation with no prior artifact,
privacy-sensitive content, and non-OpenCode refresh remain unrun. The repeatable
stdlib suites cover the listed validator and exact-state transport behavior.

## Completed V1 Baseline

The v1 live baseline established these findings:

- A delegated Explore result can be accurate while still incomplete; the parent
  must check the coverage ledger and continue only with named gaps before writing
  a complete brief.
- The v1 workflow kept source retrieval read-only, excluded reasoning bodies and
  private tool content, and preserved one parent session with direct-child
  topology rather than promoting children to primary sources.
- OpenCode's independent message and part creation/update streams and resumed
  child topology required repeated structural acquisition work in the v1 flow.
  The baseline exposed the need for one reusable Bundle state instead of
  separately repeating Outline, Delta, and topology work.
- The v1 artifact had no mechanical validator and did not sharply separate
  source activity at the pin from movement after the pin or enforce direct parent
  evidence for accepted decisions and corrections.

These findings are the v1 baseline only. They are not results for the v2 Bundle,
migration, validator, authority, or movement workflow scenarios.

## V2 Workflow Scenarios

Retained traces and artifacts are under
`scratch/session-brief-eval-20260808/`. The first historical v2 run found the
retained v1 artifact and correctly chose full rebuild rather than fresh creation.
It used one Bundle call for the parent and three children instead of the v1
baseline's 54 extractor calls. A direct Bundle check produced approximately 443
KB for initial evidence and 18 KB for the same-source no-op result.

### Historical Creation

**Prompt:** Create a Session Brief from a named historical OpenCode session.

**Assertions:** One initial Bundle call starts without `--state-json`, covers the
parent and direct children, and returns `next_state`, which is stored by
`set-adapter-state.py`. A later refresh passes that stored exact JSON through
`--state-json '<exact-json>'`, writes `state_version: 2`, and records a stable
pin without duplicating generic state maps.

**Live status:** Unrun as a no-prior-artifact model scenario. Empty-state Bundle
and full-rebuild behavior ran successfully, but the retained v1 artifact made the
model scenario a migration rebuild rather than creation.

### Current OpenCode Parent

**Prompt:** Brief the currently executing OpenCode parent session.

**Assertions:** The workflow does not launch an evidence Explore child. It
interprets the bounded Bundle result directly, records
`post_pin_movement: detected`, exposes a movement gap, and sets
`coverage.complete: false`. The pin may still record accepted evidence and
accepted guards. `not-observed` is not expected for this branch; `unknown` is
reserved for genuinely unobservable movement.

**Live result:** Passed. One Bundle call covered the executing parent, no child
was launched, the pin and guard were accepted, movement was `detected`, coverage
was incomplete with a visible movement gap, and the v2 validator passed.

### Active Accepted Non-Current Pin

**Prompt:** Brief an active OpenCode session that is not the currently executing
parent.

**Assertions:** The artifact may record active source activity, accepted evidence,
accepted guards, and `post_pin_movement: not-observed` when the bounded pin is
consistent and no later movement is observed.

**Live result:** Passed during the historical rebuild and final no-op. Persisted
nonterminal records kept source activity `active`, while the accepted historical
pin used `not-observed` movement and complete coverage.

### Movement And Rejection

**Prompt:** Create or refresh a brief when Bundle reports post-pin movement or a
scoped source guard failure.

**Assertions:** Movement stays separate from pin guard acceptance. A movement-only
gap may retain accepted pin evidence and guards; a rejected scoped guard requires
its reason or locator, overall rejection, a visible gap or reason, rejected or
partial evidence, and incomplete coverage.

**Live result:** Passed. A manually corrupted child prefix fingerprint produced a
rejected child and overall guard, partial evidence, visible rebuild gap, and
incomplete coverage without discarding accepted sessions.

### No-Op Refresh

**Prompt:** Refresh a brief whose source has no meaningful change.

**Assertions:** The exact stored state is substituted into one Bundle call's
`--state-json '<exact-json>'` argument, synthesis is preserved, state advances or
is proven unchanged as appropriate, and one concise no-op extraction-history entry
is added. Every returned Bundle state, including a no-op state, is injected with
`set-adapter-state.py` before validation.

**Live result:** Passed after exact-state remediation. One incremental Bundle
returned complete coverage, empty observation arrays for all four sessions,
unchanged topology and ledgers, and no gaps. No child was launched; the helper
reported the adapter state unchanged, narrative was preserved, one history entry
was added, and validation passed.

### Session Brief State-Version Rebuild

**Prompt:** Refresh a brief with Session Brief `state_version: 1`, missing state,
or malformed state.

**Assertions:** The old state never drives Delta and is not converted. The skill
performs a full rebuild from empty Bundle state, preserves the original brief
creation time and useful extraction history, writes v2 state, and explains why
incremental refresh was unsafe. A valid nested OpenCode Bundle `version: 1` is
not an old Session Brief.

**Live result:** Passed. The historical v1 artifact triggered empty-state full
rebuild while preserving original creation time and history. A later empty-state
recovery also replaced a corrupted v2 adapter state through the helper.

### Privacy

**Prompt:** Create a brief from a session containing reasoning and secret-bearing
tool content.

**Assertions:** Bundle remains structural and bounded, reasoning and unneeded tool
bodies are excluded, targeted reads are limited to consequential approved
evidence, and no secret or private content is written to the artifact or child
prompt. This remains a live workflow scenario, not a focused validator test.

### Claude And Non-OpenCode

**Prompt:** Validate or refresh a v2 brief backed by Claude JSONL or another
non-OpenCode adapter.

**Assertions:** The artifact uses v2 fields and a valid compact adapter-state JSON
object, keeps per-session guard acceptance, and does not force the OpenCode
four-stream schema. Claude refresh preserves its append/file-identity semantics
and rebuilds after truncation or replacement.

## Exact-State Transport Regression

The observed live defect was a manual copy of `.next_state` from a large Bundle
output into `adapter_state_json` with one transposed hex character in a source
fingerprint. The validator accepted the structurally valid but source-inexact
state, and the next refresh correctly reported a prefix mismatch. That failed
attempt remains visible as a guard-rejection evaluation, not as a successful
no-op.

The helper and validator-path tests statically cover exact replacement, byte and
final-newline preservation, unchanged no-write behavior, symlink refusal,
malformed Bundle JSON, missing or non-object `next_state`, syntactic controlled-key
and block-shape rejection, non-UTF-8 briefs, Unicode and escape serialization,
exact source-fingerprint correction, and actionable validator CLI errors. Live
recovery injected the clean Bundle state through the helper, and the following
live no-op reported that the stored state already matched Bundle `next_state`
exactly.

## Focused Validator Coverage

The stdlib suite currently covers 25 test cases and additional assertions: valid
complete OpenCode v2 with flat descriptive records; accepted current-source
movement; valid partial and rejected evidence; valid missing source; Session
Brief `state_version: 1`; independently asserted rejected-session reason,
overall-status, visible-gap, and `complete` truth-table failures; partial and
rejected truth-table failures; complete-coverage requirements; scalar-only
controlled descriptive records, structured gaps, and guard reason/locator
fields; malformed or missing four-stream cursors, counts, and terminal maps;
terminal mismatch/null; missing and malformed fingerprints; parent-as-child and
session-set mismatch; unknown and duplicate generic frontmatter state; actual
`|-` enforcement; nonstandard JSON constants and lexical whitespace; legal
non-OpenCode raw Unicode and alternate escapes; fenced fake sections; numbered
multiline authority items; blank-separated top-level prose; parent-plus-child
locators and child-only locator rejection; exact level-2 required sections; and
path validation.

The validator checks locator syntax only. Post-write inspection must resolve each
decision or correction locator in accepted pinned parent evidence and verify a
human or user turn.

## Adjacent Boundaries

**Prompts:** Summarize this conversation; write a handoff; preserve this as a
Practice; add sessions to a thread; checkpoint an active work unit.

**Assertions:** Session Brief does not replace the owning adjacent workflow and
does not promote the brief without separate authority.
