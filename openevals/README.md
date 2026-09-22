# Orchestrator Mode OpenEvals

This package contains the maintained OpenEval benchmark for the two controlled `mfz-home` environments: `minimal` and sanitized `personal`.

## Source-driven materialization

Materialization archives the requested `mfz-home` commit, applies a declarative profile overlay, and invokes the canonical `mfz` renderer with `--no-link`. It then copies only the rendered OpenCode snapshot into the candidate workspace, rewrites generated host paths to the candidate's `/home/dev/.config/opencode` path, and records file digests in `manifest.json`.

The sanitized Personal preset intentionally does not inherit the live Personal profile. It derives its selected instruction and Orchestrator Mode assets from that profile's canonical source while excluding private instruction paths, extra folders, references, credentials, browser state, and MCP connections. This prevents a benchmark run from reading live Personal state.

Materialize both presets without starting a model:

```sh
export MFZ_SOURCE_COMMIT="$(git -C .. rev-parse HEAD)"
MFZ_SOURCE_HOME="$(pwd)/.." bun src/materialize-cli.ts minimal .materialized/minimal
MFZ_SOURCE_HOME="$(pwd)/.." bun src/materialize-cli.ts personal .materialized/personal
```

Before planning the benchmark, copy the materialized environment into each eval: the full workspace into `benchmarks/orchestrator-mode/evals/baked-in-dispatch/workspace/`, and the `.openeval` directory into `benchmarks/orchestrator-mode/evals/explore-evidence/overlay/.openeval/`. Run the unchanged evals once for each preset. Keep materialized workspaces under `.materialized/` or another ignored path rather than committing them.

Run the contract check through the unit tests. The check verifies rendered instructions, required Orchestrator Mode references, command and agent files, denied external writes, empty MCP configuration, digests, and absence of private-material markers.

## Per-benchmark agent models

Each eval carries an `.openeval/agent-models.json` that maps an agent name to a model reference (`provider/model#variant`). `select-preset` writes it from the selected model preset; it covers the orchestrator, its scribe, and the roles the orchestrator can dispatch.

`configure-environment.ts` applies those overrides to `opencode.json` in the candidate workspace root. It uses a project config on purpose: OpenCode applies a global config before global agent markdown, so a model in an agent's frontmatter wins over a global override. A project config is applied after global markdown, which makes it the only config surface that can override a frontmatter model. For a repository workspace, preparation runs inside `checkout/`, so the script receives the workspace root as its first argument.

An entry takes effect when the environment defines that agent, or when OpenCode defines the agent in core — today that is `explore`. An override without either definition is skipped, because a config-only agent entry would create a promptless placeholder agent. Both environment presets define only `orchestrator` and `scribe` today, so `orchestrator`, `scribe`, and `explore` bind; the rest of the roster stays recorded but inert until its definitions are materialized into the profile overlays.

Changing this file, or the environment it applies to, changes the eval source hash. Reuse recorded evidence by rejudging; otherwise run the eval again for fresh candidate evidence.

## First evaluation and limitation

`baked-in-dispatch` is deliberately a read-only interpretation eval. It uses a hybrid judge:

- `judge.md` grades the interpretation with an LLM judge: mode selection, the dispatch decision, the correctness-critical brief fields, the wait and accept step, authority boundaries, and the return surface.
- `judge.ts` grades archive facts: whether the candidate loaded the Orchestrator Mode skill, and whether it stayed read-only with no child session.

The split exists because a deterministic judge only sees recorded data. It can decide state facts, such as which tools ran and whether the workspace changed. It cannot decide meaning, and a keyword rubric rejects correct answers that use the skill's own vocabulary. Keep behavioral criteria in `judge.md` and facts in `judge.ts`.

Validate the judge with `pnpm calibrate`. It records two constructed controls and grades them with the rubric: a clear failure (a gateway answer that claims a child ran) and an accepted alternative (a correct answer that uses different vocabulary). Constructed controls test grading boundaries only. They do not prove that a described action ran, so the `judge.ts` criteria are covered by unit tests instead.

The evaluator cannot force a dispatch; delegation is the behavior under test, not infrastructure. `baked-in-dispatch` keeps its read-only interpretation scope and infers nothing from the final response. `explore-evidence` measures a real dispatch from the recorded sessions; a run that never dispatches is a routing result, not an infrastructure failure.

The broader `chief/split` and scenario matrix are intentionally out of scope.

## Explore evidence routing

`explore-evidence` tests the routing decision for a broad, static-local question. The prompt asks one resume-semantics question about a real repository checked out at `checkout/` and does not name a specialist, so the candidate may answer directly or delegate.

- `judge.ts` records `explore_dispatched` (a successful `subagent` call naming `explore`, plus a child session) and `repository_unchanged` (checkout content unchanged, ignoring `.git`, `upstream.git`, and `node_modules`).
- `judge.md` grades meaning: completeness of the decisive mechanism findings, grounding in real paths, restraint, and the return surface.

The routing rule in the skill routes factual understanding of an unbounded application-code corpus to the evidence roles, so delegation is the intended routing for this task shape. A run that answers correctly but never dispatches fails `explore_dispatched`. That criterion is the essential routing measurement; the mean of the remaining criteria is not a substitute for it.

The repository is pinned by `workspace.repository` and a full commit. OpenEval lays it out at `<workspace>/checkout/` with the bare remote beside it, copies the overlay into `checkout/`, and runs preparation there.

## Model presets

`presets.json` defines named model presets. Each preset names the candidate session model and the agent model overrides that travel with it; a `"*"` entry covers roles it does not name.

```sh
bun src/select-preset.ts glm   # or: luna
```

Selection writes `selected-preset.json` (ignored; the benchmark falls back to `presets.json`'s `default`) and rewrites every eval's `agent-models.json`. `benchmark.ts` reads the selection, so a bare `openeval run` executes exactly the selected preset — the candidate model, the judge, and the overrides can never disagree. Selection happens host-side because preparation steps receive no model information.

Each preset names its judge too: `luna` judges with `opencode-go/gpt-5.6-luna#high`, `glm` with `zai-coding-plan/glm-5.3#high`. The judge model is part of the judge fingerprint, so recorded evidence is rejudged with the selected judge on the next run. Scores from presets with different judges measure different judges — compare within a preset, not across.
