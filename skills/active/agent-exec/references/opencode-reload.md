# OpenCode 2 Reload Boundaries

Read this before launching OpenCode 2 through its CLI merely to test a configuration or resource change.

## Next-Attempt Visibility

OpenCode 2 rebuilds request context before every physical model attempt. After the relevant watcher and reload finish, the current session's next attempt resolves the current agent definition, model object, tool snapshot, permissions, skill and reference guidance, ambient instructions, MCP tools and instructions, and plugin generation. This also applies to a later model step in an ongoing tool loop. It never rewrites a provider request already in flight.

Use the current session first for these watched changes:

- global, project, and nested `opencode.json(c)` configuration whose consumer supports reload;
- skill sources and discovery configuration;
- agent definitions, including prompts, configured model, permissions, and tool visibility;
- commands and references;
- known global and ancestor `AGENTS.md` files;
- MCP definitions, connections, tools, and instructions after reconciliation settles;
- local plugin files and files auto-discovered under watched `plugin` or `plugins` directories;
- provider definitions and settings resolved through supported configuration.

Mindframe-Z home source is not itself the watched runtime path. Run `mfz apply`, wait for the reload, then continue in the current session.

## Reselect Or Reload Explicitly

The session stores its selected agent ID and model reference. Changing `default_agent` or a default model does not replace an existing explicit selection. Switch the session's agent or model when the test concerns selection rather than the selected definition.

Skill discovery and content reload, but previously loaded skill text remains in conversation history. Invoke the skill again to load its current body. Use a fresh session or child when stale loaded text would make the evaluation ambiguous.

Use supported authentication and connection commands for provider and MCP credentials. Arbitrary edits to credential storage are not a supported reload path.

## Fresh Session

Use a fresh session or native child when testing:

- default-agent or default-model behavior at session creation;
- initial instruction rendering rather than a chronological update;
- subagent mode, permissions, depth, or child context;
- behavior that must exclude prior conversation, tool calls, permission decisions, or loaded skill text;
- a nested `AGENTS.md` file already injected by a file read, because that synthetic session entry is not replaced after the file changes.

Fresh context is a test condition, not a general runtime-refresh requirement.

## New Client Or Restart

Start a new CLI or TUI process after editing `cli.json`, including keybindings, configured themes, and terminal plugins. The running client loads these settings at startup; they are separate from server and project configuration.

Rebuild the Location service or restart the server for formatter changes, watcher ignore changes, process environment, executable code, and other services that read configuration only during construction. V2 currently parses LSP configuration but has no active LSP runtime, so do not promise reload behavior for it.

Configured absolute plugin files hot-reload. Configured plugin directory targets do not watch edits inside the directory. Installed package-plugin code also has no source watcher; trigger a supported plugin/config reload or restart the server.

The `instructions` configuration field is retained for compatibility but does not activate instruction sources in V2. Use watched `AGENTS.md` sources instead.
