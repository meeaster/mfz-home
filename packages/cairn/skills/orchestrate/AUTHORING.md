# orchestrate

## Intent

The human's way of doing software work with AI in OpenCode. The session becomes the human's design partner and the lead of the work: it thinks and decides with the human and gets source-heavy work done by delegating by default to the roles that `roles` defines.

Not for: ordinary sessions, including one that delegates a single task or acts as another role (that is `roles` alone), entry the model selects on its own, creating or maintaining efforts unasked, or a nested multi-session lead (Chief, archived).

It serves the goals in Cairn's `VISION.md`: trusted delivery, design partnership, and cost control.

Success: the lead's expensive context goes to the human, decisions, and accepting results. Finished work reaches the human with evidence for each acceptance criterion they agreed to. Cheap models do evidence work, in parallel where it helps. Every publication step waits for the human's request. Each scenario finishes with the expected roles and no wasted dispatches.

## Scenarios

The repository's `docs/orchestrate/scenarios/` holds the full set, each with the ask, what should happen, what must not happen, and what done looks like: design doc, feature delivery, a small change, a legacy repository, a change that can't be run locally, infrastructure change, quick question, external research, live investigation, diagnosing a failure, a stuck bug, a prototype question, and capture and resume, plus autonomous feature delivery for the planned autonomous mode.

Wrong behavior seen in trial runs, which the skill must keep ruling out:

- **Research finishes during design**: the lead delegated a technology report nobody asked for, when it should have returned to the human as design partner.
- **Every dispatch**: the lead re-read a separate roles file, or spent steps looking up models it already had.
- **UI work reviewed**: one reviewer did code review and QA together.
- **Implementer on an unfamiliar library**: spent its turns on documentation lookups that a cheap researcher could have done first.
- **Evidence from inside the loop handed to the human**: an implementer's own report, or evidence captured before review repairs changed the code.
- **Trivial action delegated**: asked to open an HTML page in the browser, the lead dispatched a subagent for a one-command action.
- **Results already saved by Cairn**: the lead searched the catalog for them again, or re-read the saved copy of a result it had already received.

## Decisions

