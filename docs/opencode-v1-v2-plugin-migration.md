# OpenCode V1 to V2 plugin migration

Status: current implementation and agent handoff reference for the `mfz-home`
OpenCode plugin ports.

Evidence snapshot: 2026-08-18. The installed V2 runtime was
`opencode2 v0.0.0-beta-17595`. OpenCode V2 is beta, so verify the installed
runtime and the reference checkout again before each implementation phase.

This document is for workers implementing or reviewing the V2 ports of:

- `advisor`
- `subagent-usage`
- `session-cost-tui`

`current-session` is also covered because it is currently enabled in the V1
profile, but V2 makes its behavior unnecessary.

## Source of truth

Use the following sources in this order:

1. The current plugin guide at
   <https://opencode.ai/v2/docs/build/plugins.md> for server entrypoints,
   hooks, configuration, and verification.
2. The checked-in OpenCode V2 reference at
   `/home/mark/workspace/references/opencode`. The checkout was on `v2` at
   `1f61eb5ca951174456ddac0d8cb8153417c04e44` for this evidence snapshot.
   Use the source for native TUI behavior and undocumented runtime details.
3. The official migration guide at
   <https://opencode.ai/v2/docs/migrate-v1>.
4. The current plugin implementations under
   `/home/mark/workspace/repos/mfz-home/opencode/plugins`.

The OpenCode reference is read-only. Do not change it as part of a plugin port.
The installed beta can differ from the reference checkout. A source inspection
does not replace a fresh runtime probe.

## Migration rule

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

## Current repository state

The base profile keeps V1 and V2 selections separate in
`profiles/base/profile.yml`:

- V1 loads the Advisor server and TUI from the root compatibility exports.
- The Personal V2 profile enables the `subagent-usage` server plugin.
- V2 selects the `session-cost-tui` and `herdr` native TUI plugins.
- Personal keeps `current-session` in V1 and enables `subagent-usage` in both runtimes.

The source tree contains these V2 implementations:

- `advisor/v2/server.ts` is a warning-only quarantine stub. There is no V2
  Advisor TUI.
- `subagent-usage/v2/server.ts` reports per-invocation cost, lifetime child-session
  cost, and the latest child input context to the parent model.
- `session-cost-tui/v2/` contains a native TUI implementation and focused
  tests. Its development SDK is pinned to `0.0.0-next-17428`, which predates the
  installed beta in this evidence snapshot.
- `herdr/v2/` contains a native TUI implementation and focused tests. Its
  development SDK is pinned to `0.0.0-next-17444`, which also predates the
  installed beta.

Treat the existing V2 TUI ports as repository patterns, not proof of current
runtime compatibility. Re-run their typechecks and visible runtime probes
against the elected beta before copying their contracts.

## V1 plugin shape

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

## V2 server plugin shape

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

Reference: `packages/plugin/src/promise/plugin.ts` in the OpenCode reference.

Plugin configuration is available as `ctx.options`. Registration calls return
disposable registrations. A plugin may return cleanup code from `setup`.

### V2 context domains

The V2 branch exposes these server domains through `ctx`:

- `agent`
- `aisdk`
- `app`
- `catalog`
- `command`
- `event`
- `integration`
- `mcp`
- `plugin`
- `reference`
- `session`
- `shell`
- `skill`
- `tool`
- `websearch`

The home workspace still contains `@opencode-ai/plugin@1.18.18` for V1 and
several pinned `0.0.0-next-*` packages for earlier V2 TUI work. None of those
versions proves compatibility with the elected `opencode2` beta. Typecheck each
V2 package against the SDK that matches the runtime under test, then verify the
rendered plugin in a fresh process.

### V2 transform hooks

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

### V2 tool registration

Custom tools are added through `ctx.tool.transform`:

