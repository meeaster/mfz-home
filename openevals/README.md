# mfz-home OpenEvals

OpenEval benchmarks for the orchestration skills in this home. Each eval runs in one environment rendered from `mfz-home` source by the real `mfz` renderer, installed at the candidate's `~/.mindframe-z` the way the live setup uses it:

- the built-in agents' live permissions and `subagent_depth`; roles run on the built-in `general` subagent, so no custom agents are rendered;
- every skill the live profiles enable for OpenCode, including private ones;
- the global instructions, their on-demand instruction references, capability groups, extra folders, and four small reference checkouts (openevals, openspec, opencode-plugins, mattpocock-skills) at their catalog revisions;
- the documentation MCP servers that need no credential (openai-docs, aws-knowledge, cloudflare-docs, x-docs);
- Cairn, built from the same source: preparation installs it where live does and adds its OpenCode plugin, and the rendered config runs its catalog server, so output files land under an empty catalog root in the candidate's home;
- the live server plugins that work on the candidate's own sessions, bundled from the same source: `session-context`.

Two flags remove parts of it: `--no-instructions` drops the global instructions with their pointers and references, and `--no-extra-skills` keeps only the required orchestration skills listed in `overlays/required.yml`. Other plugins, other MCP servers, and model pins are never rendered; the presets set models. A preset names the lead and judge models and, optionally, a routing variant: a copy of the live `orchestration-routing` skill with different worker models, installed in its place. The candidate container is the isolation boundary: it holds no credentials or host mounts, and pointers to host paths resolve to nothing there.

## Run a benchmark

```sh
bun install
bun src/select-preset.ts budget benchmarks/orchestrate-scenarios   # the default; other presets in presets.json only on request
bun src/environment-cli.ts stage --benchmark benchmarks/orchestrate-scenarios --working-tree
bunx --bun @hona/openeval image --benchmark ./benchmarks/orchestrate-scenarios
bunx --bun @hona/openeval image --verification --benchmark ./benchmarks/orchestrate-scenarios
bunx --bun @hona/openeval plan  --benchmark ./benchmarks/orchestrate-scenarios
bunx --bun @hona/openeval run   --benchmark ./benchmarks/orchestrate-scenarios
```

`--working-tree` renders uncommitted instruction, catalog, profile, agent, and skill changes over `HEAD`. Drop it once those changes are committed. Each flag combination is a separate condition: stage it and run again, and compare scores within one combination and one preset only, since the environment and the judge model both change what is measured.

## Evals

`orchestrate-scenarios` holds end-to-end scenarios for the current `orchestrate` skill:

| Eval | What it measures |
| --- | --- |
| `json-cli` | Building and reviewing a small, specified CLI: the CLI works, the lead delegates the build, every dispatch runs on its routed model, a code reviewer checks the work, repairs go to a fresh implementer, and nothing extra runs or ships |
| `stock-reservations` | Adding expiring stock reservations to an existing service with written conventions, then fixing what the review finds: the service behaves as asked under a race and after holds lapse, the change follows the repository's conventions, and the shared orchestration criteria above |
| `frame-criteria` | A goal with no observable requirements: the lead proposes the shape of the work and acceptance criteria with how each will be verified, and stops for Mark's confirmation before anything is built |
| `small-change` | A one-line change with its check named: the lead proceeds without a confirmation stop, one implementer loads `verification` and runs the command, no review or inspector stages run, no evidence is left in the project, and the close is brief, offering rather than running a handoff pass |
| `ci-only-change` | A publish workflow and script that only run in GitHub Actions: the script and workflow behave as asked (checked with a stub `aws`), results state how far each requirement was verified, nothing is added to the code just to make a check possible, the gap is reported with an idea, and it is recorded as `proposed` in the repository's verification article in Cairn |

These evals share the orchestration criteria in `src/judging/orchestration.ts`. Each also verifies its delivered behavior in the verification container: `stock-reservations` runs `verify.mjs` against the final project, starting the service the way the prompt names it.

Each eval pairs a code judge (archive facts: dispatch, routed models, file changes, and behavior checked in the verification container) with a Markdown judge (the meaning of the answer and of any brief sent to a child).

## Layout

```text
benchmarks/orchestrate-scenarios/  benchmark.ts, presets.json, routing/ variants, container/, evals/
overlays/required.yml           required skills and agents for every environment
src/environment/                render, contract check, and staging
src/candidate/                  preparation script copied into every eval fixture
src/judging/facts.ts            archive facts shared by the code judges
src/judging/dispatches.ts       role, routed model, and child session of each dispatch
src/judging/orchestration.ts    orchestration criteria every scenario shares
src/judging/constructed-runs.ts constructed recordings for judge unit tests
```

See `AGENTS.md` for how to add or change an eval in this setup.
