# OpenCode Assets

- Use `pnpm`, not npm or yarn. Run `pnpm test` and `pnpm typecheck` as applicable.
- Edit plugin source under `plugins/`, then run `mfz apply`.
- Declare third-party local-plugin runtime packages with exact versions under `opencode.dependencies`; the home `package.json` does not satisfy runtime dependencies. Do not declare the built-in `@opencode-ai/plugin` SDK there.
- After changing a server plugin or its runtime dependencies, verify a fresh `opencode run --format json` emits the expected `tool_use` event; unit tests alone do not prove rendered-plugin loading.
- For a wide TUI runtime probe, use `script -qefc "stty cols 200 rows 50 && timeout 15s opencode --session <id>" /dev/null`; TUI slots mount only while their layout region is visible.
- For advisor TUI diagnostics, launch with `OPENCODE_ADVISOR_DEBUG=1` and inspect `~/.opencode/logs/advisor-tui.log` for `view.mount` and pricing events.
- When an OpenCode API behaves unexpectedly, compare `opencode --version` with the `@opencode-ai/plugin` version in `~/.config/opencode/package.json`.
