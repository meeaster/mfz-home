# Orchestrator, author, and operator workflow investigation

## Status and current direction

This document preserves an unfinished workflow investigation for continuation on another computer. It records current repository facts, observed problems, design options, cost evidence, accepted routing decisions, and remaining provisional directions. It does not authorize `mfz apply`, commit, push, Jira or Confluence changes, deployment, or publication.

On 2026-09-15, the human accepted these routing changes:

- Dispatch `artifact-author` only when the human explicitly names that agent. Artifact type or destination does not select it.
- Keep reader-facing artifact creation in the warm human-facing coordinator when it already holds the relevant context and source access.
- Keep interactive instruction consultation and small, bounded, settled instruction edits in the warm coordinator unless the human explicitly requests an independent `agent-author` perspective.
- Route substantial, settled AI-instruction implementation to `agent-author` when behavioral coherence, related records or evaluations, or focused isolation provides concrete value.
- Treat the current code, instruction structure, conventions, and role topology as evidence about constraints and migration cost, not proof that the current design is best. Compare a current-aligned option with a credible structural option when both exist, without manufacturing alternatives or restructuring without a concrete benefit.

Source and authoring-record changes implement these decisions but have not been rendered with `mfz apply` or tested through a live routing scenario.

The broader investigation continues to separate seven decisions that the previous workflow often combined:

- whether evidence must persist;
- how a writer gets lossless source access;
- what a child returns to its immediate caller;
- whether the writer uses a direct tool or a helper;
- whether the warm coordinator or an isolated author writes;
- who has publication authority;
- whether a temporary result becomes durable knowledge.

Under the remaining provisional model, routine work returns typed ephemeral results rather than mandatory notes. A writer receives exact source locators rather than only a summary. Direct tools handle simple bounded operations. The effective depth stays at 2 initially. Depth 3 remains a valid option if measurements show that author-to-coordinator operational round trips recur and that named, non-delegating Luna leaf helpers remove those loops without weakening authority controls.

## Why this investigation exists

Sol is preferred for writing quality. The current role design assigns Sol to `agent-author` and `artifact-author`, while Luna handles source gathering and operations. That division can spend more tokens than it saves when a fresh specialist must reload context, source material, and destination guidance before writing. It can also force an expensive Sol author to return through the coordinator for one lookup or settled operation.

The coordinator path has its own costs. Every writer-to-coordinator-to-helper-to-coordinator-to-writer loop creates more model turns, repeated context reads, and opportunities for a summary to omit a source detail. Mandatory evidence files add writing and reading even when a routine operation already has a complete structured return and no later consumer.

The central question is not whether one role should own the whole workflow. The question is which context and authority boundaries improve writing, cost, reliability, and human effort for each artifact class.

## Current configuration facts

These statements describe the repository on 2026-09-15. They are not redesign proposals.

### Roles, models, and delegation

- `opencode/agents/orchestrator.md` defines a subagent that may dispatch named specialists, including `agent-author`, `artifact-author`, `explore`, `inspect`, and `operator`. It cannot dispatch another `orchestrator`.
- `opencode/agents/agent-author.md` owns AI-consumed behavioral instructions. It cannot dispatch children. Analysis does not authorize edits.
- `opencode/agents/artifact-author.md` owns durable reader-facing communication artifacts. It cannot dispatch children. It names `confluence-writer` for Confluence and `visual-explainer` for self-contained HTML. It does not currently name `jira-writer`.
- `opencode/agents/operator.md` owns explicitly requested, settled operational outcomes. It may dispatch only `explore` and `research` under its current task map.
- `profiles/base/profile.yml` assigns `openai/gpt-5.6-sol`, variant `medium`, to `agent-author` and `artifact-author`.
- `profiles/base/profile.yml` assigns `openai/gpt-5.6-luna`, variant `high`, to `explore` and `operator`. `opencode/agents/inspect.md` assigns the same model and variant to `inspect`.
- `profiles/personal/profile.yml` retains Sol/medium for `agent-author`. It does not override `artifact-author`, `explore`, or `operator` in the inspected section.
- The repository does not fix the main session model. An orchestrator with no model setting inherits the parent model at runtime. The observed coordinator session for this investigation used Sol/medium, but that observation is not a general configuration rule.
- `profiles/base/profile.yml` sets `opencode.config.experimental.subagent_depth` to `2`. Repository documentation describes this as permitting `root -> worker -> child`; the setting does not grant task permission by itself.

