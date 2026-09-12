# Maintenance

## Sources

The canonical API source is `https://opencode.ai/v2/docs/build/plugins`.
The runtime supplement records behavior verified from the matching OpenCode
source and installed CLI; it is not an API replacement.

## Refresh Procedure

1. Fetch the canonical page, inspect the installed `opencode --version`, and check the published stable `@opencode/plugin` releases. Treat every stable 2.x CLI patch upgrade as possible SDK/API drift: when a plugin imports or types against the SDK, verify that its exact SDK release matches the CLI and remains resolvable from the rendered entrypoint. If the matching stable SDK is unavailable, preserve the publication blocker rather than substituting a beta, development, or reserved package.
2. When the page or build changes, inspect the corresponding TUI loader and
   runtime-plugin support code before altering loader claims. Confirm discovery,
   local-directory resolution, consumed CLI configuration, render boundaries,
   host runtime aliases, and whether the TUI definition has gained an Effect
   entrypoint.
3. Re-run fresh controls for a configured local file negative case, a root-shaped directory positive case, SDK-importing and reactive plugins, and a visible-slot contribution. Use OpenCode Drive when available and retain rendered-package evidence.
4. Keep host module aliases, dependency boundaries, physical package layout,
   and CLI-file ownership only while source and runtime evidence agree.
5. Recheck registry schemas with an omitted optional property and a present `undefined` property. Preserve the distinction only while the matching runtime rejects the latter.
6. Recheck the matching event subscription contract, iterator cleanup behavior, hot reload disposal, and event delivery from plugin-owned top-level sessions. Preserve the exact-iterator cleanup and self-output exclusion rules while runtime evidence supports them.
7. Update lifecycle-selection, migration, package-directory, stable-patch-upgrade, local-entry diagnosis, dependency, and crash-diagnosis scenarios when behavior changes.

## Verification

Test representative server and TUI plugin requests against a fresh OpenCode runtime. For event-driven server plugins, trigger one action before and after reload, confirm that plugin-owned output does not retrigger the plugin, and query `/api/model`. For native TUI work, inspect active state and execute a visible contribution; neither agent summary, TypeScript compilation, nor active status alone proves rendering.

The loader evidence changed between `0.0.0-next-17428` and `0.0.0-beta-18743`. Root `index.*` and `tui.*` directory loading supersedes the older `tui/index.tsx` claim. Consult [historical evidence](LOG.md) when revisiting that reversal or the `Cell` crash diagnosis; revalidate against the installed release rather than treating either version as permanent.
