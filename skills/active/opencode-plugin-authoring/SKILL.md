---
name: opencode-plugin-authoring
description: Build, migrate, debug, or review an OpenCode server or native TUI plugin. Use when creating an OpenCode plugin, porting a V1 plugin to the current API, configuring a plugin, or diagnosing plugin loading and dependency resolution.
---

# OpenCode Plugin Authoring

Use the current [OpenCode plugin documentation](https://opencode.ai/v2/docs/build/plugins) as the normative server-plugin API and configuration source. Fetch it before selecting server entrypoints, hooks, config shape, or package metadata. Inspect the installed stable OpenCode version and the published `@opencode/plugin` releases before changing a plugin that imports or types against the SDK; use the exact SDK release matching the CLI. For native TUI behavior the server page does not document, inspect the matching release source and [runtime loading](references/runtime-loading.md) rather than extending the server contract by analogy.

If the stable SDK is unavailable, stop and report the publication blocker instead of using a beta, development, or reserved package.

## Build

1. Classify the request before editing: server plugin, native TUI plugin, published package, or local development plugin. Preserve a V1 implementation unless the request explicitly replaces it.
2. Read the current documentation. For a server plugin, use its supported default export, hooks, configuration, and verification endpoint. Use Promise `setup` for a simple lifecycle; choose the Effect entrypoint when the plugin already uses Effect or benefits from scoped fibers, finalizers, or typed failures, and declare `effect` directly. For a native TUI plugin, verify the matching release's loader, context types, slot contract, and runtime bridge before coding; do not transfer the server Effect contract to a TUI API that only exposes `setup`.
3. Inspect the active OpenCode version and the plugin's actual runtime package boundary. Declare every non-host runtime import in that plugin's `dependencies`, make it resolvable from the rendered entrypoint, and match the published `@opencode/plugin` release exactly to the installed stable CLI when the plugin imports or types against the SDK. Type-only imports are development dependencies, not rendered runtime requirements.
4. Read [runtime loading](references/runtime-loading.md) before selecting a TUI layout, dependency installation strategy, configuration owner, or diagnostic conclusion. Also read its event-consumer guidance when a server plugin subscribes to events, creates sessions, generates responses, or emits synthetic messages.
5. Implement the smallest plugin and configuration change. Validate plugin options and every contribution against the matching release schema before registration. Build each contribution from its required fields. Add an optional property only after checking that its value is not `undefined`; never include an absent value through object-literal shorthand. One invalid contribution can abort plugin reload and leave unrelated services such as model discovery unavailable. Keep hooks fast. Give every long-lived resource an explicit cleanup path. Before an event-driven plugin performs work, exclude events produced by that work so the plugin cannot trigger itself recursively.
6. Verify types, rendered files, and a fresh runtime. For server plugins, inspect active IDs through the documented OpenCode 2 API, check server logs for reload errors, and exercise an unrelated service such as model listing to prove initialization completed. If the plugin consumes events, execute the triggering behavior, confirm that plugin-owned sessions and messages do not retrigger it, reload the plugin, and confirm that one event causes one action. For native TUI plugins, use an isolated visible-slot test that executes the render body; plugin status or typechecking alone is insufficient.

## Completion

The plugin has a unique ID and release-supported default export, the correct OpenCode component owns its configuration, all non-host runtime imports resolve from its rendered entrypoint, and a fresh OpenCode process exercises the expected server or visible TUI behavior. Event-driven plugins also prove bounded execution after a reload and leave model listing available.
