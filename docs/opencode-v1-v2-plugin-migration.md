# OpenCode V1 to V2 Plugin Migration

Status: implementation reference for the `mfz-home` OpenCode plugin ports.

This document is for workers implementing or reviewing the V2 ports of:

- `advisor`
- `subagent-usage`
- `session-cost-tui`

`current-session` is also covered because it is currently enabled in the V1
profile, but V2 makes its behavior unnecessary.

## Source Of Truth

Use the following sources in this order:

1. The checked-in OpenCode V2 branch reference at
   `/home/mark/workspace/references/opencode`, ref `origin/v2`, commit
   `a6a712a3ac72248c9b2f2f883e752e6e18ef8c40` at the time this document was
   written.
2. The official migration guide:
   <https://opencode.ai/v2/docs/migrate-v1>
3. The current plugin implementations under
   `/home/mark/workspace/repos/mfz-home/opencode/plugins`.

The local reference checkout is on `dev`; inspect `origin/v2` with `git show`
or an isolated worktree. Do not change the reference checkout as part of a
plugin port.

The branch API is more complete than the V2 API visible in some `dev` snapshots.
Do not infer V2 capability from `dev` files when the same API exists under
`origin/v2`.

## Migration Rule

V1 and V2 server plugins are different runtimes. A V1 plugin must not be
loaded by V2, and a V2 plugin must not be assumed to load by V1. Keep the
implementations fully separate. Copying the V1 implementation into a V2
directory and then optimizing it for V2 is intentional and preferred here.

Do not introduce a shared abstraction solely to avoid duplication. V1 is a
retirement path, and independent implementations make it easier to evolve the
V2 plugin around its native APIs without preserving V1-shaped assumptions. A
small shared helper is allowed when it is obviously runtime-neutral, but it is
not a migration requirement.

The recommended source layout is:

```text
opencode/plugins/<plugin>/v1/
opencode/plugins/<plugin>/v2/
opencode/plugins/<plugin>/v1/tui/
opencode/plugins/<plugin>/v2/tui/
```

Keep each version self-contained unless a later change demonstrates a clear,
low-risk benefit from sharing a runtime-neutral helper.

## V1 Plugin Shape

Current V1 server plugins use the object-style module API:

```ts
import { tool, type PluginModule } from "@opencode-ai/plugin";

const plugin: PluginModule = {
  id: "example",
  server: async ({ client, directory }) => ({
    tool: {
      example: tool({
        description: "...",
        args: {},
        async execute(_args, context) {
          return context.sessionID;
        },
      }),
    },
    "tool.execute.after": async (input, output) => {},
  }),
};

export default plugin;
```

V1 behavior is commonly registered by returning a hook table from `server`.
The current `mfz-home` plugins use these V1 surfaces:

- `tool` registration
- `tool.execute.after`
- `chat.params`
- `chat.message`
- `command.execute.before`
- `experimental.chat.system.transform`
- general `event` hooks
- V1 client methods such as `client.session.messages`
- V1 TUI `api.slots.register`, `api.event`, `api.route`, and `api.state`

## V2 Server Plugin Shape

The V2 Promise API uses an explicit definition and imperative registration:

```ts
import { Plugin } from "@opencode-ai/plugin";

export default Plugin.define({
  id: "example",
  setup: async (ctx) => {
    // Register transforms and runtime hooks here.
    // Return cleanup when the plugin owns resources.
  },
});
```

Reference: `origin/v2:packages/plugin/src/README.md` and
`origin/v2:packages/plugin/src/promise/plugin.ts`.

Plugin configuration is available as `ctx.options`. Registration calls return
disposable registrations. A plugin may return cleanup code from `setup`.

### V2 Context Domains

The V2 branch exposes these server domains through `ctx`:

- `agent`
- `aisdk`
- `app`
- `catalog`
- `command`
- `event`
- `integration`
- `plugin`
- `reference`
- `session`
- `shell`
- `skill`
- `tool`
- `websearch`

The repository currently typechecks against `@opencode-ai/plugin@1.18.18`.
That installed package exposes the V1 root plugin API (`tool`, `PluginModule`,
and V1 hooks); it does not export the V2 `Plugin.define` API described by the
pinned `origin/v2` reference. Keep V2 server ports quarantined until the
runtime package actually ships and documents those surfaces.

### V2 Transform Hooks

Transforms modify stateful domains and are registered directly:

```ts
await ctx.agent.transform((agents) => {
  agents.update("reviewer", (agent) => {
    agent.description = "Reviews code for regressions";
  });
});
```

Available transform domains in the V2 branch include `agent`, `catalog`,
`command`, `integration`, `reference`, and `skill`.

