# OpenCode Assets

- Use `pnpm`, not npm or yarn. Run `pnpm test` and `pnpm typecheck` as applicable.
- Edit plugin source under `plugins/`. Server plugins load in place, so source edits need no `mfz apply`; run it after enabling a plugin, changing plugin options, or editing a TUI plugin, which apply copies.
- Declare each plugin's runtime packages with exact versions in that plugin's own `package.json`, list the plugin in `pnpm-workspace.yaml`, and run `pnpm install`. Server plugins load from their source directory here, so imports resolve from the repository's pnpm install. Leave `opencode.dependencies` empty: mfz renders it to `~/.config/opencode/package.json`, which nothing installs and no plugin loaded from the repository can see. TUI plugins are copied into the rendered profile without `node_modules`, so keep their runtime imports to host-provided modules.
- Whenever you update an OpenCode plugin dependency or SDK version, reconcile `minimumReleaseAgeExclude` in `pnpm-workspace.yaml` in the same change. Remove stale or unnecessary exceptions and keep the list concise and intentional. After changing `minimumReleaseAgeExclude` or a plugin dependency or SDK version, regenerate and verify `pnpm-lock.yaml`.
- After changing a server plugin or its runtime dependencies, verify a fresh `opencode run --format json` emits the expected `tool_use` event; unit tests alone do not prove rendered-plugin loading.
- For a wide TUI runtime probe, use `script -qefc "stty cols 200 rows 50 && timeout 15s opencode --session <id>" /dev/null`; TUI slots mount only while their layout region is visible.
- When an OpenCode 2 API behaves unexpectedly, compare `opencode --version` with the `@opencode/plugin` version the plugin's own `package.json` declares.
