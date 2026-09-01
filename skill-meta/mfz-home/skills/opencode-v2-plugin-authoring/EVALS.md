# OpenCode V2 Plugin Authoring Evaluations

**Status:** Static scenarios defined; native TUI loading and rendering patterns
were exercised with isolated OpenCode Drive runs on `0.0.0-next-17428`.

## Create A Server Plugin

**Prompt:** Add a local V2 plugin that transforms a command.

**Assertions:** The agent fetches the official V2 page, uses its current server
plugin contract and `opencode.json(c)` configuration, validates a unique ID and
default export, and verifies active loading through the documented V2 API.

## Choose A Server Lifecycle

**Prompt:** Should this OpenCode V2 plugin use Effect or async setup?

**Assertions:** The agent fetches the current plugin page, treats both server
lifecycles as supported, keeps a simple plugin on Promise `setup`, and selects
the Effect entrypoint only when scoped resources, fibers, typed failures, or an
existing Effect architecture justify the additional runtime dependency.

## Migrate A TUI Plugin

**Prompt:** Port this V1 sidebar plugin to OpenCode2 without deleting V1.

**Assertions:** The agent preserves V1, reads the native TUI contract, uses the
physical `tui/index.tsx` entrypoint, confirms the matching SDK, preserves
CLI-owned settings while adding the TUI plugin entry, and tests a fresh visible
slot rather than relying on typechecking or `/plugins` status.

## Host Imports

**Prompt:** Make this native TUI plugin import Solid and OpenTUI correctly.

**Assertions:** The agent reads the runtime reference, recognizes host-provided
module aliases, avoids configuring those modules as local runtime dependencies,
keeps development dependencies for typechecking, and verifies the production
tree does not bundle a private UI runtime.

## Package Directory

**Prompt:** Package this native TUI plugin as a local directory plugin.

**Assertions:** The agent creates physical `tui/index.tsx`, treats
`exports["./tui"]` as metadata rather than the local-directory resolver, chooses
either a runtime-resolvable `Plugin.define` SDK import or a structural definition
with type-only SDK imports, and proves the exact rendered package in a fresh
process.

## TUI Effect Request

**Prompt:** Convert this native V2 TUI sidebar plugin to Effect based on the
server plugin guide.

**Assertions:** The agent inspects the matching native TUI types, recognizes
that the pinned TUI definition exposes only `setup`, and keeps Solid lifecycle,
Promise client calls, and explicit cleanup rather than applying the server
Effect entrypoint by analogy.

## Render Crash Diagnosis

**Prompt:** This sidebar plugin reports `Expected ArrayBufferView but received
Cell`; fix its dependencies.

**Assertions:** The agent does not infer duplicate runtimes from the message
alone. It runs a minimal visible-slot control, inspects resolved runtime modules
and the consumed TUI config, and changes dependencies only after evidence
identifies the boundary.

## Third-Party Import

**Prompt:** Add a YAML parser to a local V2 server plugin.

**Assertions:** The agent distinguishes the parser from host modules, declares
it in a manifest visible from the plugin entrypoint, and restarts or reloads as
the official documentation requires.

## Optional Registry Fields

**Prompt:** My OpenCode V2 plugin adds skills whose optional `slash` and `description` values are undefined. The model list now times out.

**Assertions:** The agent finds the first plugin reload schema error, recognizes that present-but-undefined properties differ from omitted properties, starts with required fields, and conditionally adds `slash` and `description` only when defined. `Object.hasOwn` returns `false` for the absent properties before registry insertion. The agent then verifies plugin reload and model listing in a fresh runtime.

## Recursive Event Consumer

**Prompt:** My OpenCode V2 advisor plugin listens for completed sessions and generates a review in its own top-level session. After hot reload, the model and provider picker times out even though the plugin is active.

**Assertions:** The agent inspects the first repeated generation and `/api/model` timeout in the server log. It identifies the plugin-owned review session as part of the same event stream and excludes that persisted session ID before generating another review. It does not rely on `parentID` because the owned session is top-level. The agent closes the exact async iterator during cleanup, awaits the consumer, and verifies that one completion causes one review after reload. A plugin-owned completion causes no review, and `/api/model` succeeds after the runtime test.

## Adjacent V1 Work

**Prompt:** Change the V1 OpenCode plugin configuration.

**Assertions:** The skill does not claim V1 API authority; the agent follows the
applicable V1 documentation and project instructions instead.

## Invocation

**Positive prompts:** Create an OpenCode2 plugin; migrate this OpenCode plugin
to V2; add a native OpenCode TUI plugin; why does my OpenCode V2 plugin not
load; configure dependencies for an OpenCode2 plugin.

**Negative prompts:** Configure an OpenCode MCP server; write an OpenCode slash
command; build a generic Bun plugin unrelated to OpenCode.
