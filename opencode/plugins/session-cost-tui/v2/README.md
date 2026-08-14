# Session Cost TUI V2

This is the native OpenCode V2 TUI implementation. It targets the V2 branch
plugin contract:

```ts
import type { Definition } from "@opencode-ai/plugin/tui/plugin";

const plugin = {
  id: "session-cost-tui",
  setup(ctx) {
    return ctx.ui.slot({
      append: "sidebar.content",
      render: (input) => /* session view using reactive input.sessionID */ null
    });
  }
} satisfies Definition;

export default plugin;
```

The structural definition keeps the matching SDK available for typechecking
without requiring the rendered plugin package to resolve it at runtime. OpenCode
validates the default export's `id` and `setup` fields when loading local TUI
plugins.

The implementation uses `ctx.data.session.family`, `ctx.data.session.cost`,
`ctx.data.on`, and the paginated `ctx.client.message.list` API, matching
`/home/mark/workspace/references/opencode` at `origin/v2` commit
`a6a712a3ac72248c9b2f2f883e752e6e18ef8c40`. The compact sidebar presentation
matches V1: per-model API estimates followed by a total. The estimate covers the
complete current projected transcript for each family session currently known
to the TUI.

The published `@opencode-ai/plugin@1.18.18` package currently exposes the
legacy TUI contract from `@opencode-ai/plugin/tui`, not this V2 `Plugin.define`
contract. Do not enable this plugin with a published runtime until the CLI and
plugin package are from a matching V2 build. The source is intentionally kept
under `v2/` so it can be typechecked and runtime-tested against that build
without weakening the V1 implementation.
