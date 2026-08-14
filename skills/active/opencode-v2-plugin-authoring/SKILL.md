---
name: opencode-v2-plugin-authoring
description: Build, migrate, debug, or review an OpenCode V2 server or native TUI plugin. Use when creating an OpenCode 2 plugin, porting a V1 plugin to V2, configuring a plugin, or diagnosing V2 plugin loading and dependency resolution.
---

# OpenCode V2 Plugin Authoring

Use the current [OpenCode V2 plugin documentation](https://opencode.ai/v2/docs/build/plugins.md) as the normative server-plugin API and configuration source. Fetch it before selecting server entrypoints, hooks, config shape, or package metadata; V2 remains beta. For native TUI behavior the page does not document, inspect the matching release source and [runtime loading](references/runtime-loading.md) rather than extending the server contract by analogy.

## Build

1. Classify the request before editing: server plugin, native TUI plugin, published package, or local development plugin. Preserve a V1 implementation unless the request explicitly replaces it.
2. Read the current documentation. For a server plugin, use its supported default export, hooks, configuration, and verification endpoint. Use Promise `setup` for a simple lifecycle; choose the Effect entrypoint when the plugin already uses Effect or benefits from scoped fibers, finalizers, or typed failures, and declare `effect` directly. For a native TUI plugin, verify the matching release's loader, context types, slot contract, and runtime bridge before coding; do not transfer the server Effect contract to a TUI API that only exposes `setup`.
3. Inspect the active OpenCode version and the plugin's actual runtime package boundary. Declare every non-host runtime import in that plugin's `dependencies`, make it resolvable from the rendered entrypoint, and match beta SDK packages to the running build. Type-only imports are development dependencies, not rendered runtime requirements.
4. Read [runtime loading](references/runtime-loading.md) before selecting a TUI layout, dependency installation strategy, configuration owner, or diagnostic conclusion.
5. Implement the smallest plugin and configuration change. Validate plugin options at the plugin boundary, keep hooks fast, and return cleanup for resources the plugin owns.
6. Verify types, rendered files, and a fresh runtime. For server plugins, inspect active IDs through the documented V2 API and server logs. For native TUI plugins, use an isolated visible-slot test that executes the render body; plugin status or typechecking alone is insufficient.

## Completion

The plugin has a unique ID and release-supported default export, its configuration is owned by the correct OpenCode surface, all non-host runtime imports resolve from its rendered entrypoint, and a fresh V2 process exercises the expected server or visible TUI behavior.
