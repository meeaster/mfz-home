---
date: 2026-09-25
evals: [explore-evidence]
criterion: returned_files_read
skill: task-output         # agent change: opencode/agents/explore.md removed; permissions moved to profile config
file: opencode/agents/explore.md
change: removal
outcome: partial
environment: live
preset: gpt6
models:
  primary: { agent: build, model: openai/gpt-6-sol, variant: medium }
  subagents:
    explore: { model: openai/gpt-6-luna, variant: high }
  judge: { model: openai/gpt-6-sol, variant: high }
runs: { before: "4/4", after: "0/1" }
---

# Explore uses OpenCode's built-in prompt

## Behavior targeted

The human wants the task-output contract carried by the dispatch prompt rather than agent system prompts, and asked whether the custom `explore.md` could go so explore uses OpenCode's built-in agent. The custom file held the complete upstream prompt with one guideline replaced, and three skill allows. Its authoring record shows the prompt was customized because the built-in guideline "Do not create any files, or run bash commands that modify the user's system state in any way" conflicted with assigned evidence writing, but never established whether built-in explore would refuse an assigned write.

## Change

- Deleted `opencode/agents/explore.md` and removed `explore` from the base profile's agent list.
- Moved its skill allows (`task-output`, `effort-context`, `evidence-gathering`) into `opencode.config.agents.explore.permissions` in `profiles/base/profile.yml`, before the existing edit rules. The model and edit rules were already there.
- Eval environment: `src/environment/profiles.ts` now keeps config permissions for OpenCode built-in agents (`explore`) as well as enabled agents, matching live, where mfz renders the config block as-is. `overlays/required.yml` no longer requires an `explore` agent file.

## Result

0/1 (`eval_a8c401f3`), 13/14 criteria. Built-in explore loaded `task-output` and wrote its response to the assigned file in all three rounds, with brief replies naming that file; the "no files" guideline did not block assigned writes.

It failed `returned_files_read` because explore first created and updated `…/_sessions/opencode/ses_f28f94f2…/evidence/benchmark-resume--explore.md`, the assigned filename under its own session ID instead of the coordinator's (`ses_f28f9c1f…`), then switched to the assigned path for the rest of the run. The stray file was never reported or read. No earlier run showed a stray file; the removed prompt said "write only the owned evidence path".

## Interpretation

Hypothesis: the built-in prompt does not stop assigned writes, but without an ownership line in the system prompt explore may derive its own path from the assigned one. A sharper `task-output` line on writing only the exact assigned paths should prevent it; stray files recurring after that would refute it. One run cannot separate this from noise.

## Locators

Source commit `e39141b` with a dirty working tree (22 working-tree overrides). Results in `benchmarks/orchestrator-mode/results/2026-09-25T01-35-03.317Z-db10aa67`.
