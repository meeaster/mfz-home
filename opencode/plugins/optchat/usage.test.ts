import { expect, test } from "vitest"
import { estimateCost, priceTokens } from "./usage.js"

const rates = [
  { input: 1, output: 4 },
  { tier: { type: "context" as const, size: 200_000 }, input: 2, output: 8 },
]

test("prices a call at the base rate until its prompt passes a context tier", () => {
  expect(estimateCost(rates, 400_000, 4_000)).toBeCloseTo((100_000 * 1 + 1_000 * 4) / 1_000_000)
  expect(estimateCost(rates, 1_000_000, 4_000)).toBeCloseTo((250_000 * 2 + 1_000 * 8) / 1_000_000)
})

test("has no estimate for a model without rates", () => {
  expect(estimateCost([], 1_000, 1_000)).toBeUndefined()
})

test("prices recorded tokens with the cache rates, counting reasoning as output", () => {
  const cached = [{ input: 1, output: 4, cache: { read: 0.1, write: 1.25 } }]
  const tokens = { input: 1_000, output: 100, reasoning: 100, cache: { read: 20_000, write: 2_000 } }

  expect(priceTokens(cached, tokens)).toBeCloseTo((1_000 * 1 + 200 * 4 + 20_000 * 0.1 + 2_000 * 1.25) / 1_000_000)
})
