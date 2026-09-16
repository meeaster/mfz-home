import type { CostEstimate } from "./pricing.js";

export type CatalogRenderState =
  | { type: "loading" }
  | { type: "error"; message: string }
  | { type: "estimate"; estimate: CostEstimate };

export function catalogRenderState(estimate: CostEstimate | undefined, error: string | undefined): CatalogRenderState {
  if (error) return { type: "error", message: error };

  if (estimate) return { type: "estimate", estimate };

  return { type: "loading" };
}

export function formatCachedInputCost(amount: number | undefined) {
  if (amount === undefined || !Number.isFinite(amount) || amount < 0) return undefined;

  return `Cached input now: ~$${amount.toFixed(3)}`;
}
