# How OptChat caches each model

An OptChat request is laid out by how often each part changes:

```
[tools] [system prompt] [loaded skills] [view] [turn header] [this turn's messages]
```

The tools, system prompt and skills rarely change. The view grows at its end, one line per message, until a merge
batch rewrites it. So each new turn could read everything up to the end of the previous turn's view from the prompt
cache. Whether it does depends on the backend: some cache any repeated prefix by themselves, some save an entry only
where the request asks for one, and some save one only where a request ends.

`cache-profile.ts` gives every model route a profile that handles this:

- **Style:** what the backend understands. `openai` is explicit prompt-cache breakpoints, `anthropic` is
  `cache_control` marks, `warm` is block messages plus a short warm-up request after each turn, and `none` is no
  marks at all.
- **Writer:** how this route's requests get the marks. It follows the protocol. On Anthropic Messages, OptChat
  attaches OpenCode cache hints and OpenCode writes the marks. On Chat Completions and Responses, OptChat writes them
  into the request body.
- **Affinity:** the headers and cache key that keep a chat on one cache, set to a key derived from the chat, so a
  resumed chat finds the same entries.

The view is marked in blocks of whole lines: 2 KB for `anthropic`, 5 KB otherwise. A complete block keeps its text as
lines are added after it, so the next turn finds it unchanged. On a working route, a long chat's cache read grows in
steps as blocks complete, and each turn writes or re-reads at most one block plus its own messages.

## Supported routes

| Route | Models | Style and writer | Status |
|---|---|---|---|
| Work gateway (LiteLLM), Responses | Azure GPT: `sol`, `luna` | `openai`, body breakpoints | Selected by rule; measure at work |
| Work gateway (LiteLLM), Chat Completions | Claude on Bedrock: `sonnet`, `haiku` | `anthropic`, body `cache_control` | Selected by rule; measure at work |
| ChatGPT login | GPT through Codex or token sharing | `warm`, body block messages and warm-up | Works |
| OpenAI API, Azure Standard deployments | GPT-5.6 and later | `openai`, body breakpoints | Works |
| OpenCode Go, Responses | GPT-6 Luna, GPT-5.6 Luna | `openai`, body breakpoints | Works |
| Anthropic Messages | Claude Haiku 5.5, Qwen 3.x, MiniMax on Go; Anthropic; MiniMax, Moonshot, Z.ai Messages | `anthropic`, OpenCode hints | Works (Haiku measured) |
| OpenRouter | Claude models only | `anthropic`, OpenCode hints | Selected by rule |
| Providers that cache prefixes themselves | GLM-5.3, DeepSeek, Kimi, MiMo on Go | `none` | Works (GLM-5.3 measured) |
| xAI through OpenCode Go | Grok 4.x | `none`, plus xAI's conversation header | Partial |
| Everything else | | `none` | The backend's own caching only |

### Work gateway: Azure GPT and Claude on Bedrock

The gateway's model names, such as `sol` or `sonnet`, don't say which model serves them, so OptChat can't guess a
style from them. The work gateway plugin publishes each alias's family (`gpt` or `claude`) and its protocol, and the
rules match on those.

- **Azure GPT over Responses (`sol`, `luna`).** GPT-5.6 and later accept explicit breakpoints on Azure Standard
  deployments. Without them the backend saves an entry only at the end of a request, and since the view grows inside
  one message, every turn would re-send it. OptChat marks the skills and every complete view block, up to the latest
  48, because OpenAI looks back across only the latest 50 breakpoints.
