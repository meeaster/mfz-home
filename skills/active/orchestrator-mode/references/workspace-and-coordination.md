# Workspace and coordination

## Establish the workspace

Before the first evidence-producing dispatch, establish or resume `/tmp/opencode/orchestrator-workspaces/<effort>/`. Name the effort for the user's overall goal, using their terminology. Keep that name across research, design, implementation, and verification. Use an accepted project name when available; otherwise use a descriptive name without inventing a product name.

Add an empty `sessions/<current-session-id>.md` marker and retain earlier markers. These filenames support filesystem lookup across sessions; they carry no content. When asked to resume a named effort, reuse its directory and working files through [Recovery and continuity](recovery-and-continuity.md).

The human approved this temporary root for orchestration. Keep session working directories outside it and confirm it is external to each writer's active Location and project worktree; carry that confirmation in the brief.

Every dispatched producer, including a small lookup, consultation, implementation, or review, receives a unique owned `evidence/<producer-id>.md` and the `orchestrator-task-evidence` skill requirement. This provides reusable findings without predicting their future value. It adds no research phase and does not apply to ordinary conversation outside orchestration.

Check the child's skill and edit permissions. The home's Explore override permits assigned evidence notes while ordinary exploration remains read-only. A blocked producer returns the exact conflict and attributed file-ready findings; assign the fallback to yourself and preserve attribution with minimal rewriting. Never bypass denied writes or silently change roles.

Workspace writes cover assigned notes and coordinator files only. The broad temporary-directory permission does not enforce ownership or grant project mutation. Preserve privacy, omit secrets and unrelated sensitive data, and promote needed durable material only through a separately authorized owning workflow. Temporary files may disappear; session history owns the trace.

## Coordinator files

Write files for their purpose below, keeping decisions, useful reasoning, and evidence links rather than execution logs. Routine coordinator files need no general writing skill.

| File | Purpose and creation condition |
| --- | --- |
| `context.md` | Optional evolving priorities, decisions and rationale, phase, and open questions that would otherwise be lossy or expensive across dispatches. Do not create merely to restate the initial assignment for one batch. Update when the shared frame materially changes. |
| `design.md` | Optional accepted technical design needed across units: boundaries, responsibilities, flows, interfaces, invariants, and tradeoffs. Create only after acceptance. |
| `synthesis/<topic>.md` | Focused evidence-informed reasoning for reuse, created only on explicit request or acceptance of the root skill's recommendation. May connect findings, compare options, and include preferences and decisions. Mark its reasoning as provisional, recommended, or accepted. A summary, checklist, readiness marker, or worker brief alone is not synthesis. |
| `coordination.md` | Optional multi-unit dependencies, owners, status, must-preserve invariants, acceptance criteria, and evidence locators. One coherent worker keeps acceptance in its brief. |
| `index.md` | Required catalog after the first producer note is complete and checked. Update after each checked note or parallel batch. Record path, contents, reuse value, and material freshness, gaps, conflicts, or supersession at claim/topic level. |

Working files supply background, not new assignments. Keep required constraints and the complete current assignment in the dispatch prompt or its expressly designated authoritative specification. Avoid worker-brief files, planned index placeholders, copied findings, skill inventories, and process histories. Distinguish changed state or resolved gaps from contradictions; one superseded claim need not invalidate its whole note.

An explicitly selected child orchestrator may own `<effort>/assignments/<assignment-id>/` with its own coordinator files, index, and producer notes. Link selected parent context rather than copying it. Directory nesting does not change the depth boundary.

## Select and release evidence

Select relevant notes, working context, design, synthesis, and lessons for each brief using [Child contracts](child-contracts.md). State each item's status and applicability. Fresh independent children must use only selected sibling, enclosing-workspace, or other-assignment evidence; pass explicit exclusions. Let readers choose how to read selected documents.

Release dependent readers only after producer return and completed writing, including fallback notes. Serialize later note updates with reads. Check findings and material changes before cataloging them; update subsequent briefs accordingly. Give children direct relevant paths, using the index only when discovery or relationships help.