### Mandatory file-backed evidence

`skills/active/orchestrator-mode/SKILL.md` currently requires a file-backed handoff for every evidence-producing dispatch, including research, inspection, consultation, implementation, and review. Each producer receives a unique path under `/tmp/opencode/orchestrator-workspaces/<effort>/`. The producer list includes workers and operators.

Fresh children do not discover sibling evidence or enclosing workspace files automatically. The coordinator must select each relevant path, describe its status and freshness, and carry enough decision-critical context in the brief. The temporary workspace is not a durable continuity store.

The current operator contract already requires a compact return with the target, mutations, baseline and post-change verification, blockers, residual effects, and the exact state that a later agent may assume. The repository contains no evidence that every routine deterministic operator success also needs a file.

### Current Jira ownership

`skills/active/jira-writer/SKILL.md` owns the Jira draft, refinement, drift check, Jira create or update, verification, and local front-matter synchronization. Its local Markdown body is the Jira description. It requires approval before a Jira write.

There is no `jira-author` agent. `artifact-author` does not currently list Jira as one of its destinations. The current orchestration rules require explicit Jira mutation authority and route settled external-system mutation to `operator`, unless publication remains an inherent and explicitly authorized part of an owning editorial lifecycle. Loading `jira-writer` does not itself grant publication authority.

### Current Confluence ownership

`skills/active/confluence-writer/SKILL.md` owns the local Markdown draft, refinement, drift check, Confluence create or update, verification, and local metadata synchronization. Every Confluence write requires a fresh approval. `artifact-author` names `confluence-writer` as the Confluence destination owner.

The Markdown body is the Confluence page content. The local artifact may contain sync front matter, but the audience-facing body must not depend on local-only references.

### Current HTML ownership

`artifact-author` routes a self-contained HTML communication artifact to `skills/vendor/visual-explainer/SKILL.md`. The HTML file is the source of truth. The workflow requires validation through the actual rendered artifact path, including console, overflow, font, table or diagram, and first-viewport checks.

The HTML workflow does not define a generic publication target. Upload or deployment remains a separately authorized operation with a named destination and its own procedure.

## Observed failures and concerns

### A summary replaced a full-plan locator

A fresh author received a summary of a plan but not the accessible full plan path or its status. The author could not inspect omitted detail or determine whether the summary was authoritative. The failure was a source-transfer defect. It does not show that every prompt must copy every plan.

The needed rule is narrower: when omitted detail could affect the result, give the active writer an exact accessible path, a stable remote locator with read access, or a lossless snapshot. A summary can explain relevance and accepted status. It cannot replace the source.

### Evidence packets can be lossy

A distilled packet is useful for navigation, accepted facts, and a bounded question. It becomes unsafe when it is the writer's only access to source wording or detail that can change the artifact. Repeated coordinator distillation also makes it difficult to tell whether a later defect came from the source, the first summary, or the second handoff.

### Routine operator notes may not repay their cost

The current rules require a note for an evidence-producing operator dispatch even when the operator performs one deterministic action and returns the target, resulting state, verification, metadata changes, and residual effects. No reuse data currently shows that the duplicate file has value in the routine case.

### Writer, coordinator, and helper loops can multiply

At depth 2, an author cannot ask a leaf helper directly. It must return a gap to the coordinator. The coordinator dispatches a sibling helper, checks the result, and resumes the author. One lookup can therefore create four boundaries and several Sol-side turns. These loops can be justified for shared or consequential operations, but they are expensive as a universal path.

### Warm-coordinator and fresh-writer cost remains uncertain

The available author measurement covers substantial workflow analysis, not a representative Jira-writing task. The coordinator's recorded cost is cumulative across many turns, not the incremental cost of writing one artifact. Cache pricing makes a warm turn potentially cheap, but context growth, compaction, attention loss, and future-turn cost may favor isolation well before a token-only break-even point.

### This document reproduced the selection problem

The coordinator initially dispatched `artifact-author` to create this document. At that point, the coordinator already held the full discussion, checked evidence, cost measurements, destination, and intended audience. The human stopped the delegation because a fresh author had no clear isolation, continuity, or quality benefit that repaid its startup and handoff cost. The stop arrived after the child had written the first draft, so the coordinator reviewed and amended that draft directly.

