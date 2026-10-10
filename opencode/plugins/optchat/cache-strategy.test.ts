import { expect, test } from "vitest"
import { cacheStrategy, type CacheRoute } from "./cache-strategy.js"

const route = {
  providerID: "openai",
  modelID: "gpt-6.1-sol",
  package: "@opencode/ai/providers/openai",
  family: undefined,
  baseURL: "https://api.openai.com/v1",
  oauth: false,
} satisfies CacheRoute

test("the same GPT model uses marks with an API key and warming with either subscription connection", () => {
  expect(cacheStrategy(route)).toBe("openai")
  expect(cacheStrategy({ ...route, oauth: true })).toBe("warm")
  expect(cacheStrategy({ ...route, oauth: true, baseURL: "https://chatgpt.com/backend-api/codex" })).toBe("warm")
  expect(cacheStrategy({ ...route, oauth: true, baseURL: "https://api.openai.com.evil.test/v1" })).toBe("openai")
})

test("opaque gateway aliases need both qualified family metadata and the corresponding protocol", () => {
  const gateway = { ...route, providerID: "gateway", modelID: "reasoner", package: "@opencode/ai/providers/openai-compatible", baseURL: "https://gateway.test/v1" }

  expect(cacheStrategy(gateway)).toBe("none")
  expect(cacheStrategy({ ...gateway, family: "gpt" })).toBe("none")
  expect(cacheStrategy({ ...gateway, family: "gpt", package: "@opencode/ai/providers/openai-compatible/responses" })).toBe("openai")
  expect(cacheStrategy({ ...gateway, family: "claude" })).toBe("anthropic")
  expect(cacheStrategy({ ...gateway, family: "claude", package: "@opencode/ai/providers/openai-compatible/responses" })).toBe("none")
})

test("older GPT models and unsupported native protocols do not receive explicit marks", () => {
  expect(cacheStrategy({ ...route, modelID: "gpt-5.4", family: "gpt" })).toBe("none")
  expect(cacheStrategy({ ...route, modelID: "gpt-5.6-sol" })).toBe("openai")
  expect(cacheStrategy({ ...route, package: "@opencode/ai/providers/anthropic", family: "claude" })).toBe("none")
})
