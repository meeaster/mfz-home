import type { Cost, CostEstimate } from "./pricing.js";

export type CatalogRenderState =
  | { type: "loading" }
  | { type: "error"; message: string }
  | { type: "estimate"; estimate: CostEstimate };

export function catalogRenderState(estimate: CostEstimate | undefined, error: string | undefined): CatalogRenderState {
  if (error) return { type: "error", message: error };

  if (estimate) return { type: "estimate", estimate };

  return { type: "loading" };
}

export function formatCost(cost: Cost) {
  const sinceCompaction = cost.sinceCompaction ?? cost.amount;

  return `${cost.model}: $${sinceCompaction.toFixed(3)} ($${cost.amount.toFixed(3)})`;
}
