# mfz-home OpenEvals

OpenEval benchmarks for the modular orchestration skills in this home. Each eval runs in one environment rendered from `mfz-home` source by the real `mfz` renderer, installed at the candidate's `~/.mindframe-z` the way the live setup uses it:

- every OpenCode agent from the base and Personal profiles, with its live permissions and `subagent_depth`;
- every skill the live profiles enable for OpenCode, including private ones;
- the global instructions, their on-demand instruction references, capability groups, extra folders, and four small reference checkouts (openevals, openspec, opencode-plugins, mattpocock-skills) at their catalog revisions;
- the documentation MCP servers that need no credential (openai-docs, aws-knowledge, cloudflare-docs, x-docs).

Two flags remove parts of it: `--no-instructions` drops the global instructions with their pointers and references, and `--no-extra-skills` keeps only the required orchestration skills listed in `overlays/required.yml`. Plugins, other MCP servers, and model pins are never rendered; the presets set models. The candidate container is the isolation boundary: it holds no credentials or host mounts, and pointers to host paths resolve to nothing there.

## Run a benchmark

```sh
pnpm install
bun src/select-preset.ts gpt6                      # or glm; see benchmarks/orchestrator-mode/presets.json
bun src/environment-cli.ts stage --working-tree       # add --no-instructions or --no-extra-skills
bunx --bun @hona/openeval plan --benchmark ./benchmarks/orchestrator-mode
bunx --bun @hona/openeval run  --benchmark ./benchmarks/orchestrator-mode
```

`--working-tree` renders uncommitted instruction, catalog, profile, agent, and skill changes over `HEAD`. Drop it once those changes are committed. Each flag combination is a separate condition: stage it and run again, and compare scores within one combination and one preset only, since the environment and the judge model both change what is measured.

## Evals

| Eval | Selection | What it measures |
| --- | --- | --- |
| `explore-evidence` | `orchestrate` | Routing a broad source question in a pinned OpenEval checkout to `explore` with an adequate brief |
| `identified-instruction` | `orchestrate` | Reading an identified instruction file directly, without dispatch |
| `single-source-file` | `orchestrate` | Delegating investigation of one implementation file to `explore` with an adequate brief |
| `design-partner` | `design-partner` | Standalone design advice, without entering orchestration |

Each eval pairs a code judge (archive facts: workflow entry, skill loads outside each session's role, dispatch, and file changes) with a Markdown judge (the meaning of the answer and of any brief sent to a child).

## Layout

```text
benchmarks/orchestrator-mode/   benchmark.ts, presets.json, evals/, calibration/
overlays/required.yml           required skills and agents for every environment
src/environment/                render, contract check, and staging
src/candidate/                  preparation script copied into every eval fixture
src/judging/facts.ts            archive facts shared by the code judges
```

See `AGENTS.md` for how to add or change an eval in this setup.
