import type { Context } from "@opencode-ai/plugin/tui/plugin";

import {
  createBindingStore,
  discoverLedgers,
  resolveEffectiveBinding,
  type BindingStore,
  type EffectiveBinding,
} from "../core.js";

const NO_ACTIVE_LEDGER = "";

export async function selectLedger(
  context: Context,
  root: string,
  bindings: BindingStore = createBindingStore(),
) {
  const route = context.ui.router.current();
  if (route.type !== "session") return;

  let ledgers;
  try {
    ledgers = await discoverLedgers(root);
  } catch (error) {
    await context.ui.dialog.alert({
      title: "Work Ledger unavailable",
      message:
        error instanceof Error ? error.message : "The configured ledger root is unavailable.",
    });
    return;
  }

  const getSession = async (sessionID: string) => {
    await context.data.session.sync(sessionID);
    return context.data.session.get(sessionID);
  };
  let effective: EffectiveBinding;
  try {
    effective = await resolveEffectiveBinding({
      sessionID: route.sessionID,
      ledgers,
      bindings,
      getSession,
    });
  } catch (error) {
    await context.ui.dialog.alert({
      title: "Work Ledger unavailable",
      message: error instanceof Error ? error.message : "The session binding could not be read.",
    });
    return;
  }

  if (effective.status === "stale") {
    await context.ui.dialog.alert({
      title: "Stale Work Ledger binding",
      message: `This session is bound to missing ledger "${effective.ledger}". Select another ledger or clear the binding.`,
    });
  }

  const selected = await context.ui.dialog.select({
    title: "Work Ledger: Select",
    placeholder: "Search ledgers",
    current: effective.status === "bound" ? effective.ledger.name : NO_ACTIVE_LEDGER,
    options: [
      {
        title: "No active ledger",
        value: NO_ACTIVE_LEDGER,
        description:
          effective.status === "bound" && effective.source === "inherited"
            ? "Clear this session's override; the inherited ledger remains active"
            : "Clear this session's explicit binding",
      },
      ...ledgers.map((ledger) => ({
        title: ledger.name,
        value: ledger.name,
        description: currentDescription(effective, ledger.name),
      })),
    ],
  });
  if (selected === undefined) return;

  if (selected === NO_ACTIVE_LEDGER) {
    await bindings.clear(route.sessionID);
    const inherited = await resolveEffectiveBinding({
      sessionID: route.sessionID,
      ledgers,
      bindings,
      getSession,
    }).catch(() => ({ status: "unbound" }) as const);
    context.ui.toast.show({
      variant: "success",
      message:
        inherited.status === "bound"
          ? `Using inherited ledger: ${inherited.ledger.name}`
          : "No active ledger",
    });
    return;
  }

  await bindings.write(route.sessionID, selected);
  context.ui.toast.show({ variant: "success", message: `Active ledger: ${selected}` });
}

function currentDescription(effective: EffectiveBinding, ledger: string) {
  if (effective.status !== "bound" || effective.ledger.name !== ledger) return undefined;
  return effective.source === "explicit"
    ? "Active, selected in this session"
    : `Active, inherited from ${effective.sessionID}`;
}
