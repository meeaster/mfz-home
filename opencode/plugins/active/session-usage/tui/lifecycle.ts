import type { Context } from "@opencode/plugin/tui/plugin";

import { createMessageCache, type MessageCache } from "./message-cache.js";
import { billedUsages, familyPricingUsages, type SessionMessage } from "./messages.js";
import { aggregateCost, loadCatalog, type CostEstimate } from "./pricing.js";
import { createSessionStore, type SessionStore } from "./session-store.js";
import type { ModelAliases } from "./models.js";
import { sessionUsage, type SessionUsage } from "./usage.js";

/** The family's cost by model, with each family session's own usage and estimated cost. */
export type UsageEstimate = CostEstimate & { sessions: Record<string, SessionUsage & { cost: number }> };

/** Receives each family session's messages as read, oldest first, and the first message a revert removed. */
export type MessageObserver = (sessionID: string, messages: readonly SessionMessage[], boundary?: string) => void;

type CostLifecycleOptions = {
  context: Context;
  sessionID: () => string;
  setEstimate: (value: UsageEstimate | undefined) => void;
  setError: (value: string | undefined) => void;
  estimate?: (context: Context, sessionID: string, modelAliases: ModelAliases) => Promise<UsageEstimate>;
  modelAliases?: ModelAliases;
  delay?: number;
  store?: SessionStore;
  observe?: MessageObserver;
};

export function createCostLifecycle(options: CostLifecycleOptions) {
  let active = true;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let generation = 0;
  let currentSessionID: string | undefined;
  let failed = false;
  let familyIDs = new Set(options.context.data.session.family(options.sessionID()));
  const cache = createMessageCache(options.context.client, options.store ?? createSessionStore());

  const estimate = options.estimate ?? (
    (context: Context, sessionID: string, modelAliases: ModelAliases) => estimateCost(context, sessionID, modelAliases, cache, options.observe)
  );

  const refresh = (sessionID = options.sessionID()) => {
    familyIDs = new Set(options.context.data.session.family(sessionID));
    const current = ++generation;

    if (timer) clearTimeout(timer);

    if (sessionID !== currentSessionID || failed) options.setEstimate(undefined);
    currentSessionID = sessionID;
    failed = false;
    options.setError(undefined);
    timer = setTimeout(() => {
      void estimate(options.context, sessionID, options.modelAliases ?? {}).then(
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

  // Refreshes for an event on a family session, marking that session's messages for reading again.
  const changed = (sessionID: string) => {
    if (!belongs(sessionID)) return;

    cache.invalidate(sessionID);
    refresh();
  };

  const cleanups = [
    options.context.data.on("session.usage.updated", (event) => changed(event.data.sessionID)),
    options.context.data.on("session.execution.succeeded", (event) => changed(event.data.sessionID)),
    options.context.data.on("session.execution.failed", (event) => changed(event.data.sessionID)),
    options.context.data.on("session.execution.interrupted", (event) => changed(event.data.sessionID)),
    options.context.data.on("session.revert.committed", (event) => changed(event.data.sessionID)),
    options.context.data.on("session.created", (event) => {
      if (belongs(event.data.sessionID) || (event.data.parentID && belongs(event.data.parentID))) refresh();
    }),
    options.context.data.on("session.forked", (event) => {
      if (belongs(event.data.sessionID) || belongs(event.data.parentID)) refresh();
    }),
    options.context.data.on("session.deleted", (event) => belongs(event.data.sessionID) && refresh()),
    options.context.data.on("session.model.selected", (event) => belongs(event.data.sessionID) && refresh()),
    options.context.data.on("session.compaction.ended", (event) => changed(event.data.sessionID)),
    options.context.data.on("session.compaction.failed", (event) => changed(event.data.sessionID))
  ];

  return {
    refresh,
    cleanup() {
      active = false;
      generation += 1;

      if (timer) clearTimeout(timer);

      for (const cleanup of cleanups) cleanup();

      void cache.close();
    }
  };
}

async function estimateCost(
  context: Context,
  sessionID: string,
  modelAliases: ModelAliases,
  cache: MessageCache,
  observe?: MessageObserver
): Promise<UsageEstimate> {
  const [priceCatalog, sessionIDs] = await Promise.all([
    loadCatalog(),
    Promise.resolve(context.data.session.family(sessionID))
  ]);

  const familyMessages = await cache.load(sessionIDs);

  for (const { sessionID: id, messages } of familyMessages) observe?.(id, messages, context.data.session.get(id)?.revert?.messageID);
  const usages = familyPricingUsages(familyMessages, sessionID, descendantsOf(context, sessionID, sessionIDs));

  const sessions = Object.fromEntries(familyMessages.map(({ sessionID: id, messages }) => {
    const priced = aggregateCost(messages.flatMap(billedUsages), priceCatalog, undefined, modelAliases);
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