The child used seven model turns, 59,831 uncached input tokens, 173,312 cache-read tokens, 8,902 output tokens, and 415 reasoning tokens. Its current-catalog cost estimate was `$0.494989`. Direct warm-coordinator creation was estimated at `$0.21` to `$0.29`, including comparable output and focused validation. Delegation therefore added an estimated `$0.20` to `$0.29` without demonstrated quality or isolation benefit.

The child ended with about 58,885 tokens in its active turn. Direct coordinator creation would likely have added about 8,000 to 12,000 tokens to the warm parent. The coordinator later read the complete child artifact, which removed most of that theoretical context isolation.

This incident supports a stronger selection rule: a matching artifact role is not enough to justify delegation. Before starting a fresh author, name the model-escalation, context-isolation, independent-composition, sustained-revision, or parallel-work benefit that the new session is expected to provide. If the warm coordinator already has the required context and can produce the artifact within its authority, write there by default.

## First-principles decision model

The redesign must decide each concern independently.

### Reusable evidence

Reusable evidence supports a named later consumer, preserves output that cannot be obtained again, satisfies an audit or reproduction need, or carries a material finding across a phase boundary. A producer-owned note can record source locators, status, freshness, findings, and invalidation conditions.

Reusable evidence is not a prerequisite for every child return.

### Lossless source access

The writer must be able to inspect source detail that can change the result. Valid access includes an exact local path, a stable remote locator plus a read tool, or a lossless snapshot when the source cannot be addressed again.

A summary can tell the writer what matters and what has been accepted. It must not become the only copy when an omission could change the writing.

### Ephemeral child returns

A bounded lookup, operation, or validation result normally needs to reach only its immediate caller. A typed result in session history can carry the target, outcome, verification, changes, source, and residual uncertainty. It does not need a second file unless the persistence test applies.

### Helper and tool access

The active writer can use one of three independent mechanisms:

- call a direct read or mutation tool for a bounded action within explicit authority;
- call a named non-delegating leaf helper for model-mediated procedure, independent context, credential isolation, or fault containment;
- return a request to the coordinator for a sibling helper when central authority visibility, shared state, or independent verification matters.

The choice of mechanism does not decide whether to persist a note.

### Writer selection

The writer can be the warm Sol coordinator or a fresh Sol author. Select the writer according to context location, expected editorial continuity, source volume, audience needs, and measured quality. Do not select a fresh author only because an artifact type has a matching role.

`agent-author` and `artifact-author` should remain distinct if their instruction and evaluation contracts remain distinct. Optional use does not require merging them.

### Publication authority

Drafting and publication remain separate authority decisions even when one session can do both. A direct tool call does not imply permission to mutate an external system. Every mutation needs an explicit target, intended effect, allowed scope, verification, and stop conditions.

### Persistence and durable promotion

A temporary evidence note and a durable knowledge artifact are different outcomes. Even when a persistence trigger requires a temporary note, moving the lesson into durable knowledge needs the owning workflow and separate authority.

## Designs considered

### Warm coordinator with direct tools

The Sol coordinator loads the destination skill, reads exact sources, writes and refines the artifact in the human conversation, and performs a narrowly authorized read or mutation through direct tools.

This design has the least handoff loss when the coordinator already has the source context and editorial intent. It avoids a fresh Sol startup and routine writer-helper loops. It can be a poor fit when bulky sources, screenshots, render traces, or many revision turns would crowd the coordinator and cause compaction or repeated large-context reads.

The source now permits the human-facing coordinator to create or revise an explicitly requested reader-facing artifact when the session already holds the relevant context and source access. That allowance does not grant operational mutation. Direct destination reads or writes still require their normal authority and suitable tool permissions, and broader direct-tool behavior remains provisional.

### Isolated author with direct tools

A fresh `artifact-author` or `agent-author` receives the owning skill, the exact artifact path, task intent, and lossless source locators. It reads the sources and performs bounded destination operations itself when explicit authority and permissions permit.

This design pays fresh Sol startup and may duplicate source reads. It protects coordinator context and retains editorial continuity inside a long artifact lifecycle. It fits long documents, distinct audience voices, sensitive context separation, substantial rendering work, or several expected revisions. The initial brief can still lose intent, so full source access does not remove the need for a precise task contract.

### Nested Luna leaf helper at depth 3

The Sol writer calls a named read helper or operation helper. Each helper receives one exact question or settled mutation envelope, returns a typed result, and cannot delegate. A helper writes a note only when the brief names an applicable persistence trigger.

