---
name: opencode-plugin-authoring
description: Build, migrate, debug, or review an OpenCode server or native TUI plugin. Use when creating an OpenCode plugin, porting a V1 plugin to the current API, configuring a plugin, or diagnosing plugin loading and dependency resolution.
---

# OpenCode Plugin Authoring

The [OpenCode plugin docs](https://opencode.ai/v2/docs/build/plugins) are the API source: package layout, loading, `Plugin.define`, the context APIs, hooks, the Effect entrypoint, TUI parts, and V1 migration. Read the pages for the parts you're building before writing code. This skill holds only what those pages don't say: behavior learned from running plugins, and where to look in the OpenCode source when the docs run out.

Expect to read source. When the docs and the installed release disagree, the release's source wins; read it at the tag matching `opencode --version`.

## Where to look in the source

In the OpenCode repository ([anomalyco/opencode](https://github.com/anomalyco/opencode)):

| Question | Start at |
|---|---|
| The docs pages themselves, at that revision | `services/www/src/docs/content/build/plugins/` |
| What a Promise context method or hook event really does | `packages/plugin/src/promise/adapter.ts`, `packages/plugin/src/effect/session.ts` (hook event types) |
| When a hook fires and what it receives | `packages/core/src/plugin/host.ts`, `packages/core/src/session/model-request.ts` (request hooks per kind) |
| A working plugin to copy patterns from | built-in plugins in `packages/core/src/plugin/` (`goal.ts`, `warming.ts`, `provider/claude-agent/`) |
| TUI loading and the modules the host supplies | `packages/tui/src/plugin/` |

## Gotchas

### Request hooks

- **Mirror prefix changes into `generate`.** The docs say each request kind has its own hook. What they don't say: when `context` adds messages or system text, or removes tools, and `generate` doesn't, every `ctx.session.generate` call (such as `/btw` or a goal review) sends a different prefix from the session's own requests and misses their prompt cache. On the `claude-agent` provider it's worse: generate forks the native Claude session only when its messages hash the same as the saved checkpoints, so a mismatch resends the whole conversation as new input. Register the same handler for `generate`, and for `compaction` when the change matters there.
- **`session.generate` is text only.** It sends the session's tools but runs no tool loop, so a reply that calls a tool comes back as empty text; tell the model not to call tools. It reads history only up to the last settled message, and its token usage is neither returned nor recorded on the session (only a server log line). To measure it, read the provider response in the `http.response` hook where `event.kind === "generate"`.

### Contributions

- **Omit absent optional fields.** Registries decode contributions (skills, agents, commands, tools) with schemas that reject a key present with value `undefined`. Object-literal shorthand of an absent value does exactly that, and one rejected contribution can abort the whole plugin reload. The symptom shows up elsewhere: model listing times out. After a reload, check the server log for the first reload error and query `/api/model`.

### Event consumers

- **A plugin's own work re-enters the event stream.** Sessions it creates, messages it sends, and generations it runs arrive as events. Remember the IDs of sessions the plugin owns and skip them; a `parentID` check misses plugin-owned top-level sessions. After a reload, trigger one event and confirm it causes exactly one action.

### Dependencies and loading

- **Imports resolve from the plugin's entrypoint directory.** A plugin loaded by path from a source checkout resolves through that checkout's install; a `package.json` in the OpenCode config directory only reaches plugins placed beneath it. Find the entrypoint (the configured URL, or `source.path` from `/api/plugin`) and resolve each runtime import from there.
- **The TUI host supplies its UI modules.** `@opencode/plugin/tui`, `solid-js`, and the `@opentui/*` modules are provided at runtime; keep them as dev and peer dependencies and import them directly rather than bundling copies.
- **`cli.json` belongs to the CLI**, which rewrites it. Merge a TUI-only plugin entry into it; don't replace or symlink the file.
- **Use the latest stable SDK.** Depend on the `@opencode/plugin` release on npm's `latest` tag, since OpenCode itself is kept on its latest release; never a beta, next, or development build. If the installed CLI is older than that release, report the gap rather than downgrading the SDK.

### Verification

- **Prove it in a fresh process.** Hot reload can keep the last good plugin generation, so it doesn't prove a dependency or entrypoint change.
- **A TUI plugin is done when its slot renders.** `/plugins` status and typechecks don't show that the render body ran, and a contained render failure may not mark the plugin failed. Mount the slot in an isolated TUI with a real route and viewport; `opencode-drive` does this when available.
