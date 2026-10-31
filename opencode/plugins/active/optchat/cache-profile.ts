// How each model route caches an OptChat turn. A profile pairs a mark style (what the backend understands) with a
// writer (how this route's requests get those marks), and names the headers that keep the chat on one cache.
//
// - The style is chosen by RULES, first match wins, or forced by the `viewCache` option to try a route RULES doesn't
//   cover yet. A route no rule matches gets `none`: no marks, and the backend's own prefix caching still applies.
// - The writer follows the route's protocol. `hints` puts OpenCode cache hints on the view in the `context` hook,
//   and OpenCode lowers them and fits its own marks into what is left of Anthropic's four. `body` rewrites the
//   request body in `http.request` (`cache-marks.ts`), for protocols OpenCode adds no marks to. A style the
//   protocol can't carry gets no writer.
//
// To support a new route: add a RULES entry, and if its protocol is new, a PROTOCOLS entry. Then run the probe in
// AGENTS.md against it.

import type { ViewCacheMode } from "./cache-marks.js"

export type CacheStyle = ViewCacheMode | "none"

export type CacheWriter = "hints" | "body" | "none"

export interface CacheRoute {
  readonly providerID: string
  readonly modelID: string
  readonly package: string | undefined
  readonly family: string | undefined
  /** Unknown in the `context` hook, which runs before OpenCode resolves the endpoint. */
  readonly baseURL: string | undefined
  readonly oauth: boolean
}

export interface CacheProfile {
  /** The RULES entry that chose the style, `forced` for the `viewCache` option, or `default`. */
  readonly rule: string
  readonly style: CacheStyle
  readonly writer: CacheWriter
  /** Bytes per view block, of whole lines. */
  readonly blockBytes: number
  /** Request headers set to the chat's cache key when the request has them. */
  readonly affinity: readonly string[]
  /** Request headers added with the chat's cache key: a backend's own routing key that OpenCode doesn't send. */
  readonly keyHeaders: readonly string[]
}

/**
 * How a protocol's requests can carry marks. `hinted`: OpenCode lowers cache hints to Anthropic `cache_control` and
 * already places up to four of its own. `chat` and `responses`: OpenCode places none, so marks go in the body.
 */
type Protocol = "hinted" | "chat" | "responses" | "unknown"

const PROTOCOLS: readonly { readonly protocol: Protocol; readonly matches: (pkg: string) => boolean }[] = [
  { protocol: "hinted", matches: (pkg) => pkg === "@opencode/ai/providers/anthropic" || pkg === "@opencode/ai/providers/anthropic-compatible" || pkg.endsWith("/messages") },
  { protocol: "hinted", matches: (pkg) => pkg === "@opencode/ai/providers/amazon-bedrock" || pkg === "@opencode/ai/providers/openrouter" },
  { protocol: "responses", matches: (pkg) => pkg === "@opencode/ai/providers/openai" || pkg === "@opencode/ai/providers/azure" || pkg.endsWith("/responses") },
  { protocol: "chat", matches: (pkg) => pkg === "@opencode/ai/providers/openai-compatible" || pkg.endsWith("/chat") },
]

const protocolOf = (pkg: string | undefined): Protocol => (pkg === undefined ? "unknown" : (PROTOCOLS.find((entry) => entry.matches(pkg))?.protocol ?? "unknown"))

// An unknown package gets the body writer, which rewrites only a body it recognizes as Responses or Chat Completions.
// No rule matches an unknown package, so only a forced style reaches it.
const WRITERS: Readonly<Record<CacheStyle, Readonly<Record<Protocol, CacheWriter>>>> = {
  anthropic: { hinted: "hints", chat: "body", responses: "none", unknown: "body" },
  openai: { hinted: "none", chat: "body", responses: "body", unknown: "body" },
  warm: { hinted: "none", chat: "body", responses: "body", unknown: "body" },
  none: { hinted: "none", chat: "none", responses: "none", unknown: "none" },
}

const isClaude = (family: string | undefined): boolean => family === "claude" || family?.startsWith("claude-") === true

