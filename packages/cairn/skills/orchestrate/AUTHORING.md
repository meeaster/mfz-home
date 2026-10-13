# orchestrate

## Intent

The human's way of doing software work with AI in OpenCode. The session becomes the human's design partner and the lead of the work: it thinks and decides with the human and gets source-heavy work done by briefing role-based `general` subagents on models chosen per role.

Not for: ordinary sessions, entry the model selects on its own, creating or maintaining efforts unasked, or a nested multi-session lead (Chief, archived).

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
- **Results already saved by Cairn**: the lead searched the catalog for them again, or re-read the saved copy of a result it had already received.

## Decisions

- **Rebuilt from first principles, kept light** (human, 2026-10-09). The earlier orchestrator skills grew to about 7,300 words, mostly defensive rules added after incidents, until they became unruly. The skill only fits models to the human's process and lets them work from there. An incident becomes a learning, a plugin fix, or a test run first, and becomes a rule only when a run shows the model keeps getting it wrong and the rule fixes it.
- **Length is watched, not capped** (human, 2026-10-09). Anything the lead needs every session stays in `SKILL.md`. The role table moved back in after runs showed the lead re-reading a separate `roles.md` before each dispatch.
- **Every role runs on `general`, with boundaries stated in the brief** (human, 2026-10-07). Current models respect "read-only" in a prompt, so named agents with their own permissions weren't worth maintaining. A plugin hook that injected role instructions was proposed and rejected (human, 2026-10-09): the subagent shouldn't have to work out its job; the brief gives it.
- **Name skills to load; don't point at their files** (human, 2026-10-09). A brief says "load the `pr-review` skill", not "read this file".
- **Model bindings live in a separate, profile-selected `orchestration-routing` skill.** Personal and Work share this workflow but bind different models and gateway aliases, so the roles and briefing stay shared and each home owns its models. The initial bindings reused the old agents' models (human, 2026-10-09); tiers were deferred.
- **Confirm a model once per session, not per dispatch.** In trial runs the lead spent two steps on model lookups before every round of dispatches.
- **Researcher before implementer** (human, 2026-10-09). A trial implementer spent many turns on Context7 and web fetches. A saved documentation result is cheaper, and the implementer can still look up what it leaves out.
- **Parallelize cheap evidence gathering** (human, 2026-10-09), because gatherers run on cheap models.
- **Acceptance criteria are agreed before building** (human, 2026-10-12). The human has to trust that the result matches what they meant, and nothing can check that unless it is written down as something observable. The criteria travel into implementer briefs and are the inspector's checklist. A request that already states observable requirements and asks to proceed gets the criteria stated, not a confirmation stop (2026-10-12): asking again adds a round trip without adding information, and it would stall every "build it" request.
- **Two layers: the work loop and the handoff** (human, 2026-10-12). Inside the loop, agents check each other and their output is working material for the lead. Evidence for the human is gathered at handoff by a final inspector pass on the finished work, because review repairs can invalidate anything captured earlier. No new role: gathering evidence is observation, and presenting it belongs to the lead or `operator/pr`.
- **The lead proposes the shape** (human, 2026-10-12). Scaling the flow to the task was a silent judgment; a small change ran too much process or a large one too little, unseen. Stating it at Frame lets the human correct it.
- **Verification is planned with the design; gaps live in Cairn** (human, 2026-10-12). Some repositories can't be verified end to end (CI-only pipelines, deployments, servers out of reach). Each criterion gets a check and an evidence level at Frame; a way to verify that fits the change is designed in, and one needing larger infrastructure becomes a gap. Improvised hooks are ruled out because they pile up in the product (the human's example: environment variables). Gaps go to a per-repository verification article in the Cairn root, because they are the human's proposals and must work in repositories the human can't commit to.
- **The lead derives gaps from levels** (2026-10-12). In two `ci-only-change` runs the implementer rated level-2 checks as passes and named no gaps, and the lead, told to record "gaps the work reported", recorded nothing. The lead now treats every criterion below level 5 as a gap and supplies the idea itself when the subagent gave none, so the record doesn't depend on a cheap model's report. A writer records it, the role that owns knowledge write-ups: a later run gave the job to an implementer, which treated the empty Cairn root's missing `knowledge/` folder as a blocker, and the lead then dropped the ideas too, so the relay now holds even when recording fails. Once a writer recorded the article, the lead's terse final message dropped the ideas, so the report ends with a fixed Gaps section (human, 2026-10-12): the human wants each idea in front of them, not behind a link.
- **Handoff evidence is offered in supervised work, required for a PR** (human, 2026-10-12). The human watched supervised work, so a full pass is often redundant; a PR's reviewer didn't watch. The planned autonomous mode will always produce it.
- **Guidance work gets its own models and review** (human, 2026-10-12). Writing skills and agent instructions is different from coding, so `implementer/instructions` has its own routing row instead of falling back to the implementer default, and `reviewer/instructions` exists because `reviewer/code` loads a code-quality review that doesn't fit guidance.
- **Verification is a skill the brief names** (human, 2026-10-12). Implementers and inspectors load `verification`; the skill holds how, this one says who and when. QA loads the project's own verification skill only to navigate, since a pass/fail checklist would narrow its judgment, and accepted QA findings become criteria.
- **Inspector, QA, and reviewer are separate** (human, 2026-10-09). Checking acceptance criteria is cheap, so an inspector always runs in the background after any change a user can exercise; before 2026-10-12 this covered UI work only. Judging whether an interface looks right needs a stronger model, so QA runs only on request. Code review is a third job, split out after a reviewer conflated it with QA.
- **Triage is cheap and dispatched without asking; escalation needs agreement** (2026-10-12). Default triage costs about a cent on `gpt-6-luna#max` and must be told to load `debugging`, because cheap models rarely load it from its description. The repository's debugging-skill evaluation is the evidence. This replaced triage on Sol behind an explicit request.
- **Reuse is judged against the original assignment, not cache warmth.** This replaced a hard 150,000-token cutoff, which now serves only as a warning.
- **Efforts are opt-in** (human). This replaced the 2026-09-25 rule that entering orchestration created a provisional effort.
- **Chief archived** (human, 2026-10-07): unused and clunky. ui-ux-designer, session-analyst, and agent-author are deferred; scribe is experimental, because Cairn saves results and the conversation export already records the session.
- **Agent-facing records: audience, attribution, portability, and a source check** (human, 2026-10-12). Two writers persisted presentation research as Markdown in a Git repository for agents and the human to continue design work. Independent reviews found both compressed and paraphrased, because the brief said "concise" and never said agents would read it; attributed the lead's proposals and inferences to the human and invented reasons the human never gave; and used absolute machine-local paths in repository files. Nothing checked the record against its sources. So a writer's brief names its readers, the writer labels what the human stated apart from accepted and unanswered lead proposals, records cite only sources their readers can open, and the lead decides whether such a record is worth a cheap source check. Citing the source session message for each statement was tried and dropped (human, 2026-10-12): in the retest, writers cited message numbers in a session that exists only on the human's machine, once mistaking a file line number for one, and nobody else loading the repository could follow them. Because later readers can't check those sources, accuracy has to be established before the record is accepted; the check is still a judgment, not automatic every time. Plain repository context files go through the writer role, not `effort-context`, which serves Cairn efforts and records (human).
- **No personal names; say "the human"** (human, 2026-10-12). The skill already complied when this was set.
- **Only the human selects it.** Hidden from the model in both harnesses (`disable-model-invocation`, `opencode/autoinvoke: false`). Unlike `design-partner`, no workflow loads it, so Claude Code's full block costs nothing.
- **OpenCode-specific** (human, 2026-10-09). It relies on OpenCode's `general` subagent, model references, and the Cairn plugin's result saving. Test it with `opencode run`, not Claude Code.

## Sources

| Source | Revision | Local use |
|---|---|---|
| pstack (`cursor/plugins`, `pstack/`) | unpinned | Inspiration for the lifecycle flow (frame through ship) and for fewer named agents; nothing copied |
| poteto's posts on agent verification | 2026-10, summarized in `packages/cairn/sources/` | Verification as the base loop, evidence a reviewer can check faster than the change, and per-project verification skills |
