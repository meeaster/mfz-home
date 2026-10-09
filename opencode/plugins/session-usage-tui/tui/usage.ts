import { latestCompletedCompactionIndex, pricingUsage, type SessionMessage } from "./messages.js";

/** Input tokens split by whether they were read from the prompt cache. Cache writes count as uncached. */
export type CacheTotals = { uncached: number; cached: number };

export type ContextUsage = { tokens: number; providerID: string; modelID: string; variant?: string };

export type SessionUsage = {
  /** What the session holds now: its latest step since the last compaction, as OpenCode's context box counts it. */
  context?: ContextUsage;
  /** Every completed step's input, when there is a step. */
  input?: CacheTotals;
  lastStep?: CacheTotals;
};

/** A session's usage from its messages, leaving out those from `boundary` on, which a revert removed. */
export function sessionUsage(messages: readonly SessionMessage[], boundary?: string): SessionUsage {
  const boundaryIndex = boundary === undefined ? -1 : messages.findIndex((message) => message.id === boundary);
  const current = boundaryIndex === -1 ? messages : messages.slice(0, boundaryIndex);
  const steps = current.flatMap((message) => pricingUsage(message) ?? []);
  const last = steps.at(-1);
  const usage: SessionUsage = {};

  if (last) {
    const input = { uncached: 0, cached: 0 };

    for (const step of steps) {
      const totals = cacheTotals(step.tokens);

      input.uncached += totals.uncached;
      input.cached += totals.cached;
    }

    usage.input = input;
    usage.lastStep = cacheTotals(last.tokens);
  }

  const context = contextUsage(current);

  if (context) usage.context = context;

  return usage;
}

function contextUsage(messages: readonly SessionMessage[]): ContextUsage | undefined {
  const compaction = latestCompletedCompactionIndex(messages);
  const step = messages.findLast((message, index) => message.type === "assistant" && message.tokens !== undefined && index > compaction);
  const tokens = step?.tokens;

  if (!step?.model?.providerID || !step.model.id || !tokens) return undefined;

  const total = [tokens.input, tokens.output, tokens.reasoning, tokens.cache?.read, tokens.cache?.write].reduce<number>((sum, value) => sum + finite(value), 0);

  if (total <= 0) return undefined;

  const context: ContextUsage = { tokens: total, providerID: step.model.providerID, modelID: step.model.id };

  if (step.model.variant) context.variant = step.model.variant;

  return context;
}

function cacheTotals(tokens: { input: number; cacheRead: number; cacheWrite: number }): CacheTotals {
  return { uncached: tokens.input + tokens.cacheWrite, cached: tokens.cacheRead };
}

function finite(value: number | undefined) {
  return value !== undefined && Number.isFinite(value) && value >= 0 ? value : 0;
}
