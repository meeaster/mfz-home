# Browse guidance

- **Tool:** Use the Browse MCP server (`browse`) for tasks in the user's existing Chrome session or workflows requiring user-managed login.
- **Tool:** Before the first Browse operation in a session, call the `browse` MCP `skill` tool and follow the guide it returns; no Browse skill is installed.
- **Fact:** Browse sessions share the relay and browser profile; separate sessions do not isolate global browser state.
- **Behavior:** Coordinate operations that affect shared browser state.
- **Tool:** For concurrent browser tasks or agents sharing an MCP process, create separate Browse sessions and pass their IDs explicitly.
- **Tool:** Run Playwright in Browse's `execute` runtime; its `page`, `state`, and helpers are unavailable in the outer tool-orchestration runtime.
- **Fact:** Browse updates itself. If the `browse` command is missing or broken, run `mise run browse:install`; if the extension is not connected, run `browse doctor`, and `browse pair` to re-pair Windows Chrome.
