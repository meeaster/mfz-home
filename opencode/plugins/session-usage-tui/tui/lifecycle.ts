import type { Context } from "@opencode/plugin/tui/plugin";

import { familyPricingUsages, loadFamilySessionMessages, pricingUsage } from "./messages.js";
import { aggregateCost, loadCatalog, type CostEstimate } from "./pricing.js";
import type { ModelAliases } from "./models.js";
import { sessionUsage, type SessionUsage } from "./usage.js";

/** The family's cost by model, with each family session's own usage and estimated cost. */
export type UsageEstimate = CostEstimate & { sessions: Record<string, SessionUsage & { cost: number }> };

type CostLifecycleOptions = {
  context: Context;
  sessionID: () => string;
  setEstimate: (value: UsageEstimate | undefined) => void;
  setError: (value: string | undefined) => void;
  estimate?: (context: Context, sessionID: string, modelAliases: ModelAliases) => Promise<UsageEstimate>;
  modelAliases?: ModelAliases;
  delay?: number;
};

export function createCostLifecycle(options: CostLifecycleOptions) {
  let active = true;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let generation = 0;
  let currentSessionID: string | undefined;
  let failed = false;
  let familyIDs = new Set(options.context.data.session.family(options.sessionID()));

  const refresh = (sessionID = options.sessionID()) => {
    familyIDs = new Set(options.context.data.session.family(sessionID));
    const current = ++generation;

    if (timer) clearTimeout(timer);

    if (sessionID !== currentSessionID || failed) options.setEstimate(undefined);
    currentSessionID = sessionID;
    failed = false;
    options.setError(undefined);
    timer = setTimeout(() => {
      void (options.estimate ?? estimateCost)(options.context, sessionID, options.modelAliases ?? {}).then(
        (value) => active && current === generation && options.setEstimate(value),
        (reason: RejectionReason) => {
          if (!active || current !== generation) return;
          failed = true;
          options.setEstimate(undefined);
          options.setError(errorMessage(reason));
        }
      );
    }, options.delay ?? 150);
  };

  const belongs = (sessionID: string) => (
    familyIDs.has(sessionID) || options.context.data.session.family(options.sessionID()).includes(sessionID)
  );

  const cleanups = [
    options.context.data.on("session.usage.updated", (event) => belongs(event.data.sessionID) && refresh()),
    options.context.data.on("session.execution.succeeded", (event) => belongs(event.data.sessionID) && refresh()),
    options.context.data.on("session.revert.committed", (event) => belongs(event.data.sessionID) && refresh()),
    options.context.data.on("session.created", (event) => {
      if (belongs(event.data.sessionID) || (event.data.parentID && belongs(event.data.parentID))) refresh();
    }),
    options.context.data.on("session.forked", (event) => {
      if (belongs(event.data.sessionID) || belongs(event.data.parentID)) refresh();
    }),
    options.context.data.on("session.deleted", (event) => belongs(event.data.sessionID) && refresh()),
    options.context.data.on("session.model.selected", (event) => belongs(event.data.sessionID) && refresh()),
    options.context.data.on("session.compaction.ended", (event) => belongs(event.data.sessionID) && refresh())
  ];

  return {
    refresh,
    cleanup() {
      active = false;
      generation += 1;

      if (timer) clearTimeout(timer);

      for (const cleanup of cleanups) cleanup();
    }
  };
}

async function estimateCost(context: Context, sessionID: string, modelAliases: ModelAliases): Promise<UsageEstimate> {
  const [priceCatalog, sessionIDs] = await Promise.all([
    loadCatalog(),
    Promise.resolve(context.data.session.family(sessionID))
  ]);

  const familyMessages = await loadFamilySessionMessages(context.client, sessionIDs);
  const usages = familyPricingUsages(familyMessages, sessionID, descendantsOf(context, sessionID, sessionIDs));

  const sessions = Object.fromEntries(familyMessages.map(({ sessionID: id, messages }) => {
    const priced = aggregateCost(messages.flatMap((message) => pricingUsage(message) ?? []), priceCatalog, undefined, modelAliases);
    const cost = priced.costs.reduce((sum, item) => sum + item.amount, 0);

    return [id, { ...sessionUsage(messages, context.data.session.get(id)?.revert?.messageID), cost }];
  }));

  return { ...aggregateCost(usages.all, priceCatalog, usages.sinceCompaction, modelAliases), sessions };
}

/** The sessions among `sessionIDs` started under `sessionID`, directly or through other subagents. */
export function descendantsOf(context: Context, sessionID: string, sessionIDs: readonly string[]) {
  const descendants = new Set<string>();

  for (const id of sessionIDs) {
    let parent = context.data.session.get(id)?.parentID;

    while (parent !== undefined && parent !== sessionID) parent = context.data.session.get(parent)?.parentID;

    if (parent === sessionID) descendants.add(id);
  }

  return descendants;
}

type RejectionReason = Parameters<typeof String>[0];

function errorMessage(reason: RejectionReason) {
  return reason instanceof Error ? reason.message : String(reason);
}
