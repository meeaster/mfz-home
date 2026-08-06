# Vision

## Problem

Skill authoring easily collapses into editing one prompt file. That loses the intended behavior, the evidence behind decisions, reusable evaluation cases, maintenance knowledge, and the reasons earlier approaches changed.

## Intended Behavior

Skill Authoring guides an agent from intent to a complete, reviewable skill package or explicit command. It begins with behavior and invocation semantics rather than formatting. The separately managed `writing-for-agents` skill owns runtime writing quality. Its bundled OpenAI-derived planning reference contributes concrete examples, degrees of freedom, reusable-resource planning, and layered validation without carrying Codex-specific mechanics or a competing lifecycle. Both load at the start because they are required inputs with distinct roles.

The process supports creating, revising, reviewing, diagnosing, evaluating, and maintaining skills and explicit commands. It distinguishes narrow tuning from redesign, keeps development context outside ordinary runtime context, and leaves consequential intent and promotion decisions with the user. Meta artifacts preserve distinct views of the same behavioral contract, so intent, observable assertions, upkeep, and rationale may deliberately overlap with runtime instructions without copying generic authoring doctrine. Review, diagnosis, evaluation, and design do not authorize file changes by themselves; the requested outcome determines whether the process returns a proposal or modifies an artifact.

Live evaluation uses isolated task workspaces and captured session traces. It states the execution and inspection capabilities required while leaving commands and session-store mechanics to available environment guidance. When incremental value is the question, it optionally compares a new skill with no skill or a revision with its previous version. Observed defects drive the smallest authorized revision followed by the same scenario and an adjacent regression scenario; apparent prose quality and agent self-report are insufficient evidence.

Real uses also feed a bounded dogfooding synthesis. Observations remain provisional there until repeatable evidence promotes them into evaluations or accepted design decisions.

Skill Authoring is deliberately user-invoked because authoring and assessment are intentional activities rather than background behavior.

Every resulting skill contains `SKILL.md` and four uppercase process artifacts under `meta/`: `VISION.md`, `EVALS.md`, `MAINTENANCE.md`, and `LOG.md`. Their presence is consistent; their depth is proportional to the skill. An OpenCode command is instead one explicitly invoked Markdown prompt template; destination-owned development metadata may remain outside the rendered command.

## Portability

The core behavior, skill development contract, and planning guidance travel with Skill Authoring. Runtime writing quality is supplied by the separately managed `writing-for-agents` skill rather than copied into this package. OpenCode command mechanics are disclosed only for that destination; other provider-specific metadata and discovery behavior stay in the environment guidance that owns them.

The runtime process must not depend on a particular person's private notes, machine paths, workspace layout, project, knowledge system, or installation tool. It may use repositories, prior interactions, traces, or supplied notes when they are available and relevant. Add harness-specific guidance only when a harness changes the behavioral contract; command syntax and session storage belong to the environment capabilities that own them.

## Success

A successful run chooses the artifact from its invocation and resource needs, then produces or improves runtime instructions containing only relevant material. Skill packages remain understandable without reverse-engineering `SKILL.md`; commands remain explicit, single-file prompt templates; evaluations describe observable behavior and available development metadata preserves the maintenance path and consequential history.

## Non-Goals

- One universal runtime shape for every skill.
- Treating observed patterns as an exhaustive taxonomy.
- Reimplementing complete upstream skill creators or their provider-specific evaluation suites instead of adapting the distinct guidance this workflow needs.
- Copying source sessions, research, or notes into runtime instructions.
- Replacing Git history with `LOG.md`.
- Automatically installing, promoting, or publishing a skill without authorization.