```ts
await ctx.tool.transform((tools) => {
  tools.add("example", {
    description: "...",
    input: {
      type: "object",
      properties: { value: { type: "string" } },
      required: ["value"],
      additionalProperties: false,
    },
    output: {
      type: "object",
      properties: { result: { type: "string" } },
      required: ["result"],
      additionalProperties: false,
    },
    execute: async ({ value }, context) => ({
      output: { result: value },
      content: value,
      metadata: { source: "example" },
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

The result supports `output`, model-visible `content`, and machine-readable
`metadata`. Advisor owns its tool executor, so it can return all three directly.
It does not need an after-hook to mutate its own result.

### V2 tool execution hooks

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

Unlike V1, an after-hook cannot mutate an `output.output` string. A plugin that
owns the tool must return its final content and metadata from the executor. A
plugin that decorates another tool needs a separate supported delivery method.

### V2 session APIs and hooks

The public Promise domain exposes `create`, `get`, `prompt`, `generate`,
`command`, `synthetic`, `interrupt`, `rename`, and `wait` through `ctx.session`.
It does not expose `messages` in the evidence snapshot. The internal plugin
runtime has `session.messages`, but the public Promise and Effect domains omit
it. Do not import private Core services or fabricate a client to cross this
boundary.

The session context hook runs immediately before provider dispatch:

```ts
await ctx.session.hook("context", async (event) => {
  event.system.push({ type: "text", text: "Additional guidance" });
});
```

The mutable context includes `sessionID`, agent, model, system parts, messages,
and available tools. This is the primary V2 replacement for V1
`experimental.chat.system.transform`.

V2 has no direct replacement for V1 `chat.message` or
`command.execute.before`. The public event stream now includes
`session.inbox.enqueued`. Its payload contains the `inboxID` and the complete
user item, including the evaluated prompt text. V2 command execution evaluates
the command template and admits it as a normal user prompt.

Advisor can therefore use one authorization path for `/consult-advisor` and
clear natural-language requests. Subscribe to `session.inbox.enqueued`, inspect
the user text, and bind one authorization to the requesting message. Before
shipping this design, prove in the installed runtime that the event `inboxID`
correlates with the `messageID` supplied to the Advisor tool executor.

## V2 TUI plugin shape

V2 uses a separate native TUI definition API:

```ts
import { Plugin } from "@opencode-ai/plugin/tui";

