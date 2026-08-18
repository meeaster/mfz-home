# Log

## 2026-08-18 - Replace OpenCode V1 With OpenCode 2

- Kept Agent Exec model-invoked with a narrow explicit-CLI trigger because users may say "use the OpenCode 2 CLI" without naming the skill.
- Made native subagents the preferred path for ordinary OpenCode 2 tests of hot-reloaded skills, agents, configuration, ambient instructions, and local plugin sources.
- Reserved external `opencode2` runs for explicit CLI requests, client-server behavior, private or clean-room servers, and fresh top-level ancestry when current depth or permissions would invalidate a nested test.
- Recorded that nested subagents default to depth 1 but remain configurable through depth and permission settings.
- Replaced V1 commands and assumptions with V2 executable, model variant, agent inspection, JSON event, service, session API cleanup, and standalone isolation guidance.

## 2026-08-18 - Prefer Current-Session Reload Tests

- Corrected the earlier native-subagent-first rule: OpenCode 2 rebuilds reloadable request context before each physical model attempt, so the current session normally sees changes on its next attempt.
- Kept fresh native subagents for tests that require clean conversation context, session-creation defaults, initial instruction rendering, or subagent-specific behavior.
- Recorded durable selection and history exceptions for explicit agent/model choices, previously loaded skill text, and read-injected nested `AGENTS.md` files.
- Added a reload matrix covering server configuration, skills, agents, commands, references, MCP, plugins, provider settings, CLI-only settings, formatter and watcher construction state, and unsupported LSP behavior.

## 2026-08-18 - Disclose Harness Branches

- Reduced `SKILL.md` to the cross-harness workflow, context packet, routing boundaries, and generic failure handling.
- Moved each harness's command, model, output, continuation, cleanup, and clean-room guidance into one reference loaded only after selecting that harness.
- Moved the shared isolation contract into `references/isolation.md` and removed circular links between it and the harness branches.