This topology can remove repeated writer-to-coordinator loops and keep tool-heavy procedure on Luna. It requires effective depth 3 for `main -> orchestrator -> author -> helper` under the current agent mechanism, plus narrow author task permissions. It risks authority leakage, repeated helper loops, and source-detail loss if helpers summarize documents instead of returning locators or exact material.

The human is open to depth 3 if live measurements show that it removes real repeated loops and improves total cost or reliability. Preserving depth 2 is not a goal by itself.

### Coordinator-owned sibling helper

The writer returns a typed request to the coordinator. The coordinator dispatches or resumes a Luna helper, checks the result, and resumes the writer with the exact result and source locator.

This topology keeps dispatch and mutation authority centrally visible. It is suitable for consequential publication, shared external state, independent verification, or destinations whose credentials and tools must not be available to the writer. It has the most boundaries and the highest risk of duplicated Sol context for a small lookup or routine operation.

## Accepted and provisional directions

The routing decisions are accepted and implemented in source:

1. Keep bounded reader-facing artifact work in the warm human-facing coordinator when it already has the context and source access.
2. Dispatch `artifact-author` only when the human explicitly names that agent.
3. Keep instruction consultation, brainstorming, and small settled edits in the warm coordinator unless the human explicitly requests an independent `agent-author` perspective.
4. Route substantial, settled AI-instruction implementation to `agent-author` when behavioral coherence, related records or evaluations, or focused isolation provides concrete value.
5. Treat current structure as evidence rather than proof. Compare current-aligned and structural options when both are credible, and require a concrete benefit for restructuring.

The following directions remain provisional and need more evidence or a later implementation decision:

1. Remove mandatory notes for routine lookups, validations, and deterministic operations.
2. Use typed ephemeral returns for immediate caller needs.
3. Persist a note only under a checkable trigger.
4. Give the active writer lossless access to material sources. Use summaries for navigation and accepted status, not as source replacements.
5. Use direct tools for simple bounded reads and settled actions within explicit authority.
6. Keep depth 2 initially while measuring actual round trips. Consider depth 3 only for named non-delegating leaf helpers if measured loops justify the permission and topology change.
7. Keep publication authority explicit and independent of writer selection, helper topology, and note persistence.

## Checkable note-persistence test

Write a reusable evidence note only when at least one condition is true before return:

1. A named second consumer or later phase needs the result after the immediate caller's turn or child lifecycle.
2. The exact source or tool output cannot be safely obtained again, and losing it would require material reinvestigation or weaken a decision.
3. An audit, reproduction, independent-review, or provenance requirement needs a stable artifact beyond session history.
4. The result contains a non-obvious execution lesson or reusable finding with concrete expected reuse, and the coordinator accepts it as reusable evidence.
5. The human explicitly requests a persisted note.

If no condition applies, return only the typed result. Result size alone does not require a note when a stable locator provides lossless access. Every created note should name its trigger and expected consumer or preservation need.

A producer that discovers a trigger during execution can propose persistence in its return. The coordinator can authorize the exact note path before the producer closes when practical.

### Example typed return

```yaml
kind: operation
status: success
target: Jira issue OBSERVE-453
result: Description updated from the approved local Markdown body.
verification: Re-fetched OBSERVE-453 and matched the resulting description and updated timestamp.
changed:
  - Jira description
  - Local issue_id, issue_url, and last_synced front matter
residual: Jira notifications, history events, and other irreversible side effects were not removed.
source:
  artifact: docs/example-ticket.jira.md
  remote: https://example.atlassian.net/browse/OBSERVE-453
  observed_at: 2026-09-15T22:15:00Z
```

This routine return would not create a note unless one of the persistence triggers applied.

## Destination examples under the proposed decision model

### Jira

For a bounded Jira ticket whose design and wording already exist in the active conversation, the warm coordinator loads `jira-writer`, receives the full accepted plan path, and writes the local Markdown draft. Human feedback stays in the same conversation. After explicit Jira-write approval, the coordinator can use one narrowly scoped direct tool call if permissions distinguish the target and action. The writer runs the Jira drift and verification steps required by `jira-writer` and returns a typed operation result. No evidence note is created for a routine success.

