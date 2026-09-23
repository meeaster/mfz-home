# Browser guidance

## Tool selection

- **Tool:** Use Agent Browser MCP for frontend UI verification unless the user selects another browser tool.
- **Tool:** Load and use `browser-control` for tasks in the user's existing Chrome session or workflows requiring user-managed login.

## Agent Browser

- **Tool:** Before using Agent Browser, retrieve its core guidance through `agent_browser_skills_get` with `names: ["core"]`.
- **Tool:** Use the typed Agent Browser MCP tools for the operations described in the guidance's CLI examples.
- **Tool:** Pass a task-specific `session` name on each browser tool call.
- **Behavior:** Use an independently launched headless browser for frontend verification unless a visible browser is needed.
- **Behavior:** Verify UI interactions through the rendered controls even when the page offers equivalent WebMCP actions.

## Browser Control

- **Fact:** Browser Control sessions share the relay and browser profile; separate sessions do not isolate global browser state.
- **Behavior:** Coordinate operations that affect shared browser state.
- **Tool:** For concurrent browser tasks or agents sharing an MCP process, create separate Browser Control sessions and pass their IDs explicitly.
- **Tool:** Run Playwright in Browser Control's `execute` runtime; its `page`, `state`, and helpers are unavailable in the outer tool-orchestration runtime.

## Local frontend servers

- **Tool:** Serve local artifacts through localhost HTTP and open their URL with the selected browser tool. For example:

  ```sh
  python3 -m http.server <port> --bind 127.0.0.1 --directory <absolute-content-directory>
  ```

- **Behavior:** Verify the rendered content at `http://localhost:<port>/<file>`.
- **Behavior:** Reuse an appropriate existing development server and preserve servers started by others.
- **Behavior:** Track servers you start; leave them running with their URLs when needed for user inspection, otherwise stop them when finished.
