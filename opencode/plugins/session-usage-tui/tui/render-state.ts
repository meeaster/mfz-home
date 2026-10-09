import type { UsageEstimate } from "./lifecycle.js";

export type CatalogRenderState =
  | { type: "loading" }
  | { type: "error"; message: string }
  | { type: "estimate"; estimate: UsageEstimate };

export function catalogRenderState(estimate: UsageEstimate | undefined, error: string | undefined): CatalogRenderState {
  if (error) return { type: "error", message: error };

  if (estimate) return { type: "estimate", estimate };

  return { type: "loading" };
}
