# opencode-plugin-authoring

## Intent

Give agents building, migrating, debugging, or reviewing OpenCode server and native TUI plugins a rough map and the gotchas they'd otherwise hit. The official docs are the API source, and agents are expected to read the OpenCode source for anything beyond them; the skill only points the way.

Not for: restating the docs, maintaining V1 plugins beyond a requested migration, MCP servers, slash commands, or generic Bun plugins.

Success: the agent reads the docs and source rather than the skill for API detail, avoids each listed gotcha, and proves the plugin works in a fresh server or visible TUI while unrelated services stay healthy.

## Scenarios

- **New server plugin**: reads the docs pages first and looks up undocumented behavior in the source rather than guessing.
- **Plugin edits the session prompt in a `context` hook**: also applies the change in `generate`, so `/btw`-style calls share the session's cache.
- **Plugin calls `ctx.session.generate` expecting tool use or cost data**: knows neither comes back.
- **Plugin registers skills with undefined optional fields and the model list times out**: omits absent optionals instead of looking at providers.
- **Advisor plugin reviews completed sessions and the model picker hangs after reload**: excludes its own top-level sessions.
- **Add a YAML parser** to a plugin whose URL points into a source checkout: declares it in that plugin's own package and leaves the shared config-directory manifest alone.
- **TUI plugin listed in `/plugins` but never renders**: verifies a visible slot instead of trusting status.
- **Stable CLI upgrade**: moves the plugin to the `latest` `@opencode/plugin` release, never a beta.

## Decisions

- **Skill scope** (human, 2026-10-31). No content that duplicates the OpenCode plugin docs. Keep only gotchas learned from running plugins and facts found only by reading source, plus pointers into the source; leave anything an agent can learn quickly from source to the source. The previous `references/runtime-loading.md` was folded into `SKILL.md` and its documented or stale parts dropped: local-directory entry files, `cli.json` for TUI-only packages, and the TUI SDK runtime alias are now in the docs, and `event.subscribe({ signal })` now closes the stream, with the host also closing subscriptions on unload.
- **SDK on npm `latest`** (human, 2026-10-31). OpenCode is normally kept on its latest release, so the latest stable SDK fits it; the earlier exact-CLI-match rule didn't reflect practice (a working plugin ran SDK 2.1.1 on CLI 2.2.5) and the docs ask only for compatible versions.
- **Model-invoked** (2026-08-13). Plugin work benefits from the skill loading during implementation and diagnosis without being named.
- **Mirror prefix changes into `generate`** (2026-10-31). A plugin added an opening message and system text in `context` only. Generate calls then missed the session's prompt cache on every provider, and on `claude-agent` the fork's checkpoint hashes never matched, so each call resent about 100k tokens as new input. Registering the same handler for `generate` took a call from about 25k to 99.9% cached tokens.
- **A visible-slot render is the TUI completion gate.** An unconsumed test config once produced silent built-ins-only false negatives, and compilation or "active" status doesn't prove rendering.
- **Omit absent optional fields** (2026-08-21). A present `undefined` failed the host schema on reload and took down model-catalog initialization; `/api/model` is the cross-service probe after reload.
- **Exclude plugin-owned sessions from event handlers** (2026-08-26). An advisor plugin reviewed its own top-level review session and started recursive generations; `parentID` checks don't catch top-level sessions.
- **Resolve dependencies from the entrypoint, not the shared config manifest** (human, 2026-09-24). Plugins had declared dependencies in the OpenCode config directory's `package.json` that were never installed or used, because the rendered plugin URLs point into the source checkout.

## Sources

| Source | Revision | Local use |
|---|---|---|
| [OpenCode plugin docs](https://opencode.ai/v2/docs/build/plugins) | read at use time; reviewed against `services/www` at `171dbd6abe` | Normative API |
| [anomalyco/opencode](https://github.com/anomalyco/opencode) source | `171dbd6abe` (2026-10-30) | Source map and gotchas. When upgrading, recheck the generate request path (`core/src/session/generate.ts`, the `claude-agent` branch logic), contribution schema decoding, event-stream closing, and the TUI host module list |
| `@opencode/plugin` on npm | `latest` tag at use time | SDK version selection |
