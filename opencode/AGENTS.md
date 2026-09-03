# OpenCode Assets

- Use `pnpm`, not npm or yarn. Run `pnpm test` and `pnpm typecheck` as applicable.
- Edit plugin source under `plugins/`, then run `mfz apply`.
- Declare third-party local-plugin runtime packages with exact versions under `opencode.dependencies`; the home `package.json` does not satisfy runtime dependencies. Do not declare the built-in `@opencode-ai/plugin` SDK there.
- Whenever you update an OpenCode plugin dependency or SDK version, reconcile `minimumReleaseAgeExclude` in `pnpm-workspace.yaml` in the same change. Remove stale or unnecessary exceptions and keep the list concise and intentional. After changing `minimumReleaseAgeExclude` or a plugin dependency or SDK version, regenerate and verify `pnpm-lock.yaml`.
- After changing a server plugin or its runtime dependencies, verify a fresh `opencode run --format json` emits the expected `tool_use` event; unit tests alone do not prove rendered-plugin loading.
- For a wide TUI runtime probe, use `script -qefc "stty cols 200 rows 50 && timeout 15s opencode --session <id>" /dev/null`; TUI slots mount only while their layout region is visible.
- When an OpenCode 2 API behaves unexpectedly, compare `opencode2 --version` with the `@opencode-ai/plugin` version in `~/.config/opencode/package.json`.
