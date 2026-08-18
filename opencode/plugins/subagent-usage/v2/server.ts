import type { Plugin } from "@opencode-ai/plugin";

import { loadCatalog, priceTokens, type Catalog, type ModelRef, type Tokens } from "./pricing.js";

const SETTLE_TIMEOUT_MS = 500;
const SETTLE_INTERVAL_MS = 10;

type Usage = {
  sessionID: string;
  model: ModelRef;
  tokens: Tokens;
  step: boolean;
};

type Invocation = {
  childID?: string;
  baseline?: { model?: ModelRef; tokens: Tokens };
  usage: Usage[];
  projections: Map<string, Tokens>;
  ambiguous: boolean;
};

const zeroTokens = (): Tokens => ({
  input: 0,
  output: 0,
  reasoning: 0,
  cache: { read: 0, write: 0 },
});

export function summarizeUsage(usage: readonly Usage[]) {
  const latestStep = usage.findLast((entry) => entry.step);
  return {
    tokens: usage.reduce((total, entry) => addTokens(total, entry.tokens), zeroTokens()),
    currentContext: latestStep
      ? latestStep.tokens.input + latestStep.tokens.cache.read + latestStep.tokens.cache.write
      : undefined,
  };
}

export function usageTag(invocationCost: number, sessionCost: number, currentContext: number) {
  return `<subagent-usage invocation-cost-usd="${formatCost(invocationCost)}" session-cost-usd="${formatCost(sessionCost)}" current-context-tokens="${Math.round(currentContext)}" />`;
}

export function appendUsageContent(
  content: string | ReadonlyArray<{ type: "text"; text: string } | { type: "file"; uri: string; mime: string; name?: string }>,
  usage: string,
) {
  if (Array.isArray(content)) return [...content, { type: "text" as const, text: usage }];
  return `${content}\n${usage}`;
}

export default {
  id: "subagent-usage",
  setup: async (context) => {
    const invocations = new Map<string, Invocation>();
    const claimedChildren = new Map<string, string>();
    const models = new Map<string, ModelRef>();
    const pricedSessions = new Map<string, number>();
    const events = context.event.subscribe()[Symbol.asyncIterator]();
    const consume = (async () => {
      for (;;) {
        const next = await events.next();
        if (next.done) return;
        const event = next.value;
        if (event.type === "session.step.started") {
          models.set(event.data.assistantMessageID, event.data.model);
          continue;
        }
        if (event.type === "session.usage.updated") {
          for (const invocation of invocations.values()) {
            if (!invocation.childID || invocation.childID === event.data.sessionID) {
              invocation.projections.set(event.data.sessionID, event.data.tokens);
            }
          }
          continue;
        }
        const usage =
          event.type === "session.step.ended"
            ? usageFor(event.data.sessionID, event.data.assistantMessageID, event.data.tokens, true, models)
            : event.type === "session.step.failed" && event.data.cost !== undefined && event.data.tokens !== undefined
              ? usageFor(event.data.sessionID, event.data.assistantMessageID, event.data.tokens, false, models)
              : undefined;
        if (!usage) continue;
        for (const invocation of invocations.values()) {
          if (!invocation.childID || invocation.childID === usage.sessionID) invocation.usage.push(usage);
        }
      }
    })().catch(() => undefined);

    await context.tool.hook("execute.before", async (event) => {
      if (event.tool !== "subagent") return;
      // SAFETY: The built-in subagent schema owns this input after the tool-name check.
      const childID = (event.input as { sessionID?: string }).sessionID;
      const baseline = childID
        ? await context.session.get({ sessionID: childID }).catch(() => undefined)
        : undefined;
      const conflict = childID ? claimedChildren.get(childID) : undefined;
      if (conflict) {
        const active = invocations.get(conflict);
        if (active) active.ambiguous = true;
      } else if (childID) {
        claimedChildren.set(childID, event.id);
      }
      const invocation: Invocation = {
        usage: [],
        projections: new Map(),
        ambiguous: conflict !== undefined || (childID !== undefined && baseline === undefined),
      };
      if (childID) invocation.childID = childID;
      if (baseline) {
        invocation.baseline = { tokens: baseline.tokens };
        if (baseline.model) invocation.baseline.model = baseline.model;
      }
      invocations.set(event.id, invocation);
    });

    await context.tool.hook("execute.after", async (event) => {
      if (event.tool !== "subagent") return;
      const invocation = invocations.get(event.id);
      if (!invocation) return;
      try {
        if (event.status !== "completed" || event.result.content === undefined) return;
        // SAFETY: The built-in subagent owns this metadata after both discriminants above.
        const metadata = event.result.metadata as { sessionID?: string; status?: string } | undefined;
        const childID = metadata?.sessionID;
        if (!childID || metadata.status !== "completed") return;
        invocation.childID = childID;
        invocation.usage = invocation.usage.filter((entry) => entry.sessionID === childID);
        if (invocation.ambiguous) return;

        const session = await context.session.get({ sessionID: childID }).catch(() => undefined);
        if (!session?.model) return;
        const priceCatalog = await loadCatalog().catch(() => undefined);
        if (!priceCatalog) return;
        const settled = await settle(invocation, childID, session.model, priceCatalog, pricedSessions.get(childID));
        if (!settled) return;
        pricedSessions.set(childID, settled.sessionCost);
        const tag = usageTag(settled.invocationCost, settled.sessionCost, settled.currentContext);
        event.result = {
          ...event.result,
          content: appendUsageContent(event.result.content, tag),
        };
      } finally {
        if (invocation.childID && claimedChildren.get(invocation.childID) === event.id) {
          claimedChildren.delete(invocation.childID);
        }
        invocations.delete(event.id);
      }
    });

    return async () => {
      await events.return?.();
      await consume;
    };
  },
} satisfies Plugin.Plugin;

