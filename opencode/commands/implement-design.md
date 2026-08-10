---
description: Implement the accepted current-session design through a fresh worker subagent
subtask: false
---

Turn the accepted design in this session into one tight execution brief, then immediately delegate its implementation to the native `worker` subagent.

This is an ephemeral handoff, not an OpenSpec change. Do not create or update proposal, specification, design, task, or other planning artifacts, and do not run OpenSpec commands.

Treat the following as optional additional scope or constraints from the user:

`$ARGUMENTS`

Use the current conversation and focused inspection of the relevant repository state to build the execution brief. Do not copy the session transcript. Preserve the accepted design rather than asking the worker to rediscover it.

Before writing or delegating the execution brief, complete this mandatory pre-delegation material-rule overlap check. Do not write the brief or delegate until every in-scope interaction is explicitly resolved or observably equivalent:

- Identify accepted rules with observable effects and inspect each pair or small combination with potentially overlapping input or state domains, including cases where one rule determines whether another is evaluated.
- Evaluate each combined case from the rules' independently stated predicates.
- Treat a shortcut, guard, exception, or disabled-state rule that could avoid validation, parsing, or an error rule as an interaction. If deciding whether the latter applies requires assuming the former takes precedence, it is unresolved rather than an ordinary implementation detail.

If accepted rules leave an interaction or precedence unresolved, and choosing an outcome would materially change behavior, scope, authority, error handling, compatibility, persisted data, or another acceptance criterion, do not resolve it yourself, describe one outcome as intended behavior, or delegate the choice to the worker. Ask the user a targeted question and stop until answered. Proceed without asking only when the accepted design explicitly resolves the interaction or the alternatives are observably equivalent. If focused repository inspection later reveals a previously unseen material ambiguity, do not invent semantics; report a concrete blocker naming the conflicting rules, affected observable behavior, and smallest decision needed. For ordinary implementation choices that do not meet this threshold, make reasonable, bounded choices from the accepted design and current codebase.

The execution brief must state:

- The problem being solved, why it matters to the user or system, the intended outcome, and observable acceptance criteria covering the happy path and any material edge or failure cases.
- Accepted design decisions and only the rationale the worker needs to preserve them.
- In-scope work, explicit non-goals, and any user-supplied constraints.
- The implementation workspace, applicable instructions, relevant repository paths or seams, and the current dirty-worktree boundary.
- The expected implementation approach, required focused validation, and what constitutes a pass.
- A blocker policy: resolve narrow implementation gaps from repository evidence, but do not synthesize new semantics or silently replace accepted design decisions. A concrete blocker must name the conflicting rules, affected observable behavior, and the smallest decision needed.
- An optional active work unit only as supplemental background, never as a substitute for the brief.

Use one fresh native `task` call with:

- a short outcome-based `description`
- `subagent_type`: `worker`
- no `task_id`
- the complete execution brief as `prompt`

Tell the worker to read the named context before editing, implement only the execution brief, preserve unrelated working-tree changes, run the declared validation, and return changed files, validation results, and unresolved issues.

After the delegation returns, compare the worker's result and current diff with the execution brief. Report the implemented outcome, validation status, and any mismatch or unresolved blocker. Do not initiate a second delegation or a separate review as part of this command.
