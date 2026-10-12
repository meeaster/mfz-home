# opencode-plugin-authoring

## Intent

Help agents build, migrate, debug, and review OpenCode server and native TUI plugins. The official plugin page stays the API source; the skill adds only the loader, dependency, and verification facts that page doesn't cover and that agents get wrong.

Not for: copying the official API docs, maintaining V1 plugins beyond a requested migration, MCP servers, slash commands, or generic Bun plugins.

Success: the right current contract, configuration ownership respected, V1 kept when coexistence is requested, and proof that the rendered package works in a fresh server or visible TUI while unrelated services stay healthy.

## Scenarios

- **New server plugin**: fetches the official page first, keeps a simple plugin on Promise `setup`, uses the Effect entrypoint only for scoped resources, fibers, typed failures, or an existing Effect codebase.
- **Port a V1 sidebar plugin without deleting V1**: native TUI contract, a local directory with root `index.*` and `tui.*`, the matching SDK, `cli.json` settings preserved, verified by a visible slot rather than typecheck or `/plugins` status.
- **TUI plugin listed in `/plugins` but never renders**: distinguishes listing from import and setup; a configured local file is a known negative case.
- **"Convert this TUI plugin to Effect"**: the TUI definition exposes only `setup`, so it keeps Solid lifecycle instead of applying the server entrypoint by analogy.
- **`Expected ArrayBufferView but received Cell`**: doesn't assume duplicate runtimes from the message; runs a minimal control first.
- **Add a YAML parser** to a plugin whose URL points into a source checkout: declares it in that plugin's own package and leaves the shared config-directory manifest alone.
- **Plugin registers skills with undefined optional fields and the model list times out**: omits absent optionals instead of setting them to `undefined`.
- **Advisor plugin reviews completed sessions and the model picker hangs after reload**: excludes its own top-level sessions and closes its event iterator on cleanup.
- **Stable CLI patch upgrade**: picks the exact matching `@opencode/plugin` release or reports that it isn't published, never a beta.

## Decisions

- **Model-invoked** (2026-08-13). Plugin work benefits from the skill loading during implementation and diagnosis without being named.
- **Link the official page instead of copying it**, so the skill doesn't go stale.
- **A visible-slot render is the TUI completion gate.** An unconsumed test config once produced silent built-ins-only false negatives, and compilation or "active" status doesn't prove rendering.
- **Omit absent optional fields** (2026-08-21). A present `undefined` failed the host schema on reload and took down model-catalog initialization; `/api/model` is the cross-service probe after reload.
- **Exclude plugin-owned sessions from event handlers** (2026-08-26). An advisor plugin reviewed its own top-level review session and started recursive generations; `parentID` checks don't catch top-level sessions.
- **Resolve dependencies from the entrypoint, not the shared config manifest** (human, 2026-09-24). Plugins had declared dependencies in `~/.config/opencode/package.json` that were never installed or used, because the rendered plugin URLs point into the source checkout.
- **Release evidence beats remembered loader behavior.** Native TUI directory loading changed between `0.0.0-next-17428` (`tui/index.tsx`) and `0.0.0-beta-18743` (root `index.*` and `tui.*`); the `Cell` crash didn't reproduce under isolated controls.

## Sources

| Source | Revision | Local use |
|---|---|---|
| [OpenCode plugin docs](https://opencode.ai/v2/docs/build/plugins) | fetched at use time | Normative server API and configuration |
| OpenCode TUI loader and runtime-plugin source | loader evidence from `0.0.0-beta-18743`, 2026-09-01 | `references/runtime-loading.md`. When the docs or build change, recheck discovery, local-directory resolution, CLI config ownership, host module aliases, whether the TUI definition gained an Effect entrypoint, the present-`undefined` schema rejection, and event-subscription cleanup, then rerun the file-negative, directory-positive, and visible-slot controls |
| `@opencode/plugin` on npm | must match the installed stable CLI | SDK version selection |
