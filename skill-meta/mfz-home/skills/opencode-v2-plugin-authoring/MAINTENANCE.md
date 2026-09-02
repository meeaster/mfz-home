# Maintenance

## Sources

The canonical API source is `https://opencode.ai/v2/docs/build/plugins`.
The runtime supplement records behavior verified from the matching OpenCode V2
source and installed CLI; it is not an API replacement.

## Refresh Procedure

1. Fetch the canonical page and inspect the installed `opencode2 --version`.
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
7. Update lifecycle-selection, migration, package-directory, local-entry diagnosis, dependency, and crash-diagnosis scenarios when behavior changes.

## Verification

Check frontmatter, catalog registration, profile enablement, and every local reference link. Test representative server and TUI plugin requests against a fresh V2 runtime. For event-driven server plugins, trigger one action before and after reload, confirm that plugin-owned output does not retrigger the plugin, and query `/api/model`. For native TUI work, inspect active state and execute a visible contribution; neither agent summary, TypeScript compilation, nor active status alone proves rendering.
