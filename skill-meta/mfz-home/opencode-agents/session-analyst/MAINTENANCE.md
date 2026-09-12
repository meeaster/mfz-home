# Maintenance

## Runtime Dependencies

- `agent-sessions` owns the complete runtime workflow and bundled adapters.
- OpenCode must expose `openai/gpt-5.6-luna@high` and native subagent execution.
- The cost and evidence scripts require Python 3 and standard-library SQLite support.
- V2 API reads require `opencode`; direct SQLite inspection requires `sqlite3`; Claude Code projections require `jq`.
- Shell is deliberately available for adaptive read-only investigation. The agent prompt and `agent-sessions` own the no-mutation boundary; OpenCode permissions are not a semantic read-only shell sandbox.
- Global configuration owns sensitive-path and external-directory policy outside the agent's task-evidence exception. `orchestrator-task-evidence` owns assigned-note production and reuse; `../explore/MAINTENANCE.md#v2-permission-evidence` explains absolute-path matching and shared-root ownership limits. Preserve the exact skill allow, outside-root edit deny, and external root allow. Avoid a later legacy `write: deny`, which normalizes to `edit` and would override the exception.

## Change Procedure

1. Read this record, `agent-sessions`, its authoring record, and representative Session Analyst traces before changing scope, prompt, model, or permissions.
2. Keep modes, coverage, privacy, adapter commands, and harness schemas in `agent-sessions`; this agent owns only specialist routing, capability boundaries, and result handoff.
3. Review shell traces for actual mutation, privacy, or waste failures. Improve the prompt, skill, or adapter from observed behavior rather than encoding individual successful command strings as permissions.
4. Run every scenario in `EVALS.md`, including a command-capable child trace and adjacent routing checks.
5. Compare Luna/high with a higher effort only under the matched Model Policy scenario.
6. Record consequential decisions, observed effects, and reversals in `LOG.md`.
7. When activation is authorized, use plain `mfz apply`, verify the rendered and resolved agent, then validate through a native child in the running V2 server. Agent definitions hot-reload; no restart is required.

## Evidence Review

Track task completion, coverage gaps, body reads, privacy exclusions, child topology accuracy, command and permission failures, accidental mutations, source-reading violations, context compactions, duration, tokens, estimated cost, parent rework, and whether the result was used. Separate skill defects, agent-prompt defects, permission defects, model variance, and environment noise.
