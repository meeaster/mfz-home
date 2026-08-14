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
