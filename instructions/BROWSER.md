# Browser automation

- Load `browser-control` for browser automation, including isolated tasks, authenticated tabs, and human handoffs. Use its MCP tools or CLI through the WSL relay. Follow an explicit human choice of another tool; otherwise report a concrete capability blocker instead of silently switching tools.
- Create a distinct Browser Control session for each task or agent and pass its ID explicitly on subsequent calls. Use a new session-owned page unless the task requires an existing user tab; attach or adopt only the intended tab.
- Keep navigation and viewport changes local to the owned page. Separate sessions share the relay and browser profile; they do not isolate global browser state. Coordinate operations that affect that shared state.
- Run Playwright code inside Browser Control's `execute` runtime. Its `page`, `state`, and helpers are not available in the outer tool-orchestration runtime. Let the Browser Control skill own command syntax, authentication handoffs, and recovery.
- Keep browser profiles, cookies, credentials, and authentication stores out of inspection, copies, logs, and artifacts. The human completes login and security prompts through the supported handoff.

## WSL files in Windows Chrome

Serve WSL files through localhost HTTP:

```sh
python3 -m http.server <port> --bind 127.0.0.1 --directory <absolute-content-directory>
```

Open `http://localhost:<port>/<file>` with Browser Control and verify the rendered content.

Reuse an appropriate development server when possible. Track any server you start; leave it running with its URL for user inspection, otherwise stop it when finished. Preserve pre-existing servers.
