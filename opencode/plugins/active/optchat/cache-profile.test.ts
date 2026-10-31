import { expect, test } from "vitest"
import { cacheProfile, type CacheRoute } from "./cache-profile.js"

const route = {
  providerID: "openai",
  modelID: "gpt-6.1-sol",
  package: "@opencode/ai/providers/openai",
  family: undefined,
  baseURL: "https://api.openai.com/v1",
  oauth: false,
} satisfies CacheRoute

const go = { providerID: "opencode-go", oauth: false, baseURL: "https://opencode.ai/zen/go/v1" }

const writes = (candidate: CacheRoute, forced?: Parameters<typeof cacheProfile>[1]) => {
  const profile = cacheProfile(candidate, forced)

  return [profile.style, profile.writer]
}

test("the same GPT model uses breakpoints with an API key and warming with either ChatGPT login route", () => {
  expect(writes(route)).toEqual(["openai", "body"])
  expect(writes({ ...route, oauth: true })).toEqual(["warm", "body"])
  expect(writes({ ...route, oauth: true, baseURL: "https://chatgpt.com/backend-api/codex" })).toEqual(["warm", "body"])
  expect(writes({ ...route, oauth: true, baseURL: "https://api.openai.com.evil.test/v1" })).toEqual(["openai", "body"])
})

test("older GPT models and models without a rule get no marks", () => {
  expect(writes({ ...route, modelID: "gpt-5.4", family: "gpt" })).toEqual(["none", "none"])
  expect(writes({ ...route, modelID: "gpt-5.6-sol" })).toEqual(["openai", "body"])
  expect(writes({ ...go, modelID: "grok-4.7", package: "@opencode/ai/providers/openai", family: "grok" })).toEqual(["none", "none"])
  expect(writes({ ...go, modelID: "glm-5.3", package: "@opencode/ai/providers/openai-compatible", family: "glm" })).toEqual(["none", "none"])
})

test("Messages backends take hints, which OpenCode fits into its own four marks, never body marks", () => {
  expect(writes({ ...go, modelID: "claude-haiku-5-5", package: "@opencode/ai/providers/anthropic", family: "claude-haiku" })).toEqual(["anthropic", "hints"])
  expect(writes({ ...go, modelID: "qwen3.8-max", package: "@opencode/ai/providers/anthropic", family: "qwen3.8-max" })).toEqual(["anthropic", "hints"])
  expect(writes({ ...route, providerID: "minimax", package: "@opencode/ai/providers/minimax/messages", family: "minimax-m3" })).toEqual(["anthropic", "hints"])
  expect(writes({ ...route, providerID: "openrouter", modelID: "anthropic/claude-sonnet-5", package: "@opencode/ai/providers/openrouter", family: "claude-sonnet" })).toEqual(["anthropic", "hints"])
  expect(writes({ ...route, providerID: "openrouter", modelID: "google/gemini-3-pro", package: "@opencode/ai/providers/openrouter", family: "gemini" })).toEqual(["none", "none"])
})

test("opaque gateway aliases need family metadata and a protocol that can carry the style", () => {
  const gateway = { ...route, providerID: "gateway", modelID: "reasoner", package: "@opencode/ai/providers/openai-compatible", baseURL: "https://gateway.test/v1" }

  expect(writes(gateway)).toEqual(["none", "none"])
  expect(writes({ ...gateway, family: "gpt" })).toEqual(["none", "none"])
  expect(writes({ ...gateway, family: "gpt", package: "@opencode/ai/providers/openai-compatible/responses" })).toEqual(["openai", "body"])
  expect(writes({ ...gateway, family: "claude" })).toEqual(["anthropic", "body"])
  expect(writes({ ...gateway, family: "claude", package: "@opencode/ai/providers/openai-compatible/responses" })).toEqual(["none", "none"])
})

test("a forced style keeps the writer the route's protocol can carry", () => {
  const messages = { ...go, modelID: "claude-haiku-5-5", package: "@opencode/ai/providers/anthropic", family: "claude-haiku" }
  const chat = { ...go, modelID: "glm-5.3", package: "@opencode/ai/providers/openai-compatible", family: "glm" }
  const responses = { ...go, modelID: "grok-4.7", package: "@opencode/ai/providers/openai", family: "grok" }

  expect(writes(messages, "anthropic")).toEqual(["anthropic", "hints"])
  expect(writes(chat, "anthropic")).toEqual(["anthropic", "body"])
  expect(writes(responses, "anthropic")).toEqual(["anthropic", "none"])
  expect(writes(responses, "openai")).toEqual(["openai", "body"])
  expect(writes(messages, "openai")).toEqual(["openai", "none"])
  expect(cacheProfile(messages, "anthropic").rule).toBe("forced")
  expect(writes({ ...chat, package: "custom-gateway-package" }, "anthropic")).toEqual(["anthropic", "body"])
  expect(writes({ ...chat, package: "custom-gateway-package" })).toEqual(["none", "none"])
})

test("OpenCode Zen and Go keep a chat on one upstream through their session header", () => {
  expect(cacheProfile({ ...go, modelID: "glm-5.3", package: "@opencode/ai/providers/openai-compatible", family: "glm" }).affinity).toContain("x-opencode-session")
  expect(cacheProfile({ ...route, providerID: "opencode", baseURL: "https://opencode.ai/zen/v1" }).affinity).toContain("x-opencode-session")
  expect(cacheProfile(route).affinity).not.toContain("x-opencode-session")
})

test("Grok gets xAI's conversation header, which keeps a conversation on one cache server", () => {
  expect(cacheProfile({ ...go, modelID: "grok-4.7", package: "@opencode/ai/providers/openai", family: "grok" }).keyHeaders).toEqual(["x-grok-conv-id"])
  expect(cacheProfile(route).keyHeaders).toEqual([])
})