For a substantial design ticket with a distinct audience or several expected revisions, the coordinator dispatches `artifact-author` if Jira is intentionally added to that role. The brief names `jira-writer`, the artifact path, the full plan path and status, and publication authority. The isolated author owns the editorial lifecycle. It may use direct Jira tools only if explicit authority and narrow permissions exist. Otherwise, a sibling operator handles the consequential external write after approval.

A one-line settled field correction can bypass a Sol writer and go directly to an authorized operator. A drift conflict stops the operation and returns the remote identity, timestamp, and relevant content. It does not silently merge or overwrite.

### Confluence

For a small or medium page that continues the active discussion, the warm coordinator loads `confluence-writer`, reads the full source, writes the local Markdown page, and refines it with the human. Every Confluence write still needs the fresh approval required by the owning workflow. A simple authorized create or update can use a direct tool, followed by re-fetch verification and metadata synchronization.

For a long design page with large source material and several expected revisions, use `artifact-author` to keep source, craft, and revision context out of the coordinator. Give the author the full source path, not only an evidence packet. A shared or consequential Confluence update can still return to the coordinator for a sibling operator if central visibility or credential isolation matters.

### Self-contained HTML

For a bounded visual artifact whose content is already warm, the coordinator can load `visual-explainer`, generate the HTML source of truth, and validate the rendered result if a future accepted design permits durable coordinator writes. For a complex artifact with screenshots, browser traces, or several correction rounds, use `artifact-author` so that rendering context does not crowd the coordinator.

Deployment is not implied. The human must name a destination and authorize publication. A direct deployment tool or helper is valid only when a destination-specific workflow defines the operation, verification, and recovery. The workflow must not invent Jira-style or Confluence-style metadata for HTML.

## Cost evidence and formula

### Cost model

For each model call `i`, measure cached input `Iᶜᵢ`, uncached input `Iᵘᵢ`, output plus reasoning `Oᵢ`, and relevant tool cost `Kᵢ`:

`C = Σᵢ(rate_cached(mᵢ) × Iᶜᵢ + rate_uncached(mᵢ) × Iᵘᵢ + rate_output(mᵢ) × Oᵢ + Kᵢ)`

A workflow comparison must also account for revisions, failures, and displaced coordinator context:

`EC(d) = C_fixed(d) + E[R_d] × C_round(d) + P_failure(d) × C_recovery(d) + C_context_displacement(d)`

`C_context_displacement` covers compaction, reconstruction, attention loss, or future repeated reads caused by putting source, craft guidance, screenshots, and operation traces into the coordinator.

### Current-catalog rates used in this investigation

The 2026-09-15 runtime catalog estimate used these base rates per 1 million tokens:

| Model | Uncached input | Cache read | Cache write | Output or reasoning |
|---|---:|---:|---:|---:|
| Sol | $4.00 | $0.40 | $5.00 | $20.00 |
| Luna | $0.20 | $0.02 | $0.25 | $1.20 |

These rates came from `models.dev` through the local session-cost script. They differ from the older uncached list-price snapshot in `docs/model-selection.md`, which records Sol at $5 input and $30 output and Luna at $1 input and $6 output. Any continuation should refresh the catalog before relying on the figures.

All dollar values in this document are estimates, not invoices. OpenCode stored cost was `$0.00` for the inspected sessions.

### Observed session usage

| Session and scope | Model | Completed turns | Uncached input | Cache read | Output | Reasoning | Estimate |
|---|---|---:|---:|---:|---:|---:|---:|
| Coordinator, completed persisted usage | Sol/medium | 14 | 74,822 | 520,704 | 4,613 | 2,851 | $0.6568496 |
| Explore child, full session | Luna/high | 25 | 182,156 | 2,196,480 | 12,208 | 3,309 | $0.0989812 |
| Agent-author child, initial authoring boundary | Sol/medium | 12 | 57,700 | 308,352 | 6,141 | 1,716 | $0.5112808 |
| Agent-author child, final resumed session | Sol/medium | 15 | 125,513 | 425,984 | 11,864 | 3,478 | $0.979286 |
| Artifact-author child, portable document | Sol/medium | 7 | 59,831 | 173,312 | 8,902 | 415 | $0.494989 |

The coordinator value is cumulative across 14 completed turns and is not the incremental cost of one direct-writing turn. Its last completed-step context was 57,253 tokens while the session remained active. The agent-author task was substantial workflow analysis, not a representative Jira-writing benchmark. Its initial `$0.511` measurement preceded a resumed first-principles reconsideration; the final session cost was about `$0.979`.

