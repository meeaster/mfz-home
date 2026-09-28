---
date: 2026-09-27
evals: [scenario-quick-lookup-default, scenario-investigate-then-fix-default]
criterion: session_output_skills
skill: task-output             # also global instructions/AGENTS.md; evidence-gathering retired
file: SKILL.md                 # also instructions/AGENTS.md, orchestration/SKILL.md and assignments-and-dependencies.md, design-partner references, catalog, base profile
change: restructure
outcome: effective
environment: live
preset: gpt6
models:
  primary: { agent: build, model: openai/gpt-6-sol, variant: medium }
  subagents:
    agent-under-test: { model: openai/gpt-6-sol, variant: medium }
  judge: { model: openai/gpt-6-sol, variant: high }
runs: { before: "0/2", after: "8/8" }
---

# Default sessions answer their own work in the reply; only subagents write output files

## Behavior targeted

`session_output_skills` in both new default-mode scenarios, and `no_session_output_file` in the quick lookup. Neither scenario selects a workflow.

- **Quick lookup.** The driver asks whether the media cache cleanup still runs on a schedule. The baseline agent loaded `evidence-gathering` as its first action, before any lookup. It then loaded `effort-context` and `task-output` and wrote `…/orchestrator-workspaces/_sessions/opencode/<session>/evidence/media-cac…` before answering. That took 31 tool calls over 17 steps. This reproduces the live OpenCode session `ses_f1ff4d811fferKhJwimJlymO2k` ("dod I have a cron or systemd process…"), where the same chain ran and the next message made the file stale.
- **Investigate then fix.** The baseline loaded `evidence-gathering`, `anti-slop`, `effort-context` and `task-output` in the main session, but wrote no file.

Three rules chained to cause this:
- the global line "Save the substantive findings of a deliberate investigation done in this session as one file through `task-output`";
- `evidence-gathering`'s "When you carry out the investigation, load `task-output`";
- `task-output`'s "A deliberate investigation in your own session also saves one file".

The human decided that only dispatched subagents write output files. Work a session does itself is answered in its reply. `evidence-gathering` was then retired, because nearly all of its content duplicated `orchestration`, `task-output`, and the global freshness and safety rules.

## Change

- **`instructions/AGENTS.md`, Task output, second line.** Replaced with:
  > - **Behavior:** Answer this session's own lookups and investigations in the reply. Write a file for them only when the human asks for one or requests capture; `task-output` is for dispatched subagents.
- **`task-output/SKILL.md`, description.** Now reads: "Use when a dispatch brief assigns you an output file. Write the assignment's response there and reply with the path and completion state. Covers operational learnings and reuse of earlier outputs without selecting an execution workflow." The dropped clause was "or save a deliberate investigation's findings".
- **`task-output/SKILL.md`, Ownership and location.** The main-session bullet became:
  > - Work a session does for itself, including its own investigation, is answered in its reply rather than a file.

  The following sentence was removed: "For an investigation in your own session, obtain a location from `effort-context`'s storage-location operation…"
- **`evidence-gathering` deleted** from `skills/active/`, the catalog, the base profile's skill list, and the `explore` agent's skill permissions.
  - Its callers now point to their own sections. `orchestration/SKILL.md` dropped "Load `evidence-gathering` for deliberate investigations."
  - `orchestration/references/assignments-and-dependencies.md` "Missing evidence" gained the bounding rule and the one rule unique to the retired skill: "Stop gathering when the answer has sufficient support, the remaining choice is a preference, or investigation no longer narrows. Report the actual gap rather than researching to fill it."
  - `design-partner/references/collaboration.md` now says to investigate "when the answer can change the decision, and stop when it has sufficient support or the remaining choice is a preference". `design-and-prototypes.md` now says to gather facts "under the active session's routing".

Placement: the global line applies to every default session in both harnesses. The `task-output` description is the only gate Claude Code has, because Claude Code ignores `opencode/autoinvoke` metadata. That is why its trigger is now written from the producer's side ("a dispatch brief assigns you an output file"), not as a flag.

## Result

- **Before:** 0/2, one run per scenario, on committed `HEAD`. Both failed `session_output_skills`, and the lookup also failed `no_session_output_file`. Every task-quality criterion passed: the answer or diagnosis, the fix, verification, scope, the report, and driver fidelity.
- **After:** 8/8, four runs per scenario, all 14 criteria passing in each.
  - Investigate-then-fix loaded only `anti-slop` before its edit, in 14–17 tool calls against 21 at baseline.
  - The quick lookup loaded no skill from the orchestration set. Three of its four runs loaded `mindframe-z` for the systemd and install question. It used 16–27 tool calls against 31 at baseline.
  - No run dispatched a subagent, so `delegated_outputs_read` was null throughout.
- **Judge correction during the baseline.** The quick-lookup judge first failed `changes_within_scope` because the agent edited `install.sh` to remove a timer already installed on the server. That is a valid part of the removal, so `install.sh` joined the allowed files and the recording was rejudged (`judge_c611f12d-016c-466b-a90c-a5dad1d96ffa`). The rejudge left only the two target criteria failing.
- **Neighbors not rerun.** The orchestrate evals' coordinator and producer skill sets dropped `evidence-gathering` in `src/judging/facts.ts`. Their recordings predate the retirement and still load it, so a rejudge would now flag those loads. Rerun them on a restaged environment before trusting their scores.

## Interpretation

Hypothesis: a skill whose description claims a common activity ("a deliberate investigation of a factual question") is loaded almost unconditionally by gpt-6-sol, and a chained "load X" instruction then turns it into a persistence ceremony. Removing the trigger and scoping the output skill to the dispatched side was enough; no negative rule was needed.

This would be confirmed by the same result on other models, and on scenario 7 (a default session asked to use a subagent): the child should still write its file through `task-output`, and the parent should read it. It would be refuted if dispatched producers stop loading `task-output`, because their trigger now depends on the brief naming an output file.

## Locators

- **Source.**
  - Before: staged with `--revision HEAD` (`0f0fe57`).
  - After: staged with `--revision 9879c136d64891d20b7a84e5482451b7e7fb7a0c`, an unreferenced commit containing `HEAD` plus only these guidance changes. It was built this way to leave out another session's uncommitted Cairn, effort, and profile edits in the same files.
- **Results:** `benchmarks/orchestrator-mode/results/2026-09-25T01-35-03.317Z-db10aa67`.
  - Before: `eval_46096c64-8121-4f6e-98c9-5874dec0e276` (lookup; rejudged as `judge_c611f12d-016c-466b-a90c-a5dad1d96ffa`) and `eval_e5fd5127-af6e-47f9-9ff0-f25210142255` (investigate).
  - After, lookup: `eval_d92775f5-ef48-43e8-996a-e5cea862e975`, `eval_81935c1e-3d59-4adf-9465-5d6f3781107c`, `eval_9e7504de-dffb-4ab4-84cb-d3e68281e863`, `eval_1b64a82f-c7cd-47e2-b77d-97c1adc8ba85`.
  - After, investigate: `eval_823b882d-2f95-4e91-a500-6e375643f642`, `eval_d54ca7de-74e6-4df2-8afd-de86e9eb6622`, `eval_c655feba-bc37-4d2b-b523-fab01a6387da`, `eval_b9135b9f-6035-438a-ba6e-86a5dcb57124`.
