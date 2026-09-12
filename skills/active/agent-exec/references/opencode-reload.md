# OpenCode Runtime Boundaries

Read this before launching OpenCode through its CLI merely to test a configuration or resource change.

## Choose the boundary

| Need | Use |
| --- | --- |
| Current watched server state | The current session's next model attempt |
| Context without prior conversation or loaded guidance | A fresh native subagent or session |
| Client-startup state | A new CLI or TUI process |
| A private server | `--standalone` |
| A named existing server | `--server <url>` |
| Reconstructed server state or recovery from an unhealthy service | A service restart |

By default, a new OpenCode client reconnects to the shared background service. It does not provide server isolation.

## Runtime freshness

OpenCode rebuilds request context before every physical model attempt. After a watched resource reloads, the current session's next attempt resolves current server-side configuration, agent and model definitions, tools, permissions, skills, references, instructions, MCP state, and watched plugin generation. A provider request already in flight keeps its captured state.

Source repositories and generators may sit outside the watched runtime path. Complete the configuration workflow's render or installation step, wait for the reload, then continue in the current session.

The session retains its selected agent and model references. A changed default does not replace an existing explicit selection; reselect it or create a session when selection behavior is the test.

Invoke an edited skill again to load its current body. Existing skill text remains in conversation history.

## Context freshness

Use a fresh native subagent or session when the test must exclude prior conversation, tool calls, permission decisions, loaded skill text, or instruction entries already injected into the session. Also use fresh context for initial defaults, subagent mode, child permissions, depth, and child-specific configuration.

Fresh context is a test condition, not a server reload mechanism.

## New client, private server, or restart

Start a new client after changing client-startup configuration such as `cli.json`, keybindings, themes, or terminal plugins.

Use `--standalone` for a private server. Add clean-room environment controls when the run must also exclude normal configuration, credentials, sessions, caches, plugins, and skills. Use `--server <url>` to connect to a named existing service, not as an isolation shortcut.

Restart the shared service only when the test concerns state constructed at service startup or the service is unhealthy. Formatter configuration, watcher policy, process environment, and installed executable code can require reconstruction rather than request-context reload.

Configured absolute plugin files hot-reload. Configured plugin directory targets and installed package-plugin code do not reload merely because a file inside them changed; use their supported reload path or reconstruct the server state.

Use supported authentication and connection commands for provider and MCP credentials. Credential-store edits are not a reload workflow.