export default Plugin.define({
  id: "example-tui",
  setup(ctx) {
    // Claim slots, subscribe to data, and register keymaps.
  },
});
```

The current runtime accepts a default export with a unique `id` and `setup`.
Existing V2 ports in this repository use a structural definition with a
type-only SDK import. A runtime `Plugin.define` import is also valid when the
matching SDK resolves from the rendered entrypoint. In both cases, typechecking
does not prove that the TUI plugin loads or renders.

### V2 TUI slot registration

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

### V2 TUI data

The V2 TUI context provides local reactive data access, including:

- `data.session.list/get`
- `data.session.root/family/status/cost`
- `data.session.message.list/get`
- `data.on` and `data.listen`
- dialogs, toasts, keymap layers, storage, router, theme, and renderer

Prefer native `data.session.cost` and `data.session.family` over rebuilding
session traversal through raw client calls when those values meet the feature's
requirements.

The TUI owns `~/.config/opencode/cli.json`. The server does not read it. A
configured local package directory must contain a physical `tui/index.tsx` or
`tui/index.ts` entrypoint. A package export alone does not replace that layout.

## Feature migration matrix

| V1 feature | V2 replacement | Port risk | Decision |
| --- | --- | --- | --- |
| `PluginModule` object | `Plugin.define({ id, setup })` | Low | Required adapter rewrite |
| Returned `tool` map | `ctx.tool.transform(...tools.add(...))` | Medium | Required for custom tools |
| Owned tool result | Return `output`, `content`, and `metadata` from the V2 executor | Low | Do not use an after-hook for Advisor's own result |
| Decorating another tool | `ctx.tool.hook("execute.after", ...)` | Medium | Replace the completed result with a modified copy |
| `context.sessionID` | V2 tool context `sessionID` | Low | Directly available |
| `client.session.messages` | No public server-plugin equivalent in the evidence snapshot | High | Resolve before porting transcript-dependent behavior |
| `chat.params` | V2 session/AI SDK hooks | Medium | Re-map only if behavior needs it |
| `chat.message` | `session.inbox.enqueued` public event | Medium | Prove message identity and delivery ordering |
| `command.execute.before` | Evaluated command prompt through `session.inbox.enqueued` | Medium | Use the same explicit-request authorization path |
| `experimental.chat.system.transform` | `ctx.session.hook("context")` | Medium | Primary system-guidance port |
| V1 general events | `ctx.event` / V2 data events | Medium | Map each event explicitly |
| V1 TUI slots | `ctx.ui.slot` | Medium | Rewrite registration layer |
| V1 TUI route session ID | Slot `sessionID` input | Low | Direct replacement |
| V1 TUI client/state reads | `ctx.data.session.*` | Medium | Prefer native data layer |
| V1 `tui.json` | V2 global `cli.json` | Low | Render separately and migrate once |
| V1 plugin config tuple | V2 plugin object | Low | Config entry conversion |

## Plugin-specific port plans

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

Behavioral source: `opencode/plugins/subagent-usage/v1/server.ts`.
The native implementation is under `opencode/plugins/subagent-usage/v2/`.

It listens to V2 `subagent` tool hooks and session usage events. A completed
foreground result receives one compact `subagent-usage` element containing the
cost of that invocation, the lifetime cost of the direct child session, and the
latest input-side context. OpenCode's existing result already carries the child
session ID and completion state, so the plugin does not repeat them. Background,
failed, incomplete, and ambiguously overlapping calls remain unchanged.

Invocation and session costs use models.dev rates instead of OpenCode's stored
cost, which can remain zero for routed models. Ordinary steps retain their exact
model attribution; projection-only token usage, including internal compaction,
uses the child session's current model. Current context is the latest child
step's input plus cache-read and cache-write tokens.

### `session-cost-tui`

Behavioral source: `opencode/plugins/session-cost-tui/v1/index.tsx`.
The native implementation is under `opencode/plugins/session-cost-tui/v2/`.

The V2 implementation already ports the main view and data flow. Revalidate it
against the elected beta, then preserve or revise this V1 logic as needed:

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

### `advisor` server

The behavioral source is `opencode/plugins/advisor/v1/`. The root Advisor files
are the active V1 compatibility copies. The checked-in
`opencode/plugins/advisor/v2/server.ts` is a warning-only quarantine stub. It
does not register a tool, inject policy, read transcripts, call an advisor, or
persist continuation state. No V2 Advisor TUI exists yet.

Build the V2 implementation independently under `opencode/plugins/advisor/v2/`.
Use the V1 files as behavior reference, not runtime dependencies.

Logic that may be copied from V1 as a starting point:

- target parsing and eligibility
- transcript selection and serialization
- continuation state and locking
- compaction epoch handling
- Claude invocation and response handling
- pricing and usage metadata
- advisor result filtering

V2 contract spike:

1. Verify `session.inbox.enqueued` payloads and ordering in
   `opencode2 v0.0.0-beta-17595` or the elected replacement.
2. Verify that an explicit `/consult-advisor` command arrives as the evaluated
   user prompt and authorizes exactly one Advisor call.
3. Verify that clear natural-language requests authorize one call while
   negated, quoted, conditional, explanatory, and incidental mentions do not.
4. Correlate the inbox `inboxID` with the Advisor tool context `messageID`.
5. Return a probe tool result with `output`, `content`, and nested `metadata`,
   then inspect its persisted session and TUI representations.
6. Establish a supported server-side message-list operation that preserves
   stable message identity, compaction records, and tool metadata.
7. If the public plugin API still omits message listing, prefer exposing the
   existing internal `session.messages` operation upstream. Do not ship a
   context-snapshot approximation unless it passes restart, continuation,
   filtering, and compaction tests without storing transcript bodies.

Keep the V2 Advisor disabled until this spike passes. Transcript access is the
remaining API blocker. The inbox, context-hook, and owned-tool-result contracts
exist but still need runtime verification.

V2 adapter path after the spike:

1. Port the exported plugin entrypoint to `Plugin.define`.
2. Register the advisor tool with `ctx.tool.transform`.
3. Obtain the parent session from the V2 tool context's `sessionID`.
4. Map the V1 tool result to V2 `output`, `content`, and `metadata`. Preserve
   machine-readable usage, target, mode, and continuation data.
5. Replace V1 client calls with V2 session/client calls and verify response
   schemas.
6. Move policy injection from
   `experimental.chat.system.transform` to
   `ctx.session.hook("context")`.
7. Subscribe to `session.inbox.enqueued` and bind explicit authorization to the
   requesting user message.
8. Preserve the safety invariant: manual mode must reject unsolicited advisor
   calls while allowing an explicit consultation request.
9. Preserve continuation state keys, context epochs, locking, and atomic
   persistence. Do not store transcript bodies in state.
10. Add a fresh-runtime probe before enabling the V2 advisor by default.

Required runtime evidence:

- `session.inbox.enqueued` authorizes the correct assistant response and does
  not leak authorization across queued or steered user messages.
- `ctx.session.hook("context")` injects the complete policy before every
  relevant provider request.
- The supported transcript operation retains the message identities and
  compaction information required by continuation planning.
- V2 preserves Advisor tool metadata in later session reads and TUI data.
- Manual mode rejects an unsolicited call before transcript loading or target
  contact.

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

### `advisor` phase order

Work in this order. Do not enable a later phase to compensate for a failed
earlier phase.

1. Complete the contract spike. Keep the quarantine stub and all V2 Advisor
   profile entries disabled.
2. Port the server entrypoint, authorization, policy injection, transcript
   access, target execution, result metadata, and continuation state. Run a
   server-only canary.
3. Port the native TUI under `advisor/v2/tui/`. Run a visible-slot canary with
   a real session and a wide viewport.
4. Add the V2 server and TUI package exports, then select them in
   `opencode_v2`. Render and inspect the complete V2 snapshot.
5. Enable Advisor for normal V2 use only after manual, auto, on, restart,
   compaction, reload, and failure scenarios pass.

The rollback is configuration-only until V1 retires. Remove the V2 Advisor
profile entries and render again. Do not modify the preserved V1 selection.

## Configuration and loading

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

A package that provides both plugin types needs distinct server and `tui`
entrypoints. The native TUI loader resolves the package's `tui` subpath. For a
local directory, keep the physical `tui/index.tsx` or `tui/index.ts` layout.
Local plugins import dependencies directly; OpenCode does not install their
dependencies. Declare each non-host runtime import in the package that owns the
rendered entrypoint.

V2 MCP servers use `mcp.servers`; V2 permissions use an ordered `permissions`
array; V2 TUI settings use global `cli.json`. These are configuration concerns,
not plugin implementation ports, but a V2 runtime render must not combine V1
plugin files with V2 configuration.

## Runtime isolation

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

## Verification protocol

Every V2 plugin port must pass these gates:

1. Record `opencode2 --version` and typecheck against its matching plugin SDK.
2. Focused unit tests for shared logic and the V2 adapter.
3. Render inspection showing only V2 plugin entries and V2-compatible files.
4. Fresh runtime probe with `opencode2`, not a reused V1 process.
5. Tool or TUI behavior verification using observable output.
6. Cleanup/reload verification where the plugin owns timers, listeners, or
   registrations.
7. Failure-path verification proving plugin diagnostics do not break ordinary
   OpenCode work.

For server plugins, run `opencode2 api get /api/plugin` to verify discovery,
then use a fresh headless session to verify an observable tool invocation. The
API endpoint does not report native TUI plugins. For TUI plugins, use a wide PTY
with the relevant slot visible and verify mount, refresh, and unmount. For
Advisor diagnostics, set `OPENCODE_ADVISOR_DEBUG=1` and inspect
`~/.opencode/logs/advisor-tui.log`.

Keep V1 runtime tests passing until the active runtime selector explicitly
retires V1. Do not make the V2 port depend on V1-only types or generated
configuration.

## Worker handoff contract

Workers implementing these ports should:

- read this document first;
- record the installed `opencode2` version and inspect the matching V2 source;
- read `opencode/AGENTS.md` and applicable repository guidance;
- run the Advisor contract spike before replacing its quarantine stub;
- keep V1 and V2 implementations independent; duplication is acceptable and
  preferred to a V1-shaped compatibility abstraction;
- avoid editing rendered output under `~/.mindframe-z/configs/`;
- preserve unrelated dirty work in the repository;
- record any V2 branch/API drift discovered during implementation;
- add tests before enabling a port in the V2 profile;
- report unresolved API gaps rather than silently dropping behavior.

The worker is complete only when the port has a source entrypoint, compatible
rendered configuration, focused tests, and a fresh runtime verification result.
