import type { Cost } from "./pricing.js";
import type { CacheTotals, ContextUsage } from "./usage.js";

/** The columns a sidebar line has before it wraps: OpenCode's 42-column sidebar less its padding. */
export const WIDTH = 37;

/** A token count in at most five characters: 812, 41.2k, 112k, 1.2M. */
export function tokens(count: number) {
  if (count < 1_000) return String(Math.round(count));

  if (count < 99_950) return `${(count / 1_000).toFixed(1)}k`;

  if (count < 999_500) return `${Math.round(count / 1_000)}k`;

  return `${(count / 1_000_000).toFixed(1)}M`;
}

export function money(amount: number) {
  return `$${amount.toFixed(2)}`;
}

export function cachedPercent({ uncached, cached }: CacheTotals) {
  const total = uncached + cached;

  return total > 0 ? Math.round((cached / total) * 100) : undefined;
}

export function cacheLine(totals: CacheTotals) {
  const percent = cachedPercent(totals);

  return `Uncached ${tokens(totals.uncached)} · Cached ${tokens(totals.cached)}${percent === undefined ? "" : ` (${percent}%)`}`;
}

export function lastStepLine(totals: CacheTotals) {
  const percent = cachedPercent(totals);

  return percent === undefined ? undefined : `Last step ${percent}% cached`;
}

/** How much of the model's context window a count fills, as " (28%)", or nothing when the window is unknown. */
export function share(count: number, limit: number | undefined) {
  return limit ? ` (${Math.round((count / limit) * 100)}%)` : "";
}

/** Cuts text to `width` columns, ending in "…" when it is cut. */
export function fit(text: string, width: number) {
  return text.length <= width ? text : `${text.slice(0, Math.max(0, width - 1))}…`;
}

/** A model's estimate since the latest compaction, then its full-session total when the session was compacted. */
export function costLine(cost: Cost) {
  const amounts = cost.sinceCompaction === undefined ? money(cost.amount) : `${money(cost.sinceCompaction)} (${money(cost.amount)})`;
  // Aliased models are labeled with their recorded providerID/modelID key; the provider only takes room.
  const model = cost.model.slice(cost.model.indexOf("/") + 1);

  return `${fit(model, WIDTH - amounts.length - 1)} ${amounts}`;
}

/** The family's total, as the cost lines show it: since the latest compaction, then the full total when compacted. */
export function totalLine(costs: readonly Cost[]) {
  const total = costs.reduce((sum, cost) => sum + cost.amount, 0);
  const compacted = costs.some((cost) => cost.sinceCompaction !== undefined);
  const since = costs.reduce((sum, cost) => sum + (cost.sinceCompaction ?? 0), 0);

  return compacted ? `Total ${money(since)} (${money(total)})` : `Total ${money(total)}`;
}

/**
 * A subagent's model, context size and cost on one line, as parts so the size can be colored. The model name is cut
 * first, so the numbers always show.
 */
export function subagentLine(context: ContextUsage, limit: number | undefined, cost: number) {
  const size = tokens(context.tokens);
  const rest = `${share(context.tokens, limit)} ${money(cost)}`;
  const model = `${context.modelID}${context.variant ? `#${context.variant}` : ""}`;

  return { model: `${fit(model, WIDTH - size.length - rest.length - 1)} `, size, rest };
}