The author estimate can be reproduced as:

`57.7k × $4/M + 308.352k × $0.4/M + (6.141k + 1.716k) × $20/M = $0.51128`

### Illustrative direct-writing bands

For one warm Sol coordinator turn, use:

`C_direct = 0.000004 × U + 0.0000004 × C + 0.000020 × Y`

Here, `U` is uncached input, `C` is cache-read input, and `Y` is output plus reasoning.

| Case | Uncached `U` | Cache read `C` | Output plus reasoning `Y` | Estimate |
|---|---:|---:|---:|---:|
| Small warm ticket | 2k | 40k | 1.5k | $0.054 |
| Medium warm document | 8k | 80k | 6k | $0.184 |
| Source-heavy warm document | 20k | 80k | 6k | $0.232 |

These bands are examples, not observations. Against the measured `$0.511` author invocation, they suggest direct-writing savings of about `$0.28` to `$0.46` before context displacement and later turns.

If a direct turn reads 60k cached tokens and produces 4k output-plus-reasoning tokens, its token estimate reaches `$0.51128` after about 101.8k additional uncached input tokens:

`U_break = ($0.51128 - 60k × $0.4/M - 4k × $20/M) / ($4/M) ≈ 101.8k`

The approximate 102k threshold is not a recommendation to add that much context. Compaction, attention loss, and future-turn cost can justify an isolated author much earlier.

Cache effects are material. At the rates above, 100k Sol input tokens cost about `$0.04` as cache reads and `$0.40` when uncached. The observed author read about 308k cached tokens for `$0.123`. Those tokens would have cost about `$1.233` uncached. With its uncached input and output, an all-cache-miss version of the observed task would cost about `$1.62`, compared with the observed estimate of about `$0.51`.

An illustrative Sol revision round with 2k uncached input, 60k cache-read input, and 2k output-plus-reasoning costs about `$0.072`. A Luna helper with 10k uncached input, 20k cache-read input, and 1k output-plus-reasoning costs about `$0.0036` in isolation. The helper's real workflow cost also includes the Sol writer's request and integration turns.

Token cost alone cannot settle the design. A valid comparison needs comparable artifact classes, quality targets, human edit effort, failures, latency, duplicate source reads, compaction, and revision history.

## Local author-session evidence

A complete inventory of the active personal-computer OpenCode store found 24 `agent-author` or `artifact-author` sessions from 2026-09-05 through 2026-09-15:

- one `artifact-author` session, which created this document;
- 17 instruction implementation or edit sessions, including one failed session;
- six read-only instruction consultations;
- nine sessions that were resumed, corrected, or retried.

The resumed sessions accounted for about `$31.16` of the `$52.66` total current-catalog estimate. Continuation was sometimes useful, especially for coherent multi-file instruction implementation, but human-feedback relay was a material cost. One instruction-edit session ran for 109 completed turns across nine dispatches, reached about 252,000 tokens at its peak turn, compacted once, and cost an estimated `$13.58`. It demonstrated real context isolation and focused implementation continuity, but also repeated source loading, skill loading, parent handoffs, and correction loops.

The representative parent and child sessions used the same Sol/medium model. The local evidence therefore demonstrated no model-escalation benefit. It also lacked paired quality scores, reliable human edit time, time to acceptance, and representative Jira, Confluence, or render-heavy HTML author sessions.

The evidence supports different treatment for the two roles:

- `artifact-author` is explicit-by-name because human-facing artifact work is often iterative and the only local case added cost without demonstrated benefit.
- `agent-author` remains the implementation specialist for substantial, settled instruction batches because it repeatedly kept behavioral instructions, records, evaluations, and validation coherent. Consultation, brainstorming, and small warm edits remain in the human-facing coordinator unless the human explicitly requests an independent perspective.

These accepted routing changes do not prove that isolated authors never help. The work-computer investigation must still test model escalation, large render payloads, paired writing quality, human editing effort, and direct human-facing author sessions.

## Investigation to run on the work computer

The work computer may have the prior sessions and a more representative history. Use it to replace assumptions with paired or closely matched evidence.

### Identify relevant prior sessions

Find sessions that produced or revised Jira issues, Confluence pages, self-contained HTML artifacts, or AI-facing instructions. Include examples with:

