# Agent Sessions Evaluations

**Status:** Static scenarios defined. On 2026-08-08, the OpenCode extractor was
compiled and run read-only against the local OpenCode 1.18.15 store: Locate found
`ses_020250d00ffe3pU7HWgAFxGGJ0`, Outline identified one child resumed once, and
Delta detected a previously running tool's completion while excluding reasoning.
The fixture suite now covers the multi-session Bundle, reconstruction projection,
ISO timestamp metadata, prior-state no-op,
missing-child detection, compensated nonterminal replacement, strict state
validation, observation merging, privacy, page and output ceilings, and both
root option placements including `--db` after the subcommand. The cost fixture
suite covers recursive descendants, per-turn model changes, context tiers,
reasoning and cache pricing, missing prices, malformed source JSON, null agents,
deterministic local catalogs, and transcript exclusion.
Live model invocation on 2026-08-09 used Bundle for historical full rebuild,
current-parent extraction, guard rejection and recovery, and a verified no-op
refresh. Initial historical acquisition used one Bundle call for a parent and
three children; the final no-op used one incremental Bundle with empty
observations and stable next state.
An additional three-scenario live evaluation on 2026-08-09 found that Locate was
bounded, narrow investigation still selected a 35-part window, and reconstruction
used one Bundle but then repeated two Outlines, eight `jq` projections, and nine
SQLite reads. The reconstruction view and tighter runtime contract target those
observed inefficiencies. Two aligned reconstruction reruns eliminated Outline,
Delta, output redirection, and task files while adding exact-ID follow-ups and
state reuse. The latest used one cross-session preview projection, no invalid
content-bound retries, five SQLite calls, and nineteen shell calls versus the
original nine and twenty-two, but still read adapter source, made one malformed
`jq` projection, and performed one broad child-session scan. Its 140,398-token
final context remained below the original 148,394 but above the first aligned
rerun's 108,448; end-to-end efficiency therefore remains a partial pass.

## Shared Assertions

Every scenario confirms read-only access, live-shape inspection, an explicit
coverage mode, a compact coverage ledger, evidence proportional to the request,
locators for reported claims, visible exclusions and gaps, and no silent
promotion into an artifact-specific workflow.

## Multi-session Bundle

**Prompt:** Extract one parent session and all of its direct children for a
refreshable structural evidence pass.

**Assertions:** The agent selects Bundle as the first and only structural pass,
uses the full view required by the refreshable consumer, discovers direct children once, pins
all existing sessions in one read transaction, traverses every page from four
per-session cursors to the pin, returns topology and per-session coverage, and
preserves a generic next-state object without artifact fields. It does not run
Outline, topology, grouped-count, compaction, or status probes around Bundle.

## Reconstruction Projection

**Prompt:** Fully reconstruct a parent and the direct children that materially
contributed to its decisions.

**Assertions:** One reconstruction-view Bundle returns deduplicated text records,
task and non-completed tool records, explicit omission counts, truncation markers,
body-free locators for every omitted completed tool, role-labelled text records,
canonical structural summaries, and reusable state. The agent follows exact IDs
only for consequential truncated content, does not probe result shape, and uses
one state-reuse Bundle after targeted reads to classify consistency or post-pin
movement.

## Bundle Refresh No-op

**Prompt:** Run the same multi-session extraction again using the prior generic
state.

**Assertions:** The source and child guards validate, observations are empty
when no records changed, current structural state remains visible, and the
next-state remains reusable without rereading prior content into the result.

## Initial Re-pin State Reuse

**Prompt:** Retry an initial Bundle extraction after its first pinned read
reports a transient `requires_repin` result.

**Assertions:** The incomplete session's next state stores starter cursors,
starter counts, null terminal identities, and prefix fingerprints through those
starter cursors. Once the transient movement settles, reusing that state reaches
an incremental complete result without a false prefix-fingerprint gap.

## Missing Known Child

**Prompt:** Refresh a parent bundle after a previously known direct child has
disappeared or changed parent.

**Assertions:** The prior child ID remains in topology, the child is marked
missing with an explicit gap, its prior cursor state is not advanced, and the
bundle does not mistake the missing child for a new child.

## Compensated Nonterminal Replacement

**Prompt:** Refresh a parent bundle after one nonterminal historical part was
deleted and a replacement part was inserted within the prior creation prefix,
while the original terminal part remained and the prefix count stayed equal.

**Assertions:** The bundle compares counts and the structural prefix digest
through each prior creation cursor, checks persisted terminal identities in their
original session streams, reports a fingerprint-mismatch rebuild-required gap
without observations, and preserves that session's prior next-state entry.

## Malformed Bundle State

**Prompt:** Refresh with a state containing the parent as a child, a boolean
version, a string cursor shortcut, or a null/mismatched terminal identity for a
nonempty cursor.

**Assertions:** Bundle rejects each malformed state before extraction and accepts
only the documented cursor and terminal-identity shapes.

## Bundle Privacy And Merge

**Prompt:** Extract a session containing text, reasoning, and tool records whose
creation and update streams overlap.

**Assertions:** Text previews are SQL-bounded, structural tool metadata remains
available, tool bodies and reasoning bodies remain excluded by default, reasoning
exclusion counts are visible, and duplicate observations merge by record ID and
greatest `time_updated`.

## Bundle Ceilings And Option Placement

**Prompt:** Run Bundle with a small per-record or total-output ceiling, then run
it with `--pretty` and `--max-output-bytes` before and after the subcommand.

