# Browser guidance

## Browser automation

- **Tool:** Load and use `browser-control` unless the user selects another browser tool.
- **Fact:** Browser Control sessions share the relay and browser profile; separate sessions do not isolate global browser state.
- **Behavior:** Coordinate operations that affect shared browser state.
- **Tool:** For concurrent browser tasks or agents sharing an MCP process, create separate Browser Control sessions and pass their IDs explicitly.
- **Tool:** Run Playwright in Browser Control's `execute` runtime; its `page`, `state`, and helpers are unavailable in the outer tool-orchestration runtime.

## WSL files in Windows Chrome

- **Tool:** Serve WSL artifacts through localhost HTTP and open their URL with Browser Control. For example:

  ```sh
  python3 -m http.server <port> --bind 127.0.0.1 --directory <absolute-content-directory>
  ```

- **Behavior:** Verify the rendered content at `http://localhost:<port>/<file>`.
- **Behavior:** Reuse an appropriate existing development server and preserve servers started by others.
- **Behavior:** Track servers you start; leave them running with their URLs when needed for user inspection, otherwise stop them when finished.