### V2 Tool Registration

Custom tools are added through `ctx.tool.transform`:

```ts
await ctx.tool.transform((tools) => {
  tools.add({
    name: "example",
    description: "...",
    input: Schema.Struct({ value: Schema.String }),
    output: Schema.Struct({ result: Schema.String }),
    execute: async ({ value }, context) => ({
      output: { result: value },
      content: value,
    }),
  });
});
```

The V2 tool context contains:

- `sessionID`
- `agent`
- `messageID`
- tool call `id`
- `progress`

This is why `current-session` has no reason to remain a V2 plugin: any V2 tool
can use its own execution context's `sessionID`.

### V2 Tool Execution Hooks

Register lifecycle hooks with:

```ts
await ctx.tool.hook("execute.before", async (event) => {});
await ctx.tool.hook("execute.after", async (event) => {});
```

`execute.after` supplies `tool`, `sessionID`, `agent`, `messageID`, call `id`,
input, and a tagged result:

```ts
type Result =
  | { status: "completed"; result: Tool.Result }
  | { status: "error"; error: Tool.Error };
```

Unlike V1, the result is not a mutable `output.output` string. A port must
decide whether to return content through the V2 tool result, emit a separate
message/event, or move the behavior into the tool implementation.

### V2 Session APIs And Hooks

The V2 branch exposes session operations such as `get`, `create`, `prompt`,
`generate`, `command`, `synthetic`, and `interrupt` through `ctx.session`.

The session context hook runs immediately before provider dispatch:

```ts
await ctx.session.hook("context", async (event) => {
  event.system.push({ type: "text", text: "Additional guidance" });
});
```

The mutable context includes `sessionID`, agent, model, system parts, messages,
and available tools. This is the primary V2 replacement for V1
`experimental.chat.system.transform`.

Do not assume `chat.message` or `command.execute.before` has a one-to-one V2
replacement. Advisor manual-mode behavior must be revalidated against V2 event,
command, and session APIs rather than silently weakened.

## V2 TUI Plugin Shape

The pinned `origin/v2` reference describes a separate TUI definition API:

```ts
import { Plugin } from "@opencode-ai/plugin/tui";

export default Plugin.define({
  id: "example-tui",
  setup(ctx) {
    // Claim slots, subscribe to data, and register keymaps.
  },
});
```

The installed `1.18.18` package does not provide a usable V2 TUI registration
surface in this repository. This is reference material only; do not claim or
enable V2 TUI registration based on it.

### V2 TUI Slot Registration

V1 uses `api.slots.register` with names such as `sidebar_content`. V2 claims
stable slots with `ctx.ui.slot`:

```ts
ctx.ui.slot({
  append: "sidebar.content",
  render: ({ sessionID }) => <View sessionID={sessionID} />,
});
```

The V2 slot input supplies the session identity for session-specific slots:

- `session.composer.top`
- `sidebar.content`

V2 slot paths use dots, not V1 underscores.

### V2 TUI Data

The V2 TUI context provides local reactive data access, including:

- `data.session.list/get`
- `data.session.root/family/status/cost`
- `data.session.message.list/get`
- `data.on` and `data.listen`
- dialogs, toasts, keymap layers, storage, router, theme, and renderer

Prefer native `data.session.cost` and `data.session.family` over rebuilding
session traversal through raw client calls when those values meet the feature's
requirements.

## Feature Migration Matrix

| V1 feature | V2 replacement | Port risk | Decision |
| --- | --- | --- | --- |
| `PluginModule` object | `Plugin.define({ id, setup })` | Low | Required adapter rewrite |
| Returned `tool` map | `ctx.tool.transform(...tools.add(...))` | Medium | Required for custom tools |
| `tool.execute.after` | `ctx.tool.hook("execute.after", ...)` | Medium | Result shape must be adapted |
| `context.sessionID` | V2 tool context `sessionID` | Low | Directly available |
| `client.session.messages` | V2 session/client API | Medium | Verify exact method shape |
| `chat.params` | V2 session/AI SDK hooks | Medium | Re-map only if behavior needs it |
| `chat.message` | No confirmed direct equivalent | High | Investigate; do not approximate silently |
| `command.execute.before` | V2 command/session/event APIs | High | Revalidate advisor command flow |
| `experimental.chat.system.transform` | `ctx.session.hook("context")` | Medium | Primary system-guidance port |
| V1 general events | `ctx.event` / V2 data events | Medium | Map each event explicitly |
| V1 TUI slots | `ctx.ui.slot` | Medium | Rewrite registration layer |
| V1 TUI route session ID | Slot `sessionID` input | Low | Direct replacement |
| V1 TUI client/state reads | `ctx.data.session.*` | Medium | Prefer native data layer |
| V1 `tui.json` | V2 global `cli.json` | Low | Render separately and migrate once |
| V1 plugin config tuple | V2 plugin object | Low | Config entry conversion |

