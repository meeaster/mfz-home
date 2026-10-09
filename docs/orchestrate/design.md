# Orchestrate design

Worked out with Mark on 2026-10-06 to 2026-10-08. It replaces the orchestrator in [`docs/archive/orchestrator`](../archive/orchestrator/architecture.md) and the deferred [general subagent simplification](../archive/general-subagent-simplification.md). Checked against the [scenarios](scenarios/README.md).

## Why it was rebuilt

The old skills grew to about 7,300 words, and a direct orchestrator read about 5,500 of them before its first dispatch. Much of that was defensive wording added after incidents. The new skill gives the model guidance that fits Mark's process and leaves the mechanics to the model and to plugins. It is one `SKILL.md` of about 1,700 words. Length is watched, not capped: anything the orchestrator needs in every session belongs in it, which is why the role table moved back in after OptChat runs showed the lead re-reading a separate `roles.md` before every dispatch.

Keeping it light:

- Write the process and its judgment calls, not mechanics. Plugins own saving results.
- One line per rule. No edge-case lists and no "does not authorize" disclaimers beyond real publication boundaries.
- An incident becomes a learning, a plugin fix, or a test run first. It becomes a rule only when the model keeps getting it wrong and a run shows the rule fixes it.
- An addition replaces something or justifies its words.

## Primitives

| Primitive | What it is |
| --- | --- |
| Session folder | Every session's results land in its Cairn folder, saved by the plugin, ready to promote into knowledge articles and designs |
| Orchestrator | The session itself: design partner, splits work, delegates, accepts results |
| Role | A kind of job with a purpose, access, and expected result. Always dispatched to the built-in `general` subagent |
| Task type | A role specialization that changes only the model or skills, such as `implementer/frontend` |
| Skill | How to do the craft |
| Playbook | Which roles run in what order for a kind of task. Not written yet; the usual flow in the skill stands in |

A new job is a new role. Only a different model or skills is a task type. How to do the work is a skill. Ordering is a playbook.

## Roles

All roles run on `general`. Read-only is a boundary stated in the brief rather than a permission: current models follow it well, and an `execute.before` hook can block edits for read-only roles later if runs show it's needed. Built-in `explore` stays available outside orchestration.

| Group | Role | Task types | Initial model | Came from |
| --- | --- | --- | --- | --- |
| Gather | explorer | | `openai/gpt-6-luna#high` | `explore` |
| Gather | researcher | | `openai/gpt-6-luna#high` | `research` |
| Gather | inspector | | `openai/gpt-6-luna#high` | `inspect` |
| Gather | prototyper | | `openai/gpt-6.1-sol#high` | `prototype` |
| Advise | architect | | `openai/gpt-6-astra#medium` | `architect` |
| Advise | triage | | `openai/gpt-6.1-sol#high` | `triage` |
| Advise | reviewer | `code` | `openai/gpt-6-astra#medium` | `reviewer` |
| Advise | reviewer | `pr` | `openai/gpt-6.1-sol#high` | `pr-reviewer` |
| Advise | qa | | `openai/gpt-6.1-sol#high` | new: judges look and feel in the browser |
| Build | implementer | `frontend`, `backend` | `openai/gpt-6.1-sol#medium` | `worker` |
| Operate | operator | `pr` | `openai/gpt-6.1-sol#medium` | `operator` |
| Operate | operator | `git` | `openai/gpt-6-luna#high` | the global Git delegation rule |
| Record | writer | | `openai/gpt-6.1-sol#medium` | `artifact-author` |

Initial models are the Personal profile's current values for the old agents. Tiers such as an upgrade model are deferred.

Deferred: ui-ux-designer, session-analyst, agent-author. Experimental: scribe. Results are saved by the plugin, and the conversation export already records the session, so continuous transcription has to prove its value again; captures go to a writer on request.

## Decisions

- **The brief carries the job.** A subagent shouldn't have to work out how to do its job. The orchestrator puts the role's expectations into the brief: how to operate, boundaries, what to return, when to stop. A long procedure is named as a skill for the subagent to load, because retyping it would spend the orchestrator's expensive output tokens on every dispatch.
- **Models come from the roles table.** The orchestrator passes each role's model from the roles table in `SKILL.md` and starts the dispatch description with the role name, which Cairn records as the child session's title for per-role cost. An explicit request from Mark wins. A plugin hook that resolved roles to models was considered and rejected: behavior and expectations belong in the brief, not in plumbing. The subagent tool's description says not to set `model` unless the user asks; the skill is that standing request, and the first runs should confirm the model follows it. Per-profile models would need a profile-specific table; there is one table for now.
- **One owner for coupled work.** An implementer owns infrastructure changes from edit through plan, apply, and verify, with review of the plan and Mark's approval before apply. Splitting work between agents needs a concrete gain: a different model worth paying for, different access, independence, or a procedure the first owner lacks.
- **Verify, review, and QA are separate.** The implementer verifies its own work, including in the browser. After UI work an inspector checks the accepted requirements in the background, cheaply and independently. A reviewer reads the code. QA, on request, judges whether the interface looks and feels right, which needs a stronger model.
- **Review repairs go to a fresh implementer.** Its scope is the findings and the files involved, and browser checks aren't cached, so a continued session saves little. Continuing the same subagent is for follow-ups on one assignment, such as applying an approved infrastructure plan.
- **Efforts are opt-in.** Orchestration no longer creates a provisional effort on entry; `effort-context` loads when Mark asks to capture, attach, or resume. This replaces the 2026-09-25 decision in the [Cairn design](../cairn/design.md) that orchestration creates a provisional effort.
- **Chief is archived.** The nested orchestrator wasn't being used and felt clunky. The catalog keeps its `workstream` and `subject` fields for a future multi-session mode.
- **design-partner stays separate.** It is how to think with Mark and can be selected alone. `orchestrate` loads it as a skill and adds delegation; its `SKILL.md` holds the whole method with no references. Its briefing guidance for architects and prototypes moved into the roles.
- **The old agents are archived.** Their files are in `opencode/agents/archive/` and their profile entries are removed; only `scheduled-worker` and `omp-advisor` remain. The `apply-spec`, `implement-design`, and `openspec-rolling-apply` commands now dispatch `general` with the matching role's model.
- **Briefs point to files.** The orchestrator's words are its expensive output tokens; a subagent reading a file is cheap input.

## Plugin and configuration work

1. **Follow-ups append.** The Cairn plugin appends a continued subagent's reply to its saved result under a `Follow-up` heading, so a reply that only covers the follow-up keeps the original.
2. **Nested dispatch.** Built-in `general` denies `subagent`. The base profile allows `general` to dispatch `general`, so implementers and operators can use explorers and researchers and writers can use inspectors. The existing `experimental.subagent_depth: 3` bounds the nesting.

## Testing

Run each scenario's ask through `opencode run` in a fresh session with orchestrate selected, and compare the session records against the scenario: roles dispatched, brief contents, models, and cost.
