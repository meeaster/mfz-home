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

Before planning a benchmark, copy the rendered `.openeval/environment/` into each eval's `workspace/` or `overlay/` without removing its task files. `baked-in-dispatch`, `identified-instruction`, and `single-source-file` use `workspace/`; `explore-evidence` uses `overlay/`. Preserve `configure-environment.ts` and `agent-models.json`. Keep materialization output under `.materialized/` or another ignored path. Run each selected eval separately for the minimal and sanitized Personal environments; do not mix their results as if they used identical instructions.

For the uncommitted 2026-09-22 orchestration pilot, set `MFZ_SOURCE_COMMIT` to the base commit and `MFZ_SOURCE_OVERRIDES` to a comma-separated list of current orchestration source files. The optional override path accepts only `instructions/AGENTS.md`, `catalog/skills.yml`, `opencode/commands/orchestrate.md`, the two orchestration skills, and Orchestrator Mode references. The materializer archives the original commit, copies the named working-tree files into `source-overrides/`, records their SHA-256 digests in `manifest.json`, and renders from those captured bytes. Keep the materialization directory to reproduce this local candidate. A later run from a committed revision should omit overrides. Never treat the commit ID alone as a complete description when the manifest lists overrides.

Run the contract check through the unit tests. The check verifies rendered instructions, required Orchestrator Mode references, command and agent files, denied external writes, empty MCP configuration, digests, and absence of private-material markers.

## Per-benchmark agent models

Each eval carries an `.openeval/agent-models.json` that maps an agent name to a model reference (`provider/model#variant`). `select-preset` writes it from the selected model preset; it covers the orchestrator, its scribe, and the roles the orchestrator can dispatch.

`configure-environment.ts` applies those overrides to `opencode.json` in the candidate workspace root. It uses a project config on purpose: OpenCode applies a global config before global agent markdown, so a model in an agent's frontmatter wins over a global override. A project config is applied after global markdown, which makes it the only config surface that can override a frontmatter model. For a repository workspace, preparation runs inside `checkout/`, so the script receives the workspace root as its first argument.

An entry takes effect when the environment defines that agent, or when OpenCode defines the agent in core — today that is `explore`. An override without either definition is skipped, because a config-only agent entry would create a promptless placeholder agent. Both environment presets define only `orchestrator` and `scribe` today, so `orchestrator`, `scribe`, and `explore` bind; the rest of the roster stays recorded but inert until its definitions are materialized into the profile overlays.

Changing this file, or the environment it applies to, changes the eval source hash. Reuse recorded evidence by rejudging; otherwise run the eval again for fresh candidate evidence.

## First evaluation and limitation

`baked-in-dispatch` is deliberately a read-only interpretation eval. It uses a hybrid judge:

- `judge.md` grades the interpretation with an LLM judge: direct-mode ownership, the identified-instruction reading decision, a conditional child brief, acceptance, authority boundaries, and the return to the human.
- `judge.ts` grades archive facts: whether the candidate loaded the Orchestrator Mode skill, and whether it stayed read-only with no child session.

The split exists because a deterministic judge only sees recorded data. It can decide state facts, such as which tools ran and whether the workspace changed. It cannot decide meaning, and a keyword rubric rejects correct answers that use the skill's own vocabulary. Keep behavioral criteria in `judge.md` and facts in `judge.ts`.

Validate the judge with `pnpm calibrate`. It records two constructed controls and grades them with the rubric: a clear failure (a gateway answer that claims a child ran) and an accepted alternative (a correct answer that uses different vocabulary). Constructed controls test grading boundaries only. They do not prove that a described action ran, so the `judge.ts` criteria are covered by unit tests instead.

The evaluator cannot force a dispatch; delegation is the behavior under test, not infrastructure. `baked-in-dispatch` keeps its read-only interpretation scope and infers nothing from the final response. `explore-evidence` measures a real dispatch from the recorded sessions; a run that never dispatches is a routing result, not an infrastructure failure.

`identified-instruction` and `single-source-file` test the new direct-reading boundary with real tool recordings. The former presents an identified instruction under review; the latter asks about one implementation file. Their code judges check dispatch and workspace facts, while their Markdown judges check the answer and who read the source. Constructed pass, fail, and near-miss expectations are in `benchmarks/orchestrator-mode/calibration/direct-reading/boundaries.md`. The Chief, evidence reuse, and post-compaction Scribe cases are outside this pilot.

## Explore evidence routing

`explore-evidence` tests the routing decision for a broad, static-local question. The prompt asks one resume-semantics question about a real repository checked out at `checkout/` and does not name a specialist, so the candidate may answer directly or delegate.

- `judge.ts` records `explore_dispatched` (a successful `subagent` call naming `explore`, plus a child session) and `repository_unchanged` (checkout content unchanged, ignoring `.git`, `upstream.git`, and `node_modules`).
- `judge.md` grades how the coordinator handles source evidence from the tool trace, alongside answer completeness, grounding in real paths, restraint, and the return surface.

The routing rule delegates implementation-source investigation to an evidence agent, even for one file. A run that answers the broad source question correctly but never dispatches fails `explore_dispatched`. That criterion is the essential routing measurement; the mean of the remaining criteria is not a substitute for it.

The repository is pinned by `workspace.repository` and a full commit. OpenEval lays it out at `<workspace>/checkout/` with the bare remote beside it, copies the overlay into `checkout/`, and runs preparation there.

## Model presets

`presets.json` defines named model presets. Each preset names the candidate session model and the agent model overrides that travel with it; a `"*"` entry covers roles it does not name.

```sh
bun src/select-preset.ts glm   # or: gpt6
```

Selection writes `selected-preset.json` (ignored; the benchmark falls back to `presets.json`'s `default`) and rewrites every eval's `agent-models.json`. `benchmark.ts` reads the selection, so a bare `openeval run` executes exactly the selected preset — the candidate model, the judge, and the overrides can never disagree. Selection happens host-side because preparation steps receive no model information.

The `gpt6` preset uses `openai/gpt-6-sol#medium` for the candidate and orchestrator, `openai/gpt-6-astra#medium` for the judge, and GPT-6 Luna for its other agents. The `glm` preset judges with `zai-coding-plan/glm-5.3#high`. The judge model is part of the judge fingerprint, so recorded evidence is rejudged with the selected judge on the next run. Scores from presets with different judges measure different judges — compare within a preset, not across.
