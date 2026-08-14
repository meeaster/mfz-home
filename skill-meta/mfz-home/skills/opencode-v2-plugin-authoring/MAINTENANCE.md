# Maintenance

## Sources

The canonical API source is `https://opencode.ai/v2/docs/build/plugins.md`.
The runtime supplement records behavior verified from the matching OpenCode V2
source and installed CLI; it is not an API replacement.

## Refresh Procedure

1. Fetch the canonical page and inspect the installed `opencode2 --version`.
2. When the page or build changes, inspect the corresponding TUI loader and
   runtime-plugin support code before altering loader claims. Confirm discovery,
   local-directory resolution, consumed CLI configuration, render boundaries,
   host runtime aliases, and whether the TUI definition has gained an Effect
   entrypoint.
3. Re-run isolated Drive controls for file, directory, SDK-importing, reactive,
   and visible-slot plugins. Use fresh processes and retain renderer evidence.
4. Keep host module aliases, dependency boundaries, physical package layout,
   and CLI-file ownership only while source and runtime evidence agree.
5. Update lifecycle-selection, migration, package-directory, dependency, and
   crash-diagnosis scenarios when behavior changes.

## Verification

Check frontmatter, catalog registration, profile enablement, and every local
reference link. Test representative server and TUI plugin requests against a
fresh V2 runtime. For native TUI work, inspect active state and execute a visible
contribution; neither agent summary, TypeScript compilation, nor active status
alone proves rendering.
