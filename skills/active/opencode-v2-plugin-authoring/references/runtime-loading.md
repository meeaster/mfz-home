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
- In `0.0.0-beta-18743`, a configured local file entry can appear in `/plugins` but the TUI provider skips it before import. Register a local TUI directory instead.
- The configured-directory loader requires physical root `index.*` and `tui.*` files, then imports the root `tui.*` entrypoint. If the implementation remains under `tui/index.tsx`, add a root `tui.tsx` wrapper and a root `index.ts` marker.
- `exports["./tui"]` is package metadata only for local directory loading. A renderer or configuration manager must register the directory URL, not the nested `tui/index.tsx` file URL. Automatically discovered local TUI directories use the same root entrypoint shape.
- TUI plugins use the native `@opencode-ai/plugin/tui` contract, not the V1 or
  server Promise/Effect contracts. At `0.0.0-beta-18743`, the native TUI
  definition exposes `setup` and no TUI Effect entrypoint.

## Schema Boundaries

- Treat plugin registries as external schema boundaries. Build a contribution from required fields, then conditionally assign each optional field after `value !== undefined`. An object property set to `undefined` is present at runtime and can fail an Effect schema whose optional field accepts omission but not `undefined`.
- Before registration, verify that each absent optional field is absent as an own property. For example, `Object.hasOwn(skill, "slash")` must be `false` when the parsed value is absent. TypeScript optional-property syntax does not enforce this runtime distinction.
- Decode or otherwise validate generated skills, agents, commands, and tools before adding them to a registry. Type assertions and successful compilation do not prove that the runtime schema accepts the object.
- A malformed contribution can abort the complete plugin reload. The resulting symptom may appear outside the plugin. For example, a rejected skill field can prevent model-catalog initialization and make model endpoints time out.
- When model discovery fails after a plugin change, inspect the server log for the first plugin reload or schema error. Fix that error before investigating providers, credentials, or model configuration.

## Event Consumers And Reentrancy

- Treat a plugin's own sessions, generated responses, synthetic messages, and tool calls as input to the same global event stream. An event-driven plugin must identify and exclude its output before starting work. A guard keyed only by the session currently under review does not stop recursion when the plugin creates a different top-level session.
- Persist or otherwise retain the IDs of plugin-owned sessions so the exclusion survives a server restart. Apply any intended parent-session exclusion separately. A plugin-owned top-level session has no `parentID`, so a child-session check alone does not exclude it.
- Acquire a long-lived event stream once and keep its async iterator. Cleanup must close that exact iterator with `await iterator.return?.()` and then await the consumer task. Use an `AbortSignal` only when the matching SDK contract proves that the subscription accepts it and closes the stream. A locally aborted controller does not prove that the remote iterator stopped.
- Expect hot reload to expose cleanup defects. After a reload, trigger one representative event and verify that it causes one plugin action. Duplicate generations or synthetic messages indicate that an earlier consumer is still active.
- Test the plugin's feedback boundary, not only its pure parsing logic. A regression check must show that a completion from the plugin-owned session does not start another generation. Then query `/api/model`; recursive generation can exhaust initialization or request capacity and make the model picker fail even while `/api/plugin` reports the plugin as active.

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
- After a server-plugin reload and one representative plugin action, exercise model listing or another unrelated initialization-dependent endpoint. This catches rejected contributions and runaway event consumers even when plugin status reports an active generation.

## Version Check

The V2 plugin API is beta. Before creating or migrating a plugin, compare the
installed `opencode2 --version` with the plugin SDK declared by the plugin.
Use the SDK release that matches the CLI build and verify the version actually
resolved from the rendered entrypoint.