async function settle(
  invocation: Invocation,
  childID: string,
  currentModel: ModelRef,
  catalog: Catalog,
  knownSessionCost: number | undefined,
) {
  const deadline = Date.now() + SETTLE_TIMEOUT_MS;
  for (;;) {
    const summary = summarizeUsage(invocation.usage);
    const projection = invocation.projections.get(childID);
    const baseline = invocation.baseline ?? { tokens: zeroTokens() };
    if (
      summary.currentContext !== undefined &&
      projection &&
      containsTokens(projection, addTokens(baseline.tokens, summary.tokens))
    ) {
      const stepCost = priceUsages(invocation.usage, catalog);
      const residual = subtractTokens(projection, addTokens(baseline.tokens, summary.tokens));
      const residualCost = priceTokens(residual, currentModel, catalog);
      const baselineCost = knownSessionCost ?? (baseline.model ? priceTokens(baseline.tokens, baseline.model, catalog) : 0);
      if (stepCost === undefined || residualCost === undefined || baselineCost === undefined) return undefined;
      const invocationCost = stepCost + residualCost;
      return {
        invocationCost,
        sessionCost: baselineCost + invocationCost,
        currentContext: summary.currentContext,
      };
    }
    if (Date.now() >= deadline) return undefined;
    await new Promise((resolve) => setTimeout(resolve, SETTLE_INTERVAL_MS));
  }
}

function usageFor(
  sessionID: string,
  messageID: string,
  tokens: Tokens,
  step: boolean,
  models: Map<string, ModelRef>,
): Usage | undefined {
  const model = models.get(messageID);
  models.delete(messageID);
  return model ? { sessionID, model, tokens, step } : undefined;
}

function priceUsages(usages: readonly Usage[], catalog: Catalog) {
  let cost = 0;
  for (const usage of usages) {
    const amount = priceTokens(usage.tokens, usage.model, catalog);
    if (amount === undefined) return undefined;
    cost += amount;
  }
  return cost;
}

function addTokens(left: Tokens, right: Tokens): Tokens {
  return {
    input: left.input + right.input,
    output: left.output + right.output,
    reasoning: left.reasoning + right.reasoning,
    cache: {
      read: left.cache.read + right.cache.read,
      write: left.cache.write + right.cache.write,
    },
  };
}

function containsTokens(actual: Tokens, expected: Tokens) {
  return (
    actual.input >= expected.input &&
    actual.output >= expected.output &&
    actual.reasoning >= expected.reasoning &&
    actual.cache.read >= expected.cache.read &&
    actual.cache.write >= expected.cache.write
  );
}

function subtractTokens(actual: Tokens, baseline: Tokens): Tokens {
  return {
    input: actual.input - baseline.input,
    output: actual.output - baseline.output,
    reasoning: actual.reasoning - baseline.reasoning,
    cache: {
      read: actual.cache.read - baseline.cache.read,
      write: actual.cache.write - baseline.cache.write,
    },
  };
}

function formatCost(value: number) {
  return value.toFixed(6).replace(/\.?0+$/, "") || "0";
}
