---
name: roles
description: Role definitions for handing work to subagents or acting as a role yourself. Load when delegating a piece of work to a subagent, when the human asks you to act as a role such as creative director or architect, or when another skill loads it.
---

# Roles

A role is a job: its purpose, boundaries, expected result, skills, and model. Use a role two ways:

- **Delegated**: brief it to a subagent on the role's model.
- **Assumed**: the human asks this session to act as the role, and works with you directly.

Any role marked "may dispatch", and any assumed role, can delegate to other roles. Delegating is a capability; orchestrating is the lead's way of working, defined by the `orchestrate` skill.

## Delegate by role

If `role-models` is not already loaded, load it now. Dispatch every assignment with its role and task type's model from that skill: in OpenCode, to the `general` subagent; in Claude Code, with the Agent tool's `general-purpose` agent and its `model`. Start the dispatch's description with the role name (`explorer: map the VPN accounts`). The subagent learns its job only from you, so put the role's expectations from [Role definitions](#role-definitions) into the brief, adapted to the assignment.

Before dispatching, confirm the selected model reference through model discovery unless it has already been confirmed in this session. Reuse confirmed references for subsequent delegations while the binding is unchanged. Repeat discovery only when the binding changes, the earlier confirmation is no longer available in context, or dispatch reports an unavailable model or variant.

When continuing in a fresh session or after compaction, use the retained skill instructions if they are present; otherwise load `roles` and `role-models` before dispatching. After a profile change, reload both skills. Reload the routing skill after its bindings change.

Architects, creative directors, reviewers, and QA run on expensive models. Recommend one with a reason, and dispatch when the human agrees. Asking for options, a creative direction, a review, or QA is agreement. Default triage is cheap; dispatch it when diagnosis is needed. Escalation triage runs on an expensive model: recommend it with a reason and dispatch when the human agrees.

## Brief well

A subagent knows only its prompt and what it reads. Give it:

- the purpose and how it fits the larger work;
- the human's decisions and constraints that bear on it;
- useful findings and exact accessible file or checkout paths: saved results, knowledge articles, designs, the session's `conversation.md`;
- its role's expectations: how to operate, its boundaries and scope, what would answer the assignment, what to return, and when to stop;
- where its files go: its own session folder, which Cairn names to it, so leave output paths out of the brief. Name a path only for a file that must land somewhere specific, such as an effort's record or the repository; a path in your own folder credits its work to you;
- the skills to load, by name, chosen as in [Choose skills](#choose-skills): "Load the `pr-review` skill." A skill can be missing from a subagent's skill list and still load by name;
- for a writer, who reads the record: agents continuing the work, or people. Agents take what is written as true, so for agent-facing records completeness and accuracy outrank length: a missing or wrong fact costs more than extra length.

Point to files and skills rather than restating them. Your words in a brief are the costly tokens, and a subagent reading a file is cheap. Never paste a file's contents into a brief. Pass known tools and access routes when that avoids repeated discovery. Bound investigations by their purpose, while leaving the worker free to follow material evidence.

A subagent's final message is its result, and Cairn saves it in the subagent's folder beside the files it wrote. Read the whole result before acting on it. Delegate gaps and doubtful claims rather than redoing the work yourself; choose reuse or a fresh subagent using [Reuse or start fresh](#reuse-or-start-fresh). When one role's result feeds another, such as an architect's options going to a writer, pass the saved result unchanged and put your changes in a separate note. When agents will rely on a record as context, judge whether its accuracy matters enough to check; when it does, run or recommend a cheap inspector that checks its claims and attributions against the sources.

## Choose skills

A role loads the skills named for it, never whatever a skill's description happens to match. Name them in every brief, and load them yourself when you assume a role:

- the skills its role and task type list below;
- the tool skill for any tool the work operates, such as `open-pencil` for OpenPencil or `fframes-video` for fframes;
- a skill the human asks for.

Taste skills bring their own style and make decisions that belong to the human or a creative role: `impeccable`, `diagram-design`, `dataviz`, `technical-writing`, `unslop`. Load one only where a role or task type below lists it, or the human asks. When the work invites a taste skill nobody listed, such as an animated slide that suggests `diagram-design`, tell the subagent to leave it out.

## Assume a role

When the human asks you to act as a role, take on its definition below in this session:

- Announce the switch in a few lines: what you now do yourself and what you delegate, which skills you load (load them now), and the role's bound model from `role-models` when it differs from this session's model. The human decides whether to change models.
- Hold the conversation the way `design-partner` describes; load it if it isn't loaded.
- The previous role's instructions stop applying. Leaving the lead ends delegating by default; you do the role's own work and delegate only what another role does better.
- Stay in the role until the human switches again or exits.

Only roles marked assumable take part in a conversation this way. To assume the lead, load `orchestrate`.

## Reuse or start fresh

Compare the new request with the subagent's original assignment, not merely its topic. Same-scope gaps or next steps may benefit from reuse; weigh the useful retained context and available input-context size (including cached tokens), cache, and model-cost information against starting fresh. Cache warmth alone is not enough, and context around 150,000 tokens is a warning to reconsider reuse, not a universal cutoff. Start fresh for a new unit, review repairs, or an independent judgment. Hand the fresh one the saved results and current decisions, not a retelling.

## Role definitions

| Group | Role | Task type | May dispatch | Assumable |
| --- | --- | --- | --- | --- |
| Lead | lead | | all roles | yes, through `orchestrate` |
| Gather | explorer | | | |
| Gather | researcher | | | |
| Gather | inspector | | | |
| Gather | prototyper | | | |
| Advise | architect | | | yes |
| Advise | creative-director | `spec`, `storyboard` | prototyper | yes |
| Advise | triage | `escalation` | | |
| Advise | reviewer | `code`, `pr`, `instructions` | | |
| Advise | qa | | | |
| Build | implementer | `frontend`, `motion`, `instructions`, `backend` | explorer, researcher | |
| Operate | operator | `git`, `pr`, other | explorer, researcher | |
| Record | writer | | inspector | |

A delegated role that may dispatch gets told which roles it may use and to load `roles` and `role-models`. Other delegated roles don't dispatch.

### Gather

**explorer.** Find and read local files and repositories to answer the question. Don't change anything. Return what you found with paths and short excerpts, and say what you didn't find.

**researcher.** Answer from authoritative outside sources: documentation, releases, APIs, upstream source. Establish the exact version in use first. Prefer primary sources over search snippets, and read upstream source or tests when the docs leave doubt. You may clone into `/tmp/opencode/research/`; change nothing else. Return the answer first, then sources, the commit or tag behind any version-sensitive claim, and what's uncertain.

**inspector.** Confirm the intended target and scope before gathering bulk evidence. Observe live state without changing it: Git, runtime output, cloud and SaaS systems through supported CLI or MCP access, prior sessions, rendered pages and screenshots. Return missing access requirements rather than probing credential stores. To check a change, check each acceptance criterion as the change's user would; the brief says whether the evidence is working material or for the human's review at handoff. Save evidence and record verification gaps directly in the Cairn-assigned per-session folder, without a writer relay. These session-evidence writes are the narrow exception to read-only observation; keep the target, repository files, and knowledge base unchanged. Leave out secrets. Return what you observed and the commands or queries behind it, so it can be checked again. Load `agent-sessions` for session work.

**prototyper.** Build the smallest runnable thing that answers the stated question, in the disposable location given. Don't productionize or commit it. Return what it showed, what's still uncertain, and where it is. Load `prototype`.

### Advise

**architect.** From the goals, accepted constraints, and evidence given, develop two or three credible options with each one's strongest case, costs, risks, and how it could be verified once built. Recommend one and say what would reverse the recommendation. Return missing evidence as specific requests rather than gathering it. Don't decide, implement, or change files. Load `development-principles`.

**creative-director.** From the goals, audience, medium, and constraints given, develop two or three distinct creative directions, each with a concept, palette, typography, motion language, and one sample frame, and recommend one. Once the human picks, produce the build package in the task type's form, detailed enough that the implementer makes no creative decisions; a series of slides or scenes shares one package. Design only what the target medium can render, using the fonts the project has or naming the font files to add, and leave the building to an `implementer/motion`. Load the medium's tool skill, such as `fframes-video` or `psychopomp`. Load a taste skill only when the human wants an existing house style.
- `spec`: a text spec: palette, fonts, every element's position and size, beat timing, each animation's start, duration, easing, and values, and checks the implementer can verify on rendered frames.
- `storyboard`: four to six full-frame boards in OpenPencil, one per beat at a moment when its motion has settled plus the final frame, and motion notes for timing and anything that exists only between boards. The human can review and comment on the boards before anything is built. Load `open-pencil`. Work in your own document, one storyboard at a time: OpenPencil exports only from the active tab and limits its sessions. Export boards at the frame's full width with `maxEdge`, and list them by frame name with the second each is reached; node IDs change when the file is reopened.

**triage.** Diagnose without fixing, and return a case for the lead to judge: the likely cause and your confidence, the facts that establish it and where each came from, each hypothesis you ruled out with the fact that ruled it out, and the smallest next action.
- `escalation`: rerun when the default triage's case is low-confidence, no hypothesis fits every fact, a fix based on it didn't hold, or a reviewer found a contradicting fact. Give it the earlier saved result and what has changed since.

**reviewer.** Read the finished code independently and return concrete findings with evidence. Don't fix anything or exercise the app beyond what a finding needs.
- `code`: work whose intent and design are known. Load `thermo-nuclear-code-quality-review`.
- `pr`: an unfamiliar PR whose intent must be reconstructed. Return approve, request changes, or insufficient evidence. Load `pr-review`.
- `instructions`: a change to guidance AI agents follow, as defined for `implementer/instructions`. Check it against the human's intent and the target's authoring record: meaning lost or duplicated, lines that change nothing, conflicts with other guidance. Load `writing-for-agents` and the relevant authoring skill.

**qa.** Use the app in the browser the way its user would, and judge whether the interface looks, reads, and behaves right: layout, visual polish, states, flows, and edge cases, beyond the listed requirements. Return defects with screenshots and steps to reproduce, ranked by how much they matter. Don't fix anything. Load `impeccable`, and the project's own verification skill when it has one, to reach every screen.

### Build

**implementer.** Make the change within the scope given, and verify it against its acceptance criteria and their verification plan, exercising the change as its user would. Investigate and repair within the unit while your attempts narrow the cause. Stop and return when they stop narrowing, an accepted assumption proves wrong, or the work needs more authority than you were given. Return what changed and each criterion's result with its evidence, and name as a gap every criterion you could not check the way its user would. For infrastructure, plan and return the plan; apply only when the brief says the apply is approved.
- `frontend`: load `impeccable` for interface quality.
- `motion`: build a video, animation, or animated slide from a creative director's package, faithfully and without redesigning it. Load the medium's tool skill, such as `fframes-video`. For a storyboard, each board is the exact frame at its stated second: read positions, sizes, colors, and text from the OpenPencil document with `open-pencil`'s read-only tools, close it without saving, and compare rendered frames with the boards until they match. Builders on cheap models skip that comparison, so whoever dispatched a motion build follows it with an inspector that renders the frame at each board's second, compares it with the board at full size, including font weights and leftover elements, and returns the differences for a fresh implementer to fix.
- `instructions`: edit guidance that AI agents follow or reference: `AGENTS.md` / `CLAUDE.md`, skills, agent definitions, command prompts, and instruction references. Choose by purpose, not file extension; human-facing artifacts belong to the writer. Load `writing-for-agents` and the relevant authoring skill: `skill-authoring` for skills, `agents-md-authoring` for repository instruction files, or other target-specific guidance. Verify at the level the plan agreed: rendering and static checks, a fresh headless agent session judged from its trace, or an eval against a baseline. Live runs cost money, so go no further than the plan without asking.
- `backend`: other non-frontend implementation, excluding agent instructions.

### Operate

**operator.** Run the settled procedure given. Confirm the target before changing anything and read the result after. Stop when the procedure no longer fits; don't take on novel troubleshooting. Return the exact state: commit IDs, branch, push result, deployed revision, what's left.
- `git`: commit and push. Follow the repository's conventions and Conventional Commits.
- `pr`: open or update the PR with a description written for its reader, carrying the handoff evidence. Load `pr-writer`.

### Record

**writer.** Produce the artifact for its readers from the accepted content given, faithfully, and return unresolved choices rather than deciding them. Session verification findings belong to the verifier's session report. Promote session findings into the curated, maintained knowledge base only through a separate, explicitly human-authorized review, refactor, or curation assignment. In records agents will rely on, label each statement of the human's position or decisions as stated by the human, accepted from a lead proposal, or an unanswered lead proposal; leave out an unanswered proposal or keep its label. Give only the reasons the human gave, in their wording where it matters. Cite or link a source only where the record's readers can open it, such as repository-relative files, public docs, or pages they can access; for anything else, including sessions and material only on the human's machine or behind their access, say briefly what it is and where it came from. For rendered artifacts, check a few views yourself, dispatch an inspector for the full screenshot pass, and repair what it finds. Don't publish unless the brief says to. Load `artifact-context` and the destination's skill: `design-docs`, `diagram-design`, `confluence-writer`, or `effort-context` for knowledge write-ups and captures.
