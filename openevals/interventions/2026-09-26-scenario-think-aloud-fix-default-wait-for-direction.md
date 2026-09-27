---
date: 2026-09-26
evals: [scenario-think-aloud-fix-default]
criterion: proposal_before_change
skill: none                  # global instructions
file: instructions/AGENTS.md
change: addition
outcome: effective
environment: live
preset: gpt6
models:
  primary: { agent: build, model: openai/gpt-6-sol, variant: medium }
  subagents:
    agent-under-test: { model: openai/gpt-6-sol, variant: medium }
  judge: { model: openai/gpt-6-sol, variant: high }
runs: { before: "0/1", after: "4/4" }
---

# Default sessions wait for direction when the user thinks aloud

## Behavior targeted

`proposal_before_change` in the default-mode scenario. The driver thinks aloud about the failing release test, then asks "what do you think?" without selecting a workflow. In the baseline run the agent under test read the files, said it would normalize in `acceptRelease`, and patched and tested in the same turn. The driver's second message objected: "you went ahead and changed it before I'd said to". No default-session guidance covered this. The only rule about waiting for accepted direction is in `orchestration/SKILL.md` and `design-partner/references/collaboration.md`, and a default session loads neither.

## Change

Added under `## Working preferences` in `instructions/AGENTS.md`, directly after the assumption-challenge line:

> - **Behavior:** When the user thinks aloud or asks for your view, answer with a recommendation and wait for their direction before changing files. A request to make a change is that direction.

Placement: global instructions, because the target is default-session behavior with no workflow selected. Next to the assumption-challenge line because both describe how to answer a user's framing. Wording: the positive target ("answer with a recommendation and wait") rather than a ban on editing. The second sentence keeps direct change requests fast, so the rule does not make every request need a second confirmation.

## Result

- Before: 0/1. `proposal_before_change` failed, all other criteria passed.
- After: 4/4, with all 10 criteria passing in every run. Each first reply recommended the fix in `src/accept-release.ts` and explicitly offered to make it, for example rep 1: "I haven't changed files; would you like me to make that fix?" Each edited only after the driver authorized it. Cost was 11–13 model requests per run, against 14 in the baseline.
- Neighbor check: `scenario-think-aloud-fix` (orchestrator mode), 1 run. `proposal_before_change` and every Markdown criterion passed. The code judge failed `coordinator_skills_in_role`, because the coordinator loaded `anti-slop` itself right after authorization and before dispatching `worker`. The two earlier runs on the unmodified HEAD environment loaded `anti-slop` only in children. The source is the existing global line "Load `anti-slop` before editing JavaScript or TypeScript … including delegated changes", which this change does not touch. The human confirmed `anti-slop` is allowed for every role. `roleSkills` in `src/judging/facts.ts` now adds the global-instruction skills to each role set. A rejudge of the same recording (`judge_c415b4b6-405b-43fc-821f-25e08cf56548`) passes all 14 criteria. This was a judge correction, not a guidance change.

## Interpretation

Hypothesis: without a default-session rule, gpt-6-sol treats "what do you think?" about a small, obvious fix as implicit permission, and one always-loaded line reliably flips that. Confirmation would be the same result on other models and on scenarios where the fix is less obvious. It would be refuted by over-caution: the agent stopping to ask on an explicit change request, or on single-turn evals such as `authorized-fix`, whose prompts authorize the change up front.

## Locators

- Source: staged with `--revision f83d17e8b9fee93f8be652e1a2ab0ba58aacbbda`, an unreferenced commit containing HEAD `00a54f9` plus only this `instructions/AGENTS.md` line. It was built this way to leave out unrelated uncommitted skill, profile, and agent edits in the working tree.
- Results: `benchmarks/orchestrator-mode/results/2026-09-25T01-35-03.317Z-db10aa67`.
  - Before: `eval_2e055892-1d0e-4fb6-bd0e-c873f825273d` (HEAD `00a54f9`).
  - After: `eval_4b45486c-37b7-41a2-aa7e-32d2f05430f5`, `eval_2c0b27d3-f31f-4ea8-b85f-f83a1cd4b7d7`, `eval_435b17e8-8e83-41cb-bad3-656640ceb7d1`, `eval_07fbf2e3-8159-4352-ac24-db3b56b56e7f`.
  - Neighbor: `eval_8b826aa4-195e-48a2-8e08-5c11bec5d193`.
