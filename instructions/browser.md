# Browser guidance

## Tool selection

- **Tool:** Use Agent Browser MCP for frontend UI verification unless the user selects another browser tool.
- **Tool:** Use the Browse MCP server (`browse`) for tasks in the user's existing Chrome session or workflows requiring user-managed login; its guidance is the `browse` instruction reference.

## Agent Browser

- **Tool:** Before using Agent Browser, retrieve its core guidance through `agent_browser_skills_get` with `names: ["core"]`.
- **Tool:** Use the typed Agent Browser MCP tools for the operations described in the guidance's CLI examples.
- **Tool:** Pass a task-specific `session` name on each browser tool call.
- **Behavior:** Use an independently launched headless browser for frontend verification unless a visible browser is needed.
- **Behavior:** Verify UI interactions through the rendered controls even when the page offers equivalent WebMCP actions.
- **Tool:** When Code Mode's `execute` is available, look at the page first if you need to, then run each check's whole flow as one script of Agent Browser calls: act through the rendered controls, assert the page and the stored state after each step, and return only the check's pass or fail with short details. Calls inside the script don't pass through the model, so a whole flow costs one tool call instead of one per click.
- **Behavior:** Have the script return what it observed before a step fails; fix the script and run that flow again.
- **Behavior:** Clear an input as a user would, by selecting all and pressing Backspace; an empty `fill` doesn't fire the page's change events.

## Local frontend servers

- **Tool:** Serve local artifacts through localhost HTTP and open their URL with the selected browser tool. For example:

  ```sh
  python3 -m http.server <port> --bind 127.0.0.1 --directory <absolute-content-directory>
  ```

- **Behavior:** Verify the rendered content at `http://localhost:<port>/<file>`.
- **Behavior:** Reuse an appropriate existing development server and preserve servers started by others.
- **Behavior:** Track servers you start; leave them running with their URLs when needed for user inspection, otherwise stop them when finished.

## Opening a page for the user

- **Tool:** When the user asks to open or view a local HTML page, run a server for its directory in the background, then open the URL in their default browser. Don't open `file://` paths or copy the page elsewhere; they don't open reliably from WSL.

  ```sh
  python3 -m http.server <port> --bind 127.0.0.1 --directory <absolute-content-directory>
  xdg-open http://127.0.0.1:<port>/<file>
  ```

- **Behavior:** Leave the server running and reply with the URL.
