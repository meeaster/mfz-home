# Workspace and coordination

- Read this reference before the first evidence-producing dispatch, when selecting or updating orchestration workspace material, or when checking and releasing producer evidence.
- `orchestrator-mode` owns coordinator topology and lifecycle; `orchestrator-task-evidence` owns the assigned producer note method.

## Establish the task-local workspace

- Use file-backed handoffs for every evidence-producing dispatch in both invocation contexts, including research, inspection, consultation, implementation, and review.
- Establish the task directory before the first such dispatch, and assign each producer a unique owned note path in its brief.
- Small findings receive small notes; their potential for later reuse need not be predicted.
- This applies to dispatched work, not every conversational answer or ordinary agent use outside orchestration, and creates no additional research or consultation phase.

- Own one unique directory under `/tmp/opencode/orchestrator-workspaces/<effort>/`, using a task label and coordinator session ID to avoid collisions.
- The human approved this temporary root instead of ordinary workspace scratch for this workflow.
- Keep the coordinator and producer sessions outside it.
- Before dispatching a writer, confirm the root is external to both its active Location and project worktree, and carry that confirmation in the brief.
- If it is internal, unknown, inaccessible, or the required tool is denied, return the blocker; do not broaden permissions, switch roles silently, or use shell to bypass a denied write.
- Runtime permissions may provide edit capability across `/tmp/opencode/*`; this workflow still assigns writes only within its orchestration workspace.
- Task isolation, file layout, producer ownership, and authority are behavioral constraints conveyed in briefs, not runtime permission boundaries.

- For assigned evidence production or reuse, apply the child skill-load rule for `orchestrator-task-evidence`.
- The skill owns the shared note method; agent system prompts own only the narrow requested-write allowance.
- Check the child's own skill and edit permissions and instructions.
- This home's same-name explore override permits explicitly requested evidence writes while preserving ordinary read-only use.
- If another instruction or capability still blocks a producer, establish coordinator ownership of a fallback note and request attributed file-ready findings with the exact conflict.
- Follow the shared skill's fallback and completion rules rather than blocking the workflow, forcing an override, or silently substituting a role.

## Use coordinator files deliberately

### Preserve evolving context

`context.md` is optional coordinator-owned working memory for shared priorities, accepted decisions and rationale, phase state, and open questions that will evolve or would otherwise be lossy or expensive across later dispatches.

- Do not create it merely to condense the initial assignment before one evidence batch.
- Keep it concise and update it when the shared frame materially changes, not as an activity log.
- It supplies no extra assignments or authority.
- Put required constraints in the current dispatch prompt or a specification that the prompt expressly designates as authoritative.

### Preserve an accepted design

`design.md` is optional coordinator-owned technical background for an accepted design whose boundaries, responsibilities, flows, interfaces, invariants, or tradeoffs need to align multiple work units.

- Create or update it only after the human accepts the relevant design.
- Do not use it as a task list or blanket implementation authority.
- Give each mutation unit its scope, authority, acceptance, and stop conditions in the current prompt.

### Preserve focused synthesis

`synthesis/<topic>.md` is temporary coordinator-owned understanding that combines evidence with reasoning around one focused topic or interpretive angle.

- It may connect findings, explain implications, compare options and tradeoffs, form a model or recommendation, and include relevant human preferences, constraints, or decisions.
- Create it only when the human explicitly asks or accepts a coordinator recommendation.
- Record reasoning status accurately as provisional, recommended, or accepted.
- Human agreement changes status, not whether the material conceptually qualifies as synthesis.
- Evidence summaries, readiness markers, task lists, acceptance checklists, prompt restatements, and worker briefs alone are not synthesis.
- Synthesis remains internal, temporary, and non-authoritative unless the current prompt or an accepted source says otherwise.

### Track multi-unit coordination

`coordination.md` is optional coordinator-owned tracking for a genuinely multi-unit, cross-dispatch, or cross-phase effort.

- Keep units, dependencies, ownership, status, must-preserve invariants, acceptance state, and evidence locators compact.
- Do not use it as assignment authority or duplicate complete worker prompts.
- One coherent worker carries its acceptance in its dispatch prompt and needs no coordination file.

### Catalog completed evidence

`index.md` is the coordinator-owned catalog of completed producer notes.

