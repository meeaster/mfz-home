# Orchestrate design

Worked out with Mark on 2026-10-06 to 2026-10-08, with verification and handoff added on 2026-10-12. Orchestration is part of Cairn, and its goals are in [Cairn's vision](../../packages/cairn/VISION.md). It replaces the orchestrator in [`docs/archive/orchestrator`](../archive/orchestrator/architecture.md) and the deferred [general subagent simplification](../archive/general-subagent-simplification.md). Checked against the [scenarios](scenarios/README.md).

## Why it was rebuilt

The old skills grew to about 7,300 words, and a direct orchestrator read about 5,500 of them before its first dispatch. Much of that was defensive wording added after incidents. The new skill gives the model guidance that fits Mark's process and leaves the mechanics to the model and to plugins. It is one `SKILL.md` of about 2,600 words. Length is watched, not capped: anything the orchestrator needs in every session belongs in it, which is why the role table moved back in after runs showed the lead re-reading a separate `roles.md` before every dispatch.

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

| Group | Role | Task types | Came from |
| --- | --- | --- | --- |
| Gather | explorer | | `explore` |
| Gather | researcher | | `research` |
| Gather | inspector | | `inspect` |
| Gather | prototyper | | `prototype` |
| Advise | architect | | `architect` |
| Advise | triage | `escalation` | `triage` |
| Advise | reviewer | `code`, `pr`, `instructions` | `reviewer`, `pr-reviewer` |
| Advise | qa | | new: judges look and feel in the browser |
| Build | implementer | `frontend`, `instructions`, `backend` | `worker` |
| Operate | operator | `git`, `pr`, other | `operator`, the global Git delegation rule |
| Record | writer | | `artifact-author` |

Model bindings live in the profile-selected `orchestration-routing` skill. Personal's [routing skill](../../skills/active/orchestration-routing/SKILL.md) preserves the initial model choices. Work supplies its own skill with Tyler gateway aliases. Each profile selects only its own routing skill; the shared base selects neither. Tiers such as an upgrade model are deferred.

Deferred: ui-ux-designer, session-analyst, agent-author. Experimental: scribe. Results are saved by the plugin, and the conversation export already records the session, so continuous transcription has to prove its value again; captures go to a writer on request.

## Decisions

- **The brief carries the job.** A subagent shouldn't have to work out how to do its job. The orchestrator puts the role's expectations into the brief: how to operate, boundaries, what to return, when to stop. A long procedure is named as a skill for the subagent to load, because retyping it would spend the orchestrator's expensive output tokens on every dispatch.
- **Models come from a separate routing skill.** The shared orchestrator loads `orchestration-routing` before dispatching. The routing skill holds the human's model preferences for the active profile, with task-specific bindings before role defaults. An explicit request from Mark wins. An unavailable skill, binding, or model requires a human choice rather than a provider fallback. The orchestrator passes the selected reference and starts the dispatch description with the role name, which Cairn records for per-role cost. Roles and briefing expectations stay in the shared workflow, while model choices stay in each home. The implementation commands use the same bindings without entering orchestration. No dispatch plugin or named-agent catalog is needed.
- **Routing stays current.** Continuing orchestration in a fresh session, changing profiles, or editing bindings requires loading the current routing skill again. Worker routing leaves the lead's selected model unchanged. Orchestration does not select or depend on a primary agent's memory implementation.
- **One owner for coupled work.** An implementer owns infrastructure changes from edit through plan, apply, and verify, with review of the plan and Mark's approval before apply. Splitting work between agents needs a concrete gain: a different model worth paying for, different access, independence, or a procedure the first owner lacks.
- **The lead proposes the shape of the work.** At Frame, the orchestrator says how much process the task needs, such as "small change: one implementer checks its own work, no inspector or review", and the human can override it. Scaling to the task stays a judgment, but a visible one.
- **Acceptance criteria and their verification plan come first.** Before building, the orchestrator turns the request into criteria the human could observe and confirms them. Each criterion carries how it will be verified and at what evidence level, planned after reading the repository's verification article. When the request already states observable requirements and asks to proceed, the orchestrator states the criteria and plan and continues rather than stopping to ask. They go into implementer briefs and are the inspector's checklist. Without them, nothing can check that the result matches what was meant.
- **Verification is designed, not improvised.** When a criterion can't be verified with what exists, that is settled during design, with the human: a way to verify that fits the change is built in as part of it (a dry-run mode, a fixture folder, chosen for the least added surface); one that needs larger infrastructure means accepting a lower evidence level now and recording a verification gap; and what can't be observed at all is agreed to be reported as not verified. During verification, agents don't add flags, environment variables, or test-only paths to make a check possible; an unplanned gap is reported instead. Architect options include how each option would be verified, since being easier to verify is a real advantage.
- **Evidence has levels.** When the real thing can't be exercised, the strongest available evidence is gathered and its level reported: static checks, a dry run or plan, the real pipeline on a branch, a non-production target, then observing the real thing. A result says which level it reached.
- **Verification gaps live in Cairn, not the repository.** Each repository has one verification article in the Cairn root (see [terminology](../../packages/cairn/TERMINOLOGY.md)): how to verify each kind of change there, and its gaps. Gaps are the human's proposals to decide on, and they must work in repositories the human can't or shouldn't commit to. Subagents report each criterion's level, with a gap column for those below level 5; the orchestrator treats every criterion below level 5 as a gap, whether or not a subagent named one, has a writer record it in the article with `effort-context` before handing off (creating the Cairn root's `knowledge/` when absent), and ends its report with a Gaps section, one line per gap with its idea and cost plus the article's path, supplying the idea itself when needed and even when recording fails; only the human accepts or declines one. When a repository gains its own committed verification skill, the how-to moves there and the gaps stay in Cairn.
- **Verify, review, and QA are separate.** The implementer verifies its own work. After any change a user can exercise (UI, CLI, or API) an inspector checks the acceptance criteria in the background, cheaply and independently. A reviewer reads the code. QA, on request, judges whether the interface looks and feels right, which needs a stronger model; findings the human accepts become criteria. Implementers and inspectors load the [`verification`](../../skills/active/verification/SKILL.md) skill, named in the brief. QA loads the project's own verification skill, when there is one, only to reach every screen.
- **The work loop and the handoff are separate layers.** Inside the loop, results are working material for the orchestrator. When work is ready for the human, a final inspector pass checks every criterion against the finished code and saves evidence for the human's review, because review repairs can invalidate earlier evidence. The orchestrator reports each criterion with its evidence, the findings with their resolutions, and any verification gaps; for a PR, `operator/pr` puts the same in the description. This replaces handing over the implementer's own report. In supervised work the human watched the loop, so the orchestrator offers the final pass rather than running it; a PR always gets it, because its reviewer didn't watch.
- **Guidance work is its own task type.** Writing skills, agent instructions, and prompts is different work from writing code, so `implementer/instructions` and `reviewer/instructions` have their own routing rows (Personal: `gpt-6.1-sol#high` for both, chosen by the human on 2026-10-12) and load `writing-for-agents` with the matching authoring skill. `reviewer/code`'s code-quality review doesn't fit guidance. Guidance is verified through a fresh agent session at the level the plan agreed, up to an eval against a baseline.
- **Triage is cheap and makes a case.** Default triage runs on `gpt-6-luna#max` and loads the `debugging` skill, which the brief names because cheap models rarely load it from its description. It returns a case for the lead to accept or reject: the likely cause, the facts behind it, and what it ruled out. The lead decides the fix with Mark. The orchestrator dispatches default triage without asking, because it costs about a cent. Escalation reruns triage on `gpt-6.1-sol#high` when the case is weak or a fix based on it fails, and needs Mark's agreement. Triage gathers its own evidence unless that evidence is too large, scattered, or access-restricted for one agent. The [debugging skill evaluation](../debugging-skill-evaluation.md) is the evidence for this choice. This replaces the earlier rule that triage ran on Sol and needed Mark's explicit request.
- **Review repairs go to a fresh implementer.** Its scope is the findings and the files involved, and browser checks aren't cached, so a continued session saves little. Continuing the same subagent is for follow-ups on one assignment, such as applying an approved infrastructure plan.
- **Efforts are opt-in.** Orchestration no longer creates a provisional effort on entry; `effort-context` loads when Mark asks to capture, attach, or resume. This replaces the 2026-09-25 decision in the [Cairn design](../cairn/design.md) that orchestration creates a provisional effort.
- **Chief is archived.** The nested orchestrator wasn't being used and felt clunky. The catalog keeps its `workstream` and `subject` fields for a future multi-session mode.
- **design-partner stays separate.** It is how to think with Mark and can be selected alone. `orchestrate` loads it as a skill and adds delegation; its `SKILL.md` holds the whole method with no references. Its briefing guidance for architects and prototypes moved into the roles.
- **The old agents are archived.** Their files are in `opencode/agents/archive/` and their profile entries are removed; only `scheduled-worker` and `omp-advisor` remain. The `apply-spec`, `implement-design`, and `openspec-rolling-apply` commands now dispatch `general` with the matching role's model.
- **Briefs point to files.** The orchestrator's words are its expensive output tokens; a subagent reading a file is cheap input.

## Planned

- **Autonomous mode.** Today the human supervises throughout: expensive roles and each publication step wait for agreement. In autonomous mode, which only the human selects, the human takes part at two points: agreeing the acceptance criteria and their verification plan, and the handoff. Expensive roles are pre-approved within a cost budget, and commit, push, and opening a PR on a branch are pre-approved; merge and deploy still wait for the human. Handoff evidence is always produced, because the human didn't watch. The switch is made from evidence: how often supervised runs needed correcting (rejected criteria, overridden findings, evidence that proved wrong).
- **A handoff record and review page.** The final inspector pass writes a structured record (criteria, results, evidence paths, findings and resolutions, gaps) that Cairn renders as a page and opens at handoff, and that feeds a PR's description. How evidence images reach a PR is open.

## Plugin and configuration work

1. **Follow-ups append.** The Cairn plugin appends a continued subagent's reply to its saved result under a `Follow-up` heading, so a reply that only covers the follow-up keeps the original.
2. **Nested dispatch.** Built-in `general` denies `subagent`. The base profile allows `general` to dispatch `general`, so implementers and operators can use explorers and researchers and writers can use inspectors. The existing `experimental.subagent_depth: 3` bounds the nesting.

## Testing

Run each scenario's ask through `opencode run` in a fresh session with orchestrate selected, and compare the session records against the scenario: roles dispatched, brief contents, models, and cost.