- a warm coordinator writing directly;
- a fresh `artifact-author` or `agent-author`;
- an operator or helper round trip;
- several human revision turns;
- a drift conflict, publication failure, or context reconstruction when available.

Do not depend on the optional session IDs in the provenance section. Search by date, artifact path, external item ID, role, and task description.

### Record comparable measurements

Record per-turn rather than only cumulative usage. Separate uncached input, cache read, cache write, output, and reasoning. Also record source reads, handoffs, note creation and later note reads, human editing, defects, and context effects.

Use a table with this schema:

| Field | Meaning |
|---|---|
| Artifact class | Jira, Confluence, HTML, or AI instruction |
| Artifact locator | Stable local path and remote ID or URL when applicable |
| Complexity | Short correction, bounded draft, substantial synthesis, or render-heavy artifact |
| Writer topology | Warm coordinator, isolated author, nested helper, or sibling helper |
| Model and variant | Effective model for each participant |
| Turn locator | Session ID plus message or sequence identifier |
| Uncached input | Per-turn tokens |
| Cache read and write | Per-turn tokens |
| Output and reasoning | Per-turn tokens |
| Source access | Exact paths, remote locators, excerpts, or summary-only access |
| Duplicate reads | Sources read by more than one participant without a distinct need |
| Handoffs | Direction, payload type, and whether the return crossed the coordinator twice |
| Notes | Trigger, expected consumer, later reads, and whether the note prevented reinvestigation |
| Revisions | Model rounds and human edit rounds |
| Human edit effort | Time, edit distance, or categorized changes |
| Quality | Blind score or accepted-content defects against the same rubric |
| Operations | Direct tool, leaf helper, sibling operator, drift result, and verification |
| Context effects | Compaction, reconstruction, missed requirements, or later repeated reads |
| Estimated cost | Refreshed catalog estimate with formula and retrieval time |

For quality comparisons, use the same source packet and destination rubric when possible. Compare factual completeness, source fidelity, audience fit, structure, clarity, required human edits, and time to acceptance. Do not treat longer output or fewer turns as quality by itself.

### Classify handoffs and note reuse

For each handoff, determine whether it carried:

- accepted task intent;
- a lossless source locator;
- an ephemeral lookup or operation result;
- reusable evidence for a named later consumer;
- a routine note that no one read;
- a summary that replaced source access;
- a request that could have been one direct tool call.

Inspect whether the writer lacked source access, lacked the necessary tool, or lacked mutation authority. These are different causes and need different fixes.

### Determine whether depth 3 removes real loops

Count repeated author-to-coordinator requests for bounded reads or settled actions. For each loop, estimate the Sol request and integration cost, the coordinator checking cost, and the Luna helper cost. Then compare that path with a direct tool call and a hypothetical named leaf helper.

Depth 3 has measured value only if a narrow helper removes repeated loops without creating new authority failures, source-detail loss, or helper retries. One unusual operation is not sufficient evidence for a global depth change.

### Questions that could reverse the provisional direction

- Does warm direct writing cause more compaction, missed requirements, lower blind quality, or human editing than fresh authoring?
- Does a fresh author produce enough quality or continuity gain to repay duplicated context and startup?
- Are routine evidence notes later read, and do they prevent material reinvestigation?
- Are typed returns lost or insufficient after child closure?
- Do coordinator sibling handoffs cause wrong-target publication, lost source detail, or repeated source loading?
- Would direct writer tools make authority and recovery harder to audit?
- Do nested helpers leak authority, enter loops, or cost more Sol integration work than they save?
- Is Jira work mostly terse operational bookkeeping, making specialist prose unnecessary?
- Does Confluence or HTML work have enough source and rendering payload to justify isolation earlier than token cost suggests?
- Can platform permissions distinguish reads from writes and narrow a mutation to the destination and operation? If not, does a helper boundary remain necessary?

Evidence that answers these questions can weaken or reverse any part of the provisional direction.

## Implementation status and possible later areas

The accepted routing and anti-anchoring changes updated these source paths and their owning authoring records:

- `skills/active/orchestrator-mode/SKILL.md`;
- `opencode/agents/artifact-author.md`;
- the orchestrator-mode and agent-author records under `/home/mark/workspace/knowledge/personal-knowledge/authoring-records/mfz-home/`.

The changes have not been rendered with `mfz apply`, committed, pushed, or tested through a live routing scenario.

The following paths may change only if later decisions accept the corresponding provisional behavior. This list is an impact map, not authorization to edit them.

