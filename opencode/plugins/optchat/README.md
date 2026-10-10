# OptChat for OpenCode

An OpenCode server plugin that adds an `optchat` primary agent: a chat that never ends. Instead of sending the
full history on every call, each turn starts from a **view**, a bounded list of one-line summaries covering
the whole chat. Recent messages appear one per line, and older ones are merged into coarser lines. A cheap
model writes the summaries in the background, and the agent **zooms** into any line to recover the detail
behind it, down to the original message.

It implements Victor Taelin's
[OptChat design](https://gist.github.com/VictorTaelin/91837951a5ce5b38f341ec1ba1df6449): the summary tree, the
merge order taken from his rollback `push`, batched merging so the prompt cache holds, and the prompts.

## Using it

Switch to the `optchat` agent (Tab in the TUI, or `opencode run --agent optchat`). Other agents are unchanged
and don't see any of OptChat's tools.

- **New sessions start a new chat.** Each chat has a unique ID; the agent names it once its topic is clear, and names
  can repeat.
- **Ask the agent to list, rename or resume chats.** A new session can continue an earlier chat, with its whole
  memory, by resuming it.
- **One active turn per chat.** A chat can't be resumed while another session is mid-turn in it.
- **Loaded skills stay loaded.** A skill's instructions, and the files read from its folder (not its scripts), are sent
  ahead of the view in every later turn of the session, rather than shrinking to a view line.
- **Subagents** of an `optchat` session start from the chat's smaller compaction view, so they know what was
  decided without the parent restating it. Their own steps go to a separate log the agent can open with
  `zoom`; only their final report enters the chat.

OpenCode's own compaction is left alone. It rarely triggers, because requests stay bounded.

## Tools

| Tool | Available to | Purpose |
|---|---|---|
| `zoom(id, n)` | optchat sessions and their subagents | Open line `id+n` into the two lines under it; `n = 1` returns the message itself. `zoom(agent: "...")` returns a subagent's log. |
| `date(id)` | optchat sessions and their subagents | When message `id` was sent. |
| `chat_rename(name)` | optchat primary sessions | Name or rename the current chat. |
| `chat_list()` | optchat primary sessions | List named chats with their IDs. |
| `chat_resume(chat)` | optchat primary sessions | Continue a chat in this session, by its ID or by a name no other chat has. |

## Options

Pass options through the plugin entry in `opencode.json`. Sizes are UTF-8 bytes.

| Option | Default | Meaning |
|---|---|---|
| `dataDir` | `$XDG_DATA_HOME/optchat` (`~/.local/share/optchat`) | Where chats are stored |
| `compactor` | `openai/gpt-6-luna`, variant `high` | The model that writes summaries |
| `viewHigh` / `viewLow` | 128000 / 64000 | The view grows to `viewHigh`, then one batch of merges brings it back to `viewLow` |
| `compactionHigh` / `compactionLow` | 32000 / 16000 | The smaller view used by summary calls and, by default, subagents |
| `concurrency` | 8 | Summary calls in flight at once |
| `waitMs` | 120000 | How long a turn waits for earlier messages to be summarized |
| `subagentView` | `compaction` | What subagents start from: `compaction`, `full` or `none` |
| `viewCache` | `auto` | The cache style. `auto` selects it per route (see [Automatic caching](#automatic-caching)); `openai`, `anthropic`, `warm` and `none` force it. The route's protocol still decides how marks are written, and a style the protocol can't carry adds none. |
| `viewCacheBytes` | 2048 for `anthropic`, 5000 otherwise | Bytes per view block, of whole lines. OpenAI saves an entry only at least 1,024 tokens past the previous one, so smaller blocks would never be saved; Anthropic looks back 20 blocks for an earlier entry, so its blocks can be nearer the gist's 4 lines |
| `logTurns` | `false` | Log each turn's prompt parts to `plugin.log`, to check that the view only grows at its end |

## Automatic caching

No cache configuration is required. Each model request gets a cache profile from `cache-profile.ts`: a mark style
the backend understands, and a writer that matches how the route's requests carry marks. [docs/caching.md](docs/caching.md)
explains each route, why it gets its style, and what was measured.

| Route | Style | Writer |
|---|---|---|
| ChatGPT login (Codex backend or token sharing) | `warm` | Block messages in the body, plus a capped warm-up after each turn |
| GPT-5.6 and later over Responses | `openai` | Explicit breakpoints in the body |
| Anthropic Messages and compatible backends (Claude, MiniMax, Qwen on OpenCode Go), Claude on OpenRouter | `anthropic` | OpenCode cache hints, which OpenCode fits into Anthropic's four marks alongside its own |
| Claude behind an OpenAI-compatible proxy such as LiteLLM, when the provider publishes `family: "claude"` | `anthropic` | `cache_control` in the body |
| Anything else | `none` | None. The backend's own prefix caching still applies |

Gateway aliases need provider-owned family metadata because their names do not identify the underlying model.
The Tyler gateway plugin supplies this metadata and selects Responses for `sol` and `luna`, and Chat Completions for `sonnet` and `haiku`.
Other Tyler aliases keep their existing routes until qualified.

Cache affinity follows the chat across sessions: the cache key and the session headers a backend routes by are set
to the chat's key. On OpenCode Zen and Go that includes `x-opencode-session`, which picks the upstream, and Grok also
gets xAI's `x-grok-conv-id`. Model and connection changes discard the preceding request's warm-up template.
Foreground WebSocket requests can supply the template for an HTTP warm-up. Background summary calls remain uncached.

To try a route the table doesn't cover, force a style with `viewCache` and measure it with the probe:

```sh
opencode/plugins/optchat/cache-probe.sh <provider/model> [turns]
```

It runs a chat on the OpenCode service and prints each call's input, cache read and cache write tokens. On a route
that caches the view, `read` grows in steps as view blocks complete and `write` stays within one block plus the
turn's messages. Once a style works, add a rule for the route in `cache-profile.ts`.

## Storage

Each chat is a folder under `dataDir/chats/<chat id>/`:
- `main.jsonl`: every message, append-only
- `tree.jsonl`: every summary node, append-only
- `view.json`: the current view, and the `viewHigh` it was saved under
- `agents/`: one log per subagent

`chats.json` holds each chat's ID and name and which session belongs to which chat. Nothing is ever deleted except the empty
chat a session leaves when it immediately resumes another one.

## Sidebar

In `optchat` sessions, the TUI sidebar gets an **OptChat** box:

```
OptChat
Temporary Todo App
chat_abde357cbd1e4734
View 17.1k / 128k · 50 lines
No summaries pending
```

- The chat's name and ID, which `chat_resume` takes.
- The view's size against `viewHigh`, where one batch of merges brings it back to `viewLow` and rewrites the cached
  prompt; its line count, or "merging" while that batch runs.
- How many view lines are still waiting for their summaries. A turn waits up to `waitMs` for them.

OpenCode loads it as this plugin's TUI part (`tui.tsx`), with no options, so it reads the default data directory. It
reads the stored files every two seconds, since summaries are written in the background between turns.

## Viewer

A small local website for browsing chats and their memory trees:

```sh
bun opencode/plugins/optchat/viewer/cli.ts [--port 4517] [--data-dir <path>] [--open]
```

It lists every chat, and draws each chat's tree on an infinite canvas: messages along the bottom, and every
summary drawn above the messages it covers, scaled with its level. Zoomed out, the top summaries are readable;
zoom into a region to read the summaries and messages under it. Lines in the current view and the compaction
view are outlined.

- Drag to pan, scroll to zoom, Shift+scroll to pan sideways.
- Click a node to read its full text, or the whole message for a leaf. Double-click to frame it.
- With a node selected, ↑ goes to its parent, and ← and → go to its children.
- `F` fits the tree, `L` shows the newest messages, and `/` searches the summaries.

The viewer only reads the data directory and listens on 127.0.0.1. Use **Reload** to pick up new messages.

## Limitations

- **Revert and fork aren't handled.** A reverted turn stays in the chat's memory.
- **One process per chat.** A chat is locked to the OpenCode process that opened it. A second process runs that
  session without OptChat until the first lets go.
- **Experimental APIs:** the prompt-cache routing relies on experimental WebSocket hooks, and registering the
  agent relies on OpenCode's agent editor creating missing agents.

## Development

From the repository root:

```sh
pnpm test opencode/plugins/optchat
pnpm typecheck
```
