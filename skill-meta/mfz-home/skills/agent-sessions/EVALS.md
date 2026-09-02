# Agent Sessions evaluations

## Status

The repeatable Python suites cover the OpenCode V2 snapshot, delta, and cost contracts. Adaptive SQL and API scenarios remain static evaluations. Read-only live V2 verification is recorded separately when the current environment supports both sources without exposing bodies.

## Invocation

### Positive prompts

- "Find my prior OpenCode session about deployment failures."
- "Fully reconstruct this session and the children that contributed."
- "Audit whether the prior agent followed its instructions."
- "Calculate current API cost for this OpenCode session and all subagents."

The model loads Agent Sessions, declares a coverage mode, selects the matching harness reference, and keeps source access read-only.

### Adjacent negative prompts

- "Continue implementing in this session."
- "Write a handoff from the conversation already in context."
- "Create a Session Capture."
- "Ingest these sessions into a thread."

Agent Sessions does not replace the owning workflow. It may provide prior-session evidence when that workflow requests it.

## OpenCode V2 adaptive analysis

### Explicit SQLite investigation

**Prompt:** Investigate one failed tool in this session using the supplied V2 database path.

**Assertions:** The agent opens the explicit path with `mode=ro`, validates `session_v2` and `session_message`, orders by `seq`, and composes bounded SQL around the question. It excludes reasoning text and unrelated bodies, preserves session, sequence, message, and content identity, and does not route the investigation through the snapshot adapter.

### API fallback

**Prompt:** Locate a V2 session when no database path or filesystem backend is available.

**Assertions:** The agent uses the authenticated service API, follows opaque pagination, and projects only needed metadata and message fields. It does not guess a path. An unavailable service remains a visible gap.

### Reconstruction across compaction

**Prompt:** Reconstruct the relevant decisions across completed compactions.

**Assertions:** The agent distinguishes all projected history from active context beginning at the latest completed compaction sequence. It declares scope, child traversal, terminal boundaries, exclusions, movement, and gaps.

## Deterministic V2 adapter

### Snapshot

**Assertions:** One read-only transaction returns adapter and source identity, parent and direct-child scope, separate fork provenance, sequence-ordered messages, bounded user and assistant text, structural tool evidence, completed compaction and active-context boundaries, nonterminal locators, structural inbox rows, optional event and inbox watermarks, coverage, and a version-2 checkpoint. Reasoning records retain type and locator without body text. Tool and event bodies remain absent.

### Pure append and no-op

**Assertions:** Exact checkpoint reuse with no changes returns an accepted empty delta and byte-equivalent checkpoint. A message appended after the terminal sequence returns only appended evidence and advances the checkpoint.

### Rebuild conditions

**Assertions:** Existing-message update, deletion, replacement, direct-child addition or removal, parent relationship change, source replacement, stale terminal state, and a new completed compaction return `rebuild_required` with no mixed session delta.

### Bounds and command shape

**Assertions:** Message and total-output ceilings fail clearly rather than truncating claimed coverage. Help exposes only `snapshot` and `delta`. A source without the V2 contract fails without fallback.

## V2 cost

**Assertions:** The calculator validates only `session_v2` and `session_message`, follows recursive descendants with cycle guards, excludes unrelated forks, ignores assistant messages with no usage, rejects partial usage, and attributes model switches exactly. Tests cover context tiers, mode prices, cache categories, reasoning rates and fallback, malformed JSON, missing pricing, deterministic local catalogs, pretty output, null agents, stored-cost comparison, and body exclusion.

## Shared execution assertions

Every scenario confirms an explicit coverage mode, bounded evidence proportional to the request, native locators, visible exclusions and gaps, child and fork distinction, and no silent artifact promotion.
