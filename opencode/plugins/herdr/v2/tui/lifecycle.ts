import type { Context } from "@opencode-ai/plugin/tui/plugin";

import { createReporter, herdrEnvironment } from "./reporter.js";
import { stateForEvent } from "./state.js";

const ROUTE_POLL_INTERVAL_MS = 100;
const SELECTION_RETRY_DELAYS_MS = [100, 400, 1_000] as const;

type OpenCodeEvent = Parameters<Parameters<Context["data"]["listen"]>[0]>[0]["details"];

export function createHerdrLifecycle(context: Context) {
  const environment = herdrEnvironment();
  if (!environment) return;

  const reporter = createReporter(environment);
  const roots = new Map<string, string>();
  let active = true;
  let selectedRootID: string | undefined;
  let retryIndex = 0;
  let nextReportAt = 0;
  let reportPending = false;

  const rootFor = (sessionID: string) => {
    const known = roots.get(sessionID);
    if (known) return known;
    const session = context.data.session.get(sessionID);
    if (!session?.parentID) return sessionID;
    const root = context.data.session.root(sessionID);
    roots.set(sessionID, root);
    return root;
  };

  const syncSelectedSession = async () => {
    const route = context.ui.router.current();
    const sessionID = route.type === "session" ? route.sessionID : undefined;
    const session = sessionID ? context.data.session.get(sessionID) : undefined;
    if (!sessionID || !session || session.parentID) {
      selectedRootID = undefined;
      retryIndex = 0;
      nextReportAt = 0;
      return;
    }
    if (sessionID !== selectedRootID) {
      selectedRootID = sessionID;
      retryIndex = 0;
      nextReportAt = 0;
    }
    if (reportPending || Date.now() < nextReportAt) return;

    const reportingSessionID = sessionID;
    reportPending = true;
    await reporter.session(reportingSessionID).finally(() => {
      reportPending = false;
    });
    if (!active || selectedRootID !== reportingSessionID) return;
    const delay = SELECTION_RETRY_DELAYS_MS[retryIndex];
    retryIndex += 1;
    nextReportAt = delay === undefined ? Number.POSITIVE_INFINITY : Date.now() + delay;
  };

  const onEvent = (event: OpenCodeEvent) => {
    if (event.type === "session.created" && event.data.parentID) {
      roots.set(event.data.sessionID, rootFor(event.data.parentID));
    }

    const sessionID = sessionIDForEvent(event);
    if (!active || !selectedRootID || !sessionID) return;
    const rootID = rootFor(sessionID);
    if (rootID !== selectedRootID) return;
    const state = stateForEvent(
      event.type,
      event.type === "session.status" ? event.data.status.type : undefined,
      sessionID !== selectedRootID
    );
    if (state) void reporter.state(state, selectedRootID);
  };

  const unlisten = context.data.listen(({ details }) => onEvent(details));
  void syncSelectedSession();
  const routePoll = setInterval(() => void syncSelectedSession(), ROUTE_POLL_INTERVAL_MS);

  return () => {
    active = false;
    clearInterval(routePoll);
    unlisten();
  };
}

function sessionIDForEvent(event: OpenCodeEvent): string | undefined {
  if (event.type === "form.created") return event.data.form.sessionID;
  if (event.type === "form.replied" || event.type === "form.cancelled") return event.data.sessionID;
  if (
    event.type === "session.status" ||
    event.type === "session.idle" ||
    event.type === "session.created" ||
    event.type === "session.execution.started" ||
    event.type === "session.execution.failed" ||
    event.type === "session.inbox.enqueued" ||
    event.type === "permission.asked" ||
    event.type === "permission.replied"
  ) {
    return event.data.sessionID;
  }
  return undefined;
}