- **Claude on Bedrock over Chat Completions (`sonnet`, `haiku`).** LiteLLM turns `cache_control` on a message into a
  Bedrock cache point. OpenCode adds no marks on this protocol, so OptChat uses three of the four: the skills (or the
  system prompt's end when no skill is loaded), the last complete view block, and the request's end. Bedrock, like
  Anthropic, looks back from a mark for an earlier entry, which is why its blocks can be small.

A gateway alias not yet listed in the gateway plugin keeps `none` until it's qualified. To check a work route, run
`cache-probe.sh` with the alias.

### ChatGPT login

The ChatGPT backend, through both the Codex websocket and token sharing, rejects breakpoints ("not supported on this
model"). It saves an entry only where a request ends. So OptChat sends each view block as its own message and, at
each turn's end, sends a warm-up request built from that turn's request, ending at the last complete block and capped
at 16 output tokens. The next turn's request shares that ending, so it reads the block. An entry is readable only
when it lies at least 1,024 tokens past the previous one, which is why blocks are 5 KB.

### Anthropic Messages, including Claude, Qwen and MiniMax on OpenCode Go

OpenCode already places up to four `cache_control` marks on these requests, and Anthropic rejects a fifth ("A maximum
of 4 blocks with cache_control may be provided"). So OptChat never writes marks into these bodies. It attaches cache
hints to the skills, the last complete view block and the request's end, and OpenCode counts them before filling the
rest with its own. This follows the gist: one mark on the last whole block, one on the request's end.

Measured on Claude Haiku 5.5 over 12 turns: the cache read stepped from 21.7k to 22.7k to 23.6k tokens as blocks
completed, and each turn wrote 350 to 1,180 tokens. Before hints, each turn wrote the whole view.

### Providers that cache prefixes themselves

GLM, DeepSeek, Kimi and MiMo on OpenCode Go use Chat Completions without marks, and their providers reuse any prefix a
recent request shared. OptChat's layout already gives them a long shared prefix, so no marks are needed. GLM-5.3 read
about 16k tokens per turn, with an occasional miss on the provider's side.

GLM-5.3 Flash behaves differently. It read exactly 9,728 tokens on every turn, which is the system prompt, and
re-processed the whole view each time. Its cache seems to keep entries only at certain boundaries rather than at any
shared prefix, which is what the ChatGPT backend does. Splitting the view into block messages, like `warm` does, may
fix it. Not tested yet.

### Grok through OpenCode Go

xAI keeps a conversation on one server, and so on one cache, by `prompt_cache_key` on Responses or by the
`x-grok-conv-id` header. OpenCode already sends the key, which OptChat sets to the chat's, and OptChat adds the
header. In two runs of 7 calls each, hits went from 4 and 2 without the header to 5 and 4 with it, which is too few
runs to call settled. The remaining misses depend on how OpenCode Go routes to xAI, which OptChat can't see.

### Not supported

- **Muse on OpenCode Go.** The `-contributor` models train on request data, and Go refuses them until that's allowed
  in the workspace's Privacy settings.
- **OpenRouter models other than Claude.** OpenRouter's other upstreams cache without marks, and Gemini reads only the
  last mark, so a mark at the request's end would write a new entry at every step.
- **GPT before 5.6.** These models reject explicit breakpoints.

## Affinity

A gateway with several upstreams has a separate cache on each. OptChat sets these to the chat's key:

- `prompt_cache_key` in the body, when the request has one.
- The session headers the request already has: `x-session-affinity`, `session-id`, `x-session-id`,
  `x-litellm-session-id`.
- `x-opencode-session` on OpenCode Zen and Go, which choose the upstream from it.
- `x-grok-conv-id` for Grok.

## Adding a route

1. Force a style with the `viewCache` option and run `cache-probe.sh <provider/model> 16`.
2. Check that `read` grows in steps as blocks complete and that `write`, or uncached `in` on routes without marks,
   stays within about one block per turn. A Messages route that fails with "A maximum of 4 blocks with cache_control"
   has a mark that bypasses the hints.
3. Add a rule to `RULES` in `cache-profile.ts`, a protocol to `PROTOCOLS` if the package is new, and any routing
   header to `GATEWAYS` or `KEY_HEADERS`. Add a case to `cache-profile.test.ts` and a row to this page.