// GPT-5.6 and later accept explicit breakpoints; earlier versions reject them.
const breakpointGpt = (route: CacheRoute): boolean => {
  const version = /^gpt-(\d+)(?:\.(\d+))?(?:-|$)/.exec(route.modelID)

  if (version === null) return route.family === "gpt"

  const major = Number(version[1])

  return major > 5 || (major === 5 && Number(version[2] ?? 0) >= 6)
}

const hostIs = (baseURL: string | undefined, host: string, path: RegExp): boolean => {
  const url = baseURL === undefined ? undefined : new URL(baseURL)

  return url?.protocol === "https:" && url.hostname === host && path.test(url.pathname)
}

// The ChatGPT login, through the Codex backend or token sharing. It rejects breakpoints, so the view is warmed.
const chatgptLogin = (route: CacheRoute): boolean =>
  route.providerID === "openai" && route.oauth && (hostIs(route.baseURL, "chatgpt.com", /^\/backend-api\/codex(?:\/|$)/) || hostIs(route.baseURL, "api.openai.com", /^\/v1(?:\/|$)/))

const RULES: readonly { readonly name: string; readonly style: CacheStyle; readonly matches: (route: CacheRoute, protocol: Protocol) => boolean }[] = [
  { name: "chatgpt-login", style: "warm", matches: chatgptLogin },
  // Anthropic, and Anthropic-compatible Messages backends such as MiniMax and Qwen; on OpenRouter, only Claude.
  { name: "messages", style: "anthropic", matches: (route, protocol) => protocol === "hinted" && (route.package !== "@opencode/ai/providers/openrouter" || isClaude(route.family)) },
  // Claude behind an OpenAI-compatible proxy such as LiteLLM, which turns `cache_control` into Anthropic or Bedrock
  // cache points. Gateway aliases need the provider to publish the family: their names don't identify the model.
  { name: "claude-proxy", style: "anthropic", matches: (route, protocol) => protocol === "chat" && isClaude(route.family) },
  { name: "gpt-breakpoints", style: "openai", matches: (route, protocol) => protocol === "responses" && breakpointGpt(route) },
]

// Gateways that route a session to one of several upstreams by a header of their own. OpenCode Zen and Go pick the
// upstream from `x-opencode-session`, so without it a resumed chat can land on a cold upstream.
const GATEWAYS: readonly { readonly headers: readonly string[]; readonly matches: (route: CacheRoute) => boolean }[] = [
  { headers: ["x-opencode-session"], matches: (route) => hostIs(route.baseURL, "opencode.ai", /^\/zen(?:\/|$)/) },
]

// Backends that route by a header OpenCode doesn't send. xAI keeps a conversation on one server, and so on its cache,
// by `x-grok-conv-id`; gateways such as OpenCode Go pass client headers through.
const KEY_HEADERS: readonly { readonly headers: readonly string[]; readonly matches: (route: CacheRoute) => boolean }[] = [
  { headers: ["x-grok-conv-id"], matches: (route) => route.family === "grok" || route.modelID.startsWith("grok-") },
]

/** Session headers a backend may route by, set to the chat's cache key when the request has them. */
export const AFFINITY = ["x-session-affinity", "session-id", "x-session-id", "x-litellm-session-id"]

/** The route's cache profile; `forced` replaces the rules' style, and the writer still follows the protocol. */
export const cacheProfile = (route: CacheRoute, forced?: CacheStyle): CacheProfile => {
  const protocol = protocolOf(route.package)
  const rule = forced === undefined ? RULES.find((entry) => entry.matches(route, protocol)) : undefined
  const style = forced ?? rule?.style ?? "none"
  const gateways = GATEWAYS.filter((entry) => entry.matches(route)).flatMap((entry) => entry.headers)

  return {
    rule: forced === undefined ? (rule?.name ?? "default") : "forced",
    style,
    writer: WRITERS[style][protocol],
    // Anthropic finds an earlier entry up to 20 blocks back, so blocks can be near the gist's 4 lines. OpenAI saves an
    // entry only at least 1,024 tokens past the previous one, so smaller blocks would never be saved.
    blockBytes: style === "anthropic" ? 2048 : 5000,
    affinity: [...AFFINITY, ...gateways],
    keyHeaders: KEY_HEADERS.filter((entry) => entry.matches(route)).flatMap((entry) => entry.headers),
  }
}
