# Executor Context Probe Findings

Probe date: 2026-07-10. Runtime: OpenCode `1.17.18`.

## Confirmed

- `experimental.chat.system.transform` receives the assembled system prompt
  for a session request. The observed build-agent prompt was 55,778 characters
  and contained the home instructions, `AGENTS.md` guidance, and
  `available_skills`. The hook does not include the agent name, so exact
  executor attribution requires best-effort correlation with `chat.params`.
- `chat.params` provides the exact session ID, active agent name, model, and
  provider ID. The runtime provider has `id`, despite the installed plugin type
  advertising `provider.info.id`.
- `tool.execute.before` and `tool.execute.after` provide exact session-scoped
  evidence for tools actually executed. The probe observed `read` for its
  requested file read.
- `tool.definition` provides names, descriptions, and schemas, but no session
  ID. It fires for multiple requests, including title generation, so it cannot
  safely be attributed to a session under concurrency.
- A control run with SDK inventories disabled still emitted 28 definitions for
  14 IDs while executing only `read`. SDK `tool.list()` adds further definition
  batches, so inventory calls must not be used to infer hook ordering.
- `client.tool.ids()` returns global registry IDs. `client.tool.list()` is a
  default-agent approximation: it omitted `edit` and `write` while the global
  registry included both. It must not be presented as the executor's exact
  capabilities.

## Consequence

The advisor can receive the assembled system prompt now, but must label its
executor attribution as best-effort until OpenCode exposes the request agent in
the hook. Exact future tool availability still needs an OpenCode hook after
final tool resolution. Until then, tool inventories must be labeled
approximate; executed-tool history is exact but incomplete.
