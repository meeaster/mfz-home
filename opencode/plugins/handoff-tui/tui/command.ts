import type { Context } from "@opencode/plugin/tui/plugin";

export type HandoffContext = {
  readonly client: {
    readonly session: Pick<Context["client"]["session"], "prompt" | "wait" | "compact">;
  };
  readonly ui: {
    readonly router: Pick<Context["ui"]["router"], "current">;
    readonly toast: Pick<Context["ui"]["toast"], "show">;
  };
};

export async function runHandoff(context: HandoffContext, input?: string) {
  const route = context.ui.router.current();

  if (route.type !== "session") {
    context.ui.toast.show({ variant: "info", message: "Open a session first." });

    return;
  }

  const focus = input?.trim();

  const text = focus
    ? `Prepare a continuation handoff. Preserve this focus: ${focus}`
    : "Prepare a continuation handoff.";

  try {
    await context.client.session.prompt({
      sessionID: route.sessionID,
      text,
      skills: [{ id: "handoff" }],
      delivery: "queue",
    });
    await context.client.session.wait({ sessionID: route.sessionID });
    await context.client.session.compact({ sessionID: route.sessionID });
    await context.client.session.wait({ sessionID: route.sessionID });
  } catch (error) {
    context.ui.toast.show({
      variant: "error",
      message: `Handoff failed: ${error instanceof Error ? error.message : String(error)}`,
    });

    return;
  }

  context.ui.toast.show({ variant: "success", message: "Handoff complete; session compacted." });
}
