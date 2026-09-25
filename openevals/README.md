# mfz-home OpenEvals

OpenEval benchmarks for the modular orchestration skills in this home. Each eval runs in one of two environments rendered from `mfz-home` source by the real `mfz` renderer:

- **`minimal`**: the shared instructions, the seven orchestration skills, and the `orchestrator`, `scribe`, and `explore` agents.
- **`personal`**: the live base and Personal profiles with private instructions, private skills, references, extra folders, MCP servers, and plugins removed. It carries the full skill set and agent roster.

Neither environment reads live host state. The rendered permissions deny every action except reading, and no MCP server is configured.

## Run a benchmark

```sh
pnpm install
bun src/select-preset.ts gpt6                      # or glm; see benchmarks/orchestrator-mode/presets.json
bun src/environment-cli.ts stage minimal --working-tree
bunx --bun @hona/openeval plan --benchmark ./benchmarks/orchestrator-mode
bunx --bun @hona/openeval run  --benchmark ./benchmarks/orchestrator-mode
```

`--working-tree` renders uncommitted orchestration changes over `HEAD`. Drop it once those changes are committed. Stage `personal` and run again for the second environment. Compare scores within one environment and one preset only: the environment and the judge model both change what is measured.

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
overlays/minimal/profile.yml    required skills and agents for every environment
src/environment/                render, contract check, and staging
src/candidate/                  preparation script copied into every eval fixture
src/judging/facts.ts            archive facts shared by the code judges
```

See `AGENTS.md` for how to add or change an eval in this setup.
