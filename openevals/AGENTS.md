# OpenEvals for mfz-home

These benchmarks measure how agents behave under this home's own configuration: its instructions, skills, and agents, rendered from source the same way the live setup is. Load the eval-writing skill before designing, reviewing, running, or reporting an eval; it owns general method and OpenEval usage. This file adds only what is specific to evaluating a rendered home.

Discover current commands, environments, presets, and evals from the package scripts, CLI help, and directory layout.

## Environments

The configuration an eval runs under is an input to control, not background.

- **Rendered, not copied.** The environment is built from home source by the real renderer, then checked and digested into a manifest. Change the source or the environment definition and render again; never edit rendered configuration.
- **Mirror the live setup.** Roles run on the built-in `general` subagent, so the environment renders no custom agents; built-in agents keep their live permissions, and every rendered path resolves where the live setup has it. Flags remove the global instructions or the skills beyond the required set; the required skills and agents are declared once, and the contract check and the flags derive from that declaration.
- **The container is the isolation boundary.** The candidate reaches only credential-free documentation MCP servers, the Cairn catalog, which runs inside the container on an empty root built from the same source, and allowed server plugins bundled from that source; never credentials or host mounts. A contract failure is a finding about the rendering: fix the rendering or the exclusion, never the check.
- **Storage is Cairn's.** Output files land under Cairn's root, and judges grade that layout alone.
- **Uncommitted guidance is an input.** When evaluating guidance that is not yet committed, capture it explicitly over the commit; the manifest's commit plus captured changes is the reproducible setup.
- **Tools the rendered guidance invokes match live.** The benchmark's `container/` image installs, through mise at the versions live resolves, only the tools the OpenEval runtime lacks or has too old for what the rendered skills and global instructions tell the candidate to run, such as the workflow linters the instructions require; rebuild with `image` after changing it, and only when no run is in progress: a run pins the image it started with, and evals it hasn't started yet fail with "No such image" once a rebuild replaces it. When a recording shows a candidate trying to install a tool, add it here rather than letting runs spend turns on installs.
- **Separate conditions.** Flag combinations differ in what the candidate is told. Run and report each separately, alongside the preset, and never pool their scores.

## Staging and preparation

OpenEval copies only an eval's own fixture into the container, so everything candidate setup needs is staged into each fixture.

- **One canonical preparation source.** Edit it, sync the per-eval copies, and rely on the drift test to catch divergence.
- **Staged environments and preparation code are task inputs.** Restaging a different environment or changing preparation requires new candidate evidence for every eval.
- **Preparation leaves only task files.** It installs global configuration and the preset's worker models (its routing variant in place of the rendered skill, or named-agent models through project config, the only layer that overrides agent frontmatter), then removes its own harness files before the initial snapshot. Prompts and judges must not depend on harness files.
- **Run on the budget preset.** Mark's model usage is limited by subscription, so every eval runs on its benchmark's `budget` preset, which is the default selection. Another preset, or a benchmark without a budget preset, runs only when Mark asks for it.
- **Presets bind models together.** A preset sets the candidate (the lead), the judge, and the worker models. Workers get theirs from the `role-models` skill: a preset either keeps live routing or names a variant file, a copy of the live skill that changes only model cells, and the drift test holds it to that. Each preset is its own condition.
- **Render and stage before planning.** A plan against a stale staged environment reports the wrong inputs.

## Validating a change

Fix an observed behavior problem test-first. Before changing guidance, write or extend an eval that captures the problem and confirm it fails on the current guidance; rejudging an existing recording counts when it shows the behavior. Then change the guidance and rerun, revising until the eval passes.

When validating a change to guidance, prompts, or judges, run one repetition of the affected eval first. If it fails, diagnose from its recording before running again. If it passes, run three more to confirm it holds. Keep the benchmark's default at one repetition and raise it only for that confirmation run.

Record every guidance change made to fix an eval result as its own entry in the intervention log, including attempts that had no effect; the log's README defines the entry format. Take the primary-session and subagent models from the recordings. The log exists to compare how different models respond to instruction changes, so record placement and wording exactly.

## Designing against this home's guidance

- **Selection is explicit.** Human-only workflow entries cannot be auto-invoked, and OpenEval does not drive slash menus, so prompts select a workflow by asking the candidate to load its entry skill. These evals measure behavior after selection.
- **Track the live guidance.** Use only skills, roles, and vocabulary that exist in the current source. When the guidance is redesigned, re-derive each affected eval's claim; a rubric built on a retired concept still runs but measures nothing.
- **Build code judges from the shared fact helpers** for skill loads, dispatch attempts, child sessions, and file changes, and unit-test each grading function. Dispatch and mutation facts count attempts, so a denied call still records the routing decision.
- **Grade skill loads per session against the role's skill set.** Derive each set from what the guidance has that role load, not from what past runs loaded; a load outside it fails the run.
