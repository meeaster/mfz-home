# Workspace and coordination

## Establish the workspace

Before the first evidence-producing dispatch, the Chief establishes or resumes `/tmp/opencode/orchestrator-workspaces/<effort>/`. Name the effort for the user's overall goal, using their terminology. Keep that name across research, design, implementation, and verification. Use an accepted project name when available; otherwise use a descriptive name without inventing a product name.

Add an empty `sessions/<current-session-id>.md` marker and retain earlier markers. These filenames support filesystem lookup across sessions; they carry no content. When asked to resume a named effort, reuse its directory and working files through [Recovery and continuity](recovery-and-continuity.md).

The human approved this temporary root for orchestration. Keep session working directories outside it and confirm it is external to each writer's active Location and project worktree; carry that confirmation in the brief.

The standing orchestrator owns `<effort>/assignments/<assignment-id>/`, including its coordinator files, full child roster, index, and producer notes. Every producer it dispatches directly, including a small lookup, consultation, implementation, or review, receives a unique owned `evidence/<producer-id>.md` beneath that assignment and the `orchestrator-task-evidence` skill requirement. This provides reusable findings without predicting their future value. Internal helpers return findings to their immediate parent; the direct child preserves relevant results, attribution, evidence links, and limits in its own note. A helper needs the skill and a separate shared note only when explicitly assigned that evidence responsibility. This adds no mandatory research stage and does not apply to ordinary conversation outside orchestration.

A producer that cannot write its assigned note returns the exact conflict and attributed file-ready findings; assign the fallback to yourself and preserve attribution with minimal rewriting. Never bypass a harness denial or silently change roles.

Workspace writes cover assigned notes, assigned source captures, and coordinator files only. The broad temporary-directory permission does not enforce ownership or grant project mutation. Preserve privacy, omit secrets and unrelated sensitive data, and promote needed durable material only through a separately authorized owning workflow. Temporary files may disappear; session history owns the trace.

Producers own their evidence notes. The orchestrator accepts producer packets; the Chief owns effort decisions and final acceptance. On explicit Chief instruction, the scribe maintains shared state files that transcribe decided state, including `context.md`, one assignment-pointer row in the effort `index.md` for each completed assignment, and authorized synthesis. That maintenance transfers neither decision authority nor ownership of producer notes.

## Source captures

Use `sources/` for raw material extracted or exported from another system when the task calls for retaining it, such as a Teams meeting transcript. Create it when needed. Source captures are inputs; producer findings belong in `evidence/` and link to the captures they use. Retaining a source does not require an analytical finding.

Assign each capture an owner and exact path in the brief, subject to the writer's permissions. Preserve the extracted content in its supplied format when practical; keep summaries and interpretation outside the capture. Record its origin or source locator, extraction time, and material omissions, conversion, or redaction in the producer note or existing index entry. Describe a partial extraction as partial. Preserve earlier captures when collecting a changed version.

Release captures after writing completes, and select their paths for downstream readers as needed. Catalog retained captures in `index.md` with their provenance and limits; storage alone does not establish accuracy or acceptance.

## Coordinator files

Write files for their purpose below, keeping decisions, useful reasoning, and evidence links rather than execution logs. The Chief owns effort-level coordinator files and delegates their transcription to the scribe; the orchestrator owns assignment-level coordinator files. Routine coordinator files need no general writing skill.

| File | Purpose and creation condition |
| --- | --- |
| `context.md` | Required when establishing the workspace. Capture the current understanding from the conversation: goal and why it matters, human priorities/preferences, constraints and waivers, accepted decisions and rationale, consequential rejected directions, open questions, and next step. |
| `screenshots/` | Selected rendered evidence when validation produces captures. Use the [screenshot evidence contract](child-contracts.md#screenshot-evidence); retain the revision and view mapping in the existing owner note or helper return. |
| `design.md` | Optional accepted technical design needed across units: boundaries, responsibilities, flows, interfaces, invariants, and tradeoffs. Create only after acceptance. |
| `synthesis/<topic>.md` | Focused evidence-informed reasoning for reuse, created only on explicit request or acceptance of the root skill's recommendation. May connect findings, compare options, and include preferences and decisions. Mark its reasoning as provisional, recommended, or accepted. A summary, checklist, readiness marker, or worker brief alone is not synthesis. |
| `coordination.md` | Optional multi-unit dependencies, owners, status, must-preserve invariants, acceptance criteria, and evidence locators. One coherent worker keeps acceptance in its brief. |
| `index.md` | At effort level, one scribe-maintained pointer row per checked assignment. At assignment level, the orchestrator's catalog after the first producer note or source capture is complete and checked; update it after each checked return or parallel batch with path, contents, reuse value, and material freshness, gaps, conflicts, or supersession at claim/topic level. |

Maintain `context.md` when discussion materially changes the goal, constraints, decisions, direction, or next step. Reconcile changed authority and completed actions with existing constraints, current state, and next steps instead of appending competing updates. Keep operational detail in producer notes and mark superseded state in the index. Preserve useful reasoning rather than a transcript or activity log. Keep proposals and unresolved choices distinct from accepted decisions. Include its path in child briefs when higher-level understanding helps, while keeping the child's assignment and authority explicit in the brief.

Resume each coordinator's scribe session across its workspace cycles. Scribe dispatches default to pointer briefs naming the dispatching coordinator's `sessionID` and focus so every cycle pulls the current delta; pass no marker because the scribe remembers and uses its own position. Mark a cycle `no pull` only for a purely mechanical file operation fully specified in the brief. Keep the applicable workspace's `Scribe cursor:` value only as a recovery anchor for diagnostics or a lost scribe, not as a routine seed. A fresh scribe calls `session_context` without `sinceMarker` and receives the full active post-compaction window; after a marker mismatch or empty delta caused by source compaction, it performs one full pull and continues normally.

Working files supply background, not new assignments. Keep required constraints and the complete current assignment in the dispatch prompt or its expressly designated authoritative specification. Avoid worker-brief files, planned index placeholders, copied findings, skill inventories, and process histories. Distinguish changed state or resolved gaps from contradictions; one superseded claim need not invalidate its whole note.

Link selected effort context into assignment briefs rather than copying it. Directory nesting does not change the depth boundary, and the standing orchestrator never dispatches another orchestrator.

## Select and release evidence

Select relevant notes, working context, design, synthesis, and lessons for each brief using [Child contracts](child-contracts.md). State each item's status and applicability. Fresh independent children must use only selected sibling, enclosing-workspace, or other-assignment evidence; pass explicit exclusions. Let readers choose how to read selected documents.

Release dependent readers only after producer return and completed writing, including fallback notes. Serialize later note updates with reads. Check findings and material changes before cataloging them; update subsequent briefs accordingly. Give children direct relevant paths, using the index only when discovery or relationships help.