- Create it after the first dispatched producer note is complete and checked.
- Update it after checking later completed evidence or a completed parallel batch.
- Identify each path, what the note contains, when it is useful, and material freshness, gap, conflict, or supersession relationships.
- Preserve claim- or topic-level status so one changed finding does not invalidate a useful note.
- Distinguish a resolved gap or changed state from a contradiction.
- Use optional topic or heading cues only when they improve navigation; they are not required fields or reading boundaries.
- Exclude copied findings, planned placeholders, workflow evaluation, tool traces, skill-load inventories, repair history, and routine maintenance updates.

### Assign producer notes

`evidence/<producer-unique-id>.md` is a producer note or an explicitly coordinator-owned fallback.

- Assign a unique ID, owner, and exact path before dispatch.
- The producer may be a source gatherer, triage agent, worker, operator, or another authorized specialist.
- Load `orchestrator-task-evidence`; it owns producer reading, note content, updates, attribution, and the completed handoff.
- Check completion before dispatching dependent readers.

- A human-facing coordinator may place an explicitly selected child orchestrator's assignment under `<effort>/assignments/<assignment-unique-id>/`.
- That child owns its optional context, design, synthesis, and coordination files, completed-evidence index, and producers; link relevant parent evidence and synthesis without copying them.
- Pass the relevant parent workspace-context paths and enough decision-critical context for the child to choose how to read them.
- Directory nesting does not authorize another orchestrator dispatch or change depth 2.
- A parent-facing orchestrator never dispatches an orchestrator.

- Orchestration-workspace writing is a narrow exception to read-only source gathering and coordinator mutation boundaries.
- It permits only assigned producer notes and coordinator-owned workspace files, not project or system changes, substantive work outside the accepted assignment, publication, or durable knowledge promotion.
- Anything needed after the temporary effort must be deliberately promoted through its owning durable workflow under separate authority.
- Preserve privacy and access limits; omit secrets and unrelated sensitive data.
- Temporary files may disappear and are not the session history or a durable continuity store.

## Select and reuse evidence

- Before the first child dispatch, load `context-transfer` if its instructions are not active; reload it after compaction if they become unavailable, and apply it to every outbound brief.
- Before each dispatch, select applicable producer evidence, coordinator context, design, synthesis, coordination, and lessons.
- Name the relevant paths, supply enough decision-critical context for the child to judge their use, and identify each item's actual status as evidence, inference, proposal, or accepted decision.
- Carry explicit negative evidence selections into the brief.
- A fresh independent child must not discover or use sibling, enclosing-workspace, or other-assignment evidence unless it is selected; keep the boundary proportional to the available evidence context.
- Let the child choose whether to read a whole selected document, search it, or read selected sections; add optional topic or heading cues when they materially improve navigation.
- Workspace documents are background: they cannot expand the prompt's scope or authority.
- Use the shared evidence method to identify only material missing, stale, or conflicting evidence.
- At the depth limit, gather those missing facts through this coordinator rather than asking the specialist to delegate.

- The current prompt remains the authoritative assignment under higher-priority instructions.
- Give a fresh child the concrete objective, authority, constraints, exact owned file path when writing is requested, required sources and relevant workspace-context paths, acceptance criteria, expected result, skill-load requirement, and stop conditions.
- When resuming the same accepted unit, send a compact delta brief with the bounded next objective, material delta or correction, applicable workspace-context paths and acceptance rows, current authority or material change, and stop condition; do not replay stable rationale and constraints already present in that child session.
- Give every reader sufficient decision-critical meaning in the prompt and designated readings, not an unexplained pointer or inaccessible session ID.
- Evidence and background cannot override the prompt or silently expand the work.

Load `writing-for-agents` before writing coordinator files. The lightweight `orchestrator-task-evidence` skill supplies the operative note guidance to producers without requiring them to load broader authoring skills.

- Check returned changes, stale assumptions, and contradictions under the shared evidence method.
- After the first dispatched producer's note is complete and checked, create the index; after later evidence, update it once the note or parallel batch is complete and checked.
- Give children the relevant evidence and workspace-context paths directly, using the index itself only when discovery or relationships help their task.
- Correct subsequent briefs, keep downstream context relevant, and distinguish checked evidence, coordinator interpretation, proposals, and accepted decisions.