## Plugin-Specific Port Plans

### `current-session`

Current source: `opencode/plugins/current-session/server.ts`.

V1 registers `current_session_id` solely to return `context.sessionID`.

V2 tools already receive `sessionID` in their execution context. Remove this
plugin from the V2 profile. If a user-facing tool is still desired for a
specific workflow, implement it as a normal V2 tool, but do not preserve it as
an infrastructure dependency.

Completion criteria:

- No V2 config entry loads `current-session`.
- V2 advisor and subagent-usage code use supplied session IDs directly.
- V1 behavior remains unchanged until the V1 runtime is retired.

### `subagent-usage`

Current source: `opencode/plugins/subagent-usage/server.ts`.

The V2 implementation may copy the following V1 logic as a starting point,
then simplify or reshape it for native V2 behavior:

- `summarizeUsage`
- context-limit calculation
- `usageGuidance`
- `backgroundGuidance`

V1 adapter behavior:

- listen to `tool.execute.after`
- filter `input.tool === "task"`
- read child session ID from `output.metadata.sessionId`
- load child messages through `client.session.messages`
- append guidance to mutable `output.output`

V2 adapter path:

1. Register `ctx.tool.hook("execute.after")`.
2. Filter the V2 task tool.
3. Confirm where V2 stores the child session ID for completed and background
   task results. Do not assume the V1 `metadata.sessionId` shape.
4. Load child messages through the V2 session/client API.
5. Preserve the usage calculation and formatting behavior in the V2
   implementation. Sharing the source module is optional.
6. Decide how guidance is surfaced because V2 after-hooks do not expose a
   mutable output string. Prefer a V2-supported result/content mechanism; if
   after-hook output cannot be changed, move the guidance to a task result
   wrapper or a narrowly scoped synthetic message.
7. Keep failures non-fatal: usage reporting must never turn a completed task
   into an error.

Required tests:

- completed task with child session ID
- background task
- missing child ID
- child message lookup failure
- V2 completed and error hook variants
- context exactly at and above the 200,000-token limit

### `session-cost-tui`

Current source: `opencode/plugins/session-cost-tui/index.tsx`.

The V2 implementation may copy the following V1 logic as a starting point,
then use native V2 cost data where appropriate:

- model catalog loading
- variant and context-tier rate selection
- token pricing
- per-model aggregation and display formatting

V2 adapter path:

1. Replace `TuiPluginApi`/`TuiPluginModule` with
   `@opencode-ai/plugin/tui` `Plugin.define`.
2. Replace `api.slots.register` with a `ctx.ui.slot` claim for
   `sidebar.content`.
3. Read the slot's `sessionID` directly.
4. Prefer `ctx.data.session.cost(sessionID)` for native cost totals.
5. Use `ctx.data.session.family(sessionID)` when descendant sessions are
   required.
6. Use `ctx.data.session.message.list(sessionID)` only when the API estimate
   needs message-level detail unavailable from native cost data.
7. Replace V1 event subscriptions with `ctx.data.on`/`ctx.data.listen` and
   invalidate or refresh through the V2 data layer.
8. Preserve debouncing, cancellation, loading, and error states.

The native V2 cost value and the existing models.dev API estimate may not be
identical. Label the displayed value according to its source and retain the
models.dev calculation only when the user needs the existing API estimate.

Required tests:

- sidebar slot receives the expected session ID
- refresh after assistant completion
- parent plus descendant session aggregation
- unavailable pricing data
- V2 native cost versus API-estimate labeling
- cleanup removes event listeners and pending timers

### `advisor` Server

Current source: `opencode/plugins/advisor/server.ts`; the V2 implementation
should begin as an independent copy of the advisor behavior and then be
reshaped around native V2 APIs. Existing files such as `transcript.ts`,
`targets.ts`, and `state.ts` are reference material, not required shared
dependencies.

Logic that may be copied from V1 as a starting point:

- target parsing and eligibility
- transcript selection and serialization
- continuation state and locking
- compaction epoch handling
- Claude invocation and response handling
- pricing and usage metadata
- advisor result filtering

V2 adapter path:

1. Port the exported plugin entrypoint to `Plugin.define`.
2. Register the advisor tool with `ctx.tool.transform`.
3. Obtain the parent session from the V2 tool context's `sessionID`.
4. Map the V1 tool result (`title`, output text, metadata) to the V2 tool
   result contract (`output`, `content`). Preserve machine-readable usage
   metadata through the V2-supported result shape.
