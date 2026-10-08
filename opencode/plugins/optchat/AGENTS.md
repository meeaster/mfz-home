# OptChat plugin

Implements Victor Taelin's OptChat design
(https://gist.github.com/VictorTaelin/91837951a5ce5b38f341ec1ba1df6449) as an OpenCode server plugin. Read the
gist before changing the tree, view or compaction logic; it is the specification.

## Design invariants

- A pair's merge priority is `(T - last) / 2^l`, measured from the pair's **last** message. Measuring from its
  first message churns old lines. `tree.test.ts` checks the merge order against Taelin's `push` for t = 0..20,000;
  it must keep passing.
- Merges are batched (view `viewHigh` down to `viewLow`), and the view is saved to `view.json` and reloaded,
  never rebuilt from the log. Rebuilding or merging every message rewrites the cached prefix on every call.
- The system prompt and tools must not change between calls. Per-turn state (date, session, chat name) goes in
  the turn header after the view, and the view is frozen for the whole turn. OpenCode's date line is stripped
  from its system prompt for the same reason.
- `main.jsonl` and `tree.jsonl` are append-only and flushed on every write; one OpenCode process owns a chat
  through its `lock` file. Changing stored formats needs a migration for existing chats under `dataDir`.
- Lines are at most 512 bytes. Models can't count bytes, so keep the ruler, the "Too long" retry and the
  keep-the-shortest rule in `memory.ts`.

## Viewer

- `viewer/` is a standalone, read-only local website (`bun viewer/cli.ts`). It reads the data directory
  directly through the stored-format schemas exported from `store.ts`, `chats.ts` and `subagent-logs.ts`. A
  format change must keep `viewer/data.ts` working.
- It reads while the plugin is appending, so it skips lines that don't parse and never takes a chat's `lock`.
  It accepts any message `kind`, because dropping a line would shift every later message's index.
- `viewer/app.js` is plain browser JavaScript with no build step. Its layout repeats the tree arithmetic from
  `tree.ts` (a node `(l, i)` covers messages `i·2^l` to `(i+1)·2^l - 1`).

## Scope rules

- Only requests from the `optchat` agent are rewritten. Every other agent's request has all OptChat tools
  removed in the `context` hook. Keep it that way when adding tools.
- `chat_*` tools are for the optchat primary session only: hide them from subagents and refuse them in
  `execute`. Subagents get `zoom` and `date`, and start from the compaction view by default. An evaluation found
  the compaction view answered chat-only questions as well as the full view at under half the input; without a
  view, subagents failed them.
- OpenCode's own compaction is deliberately left alone. Don't add a `compaction` hook without evidence that it
  is needed.
- Keep this plugin free of this home's own tooling (Cairn, effort records, Mindframe-Z paths) so it stays
  shareable.

## OpenCode behaviors this relies on

- The plugin creates the `optchat` agent through `ctx.agent.transform` with `editor.update`, which creates a
  missing agent from defaults (`packages/core/src/agent.ts` in the OpenCode source). The SDK has no `add`, and
  this upsert is undocumented: check it first if the agent disappears after an OpenCode upgrade.
- The `context` hook can replace `event.messages` entirely; new messages are built with `Message.user` from
  `@opencode/ai`.
- `ctx.generate.text` takes only a prompt and a model: no system prompt, tools or usage. Compaction prompts
  therefore embed the system text themselves.
- Assistant final replies are only seen through the `session.text.ended` event; `session.execution.*` events
  release the per-chat turn lock.
- Prompt-cache routing uses the experimental `experimental.ws.send` and `experimental.ws.handshake` hooks
  (OpenAI's `prompt_cache_key` and the ChatGPT backend's session-affinity headers). Without them, resumed chats
  start with a cold cache.
- `@opencode/plugin` and `@opencode/ai` must match the installed `opencode --version`.

## Verifying changes

- `pnpm test opencode/plugins/optchat` and `pnpm typecheck` from the repository root.
- For a runtime change, run a fresh `opencode run --format json --agent optchat` in a scratch folder and check
  for the expected `tool_use` event (for example, `chat_rename` on a first turn with a clear topic). Then confirm
  a `build` session still has none of the OptChat tools.
- Live runs use the active global OpenCode config, so other plugins (such as session capture) see them. For
  repeated or automated runs, point `OPENCODE_CONFIG_DIR` at an empty directory and pass the plugin through that
  folder's `opencode.json`.
- For a viewer change, run it with `--data-dir` pointed at a chat with merged summaries, and check the page in
  a browser: the fit view, zooming in, clicking a leaf (it loads the full message), and search.
