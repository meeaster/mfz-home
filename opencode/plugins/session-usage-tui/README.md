# Session Usage TUI

An OpenCode V2 TUI plugin that adds a **Usage** box to the session sidebar, a **Running** box while subagents
work, and an idle timer to the prompt footer. It replaces OpenCode's own Context box, which the CLI config turns off
with `"-opencode.sidebar.context"` in its `plugins` list.

```
Usage
112k tokens (28%)
Uncached 84.2k · Cached 887k (91%)

GPT-6.1 Sol 20M $0.12 ($1.23)
GPT-6 Luna ≥50M $0.03 ($0.40)
Total $0.15 ($1.64)

Running
explorer: map the VPN accounts
gpt-6-luna#high 41.2k (10%) $0.04
Uncached 8.1k · Cached 33k (80%)
```

The prompt footer's status area ends with the idle timer while the session waits:

```
idle 6m
idle 42m ($1.23)
idle 6m · new model
```

- **Context** is the selected session's latest step since its last compaction, against the model's context window,
  counted the way OpenCode's Context box counts it.
- **Uncached and Cached** total the selected session's input over all its steps, without its subagents. Cache writes
  count as uncached. A blank line separates these token lines from the cost lines.
- **Cost lines** show each model's learned prompt-cache lifetime (see below) after its name, then estimate its cost
  over the session family (the session and its subagents) from the models.dev catalog. After a compaction, a line shows the cost since the selected session's latest compaction, then
  the total across all compactions in parentheses. The first amount counts the session's own later steps and its
  subagents' steps that started after the compaction. Without a compaction, a line shows one amount. These are
  catalog estimates, not billing records. **Total** sums them the same way.
- **Claude Code steps** are priced from models.dev's `anthropic` entries. One such step runs a whole Claude Code
  turn of many model calls while its tokens hold only the last call's, so the provider reports the turn's tokens by
  API model (`native.usage`, subagents included) and the API model behind the step's alias (`native.apiModel`). Cost
  lines and the Uncached and Cached totals count those tokens, each model on its own line; a context-priced tier is
  chosen by that model's largest single call in the turn. The idle timer and cache lifetimes price the step's last
  call as its API model.
- **Idle timer** shows, in the prompt footer, how long the selected session has waited since its latest assistant
  message completed: `idle 42s`, `idle 6m`, `idle 1h 12m`. It hides while the session runs and before its first step
  completes. Its color follows the learned lifetime of the model that step used. For a learned lifetime it is muted
  until 80% of it, then the theme's warning color, and past it the error color, as a sign that the prompt cache has
  likely expired. For a lower bound it turns the warning color past the bound, beyond what has been seen, and the error
  color only past `idleExpiredAfter` when that is later. While the model's lifetime is unknown, `idleWarnAfter` and
  `idleExpiredAfter` set the colors. Once it turns the error color, the catalog estimate of resuming follows in
  parentheses: the last step's whole prompt and output read back uncached, at the model's cache-write price when the
  catalog lists one, since such a provider writes it all back to the cache, and otherwise at its input price. It
  leaves out the new message and the reply. When the prompt's selected model differs from the one that step used, the next
  request can't reuse the cache however short the wait, so the timer reads `idle 6m · new model` in the warning color.
- **Running** lists the family's other sessions that are running now, by title, each with its model, context, cost,
  and cache totals. Finished subagents drop off.

Headers, totals and subagent titles use the theme's base text color, and detail lines its muted color. A context size
above `warnAt` tokens (200,000 by default) is drawn in the theme's warning color.

Every line is cut to 37 columns, the sidebar's width less its padding, so nothing wraps. Long model names and titles
are cut with "…" before any lifetime or number.

## Prompt-cache lifetime

Providers keep a request's prompt cached for a while, and a later request that starts with the same prompt reads it
back at a fraction of the price. How long they keep it differs by model and changes over time: OpenAI documents at
least 30 minutes and up to 24 hours, and Bedrock and Anthropic models keep it for as long as the client asks per
request. So the plugin learns each model's lifetime from your own OpenCode history, keyed by the recorded
`providerID/modelID` without the variant, and assumes nothing about providers or model names.

The label after a cost line's model name reads:

- `20M` or `1.5H`: the cache has lasted about this long. Below two hours it is in minutes, then in hours to the half
  hour, and whole hours from ten.
- `≥50M`: the cache lasted at least this long, and nothing seen says how much longer.
- `?`: too little history for that model yet.

How it is learned:

- An **observation** is a pair of consecutive completed steps in one session on the same model and variant: the idle
  gap from the first step's completion to the second's start, and the share of the first step's whole prompt (input,
  cache reads and cache writes) that the second read from cache. Pairs are left out across a compaction or an agent,
  model or location switch, after an unfinished step, from a revert's boundary on, when the first prompt is under
  20,000 tokens, and when the gap is under a minute.
- A share of at least half is a **hit**, anything less a **miss**. A request after the cache expired often still reads
  the system prompt and tools, which other sessions keep warm, so a miss is rarely a zero.
