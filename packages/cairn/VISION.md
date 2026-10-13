# Cairn vision

Cairn is a system for doing software work with AI. A person can work through problems with it back and forth, and can also hand work to it and let it run on its own. This document is its maintainers' shared direction. Parts of it describe where Cairn is heading rather than what it does today. Where they differ, the direction here wins and the gap is work to do.

## North star

The human can say "this is what I want, go build it" and trust that the result matches what they meant, because Cairn shows them evidence instead of asking them to take its word. When they don't yet know what they want, the same system is a partner that researches, gathers sources, and learns their domain and constraints until both sides understand the problem the same way. And it does both at a cost they choose.

## Goals

**Trusted delivery.** Work is done when it has been verified, not when it has been written. The agent that builds something runs it the way a user would: a CLI command, an API call, a page in the browser. It returns an artifact that shows the work is correct, shows it matches what was asked for, and is easier to review than the change itself, such as screenshots, a recording, or command output. Verification is an approximation and can be wrong, so it is checked independently where the cost is justified. When the real thing can't be exercised, as with a deployment or a CI-only pipeline, the strongest available evidence is gathered and its level is stated, rather than passed off as verified.

**Design partnership.** Before building, Cairn thinks with the human. It researches, compiles sources, and builds up an understanding of their domain, their constraints, and what they mean, then recommends rather than surveys. Research serves the conversation: it comes back to the human instead of turning into work nobody asked for.

**Cost control.** Each job runs on a model chosen for that job. Expensive models go where judgment matters: the conversation, decisions, verifying, and reviewing code and requirements. Cheap models do evidence gathering and well-specified implementation. A cheap implementer checked by a stronger verifier is often the right trade. Model choices are configuration the human controls, and cost is measured per role so the choices can be checked against what they buy.

**Continuity.** Work survives the session it happened in. The human can return to an effort weeks later, see everything done for it across sessions, and pick it up.

## Principles

- **Evidence over assertion.** A claim that something works comes with the evidence behind it. Separate jobs check separate things: the implementer verifies its own work, an independent check confirms the accepted requirements, and a reviewer reads the code.
- **Design for verification.** How each requirement will be verified is decided while the work is designed, not discovered after it is built. A way to verify that fits the change is built in cleanly, as part of the change. One that needs larger infrastructure, such as a test environment, is proposed for the human to decide on, never improvised during verification.
- **The work loop and the handoff are different audiences.** Inside the loop, agents check each other, and what they produce is working material. When work is ready for the human, because it is done or a pull request is opening, evidence is gathered again from the final state and shaped for their review.
- **The human decides.** Cairn recommends; the human decides. Agents don't approve direction, and they surface a conflict with this vision instead of resolving it themselves. Committing, pushing, and publishing need the human's approval, given for each request or in advance by choosing a more autonomous way of working; merging and deploying always wait for the human.
- **Cairn gets better with use.** Each piece of work leaves behind what it learned: how to verify things in that project, where verification falls short, what went wrong. The next piece of work starts further along. What changes behavior or structure goes through the human.
- **Autonomy is earned with evidence.** The human chooses how much to supervise. Handing over more of the workflow is a decision made from how often supervised work needed correcting, not from a feeling.
- **Mistakes become structure.** A repeated failure becomes a check, a type, a test, a plugin fix, or a learning before it becomes another rule. Instructions stay light because the structure carries the lessons.
- **Keep what earns its place.** Every skill, rule, role, and plugin should demonstrably change outcomes. Ones that don't are removed, and an addition replaces something or justifies its cost.
- **Spend expensive context on thinking.** The lead's context goes to the human and to decisions. Source-heavy work is delegated, and briefs point to files rather than restating them.
- **Every handoff loses intent.** Passing work between roles or models compresses what was meant into a brief or a result, and each further translation, such as spec to mockup to build, loses more. A handoff earns its place by saving cost or settling a decision the human can see. When later work needs the original intent, such as revising a creative direction, continuing the session that holds it is preferred to briefing a fresh one. Roles and stages are added when measured outcomes show they help, not to complete a process.
- **Skills are chosen, not matched.** A subagent loads the skills its brief names, and a session assuming a role loads the skills that role names, not whatever skill descriptions happen to match. Skills that teach a tool load whenever that tool is used. Skills that bring their own taste, such as a visual or writing style, load only when the role or task calls for them, because they make decisions that belong to the human or to a creative role.
- **Plain names.** Cairn is the one proper noun. Its parts are named for what they do.

## Parts

- **Catalog**: the record of sessions, efforts, and the files and URLs they produce. It holds pointers and descriptions, never file contents.
- **Roles**: each role defines a job (its purpose, boundaries, expected result, skills, and model), where a task type can add skills, exclude them, or require that they be chosen explicitly. A role can be delegated, briefed to a subagent, or assumed by the main session when the human wants to work with it directly; a session in any role can still delegate to others. Any session can use roles without entering orchestration.
- **Orchestration**: the lead role, which holds the conversation with the human and proactively delivers work through other roles, and `design-partner`, which is how the conversation is held.
- **Effort context, learnings, and design docs**: continuity across sessions, operational lessons, and the agreed record of what is being built and why.

A new part belongs in Cairn when it serves the goals above. A general-purpose skill that stands on its own does not.

## Not goals

- Running without the human. Autonomy means they can hand work off and trust the result, not that they stop deciding.
- Formal guarantees. Cairn aims for verified, reviewable work, not proofs of correctness.
- Entering orchestration or creating efforts on the model's own initiative. Quick questions and one-off tasks stay light.

## Changing this vision

Cairn's maintainers own this document. Agents check their changes against it and propose edits when work shows it is wrong or incomplete. When an accepted decision changes the direction, this document changes in the same piece of work.

## Further reading

- [Cairn design](../../docs/cairn/design.md) and [terminology](TERMINOLOGY.md)
- [Orchestrate design](../../docs/orchestrate/design.md) and [scenarios](../../docs/orchestrate/scenarios/README.md)
- [Agent verification and codebase-as-memory (poteto)](sources/poteto-agent-verification.md): outside thinking that informs the trusted-delivery goal
