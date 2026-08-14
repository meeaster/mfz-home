# Runtime Loading

This reference supplements the canonical V2 plugin page. Refresh it against the
installed OpenCode release or its matching source when loader behavior changes.

## Resolution Boundaries

- A local plugin resolves ordinary imports from its entrypoint's package and
  ancestor directories. Declare runtime imports in the owning plugin package;
  install them package-locally or expose them through a deliberate rendered
  ancestor. A dependency elsewhere on disk does not satisfy this boundary.
- A native TUI plugin using runtime `Plugin.define` from
  `@opencode-ai/plugin/tui` must declare the SDK in `dependencies`, pin beta
  builds to the installed OpenCode version, and make it resolvable from the
  rendered entrypoint. A structural `{ id, setup }` default export with
  type-only SDK imports needs the matching SDK only for development and may
  declare it in `devDependencies`; verify that compiled or directly imported
  runtime code contains no SDK import before relying on this deployment shape.
- Rendering a manifest does not install it. A configuration manager that copies
  local plugins must separately establish runtime dependency resolution and
  must not copy source-workspace `node_modules` as deployment output.
- Native TUI plugins run inside OpenCode's Bun TUI host. The host registers its
  bundled `solid-js`, `solid-js/store`, `@opentui/solid`, OpenTUI core modules,
  JSX runtimes, and keymap modules as runtime plugin modules before plugin
  import. Keep those packages available for development and typechecking, but
  preserve direct imports for the host bridge rather than bundling private
  runtime copies into deployment output.
- The V2 plugin SDK lists UI modules as optional peers. Inspect the installed
  production tree: a plugin-local Solid/OpenTUI copy is a compatibility risk,
  not proof of a failure. Errors mentioning `Cell` or `ArrayBufferView` require
  a minimal render control and resolved-module evidence before diagnosis.
- Any import outside those host-provided modules remains a plugin dependency and
  needs normal runtime resolution. Confirm unclear specifiers from the installed
  release before declaring them bundled.

## Native TUI Configuration

- Server plugins belong in `opencode.json(c)` as documented.
- In releases using native CLI plugin configuration, TUI entries live in
  `cli.json` under `plugins`. The CLI owns and may rewrite that file. Merge a
  managed entry while preserving unrelated settings and entries; do not replace
  or symlink the file. Verify this surface from the installed release because
  native TUI configuration remains beta.
- Tested local values include `file://`, absolute, and relative package paths,
  explicit entry files, object entries, and immediate `plugins/tui/*.tsx`
  discovery files.
- For a configured local directory, the tested loader resolves the physical
  `<package>/tui` path. Use `tui/index.tsx`. Package `exports["./tui"]` is useful
  metadata but does not replace that physical layout; root-only `tui.tsx` or
  `index.tsx` entrypoints do not satisfy directory loading.
- TUI plugins use the native `@opencode-ai/plugin/tui` contract, not the V1 or
  server Promise/Effect contracts. At `0.0.0-next-17428`, the native TUI
  definition exposes `setup` and no TUI Effect entrypoint.

## Native TUI Verification

- Use a fresh isolated TUI process with a real route and viewport that mounts
  the target slot. When available, load `opencode-drive`, typecheck the Drive
  script, and assert exact renderer text plus the absence of plugin crash UI.
- Write the configuration file consumed by the tested release. A helper that
  writes a legacy or inactive config surface can yield built-ins-only status
  without a load error.
- Check `/plugins` for discovery and setup state, but execute the contribution:
  status does not prove a slot render body ran, and a contained render failure
  may not mark plugin status failed or emit a stack.
- Test a fresh process after dependency or entrypoint changes. Hot reload may
  retain or restore the last good generation and is supplemental evidence only.

## Version Check

The V2 plugin API is beta. Before creating or migrating a plugin, compare the
installed `opencode2 --version` with the plugin SDK declared by the plugin.
Use the SDK release that matches the CLI build and verify the version actually
resolved from the rendered entrypoint.