- Gaps fall in buckets with edges at 1, 2, 3, 5, 8, 10, 15, 20, 30, 45 and 60 minutes and 1.5, 2, 3, 4, 6, 8, 12 and
  24 hours. The **lifetime** is the start of the first bucket where misses are the majority and that holds at least
  two events' weight, so one stray miss, which routing causes at short gaps, doesn't set it. When the longest hit in
  the hit-majority buckets below it is less than half that start, the gap between them is unexplored and the label is
  a lower bound at the longest hit. When no bucket has a miss majority, it is a lower bound at the longest hit too.
- **Recent evidence dominates**: an observation counts half as much every 14 days and is dropped after 90, so a
  lifetime that shrinks shows within days. Steps of one model that start in the same minute, as when a scheduled job
  resumes many sessions at once, count together as one event.

The rules' constants are `LIFETIME_RULES` in `tui/cache-lifetime.ts`, and the saved estimates keep each bucket's hit
and miss weight so a label can be checked.

Only a running TUI learns. Five seconds after it starts it reads every session updated in the last 30 days, subagents
included, newest first and one request at a time with a short pause, then every 10 minutes those updated since, and
soon after any session finishes a step. It also learns from the messages the sidebar reads anyway. A session whose
token totals can't hold one observation is never read.

## Options

- `warnAt`: the context size, in tokens, past which a session's size turns yellow.
- `idleWarnAfter`: the idle time, in seconds, past which the idle timer turns yellow while the model's lifetime is
  unknown (1200, 20 minutes, by default).
- `idleExpiredAfter`: the idle time, in seconds, past which the idle timer turns red while the model's lifetime is
  unknown, or past a lower bound shorter than it (1800, 30 minutes, by default). The defaults follow OpenAI's
  documented 30-minute minimum prompt-cache lifetime.
- `modelAliases`: maps recorded `providerID/modelID` keys to models.dev `providerID` and `modelID` entries for
  pricing. Mapped models are labeled with their recorded model ID.

## Implementation

The plugin targets OpenCode 2.0.26 through `@opencode/plugin@2.0.26`, with OpenTUI `0.5.17`, Solid `1.9.15` and `effect` `4.0.0-rc.112` as
development peers. The SDK import is type-only; OpenCode provides the Solid, OpenTUI and `effect` runtime modules inside the
TUI host. The SDK's theme type doesn't resolve here, so typecheck doesn't catch a wrong theme color name: compare
them with `ResolvedThemeTokens` in OpenCode's `packages/theme/src/tui/types.ts`.

It reads family sessions' messages through the paginated `ctx.client.message.list` API, keeping only the fields it
reads, and recomputes on usage, execution, revert, compaction, model, and family events. An event marks its session to
be read again from its latest assistant message, newest first, since only that message, any later ones, and a running
compaction can still change. If that message is gone after a revert, the session is read in full.

Each session's trimmed messages are also saved to `$TMPDIR/opencode-session-usage/<sessionID>.json` (`/tmp` by
default, which the system clears when it restarts), about a minute after they change and when the box closes. Each
file records `cacheVersion` and the session's fingerprint: its update time and usage totals from
`ctx.client.session.get`, taken before the messages were read. A session that joins the shown family starts from its
file when the fingerprint still matches, and otherwise reads only what follows the file's settled messages. A file with
another `cacheVersion` is ignored and rewritten, so increment `CACHE_VERSION` in `tui/session-store.ts` when the saved
format or those rules change. Several OpenCode instances can share the folder: files are renamed into place whole,
and a stale one only costs a tail read.

The idle timer's resume cost uses the same models.dev catalog and `modelAliases` as the cost lines. It reads the latest completed assistant message from `ctx.data.session.message.list`, the host's own
synced copy of the open session's latest messages, so it fetches nothing itself and works while the sidebar is hidden.
It ticks every second and skips messages a revert removed. The prompt's selected model comes from
`ctx.ui.model.current()`.

The lifetime learner starts once per TUI process in the plugin's setup, not in the sidebar, which mounts and unmounts
with the layout, and stops when the plugin is disposed. It lists sessions with `ctx.client.session.list`, which
without a `parentID` filter returns subagent sessions too, ordered by update time. What it learned is saved to
`$XDG_STATE_HOME/opencode-session-usage/cache-lifetimes.json` (`~/.local/state` when `XDG_STATE_HOME` is unset), which
survives restarts, about 30 seconds after it changes and when the plugin stops. The file holds `version`, the
observations, each session's checkpoint (its update time when it was listed and its latest completed step), the
`watermark` up to which every updated session has been read, and the latest `estimates` with `computedAt` and each
model's buckets. A session is read again only when its update time passes its checkpoint, and then only the messages
after the checkpoint's step, unless a revert removed it. Several OpenCode instances share the file: each merges it
before writing, keeping every observation, each session's newer checkpoint and the later watermark, and renames the
result into place whole. A file with another `version` is ignored and history is read again, so increment
`STATE_VERSION` in `tui/lifetime-store.ts` when the saved format or what an observation means changes.

Running state comes from `ctx.data.session.status`, titles from `ctx.data.session.get`, and context windows from `ctx.data.location.model.list`.

The root `index.ts` and `tui.tsx` files are the V2 local-plugin directory entry points. `tui.tsx` re-exports the
implementation under `tui/`; OpenCode does not activate a configured local file entry directly.
