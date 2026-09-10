# Command evaluations

- Invoking `/orchestrate` with a partial thought, correction, or multiline input stays in the current conversation and preserves its model. It explicitly loads and follows skill ID `orchestrator-mode` in human-facing context.
- `$ARGUMENTS` appears once, unwrapped, as the final content under `## User prompt`. No shell interpolation or positional placeholder can reinterpret the supplied input.
- The command has `subtask: false`, no agent or model override, and no copied workflow body. It does not launch orchestrator merely because the command was invoked.
- The shared skill is registered for explicit loading, with automatic discovery and its interactive slash entry disabled. There is only one interactive `/orchestrate` entry.

Run workflow regressions and inspect current validation evidence in `../../skills/orchestrator-mode/EVALS.md`. Static argument substitution and MFZ rendering do not prove live slash execution or model compliance.
