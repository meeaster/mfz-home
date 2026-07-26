# Vision

## Problem

Skill authoring easily collapses into editing one prompt file. That loses the intended behavior, the evidence behind decisions, reusable evaluation cases, maintenance knowledge, and the reasons earlier approaches changed.

## Intended Behavior

Skill Authoring guides an agent from intent to a complete, reviewable skill package. It begins with behavior rather than formatting, reads its bundled `writing-great-skills` doctrine before skill work, and consults its bundled pattern catalogue only after a preliminary structure exists and examples would help.

The process supports creating, revising, reviewing, diagnosing, evaluating, and maintaining skills. It distinguishes narrow tuning from redesign, keeps development context outside ordinary runtime context, and leaves consequential intent and promotion decisions with the user. Review, diagnosis, evaluation, and design do not authorize file changes by themselves; the requested outcome determines whether the process returns a proposal or modifies a package.

Live evaluation uses isolated task workspaces and captured session traces. Observed defects drive the smallest authorized revision followed by the same scenario and an adjacent regression scenario; apparent prose quality and agent self-report are insufficient evidence.

Real uses also feed a bounded dogfooding synthesis. Observations remain provisional there until repeatable evidence promotes them into evaluations or accepted design decisions.

Skill Authoring is deliberately user-invoked because authoring and assessment are intentional activities rather than background behavior.

Every resulting skill contains `SKILL.md` and four uppercase process artifacts under `meta/`: `VISION.md`, `EVALS.md`, `MAINTENANCE.md`, and `LOG.md`. Their presence is consistent; their depth is proportional to the skill.

## Portability

The complete `writing-great-skills` doctrine and the maintained pattern catalogue are bundled references. Skill Authoring has no runtime dependency on separately installed authoring skills.

The runtime process must not depend on a particular person's private notes, machine paths, workspace layout, project, knowledge system, or installation tool. It may use repositories, prior interactions, traces, or supplied notes when they are available and relevant.

## Success

A successful run produces or improves a package whose intended behavior can be understood without reverse-engineering `SKILL.md`, whose runtime instructions contain only relevant material, whose evaluations describe observable behavior, and whose maintenance path and consequential history are preserved.

## Non-Goals

- One universal runtime shape for every skill.
- Treating observed patterns as an exhaustive taxonomy.
- Copying source sessions, research, or notes into runtime instructions.
- Replacing Git history with `LOG.md`.
- Automatically installing, promoting, or publishing a skill without authorization.
