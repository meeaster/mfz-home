import type { Context } from "@opencode-ai/plugin/tui/plugin";

import { loadFamilyMessages, pricingUsage } from "./messages.js";
import { aggregateCost, loadCatalog, type CostEstimate } from "./pricing.js";

type CostLifecycleOptions = {
  context: Context;
  sessionID: () => string;
  setEstimate: (value: CostEstimate | undefined) => void;
  setError: (value: string | undefined) => void;
  estimate?: (context: Context, sessionID: string) => Promise<CostEstimate>;
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
      void (options.estimate ?? estimateCost)(options.context, sessionID).then(
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
    options.context.data.on("session.deleted", (event) => belongs(event.data.sessionID) && refresh())
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

async function estimateCost(context: Context, sessionID: string) {
  const [priceCatalog, sessionIDs] = await Promise.all([
    loadCatalog(),
    Promise.resolve(context.data.session.family(sessionID))
  ]);
  const usages = (await loadFamilyMessages(context.client, sessionIDs))
    .map(pricingUsage)
    .filter((usage) => usage !== undefined);
  return aggregateCost(usages, priceCatalog);
}

type RejectionReason = Parameters<typeof String>[0];

function errorMessage(reason: RejectionReason) {
  return reason instanceof Error ? reason.message : String(reason);
}
