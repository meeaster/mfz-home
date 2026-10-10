# Verifying the cache refactor on the work computer

Handoff for the agent on the work computer. OptChat's cache selection was refactored on the personal computer, where
the work routes (LiteLLM serving Azure GPT and Claude on Bedrock) and the Codex websocket login can't be reached.
Those routes worked before the refactor. Confirm they still do, fix any regression, then delete this file.

## What changed and why

OptChat needed to support more providers, and the old `cache-strategy.ts` was a chain of conditions that also mixed
route knowledge into the body writers. Live tests on OpenCode Go found one route that broke when forced: Claude over
Anthropic Messages failed with "A maximum of 4 blocks with cache_control may be provided. Found 5", because OpenCode
already places up to four marks there and OptChat added a fifth.

- `cache-profile.ts` replaces `cache-strategy.ts`. Each route gets a profile:
  - `style`: `openai`, `anthropic`, `warm` or `none`. It comes from `RULES` (first match wins), or from the
    `viewCache` option when forced.
  - `writer`: chosen from the package's protocol. `hints` on Anthropic Messages, `body` on Chat Completions and
    Responses (and on unknown packages when a style is forced), `none` when the protocol can't carry the style.
  - `affinity` and `keyHeaders`: headers set to the chat's cache key. `x-opencode-session` is added for OpenCode Zen
    and Go, which pick the upstream from it, and `x-grok-conv-id` for Grok.
  - `blockBytes`: 2048 for `anthropic`, 5000 otherwise, as before.
- `cache-hints.ts` is new. On Messages routes it attaches OpenCode `CacheHint`s, on the skills, the last complete view
  block and the request's end, in the `context` hook. OpenCode counts them before adding its own marks, so a request
  never exceeds four. This route had no marks before, so nothing at work depends on it.
- `server.ts` resolves the profile in `model.request` and, for the hints writer only, in `context`. The `strategy`
  log line now reads `rule=... style=... writer=...`. The affinity rewrite matches header names case-insensitively,
  so the websocket handshake now also rewrites a capitalised `X-Session-Id`. The HTTP path already did.
- `cache-marks.ts` (the body writers: breakpoints, `cache_control`, block messages and warm-up bodies) is unchanged.
- New files: `cache-probe.sh`, `docs/caching.md` (every route and why), and the tests `cache-profile.test.ts` and
  `cache-hints.test.ts`.

## Why the work routes should behave as before

Reading the code, in `auto` mode these resolve as the old `cacheStrategy` did:

| Work route | Expected `strategy` log line | Writer path |
|---|---|---|
| Azure GPT (`sol`, `luna`) on a Responses package (`openai-compatible/responses`, `openai` or `azure`), family `gpt` | `rule=gpt-breakpoints style=openai writer=body` | `markCache` with `openai`, unchanged |
| Claude on Bedrock (`sonnet`, `haiku`) on `@opencode/ai/providers/openai-compatible`, family `claude` | `rule=claude-proxy style=anthropic writer=body` | `markCache` with `anthropic`, unchanged |
| ChatGPT login, Codex websocket or token sharing | `rule=chatgpt-login style=warm writer=body` | Block messages and warm-up, unchanged |

On these routes the `context` hook builds the same messages as before, because hints apply only to Messages
packages. Family matching is slightly wider (`claude-sonnet` now matches as well as `claude`), which only adds routes.

## Verification steps

1. **Update and check the build.** Pull `mfz-home`. Confirm `opencode --version` is 2.0.26, the version the plugin's
   `package.json` pins. From the repository root, run `pnpm test opencode/plugins/optchat` and `pnpm typecheck`.
2. **Turn on turn logging.** Set the optchat plugin option `logTurns: true` in the work profile and run `mfz apply`,
   so `~/.local/share/optchat/plugin.log` gets the `strategy` and `view cache` lines.
3. **Restart the OpenCode service.** OptChat loads from a plugin directory, which doesn't hot-reload.
4. **Check the summary model.** OptChat's `compactor` (default `openai/gpt-6-luna`) must answer. If it is rate-limited,
   every turn waits up to `waitMs` (2 minutes) for summaries, and the probe looks hung.
