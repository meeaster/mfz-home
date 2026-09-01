import { Plugin } from "@opencode-ai/plugin";

import {
  createBindingStore,
  discoverLedgers,
  resolveEffectiveBinding,
  resolveOptions,
  type BindingStore,
} from "./core.js";

export function ledgerContext(name: string, ledgerPath: string, source: "explicit" | "inherited") {
  return [
    "Work Ledger is active for this session.",
    `Ledger: ${name}`,
    `Path: ${ledgerPath}`,
    `Binding: ${source}`,
    "Read ledger files only when they are relevant to the current task.",
  ].join("\n");
}

export async function setupWorkLedger(context: Plugin.Context, bindings: BindingStore) {
  let root: string;
  try {
    root = resolveOptions(context.options).root;
  } catch {
    return;
  }
  await context.session.hook("context", async (event) => {
    try {
      const effective = await resolveEffectiveBinding({
        sessionID: event.sessionID,
        ledgers: await discoverLedgers(root),
        bindings,
        getSession: (sessionID) => context.session.get({ sessionID }),
      });
      if (effective.status !== "bound") return;
      event.system.push({
        type: "text",
        text: ledgerContext(effective.ledger.name, effective.ledger.path, effective.source),
      });
    } catch {
      // Work Ledger context must never block the underlying model request.
    }
  });
}

export default Plugin.define({
  id: "work-ledger",
  setup: (context) => setupWorkLedger(context, createBindingStore()),
});