- **Verification articles live in the knowledge base and keep the human's gap decisions** (human, 2026-10-12; moved 2026-10-19). Orchestration folds verification gaps into a per-repository article, written with the `knowledge-base` skill; the gap rules sit in `references/verification-articles.md` because only orchestration needs them. Gaps are proposals only the human settles, and an article's "keep it current" step would otherwise let an agent drop a declined gap, which then gets proposed again. The rule that a missing article may be created came from an eval where a subagent found none in a fresh root and declined to write it.
- **Rebuilt from first principles, kept light** (human, 2026-10-09). The earlier orchestrator skills grew to about 7,300 words, mostly defensive rules added after incidents, until they became unruly. The skill only fits models to the human's process and lets them work from there. An incident becomes a learning, a plugin fix, or a test run first, and becomes a rule only when a run shows the model keeps getting it wrong and the rule fixes it.
- **Length is watched, not capped** (human, 2026-10-09). Anything the lead needs every session stays in `SKILL.md`. The role table moved back in after runs showed the lead re-reading a separate `roles.md` before each dispatch.
- **Roles live in their own skill; this skill is the lead's playbook** (human, 2026-10-13). The human wants to delegate a single piece of work from an ordinary session, and to have the session act as another role, such as the creative director, without entering orchestration. `orchestrate` is human-only and puts the session in lead mode, so the role content moved to `roles`, which the model can load. Delegating is a capability any role can have; orchestrating is the lead's way of working: delegating by default, the delivery flow, and handoff. The lead isn't defined in `roles`; assuming the lead means loading this skill, so there is one definition of it. `roles` holds the role decisions that used to be here. This reverses part of the 2026-10-09 decision to keep the role table in this file, which was made after the lead re-read a separate `roles.md` before every dispatch. A skill stays in context once loaded rather than being read as a file, and runs must confirm the lead loads `roles` once and dispatches from it without re-reading.
- **Researcher before implementer** (human, 2026-10-09). A trial implementer spent many turns on Context7 and web fetches. A saved documentation result is cheaper, and the implementer can still look up what it leaves out.
- **Trivial actions stay with the lead** (human, 2026-10-13). "Delegate running commands" led the lead to dispatch a subagent to open a page in the browser, where the brief and the result cost more than the action. The exception is a cost test rather than a list of cases so it covers the next trivial action, and it excludes file edits so small implementation doesn't drift back to the lead.
- **Parallelize cheap evidence gathering** (human, 2026-10-09), because gatherers run on cheap models.
- **Acceptance criteria are agreed before building** (human, 2026-10-12). The human has to trust that the result matches what they meant, and nothing can check that unless it is written down as something observable. The criteria travel into implementer briefs and are the inspector's checklist. A request that already states observable requirements and asks to proceed gets the criteria stated, not a confirmation stop (2026-10-12): asking again adds a round trip without adding information, and it would stall every "build it" request.
- **Two layers: the work loop and the handoff** (human, 2026-10-12). Inside the loop, agents check each other and their output is working material for the lead. Evidence for the human is gathered at handoff by a final inspector pass on the finished work, because review repairs can invalidate anything captured earlier. No new role: gathering evidence is observation, and presenting it belongs to the lead or `operator/pr`.
- **The lead proposes the shape** (human, 2026-10-12). Scaling the flow to the task was a silent judgment; a small change ran too much process or a large one too little, unseen. Stating it at Frame lets the human correct it.
- **Verification is planned with the design; gaps live in Cairn** (human, 2026-10-12). Some repositories can't be verified end to end (CI-only pipelines, deployments, servers out of reach). Each criterion gets a check and an evidence level at Frame; a way to verify that fits the change is designed in, and one needing larger infrastructure becomes a gap. Improvised hooks are ruled out because they pile up in the product (the human's example: environment variables). Gaps go to a per-repository verification article in the Cairn root, because they are the human's proposals and must work in repositories the human can't commit to.
- **The lead derives gaps from levels** (2026-10-12). In two `ci-only-change` runs the implementer rated level-2 checks as passes and named no gaps, and the lead, told to record "gaps the work reported", recorded nothing. The lead now treats every criterion below level 5 as a gap and supplies the idea itself when the subagent gave none, so the record doesn't depend on a cheap model's report. A writer records it, the role that owns knowledge write-ups: a later run gave the job to an implementer, which treated the empty Cairn root's missing `knowledge/` folder as a blocker, and the lead then dropped the ideas too, so the relay now holds even when recording fails. Once a writer recorded the article, the lead's terse final message dropped the ideas, so the report ends with a fixed Gaps section (human, 2026-10-12): the human wants each idea in front of them, not behind a link.
- **Handoff evidence is offered in supervised work, required for a PR** (human, 2026-10-12). The human watched supervised work, so a full pass is often redundant; a PR's reviewer didn't watch. The planned autonomous mode will always produce it.
- **Efforts are opt-in** (human). This replaced the 2026-09-25 rule that entering orchestration created a provisional effort.
- **Chief archived** (human, 2026-10-07): unused and clunky.
- **No personal names; say "the human"** (human, 2026-10-12). The skill already complied when this was set.
- **Only the human selects it.** Hidden from the model in both harnesses (`disable-model-invocation`, `opencode/autoinvoke: false`). Unlike `design-partner`, no workflow loads it, so Claude Code's full block costs nothing.
- **OpenCode-specific** (human, 2026-10-09). It relies on OpenCode's `general` subagent, model references, and the Cairn plugin's result saving. Test it with `opencode run`, not Claude Code.

## Sources

| Source | Revision | Local use |
|---|---|---|
| pstack (`cursor/plugins`, `pstack/`) | unpinned | Inspiration for the lifecycle flow (frame through ship) and for fewer named agents; nothing copied |
| poteto's posts on agent verification | 2026-10, summarized in `packages/cairn/sources/` | Verification as the base loop, evidence a reviewer can check faster than the change, and per-project verification skills |