- `skills/active/orchestrator-mode/SKILL.md`: replace the all-dispatch note rule, define typed returns and persistence triggers, or add a helper topology.
- `opencode/agents/orchestrator.md`: adjust permissions only if a later direct-tool or helper topology requires it.
- `opencode/agents/artifact-author.md`: add direct-tool or leaf-helper access only if later evidence supports it.
- `opencode/agents/agent-author.md`: add narrow helper or tool permissions only if later evidence supports it.
- `opencode/agents/operator.md`: align compact typed returns and selective note behavior while preserving explicit mutation authority.
- `profiles/base/profile.yml`: change `subagent_depth` only if measured evidence supports nested leaf helpers; add only named task permissions needed by the accepted topology.
- `profiles/personal/profile.yml`: change only Personal-specific model or permission policy. Keep shared behavior in `base`.
- `skills/active/jira-writer/SKILL.md`: clarify the relation between editorial ownership, direct publication, and mechanical sync if live tests show ambiguity.
- `skills/active/confluence-writer/SKILL.md`: preserve the fresh approval gate and drift behavior while clarifying any accepted writer or helper split.
- `skills/vendor/visual-explainer/SKILL.md`: likely remains the HTML craft and render owner. Do not add a generic deployment contract without a named destination.
- The applicable Skill Authoring records under `/home/mark/workspace/knowledge/personal-knowledge/authoring-records/`: update the owning records and evaluations with any accepted behavioral change. Resolve record ownership before editing because the inspected evidence did not identify a standalone `artifact-author` record.

Any accepted change to this Mindframe-Z home must follow repository guidance, including `mfz guide`, authoring-record requirements, validation, and a separately authorized `mfz apply`. This investigation grants none of those actions.

## Evaluation scenarios for an accepted redesign

Use observable scenarios such as these to evaluate behavior:

- A warm coordinator with the full accepted plan writes a bounded Jira draft directly. One explicitly authorized tool call publishes it. No child or evidence file exists.
- A long Confluence design uses `artifact-author` because the brief names source isolation and multi-turn continuity as expected benefits. The author receives the full plan path.
- An author needs one current remote field. A direct read tool or one narrow helper returns a typed ephemeral result without a note.
- A consequential Confluence update returns to the coordinator for a sibling operator. The author resumes with the exact remote locator and drift state.
- A routine operator success returns the target, result, verification, changes, and residual effects without a file.
- An operator that discovers a reusable recovery constraint proposes a note and names the later consumer.
- A note without a persistence trigger fails validation.
- A summary with a stable accessible source path passes source-transfer validation. A summary without the source fails when omitted detail could matter.
- General author delegation remains denied. If nested helpers are enabled, only named non-delegating helpers are allowed, and the effective depth supports exactly that topology.
- An HTML artifact is rendered and checked through the real browser path. A publication request with no named target stops without deployment.
- A drift conflict stops the write and returns the smallest consequential decision to the human.

## Provenance and continuation limits

The source investigation was coordinated in OpenCode session `ses_f58febe1fffej30p3Z3OkeWizP` on 2026-09-15.

`artifact-author` produced the initial version of this document before a stop request reached it. The coordinator then read the complete file, added the live delegation example above, and accepted responsibility for the final working document. Treat the incident as evidence for the investigation rather than as validation of the original dispatch.

Optional child-session provenance:

- Explore: `ses_f58fe090dffehQvsSm1cLNY4Io`
- Agent-author: `ses_f58fa408fffe7rAa2764TnLt77`
- Inspect: `ses_f58ece4edffeK5EPaNlILAXQM7`
- Author-session inventory: `ses_f58625d4fffevMPubfDkCoBVsa`
- Author-session value analysis: `ses_f5850e83effeYKIdT12yob8Gcw`
- Accepted routing implementation: `ses_f583ea516ffe0tKyWVYQfmXJMj`

The temporary evidence directory used during the investigation was under `/tmp/opencode/orchestrator-workspaces/author-operator-workflow-ses_f58febe1fffej30p3Z3OkeWizP/`. That directory and the child sessions may not exist on the work computer. This document includes the material facts, reasoning, formulas, and next investigation questions needed to continue without them.

Repository source remains authoritative for current behavior. Before continuing, inspect the repository-relative files named in this document and check for changes since 2026-09-15. Runtime pricing, session usage, and external-system behavior require fresh evidence.
