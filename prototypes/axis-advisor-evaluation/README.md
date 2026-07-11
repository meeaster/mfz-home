# Axis Advisor-Evaluation Probe

PROTOTYPE - delete after deciding whether Axis can bootstrap an OpenCode skill.

Question: can an Axis scenario seed an isolated OpenCode home with a skill and have OpenCode invoke it?

Run:

```sh
pnpm dlx @netlify/axis@1.17.0 run --config axis.config.json --scenario skill-access --no-score --verbose
```

Scenarios:

- `skill-access`: bootstraps a global OpenCode skill and checks explicit invocation.
- `project-skill-access`: checks whether a project-local `.claude` skill works in Axis's bare workspace.
- `skill-resource-action`: checks whether a global skill can read a bundled reference and write a workspace artifact.
- `skill-composition`: checks whether a project-local skill can direct OpenCode to load a global dependency skill and use its result.

Each scenario has a unique sentinel in its transcript. The resource-action probe also captures its output artifact in the report.

To run the composition probe with Claude Code Opus at high effort as the judge:

```sh
pnpm dlx @netlify/axis@1.17.0 run --config axis.opus-judge.config.json --scenario skill-composition --verbose
```

To run the Codex composition probe on GPT-5.6-Terra at medium reasoning, with skills supplied by Axis:

```sh
pnpm dlx @netlify/axis@1.17.0 run --config axis.codex.config.json --scenario codex-skill-composition --no-score --verbose
```

This probe intentionally does not include the real `advisor-evaluation` skill or a session fixture.

`--debug` currently crashes in Axis 1.17.0 when the OpenCode model name contains `/`; use the regular report transcript instead.
