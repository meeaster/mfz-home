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
  the turn header after the view, and the view, header, and loaded skills are frozen for the whole turn. OpenCode's date line is stripped
  from its system prompt for the same reason.
- A request is `[system] [loaded skills] [view] [turn header] [this turn's messages]`, ordered like the gist's
  `[tools] [system] [view] [new message]` by how often each part changes, so each call reads the longest prefix
  from the cache. Skills change only when one loads (each load rewrites the view's cache once), the view grows every
  turn, and the header is per turn. Skills and header are built once when the turn starts and frozen with the view,
  so the turn's steps stay cached. Only the skill tool or a user attachment loads a skill (a `<skill_content>` quoted
  in a zoom or a subagent's report doesn't), and each comes once in first-load order with the latest `read` of each
  file in its base directory except `scripts/`; a view line can't carry their instructions.
- Whether a new turn reuses the skills and the earlier view depends on the backend. Anthropic caches at marks inside
  a message, which the gist assumes. OpenAI on GPT-5.6 and later writes an entry only at the end of a request's last
  message unless the request has explicit breakpoints, so a view that grows inside one message is re-sent each turn;
  steps within a turn still reuse everything. `cache-profile.ts` picks each route's style (`RULES`, or forced by
  `viewCache`) and its writer from the protocol; keep route knowledge there, not in the writers. `openai` puts
  breakpoints in the body for the OpenAI API and Azure Standard deployments (`cache-marks.ts`). `anthropic` on a
  Messages protocol uses OpenCode cache hints (`cache-hints.ts`): OpenCode already places up to four marks there and
  Anthropic rejects a fifth, so marks must go through hints, which OpenCode counts before adding its own. Never add
  `cache_control` to a Messages body. `anthropic` on Chat Completions, Claude through LiteLLM, puts `cache_control` in
  the body, where OpenCode adds none. The ChatGPT login rejects breakpoints ("not supported on this model") on both the Codex websocket backend
  and token sharing, and splitting the view into messages alone doesn't help: no request ends at those messages. So
  `warm` does both: block messages, plus a warm-up at each turn's end (`ctx.session.generate`, rewritten in
  `http.request` from the turn's own request body so the prefix is identical) that ends at the last complete block.
  The body is rebuilt from the turn's request rather than in the `generate` hook because other plugins add to the
  system prompt in `context` hooks only. Verified on the ChatGPT login: the next turn reads the block only when it
  lies at least 1,024 tokens past the system prompt's entry, which is why blocks are sized in bytes (5,000 by
  default), and the entry took more than a few seconds to become readable. The warm-up goes out as soon as the turn
  ends, with only the lines whose summaries are written (`Memory.builtLines`): waiting for the rest let a quick next
  turn start first and lose the warm-up.
- Only the human's message starts a turn. A synthetic message (a background subagent's result, a plugin's note)
  arrives as a plain user message and continues the turn, so the frozen view keeps its cached prefix and the next
  warm-up covers it; otherwise each background result re-sent the grown view. The model request can't tell them
  apart, so when a turn boundary is possible the session's own messages are read (`ctx.session.context`), where a
  synthetic message has `type: "synthetic"`. The `session.synthetic` event isn't used: it can arrive after the
  message's first request is built.
- `main.jsonl` and `tree.jsonl` are append-only and flushed on every write; one OpenCode process owns a chat
  through its `lock` file. Changing stored formats needs a migration for existing chats under `dataDir`.
- Lines are at most 512 bytes. Models can't count bytes, so keep the ruler, the "Too long" retry and the
  keep-the-shortest rule in `memory.ts`.

## Sidebar

- `sidebar/` is the TUI part (`tui.tsx`): a read-only box in `optchat` sessions. Like the viewer, it reads the data
  directory through the stored-format schemas and never takes a chat's `lock`, so a format change must keep
  `sidebar/status.ts` working. Its view size must match `Memory.viewBytes()`; `sidebar/status.test.ts` checks that.
- OpenCode loads it without the plugin's options, so it reads `defaultDataDir()`, and `view.json` records `high`
  for it.

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
- For a cache change, run `cache-probe.sh <provider/model> [turns]` against each affected route after restarting the
  OpenCode service (this plugin loads from a directory, which doesn't hot-reload). Check that `read` steps up as view
  blocks complete and `write` stays within a block; a Messages route that errors with "A maximum of 4 blocks with
  cache_control" has a mark outside the hints. Update `docs/caching.md` when a route's rule or measured behavior
  changes. Probe the cheaper model of a family (for example `opencode-go/glm-5.3-flash`) unless the change is
  model-specific.
- For a runtime change, run a fresh `opencode run --format json --agent optchat` in a scratch folder and check
  for the expected `tool_use` event (for example, `chat_rename` on a first turn with a clear topic). Then confirm
  a `build` session still has none of the OptChat tools.
- Live runs use the active global OpenCode config, so other plugins (such as session capture) see them. For
  repeated or automated runs, point `OPENCODE_CONFIG_DIR` at an empty directory and pass the plugin through that
  folder's `opencode.json`.
- For a viewer change, run it with `--data-dir` pointed at a chat with merged summaries, and check the page in
  a browser: the fit view, zooming in, clicking a leaf (it loads the full message), and search.
