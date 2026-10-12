---
date: 2026-10-12
evals: [small-change]
criterion: scaled_to_task, brief_close
skill: orchestrate
file: SKILL.md
change: wording
outcome: inconclusive
environment: live
preset: budget
models:
  primary: { agent: build, model: openai/gpt-6.1-sol, variant: medium }
  subagents:
    implementer: { model: openai/gpt-6-luna, variant: max }
    inspector: { model: openai/gpt-6-luna, variant: high }
  judge: { model: openai/gpt-6.1-sol, variant: high }
runs: { before: "0/1", after: "not yet run" }
---

## Behavior targeted

`scaled_to_task` and `brief_close` failed. For a one-line sort change whose check Mark named, the lead dispatched one implementer (which loaded `verification`, ran `bun run todo list`, and reported per criterion with evidence) and then an `inspector: verify todo list ordering` it hadn't been asked for. The other nine criteria passed, including the behavior check and `no_confirmation_stop`.

## Change

The Verify bullet in the usual flow said to run an inspector "after any change a user can exercise", while the Frame bullet's example shape for a small change says "no inspector or review". The lead followed Verify. Appended to the Verify bullet: "Skip it when the shape you stated leaves it out, such as a small change whose implementer verifies its own work." Placed on the rule the lead followed, so the exception sits where the decision is made.

## Result

Not rerun yet: the eval runtime pins OpenCode 2.0.22, and Luna streams stalled in three runs on 2026-10-12, so reruns wait for the runtime question.

## Interpretation

Hypothesis: the lead treats a flow-stage rule as binding over an example given at Frame. Confirmed if the rerun skips the inspector while `frame-criteria` (which proposed "one implementer and an independent inspector" for a feature) still plans one.

## Locators

mfz-home `c0df510` with a dirty working tree (uncommitted orchestrate, verification, routing, and eval changes). Result: `benchmarks/orchestrate-scenarios/results/2026-10-12T21-25-40.215Z-79a19fdf`.