5. Replace V1 client calls with V2 session/client calls and verify response
   schemas.
6. Move policy injection from
   `experimental.chat.system.transform` to
   `ctx.session.hook("context")`.
7. Rebuild command and manual-mode detection around V2 command/event/session
   behavior. This is a design task, not a mechanical rename.
8. Preserve the safety invariant: manual mode must reject unsolicited advisor
   calls while allowing an explicit consultation request.
9. Preserve continuation state keys, context epochs, locking, and atomic
   persistence. Do not store transcript bodies in state.
10. Add a fresh-runtime probe before enabling the V2 advisor by default.

Advisor-specific blockers to resolve with evidence:

- Whether V2 exposes enough command lifecycle information to identify an
  explicit `/consult-advisor` request.
- Whether a natural-language consultation request can be identified without a
  V1 `chat.message` hook.
- Whether `ctx.session.hook("context")` can inject the complete advisor policy
  before every relevant provider request.
- How V2 serializes tool output and metadata into later session messages.

### `advisor` TUI

The advisor TUI is part of the advisor port, not a server-plugin shortcut.

Replace:

- route parsing with slot-provided `sessionID`
- V1 `api.state` message reads with `ctx.data.session.message.list`
- V1 child traversal with `ctx.data.session.family`
- `api.slots.register` with `ctx.ui.slot`
- V1 command registration with V2 keymap/dialog APIs
- V1 event subscriptions with V2 data subscriptions

Keep the following logic where possible:

- metrics aggregation
- pricing lookup
- mode state resolution
- pending transcript estimates
- context reset presentation

## Configuration And Loading

The official migration guide says V1 config and file locations remain readable
by V2, but V1 plugin implementations do not work in V2. Native V2 plugin
configuration uses objects such as:

```jsonc
{
  "plugins": [
    {
      "package": "./plugin.ts",
      "options": {}
    }
  ]
}
```

V2 local plugin files belong under `.opencode/plugins/` when managed directly
by OpenCode. `mfz-home` may keep its source layout under `opencode/plugins/`,
provided the renderer emits only the selected runtime's compatible assets.

V2 MCP servers use `mcp.servers`; V2 permissions use an ordered `permissions`
array; V2 TUI settings use global `cli.json`. These are configuration concerns,
not plugin implementation ports, but a V2 runtime render must not combine V1
plugin files with V2 configuration.

## Runtime Isolation

Maintain separate rendered snapshots for inspection and rollback, but expose
one active OpenCode config location to the user. A version selector may choose
which complete snapshot is linked to the canonical runtime directory.

The selector must switch the complete set:

- `opencode.jsonc`
- plugin package/runtime files
- commands
- agents
- skills
- TUI configuration
- plugin dependencies

Never switch only the executable or only `opencode.jsonc`. That can leave a V1
plugin implementation attached to V2 or vice versa.

## Verification Protocol

Every V2 plugin port must pass these gates:

1. Typecheck against the exact plugin package used by the runtime (`1.18.18` here).
2. Focused unit tests for shared logic and the V2 adapter.
3. Render inspection showing only V2 plugin entries and V2-compatible files.
4. Fresh runtime probe with `opencode2`, not a reused V1 process. The probe is
   currently blocked until the V2 executable and matching V2 plugin package are
   installed; use `mfz smoke-opencode-v2` once they are available.
5. Tool or TUI behavior verification using observable output.
6. Cleanup/reload verification where the plugin owns timers, listeners, or
   registrations.
7. Failure-path verification proving plugin diagnostics do not break ordinary
   OpenCode work.

For server plugins, a fresh headless probe should verify the expected
`tool_use` event or equivalent V2 tool invocation. For TUI plugins, use a wide
PTY with the relevant slot visible and verify mount, refresh, and unmount.

Keep V1 runtime tests passing until the active runtime selector explicitly
retires V1. Do not make the V2 port depend on V1-only types or generated
configuration.

## Worker Handoff Contract

Workers implementing these ports should:

- read this document first;
- inspect `origin/v2` at the pinned reference or a newer explicitly verified
  commit;
- read `opencode/AGENTS.md` and applicable repository guidance;
- keep V1 and V2 implementations independent; duplication is acceptable and
  preferred to a V1-shaped compatibility abstraction;
- avoid editing rendered output under `~/.mindframe-z/configs/`;
- preserve unrelated dirty work in the repository;
- record any V2 branch/API drift discovered during implementation;
- add tests before enabling a port in the V2 profile;
- report unresolved API gaps rather than silently dropping behavior.

The worker is complete only when the port has a source entrypoint, compatible
rendered configuration, focused tests, and a fresh runtime verification result.
