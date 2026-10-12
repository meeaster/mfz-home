// What OptChat's own model calls cost. OpenCode's stateless `generate.text` returns only the reply text, so the cost is
// estimated from the bytes sent and received, priced with OpenCode's rates for the model, or models.dev's API rates
// when OpenCode has none, as for a subscription login.

import { z } from "zod"

/** A model's price in USD per million tokens, as OpenCode's model list gives it: one entry per context tier. */
export interface Rate {
  readonly tier?: { readonly type: "context"; readonly size: number }
  readonly input: number
  readonly output: number
}

/** Rough tokens in a UTF-8 text of `size` bytes: about four bytes a token in English prose and code. */
export const estimateTokens = (size: number): number => Math.ceil(size / 4)

/**
 * The estimated cost of one uncached call, with the rate of the largest context tier the prompt passes, as OpenCode
 * prices a step. Reasoning tokens aren't in the reply, so the estimate runs low for a model that reasons.
 */
export const estimateCost = (rates: readonly Rate[], promptBytes: number, replyBytes: number): number | undefined => {
  const input = estimateTokens(promptBytes)
  let rate = rates.find((candidate) => candidate.tier === undefined)

  for (const candidate of rates) {
    if (candidate.tier !== undefined && input > candidate.tier.size && (rate?.tier === undefined || candidate.tier.size > rate.tier.size)) rate = candidate
  }

  if (rate === undefined) return undefined

  return (input * rate.input + estimateTokens(replyBytes) * rate.output) / 1_000_000
}

const Price = z.object({ input: z.number(), output: z.number() })

const CatalogProvider = z.object({ models: z.record(z.string(), z.unknown()) })

const CatalogModel = z.object({
  cost: Price.extend({
    tiers: z.array(Price.extend({ tier: z.object({ type: z.literal("context"), size: z.number() }) })).optional(),
    context_over_200k: Price.optional(),
  }).optional(),
})

/** A model's API rates from the models.dev catalog, or undefined when it doesn't list a price for the model. */
export const catalogRates = async (providerID: string, modelID: string): Promise<readonly Rate[] | undefined> => {
  const response = await fetch("https://models.dev/api.json", { signal: AbortSignal.timeout(10_000) })

  if (!response.ok) throw new Error(`models.dev returned ${response.status}`)

  const catalog = z.record(z.string(), z.unknown()).parse(await response.json())
  const provider = CatalogProvider.safeParse(catalog[providerID])
  const model = CatalogModel.safeParse(provider.success ? provider.data.models[modelID] : undefined)
  const cost = model.success ? model.data.cost : undefined

  if (cost === undefined) return undefined

  const base: Rate = { input: cost.input, output: cost.output }

  if (cost.tiers !== undefined) return [base, ...cost.tiers]

  if (cost.context_over_200k !== undefined) return [base, { ...cost.context_over_200k, tier: { type: "context", size: 200_000 } }]

  return [base]
}
