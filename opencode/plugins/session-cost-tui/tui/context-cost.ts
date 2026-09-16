import { latestAssistantWithUsage, pricingUsage, type SessionMessage } from "./messages.js";
import { cacheReadCost, type Catalog } from "./pricing.js";

type SessionState = {
  model?: { providerID: string; id: string };
  revert?: { messageID?: string };
};

/**
 * Uses the latest completed provider usage in the active context as a proxy for
 * the next context size. The proxy is input + cache-read + cache-write tokens;
 * output and reasoning tokens are deliberately excluded.
 */
export function cachedInputCost(
  messages: readonly SessionMessage[],
  session: SessionState | undefined,
  catalog: Catalog
): number | undefined {
  const latest = latestAssistantWithUsage(messages, session?.revert?.messageID);

  if (!latest) return undefined;

  const usage = pricingUsage(latest);

  if (!usage || !latest.model) return undefined;

  const modelRef = session?.model ?? latest.model;

  if (!modelRef.providerID || !modelRef.id) return undefined;

  const models = catalog[modelRef.providerID]?.models ?? {};
  const model = models[modelRef.id];

  if (!model) return undefined;

  const contextTokens = usage.tokens.input + usage.tokens.cacheRead + usage.tokens.cacheWrite;

  return cacheReadCost(model, contextTokens);
}
