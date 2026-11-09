---
name: opencode-plugin-authoring
description: Build, migrate, debug, or review an OpenCode server, native TUI, or desktop GUI plugin. Use when creating an OpenCode plugin, porting a V1 plugin to the current API, configuring a plugin, or diagnosing plugin loading, dependency resolution, or a desktop panel that doesn't show or reload.
---

# OpenCode Plugin Authoring

The [OpenCode plugin docs](https://opencode.ai/v2/docs/build/plugins) are the API source: package layout, loading, `Plugin.define`, the context APIs, hooks, the Effect entrypoint, TUI and GUI parts, and V1 migration. Read the pages for the parts you're building before writing code. This skill holds only what those pages don't say: behavior learned from running plugins, and where to look in the OpenCode source when the docs run out.

Expect to read source. When the docs and the installed release disagree, the release's source wins; read it at the tag matching `opencode --version`.

## Where to look in the source

In the OpenCode repository ([anomalyco/opencode](https://github.com/anomalyco/opencode)):

| Question | Start at |
|---|---|
| The docs pages themselves, at that revision | `services/site/src/docs/content/build/plugins/` |
| What a Promise context method or hook event really does | `packages/plugin/src/promise/adapter.ts`, `packages/plugin/src/effect/session.ts` (hook event types) |
| When a hook fires and what it receives | `packages/core/src/plugin/host.ts`, `packages/core/src/session/model-request.ts` (request hooks per kind) |
| A working plugin to copy patterns from | built-in plugins in `packages/core/src/plugin/` (`goal.ts`, `warming.ts`, `provider/claude-agent/`) |
| TUI loading and the modules the host supplies | `packages/tui/src/plugin/` |
| A GUI API's exact behavior (TSDoc on every field), and built-in panels to copy | `packages/plugin/src/gui/`, `packages/gui-plugins/` (its `README.md` is the authors' guide) |
| How the desktop app lists, reads, and reloads GUI bundles | `packages/desktop/src/main/plugin/host.ts`, `packages/core/src/plugin/module.ts` |

## Gotchas

### Request hooks

- **Mirror prefix changes into `generate`.** The docs say each request kind has its own hook. What they don't say: when `context` adds messages or system text, or removes tools, and `generate` doesn't, every `ctx.session.generate` call (such as `/btw` or a goal review) sends a different prefix from the session's own requests and misses their prompt cache. On the `claude-agent` provider it's worse: generate forks the native Claude session only when its messages hash the same as the saved checkpoints, so a mismatch resends the whole conversation as new input. Register the same handler for `generate`, and for `compaction` when the change matters there.
- **`session.generate` is text only.** It sends the session's tools but runs no tool loop, so a reply that calls a tool comes back as empty text; tell the model not to call tools. It reads history only up to the last settled message, and its token usage is neither returned nor recorded on the session (only a server log line). To measure it, read the provider response in the `http.response` hook where `event.kind === "generate"`.

### Contributions

- **Omit absent optional fields.** Registries decode contributions (skills, agents, commands, tools) with schemas that reject a key present with value `undefined`. Object-literal shorthand of an absent value does exactly that, and one rejected contribution can abort the whole plugin reload. The symptom shows up elsewhere: model listing times out. After a reload, check the server log for the first reload error and query `/api/model`.

### Event consumers

- **A plugin's own work re-enters the event stream.** Sessions it creates, messages it sends, and generations it runs arrive as events. Remember the IDs of sessions the plugin owns and skip them; a `parentID` check misses plugin-owned top-level sessions. After a reload, trigger one event and confirm it causes exactly one action.
- **A server plugin runs once per location.** Each open directory gets its own instance, so a watcher or RPC registration in `setup` exists once per location, and every instance's RPC event reaches every subscriber. Filter received events on `event.location.directory`, and pass `{ location }` on RPC calls to pick the instance.

### Dependencies and loading

- **Imports resolve from the plugin's entrypoint directory.** A plugin loaded by path from a source checkout resolves through that checkout's install; a `package.json` in the OpenCode config directory only reaches plugins placed beneath it. Find the entrypoint (the configured URL, or `source.path` from `/api/plugin`) and resolve each runtime import from there.
- **A server plugin runs inside the `opencode` binary.** `process.execPath` is `opencode`, not Node, so spawn a Node script with `node` by name.
- **The TUI host supplies its UI modules.** `@opencode/plugin/tui`, `solid-js`, and the `@opentui/*` modules are provided at runtime; keep them as dev and peer dependencies and import them directly rather than bundling copies.
- **`cli.json` belongs to the CLI**, which rewrites it. Merge a TUI-only plugin entry into it; don't replace or symlink the file.
- **Use the latest stable SDK**: the `@opencode/plugin` release on npm's `latest` tag, never a beta, next, or development build. If the installed CLI is older, report the gap rather than downgrading the SDK.

### Desktop GUI

- **The GUI loads from the app machine's sidecar**, which reads that machine's global config: on Windows, `%USERPROFILE%\.config\opencode\opencode.json`, even when sessions run on a WSL or remote server. Panels still render for sessions on any server. `ctx.client` is the sidecar's client, so reach the plugin's server part where the session runs with `props.session.server.client.rpc(Definition)`.
- **Windows sees no file changes under `\\wsl.localhost`**, so a Windows sidecar never reloads a bundle loaded from WSL. Register a Windows folder and have the build copy `package.json` and the bundle into it.

### Verification

- **Prove it in a fresh process.** Hot reload can keep the last good plugin generation, so it doesn't prove a dependency or entrypoint change. A reload that fires while related files are half-edited can also cache the stale module, and every later reload fails the same way until the server restarts (`opencode service restart`). After editing a plugin's imports, check the server log (`~/.local/share/opencode/log/opencode.log`) for `failed to load plugin`.
- **A TUI plugin is done when its slot renders.** `/plugins` status and typechecks don't show that the render body ran, and a contained render failure may not mark the plugin failed. Mount the slot in an isolated TUI with a real route and viewport; `opencode-drive` does this when available.
- **A GUI plugin is done when its panel renders, and a rebuild changes it.** The sidecar's `/api/plugin` and `/api/plugin/gui?id=<id>` show whether it loaded; its URL and password are in the app machine's `~/.local/state/opencode/service.json`, and from WSL a Windows sidecar is reachable only through a Windows process such as PowerShell. Then start the app with `--remote-debugging-port`, read the panel's text over CDP (`windows-app-recording` covers the WSL relay), rebuild with a change, and read it again.
