import type { ViewCacheMode } from "./cache-marks.js"

export interface CacheRoute {
  readonly providerID: string
  readonly modelID: string
  readonly package: string | undefined
  readonly family: string | undefined
  readonly baseURL: string | undefined
  readonly oauth: boolean
}

/** Select only known cache protocols; a provider must publish family metadata for opaque proxy aliases. */
export const cacheStrategy = (route: CacheRoute): ViewCacheMode | "none" => {
  const url = route.baseURL === undefined ? undefined : new URL(route.baseURL)

  const subscription = route.providerID === "openai" && route.oauth && url?.protocol === "https:" &&
    (url.hostname === "chatgpt.com" && /^\/backend-api\/codex(?:\/|$)/.test(url.pathname) ||
      url.hostname === "api.openai.com" && /^\/v1(?:\/|$)/.test(url.pathname))

  if (subscription) return "warm"

  if (route.package === "@opencode/ai/providers/openai-compatible" && route.family === "claude") return "anthropic"

  const responses = route.package === "@opencode/ai/providers/openai-compatible/responses" ||
    route.package === "@opencode/ai/providers/openai" || route.package === "@opencode/ai/providers/azure"

  if (!responses) return "none"

  // Opaque aliases are qualified by their provider plugin. Versioned GPT IDs must support explicit breakpoints.
  const version = /^gpt-(\d+)(?:\.(\d+))?(?:-|$)/.exec(route.modelID)

  if (version !== null) return Number(version[1]) > 5 || Number(version[1]) === 5 && Number(version[2] ?? 0) >= 6 ? "openai" : "none"

  return route.family === "gpt" ? "openai" : "none"
}