5. **Probe each route.** Find the gateway's provider ID with `opencode models`, then:

   ```sh
   opencode/plugins/optchat/cache-probe.sh <gateway>/sonnet 12
   opencode/plugins/optchat/cache-probe.sh <gateway>/sol 20
   opencode/plugins/optchat/cache-probe.sh openai/gpt-6-luna 20   # with the Codex websocket login active
   ```

   The script runs a chat on the OpenCode service with stdin closed (`opencode run` waits for stdin to close
   otherwise), prints each call's `in`, `read` and `write` tokens, and deletes the session. Each turn adds about 500
   bytes to the view, so a 2 KB block completes every 4 or 5 turns and a 5 KB block about every 10.
6. **Read the log.** For each probe, check the `strategy` line against the table above. For the Codex login, also
   check for `view cache ... via=ws mode=warm rewritten=true` and, once the view passes 5 KB,
   `warm-up ... sent=true` followed by `warm-up ... replied`.

### What a working route looks like

- **`sonnet` (Bedrock):** `read` covers the system prompt from turn 1. It steps up by about one block every 4 or 5
  turns, and `write` stays under roughly 1,200 tokens a turn. The Haiku measurement over OpenCode Go read
  21.7k → 22.7k → 23.6k tokens with writes of 350 to 1,180.
- **`sol` (Azure):** the same pattern with 5 KB blocks. GPT-6 Luna over OpenCode Go read 15.1k tokens until turn 11,
  then 16.2k, with writes back down to about 300.
- **Codex login:** `read` covers the system prompt every turn, and after the first warm-up the next turn's `read`
  includes the warmed blocks.

## If something is wrong

| Symptom | Likely cause | Where to fix |
|---|---|---|
| `rule=default style=none` for a gateway alias | The model's `package` or `family` doesn't match a rule. The gateway plugin may publish a different family string or package name | Log `package` and `family` from `ctx.model.list()` for the alias, then adjust `PROTOCOLS` or `RULES` in `cache-profile.ts`, or the gateway plugin's metadata |
| `rule=gpt-breakpoints` on the ChatGPT login and errors like "not supported on this model" | The `chatgpt-login` rule didn't match: the connection isn't OAuth, or the base URL isn't `chatgpt.com/backend-api/codex` or `api.openai.com/v1` | `chatgptLogin` in `cache-profile.ts` |
| "A maximum of 4 blocks with cache_control" | The Claude alias uses a Messages package, so a body mark was added on top of OpenCode's | It should get `writer=hints`. Check `PROTOCOLS` |
| `read` stays flat while `in` or `write` grows every turn | The view isn't being cached. Check the `view cache ... rewritten=true` lines; if they say `false`, the body didn't contain the view as one text message | `markCache` in `cache-marks.ts` |
| The Codex login shows no `via=ws` lines | The websocket hooks didn't fire, or a profile wasn't set before them | `experimental.ws.send` and `experimental.ws.handshake` in `server.ts` |
| No `warm-up` lines on a long Codex chat | `bodyMode` isn't `warm`, or no turn request was saved as a template (`no full turn request to warm from`) | `rewriteFor` and `warmUp` in `server.ts` |

After a fix, rerun `pnpm test opencode/plugins/optchat`, `pnpm typecheck` and the anti-slop check on the changed
files, restart the service, and probe again.

## When done

- In `docs/caching.md`, change the work rows from "Selected by rule; measure at work" to the measured result, and add
  the numbers to their sections.
- Delete this file.
- Probe chats stay in `~/.local/share/optchat`. Delete them if they're in the way.

## Not verified anywhere yet

- Whether a resumed chat keeps its upstream on OpenCode Go through `x-opencode-session`.
- The OpenRouter Claude and MiniMax-direct rules (unit tests only).
- Grok's hit rate with `x-grok-conv-id` (two runs, inconclusive), and GLM-5.3 Flash, which caches only the system
  prompt. Neither matters for work.