**Assertions:** The extractor fails clearly instead of truncating complete
coverage, the per-stream ceiling is enforced, and both output-option placements
preserve the same meaning without resetting explicit values to defaults. `--db`
also works after the subcommand.

## Locate By Approximate Title

**Prompt:** Find my recent session about subagent progress visibility.

**Assertions:** The agent selects Locate mode, compares title and recency before
reading bodies, reports ambiguity if multiple candidates remain, and does not
perform a complete transcript reconstruction. It uses emitted UTC ISO metadata
instead of shell date conversion and does not read extractor source.

## Narrow Tool Failure

**Prompt:** Why did the final service restart in this OpenCode session not finish?

**Assertions:** The agent selects Investigate mode, outlines the session first,
uses one `tool-context` call for the known tool ID, owning message, and nearest
preceding multipart user request, distinguishes persisted running state from
external service state, and avoids duplicate reads, descending transcript windows,
or unrelated content.

## Complete Reconstruction

**Prompt:** Fully reconstruct this session and all children that materially
contributed to its decisions.

**Assertions:** The agent selects Reconstruct with exhaustive declared scope,
tracks every requested deliverable, uses one reconstruction-view Bundle, reads
only consequential truncated child results by exact ID, accounts for exclusions,
and does not finalize while the ledger is incomplete.

## Recursive Session Cost

**Prompt:** Calculate the API cost of this OpenCode session, with a total and a
breakdown for the main session and every subagent.

**Assertions:** The agent runs the cost calculator directly without Bundle or
transcript reads. The script traverses recursive descendants, attributes every
step-finish turn to its exact assistant provider/model/variant, applies the
correct current models.dev context tier and token-category rates, reports total,
per-session, and per-model estimates, preserves null session agents, and labels
the current-catalog result as an estimate rather than an invoice.

## Bounded Reconstruction

**Prompt:** Reconstruct the decisions around worker naming; unrelated
implementation details are not needed.

**Assertions:** The agent selects Reconstruct with bounded scope, follows the
relevant timeline and corrections, provides locators, and does not expand the
request into complete-audit coverage.

## Behavioral Audit

**Prompt:** Audit whether the agent followed its session-analysis guidance and
identify improvements.

**Assertions:** The agent loads `references/analysis.md`, traces guidance timing,
failures, retries, and parent use of child results, separates instruction defects
from execution failures, and supports each recommendation with a locator.

## Resumed Child

**Prompt:** Review the last two Explore calls and explain whether they were two
children or one continuation.

**Assertions:** The agent maps both parent task parts, recognizes the second
part's existing `task_id`, reports one child resumed once, and preserves both call
IDs, task-part locators, timestamps, statuses, and child identity.

## Compaction During Audit

**Prompt:** Completely audit a session large enough to compact during analysis.

**Assertions:** The coverage ledger survives compaction, the agent emits no final
answer from an incomplete checkpoint, and the resumed analysis continues from
unverified ledger entries rather than repeating the whole read.

## Incremental Refresh

**Prompt:** Return everything added or changed after these message-created,
message-updated, part-created, and part-updated cursors.

**Assertions:** The agent selects Delta mode, uses all four keyset cursors,
excludes reasoning bodies, reports new records separately from updated records,
rechecks child topology, and advances cursors only through records scanned in one
read snapshot. Before synthesis it merges cross-page observations by record ID
and greatest `time_updated`.

## Running Tool Changes Later

**Prompt:** Refresh a session whose prior outline ended with a running tool.

**Assertions:** The update cursor detects a status or output change on the
existing part even when no new part was created; the report does not infer
completion from unrelated external state.

## Active Source Pin

**Prompt:** Read a multi-page Delta only through the four cursors observed by the
initial Outline while the source session continues writing.

**Assertions:** Every page receives the same inclusive upper bounds, records
created or updated beyond them remain outside the result, and reported cursors do
not advance past the pin.

## Updated Assistant Message

**Prompt:** Refresh a session whose prior assistant message had no finish state.

**Assertions:** The message-update cursor returns the existing message after its
finish or error state changes even when no new message is created.

## Bounded Structural Delta

**Prompt:** Return a delta from a large session without exposing transcript
content.

**Assertions:** Delta is structural by default, pages each stream with a hard
record limit, reports `has_more` and continuation cursors, enforces a total output
ceiling, and includes bounded content only after explicit privacy-scoped opt-in.

## User Perspective Mining

**Prompt:** Extract the durable preferences and corrections from this design
discussion.

**Assertions:** The agent loads `references/analysis.md`, distinguishes dictated
exploration, pasted context, and corrections, admits only reusable perspectives,
preserves uncertainty, and gives each perspective an evidence locator.

## Privacy-Sensitive Transcript

**Prompt:** Reconstruct this session, which contains credentials in one tool
input.

**Assertions:** The agent counts and locates the relevant record without exposing
the credential, states the privacy exclusion, and preserves enough sanitized
evidence to explain its significance.

## Unknown Harness

**Prompt:** Analyze this exported session from a harness without a bundled
adapter.

**Assertions:** The agent confirms the supplied artifact's live shape, applies
the common mode and ledger contract, uses stable record locators available in
that format, and does not force OpenCode or Claude Code schema assumptions onto
it.

## Adjacent Negative Cases

**Prompts:** Continue implementing in the current session; create a durable
Session Capture; write a handoff from the conversation already in context; ingest
these sessions into a thread.

**Assertions:** Agent Sessions does not replace current-session implementation,
Session Derived Knowledge, Handoff, or Threads. It may supply prior-session
evidence when the owning workflow explicitly needs it.
