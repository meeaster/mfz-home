# Session Cost TUI

This is the native OpenCode V2 TUI implementation. It targets the V2
plugin contract:

```ts
import type { Definition } from "@opencode-ai/plugin/tui/plugin";

const plugin = {
  id: "mindframe-z.session-cost-tui",
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
shows per-model API estimates followed by a total. The estimate covers the
complete current projected transcript for each family session currently known
to the TUI.

The development SDK is pinned to `0.0.0-beta-18743`, matching the installed
`opencode2` build. The SDK import is type-only; OpenCode provides the Solid and
OpenTUI runtime modules inside the TUI host.

The root `index.ts` and `tui.tsx` files are the V2 local-plugin directory entry
points. `tui.tsx` re-exports the implementation under `tui/`; OpenCode does not
activate a configured local file entry directly.
