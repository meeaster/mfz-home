# orchestrate

## Intent

The human's way of doing software work with AI in OpenCode. The session becomes the human's design partner and the lead of the work: it thinks and decides with the human and gets source-heavy work done by briefing role-based `general` subagents on models chosen per role.

Not for: ordinary sessions, entry the model selects on its own, creating or maintaining efforts unasked, or a nested multi-session lead (Chief, archived).

Success: the lead's expensive context goes to the human, decisions, and accepting results. Cheap models do evidence work, in parallel where it helps. Every publication step waits for the human's request. Each scenario finishes with the expected roles and no wasted dispatches.

## Scenarios

The repository's `docs/orchestrate/scenarios/` holds the full set, each with the ask, what should happen, what must not happen, and what done looks like: design doc, feature delivery, infrastructure change, quick question, external research, live investigation, diagnosing a failure, a stuck bug, a prototype question, and capture and resume.

Wrong behavior seen in trial runs, which the skill must keep ruling out:

- **Research finishes during design**: the lead delegated a technology report nobody asked for, when it should have returned to the human as design partner.
- **Every dispatch**: the lead re-read a separate roles file, or spent steps looking up models it already had.
- **UI work reviewed**: one reviewer did code review and QA together.
- **Implementer on an unfamiliar library**: spent its turns on documentation lookups that a cheap researcher could have done first.
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
- **Inspector, QA, and reviewer are separate** (human, 2026-10-09). Checking accepted requirements is cheap, so an inspector always runs in the background after UI work. Judging whether an interface looks right needs a stronger model, so QA runs only on request. Code review is a third job, split out after a reviewer conflated it with QA.
- **Triage is cheap and dispatched without asking; escalation needs agreement** (2026-10-12). Default triage costs about a cent on `gpt-6-luna#max` and must be told to load `debugging`, because cheap models rarely load it from its description. The repository's debugging-skill evaluation is the evidence. This replaced triage on Sol behind an explicit request.
- **Reuse is judged against the original assignment, not cache warmth.** This replaced a hard 150,000-token cutoff, which now serves only as a warning.
- **Efforts are opt-in** (human). This replaced the 2026-09-25 rule that entering orchestration created a provisional effort.
- **Chief archived** (human, 2026-10-07): unused and clunky. ui-ux-designer, session-analyst, and agent-author are deferred; scribe is experimental, because Cairn saves results and the conversation export already records the session.
- **Only the human selects it.** Hidden from the model in both harnesses (`disable-model-invocation`, `opencode/autoinvoke: false`). Unlike `design-partner`, no workflow loads it, so Claude Code's full block costs nothing.
- **OpenCode-specific** (human, 2026-10-09). It relies on OpenCode's `general` subagent, model references, and the Cairn plugin's result saving. Test it with `opencode run`, not Claude Code.

## Sources

| Source | Revision | Local use |
|---|---|---|
| pstack (`cursor/plugins`, `pstack/`) | unpinned | Inspiration for the lifecycle flow (frame through ship) and for fewer named agents; nothing copied |
