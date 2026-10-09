# Session Usage TUI

An OpenCode V2 TUI plugin that adds a **Usage** box to the session sidebar, and a **Running** box while subagents
work. It replaces OpenCode's own Context box, which the CLI config turns off with `"-opencode.sidebar.context"` in
its `plugins` list.

```
Usage
112k tokens (28%)
Uncached 84.2k · Cached 887k (91%)
Last step 97% cached
GPT-6.1 Sol $0.12 ($1.23)
GPT-6 Luna $0.03 ($0.40)
Total $0.15 ($1.64)

Running
explorer: map the VPN accounts
gpt-6-luna#high 41.2k (10%) $0.04
Uncached 8.1k · Cached 33k (80%)
```

- **Context** is the selected session's latest step since its last compaction, against the model's context window,
  counted the way OpenCode's Context box counts it.
- **Uncached and Cached** total the selected session's input over all its steps, without its subagents. Cache writes
  count as uncached. **Last step** is the latest step's share of cached input, so a cache miss shows at once.
- **Cost lines** estimate each model's cost over the session family (the session and its subagents) from the
  models.dev catalog. After a compaction, a line shows the cost since the selected session's latest compaction, then
  the total across all compactions in parentheses. The first amount counts the session's own later steps and its
  subagents' steps that started after the compaction. Without a compaction, a line shows one amount. These are
  catalog estimates, not billing records. **Total** sums them the same way.
- **Running** lists the family's other sessions that are running now, by title, each with its model, context, cost,
  and cache totals. Finished subagents drop off.

Headers, totals and subagent titles use the theme's base text color, and detail lines its muted color. A context size
above `warnAt` tokens (200,000 by default) is drawn in the theme's warning color.

Every line is cut to 37 columns, the sidebar's width less its padding, so nothing wraps. Long model names and titles
are cut with "…" before any number.

## Options

- `warnAt`: the context size, in tokens, past which a session's size turns yellow.
- `modelAliases`: maps recorded `providerID/modelID` keys to models.dev `providerID` and `modelID` entries for
  pricing. Mapped models are labeled with their recorded model ID.

## Implementation

The plugin targets OpenCode 2.0.26 through `@opencode/plugin@2.0.26`, with OpenTUI `0.5.17` and Solid `1.9.15` as
development peers. The SDK import is type-only; OpenCode provides the Solid and OpenTUI runtime modules inside the
TUI host. The SDK's theme type doesn't resolve here, so typecheck doesn't catch a wrong theme color name: compare
them with `ResolvedThemeTokens` in OpenCode's `packages/theme/src/tui/types.ts`.

It loads every family session's messages through the paginated `ctx.client.message.list` API, and reloads them on
usage, execution, revert, compaction, model, and family events. Running state comes from `ctx.data.session.status`,
titles from `ctx.data.session.get`, and context windows from `ctx.data.location.model.list`.

The root `index.ts` and `tui.tsx` files are the V2 local-plugin directory entry points. `tui.tsx` re-exports the
implementation under `tui/`; OpenCode does not activate a configured local file entry directly.
