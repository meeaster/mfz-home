/** @jsxImportSource @opentui/solid */
import type { TuiPlugin, TuiPluginApi, TuiPluginModule } from "@opencode-ai/plugin/tui";
import { createEffect, createMemo, createSignal, For, onCleanup, onMount, Show } from "solid-js";

import { advisorDebug, advisorDebugEnabled } from "./debug.js";
import {
  advisorMetricGroups,
  createRefreshScheduler,
  dedupeAdvisorParts,
  loadAdvisorHistory,
  loadDescendantAdvisorParts,
  type AdvisorMetricGroup,
  type AdvisorToolPart,
  type DescendantSessionsClient,
  type SessionMessagesClient,
} from "./metrics.js";
import { advisorCost, type AdvisorCost } from "./pricing.js";

let invocation = 0;

const compactTokens = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

function Metrics(props: { group: AdvisorMetricGroup; cost?: AdvisorCost; muted: TuiPluginApi["theme"]["current"]["textMuted"] }) {
  const metrics = () => props.group.metrics;
  const isClaude = props.group.harness === "claude-code";
  const tokens = (value: number) => compactTokens.format(value);
  const formattedCost = () => props.cost && `$${props.cost.amount.toFixed(props.cost.amount < 1 ? 3 : 2)}`;
  return (
    <box>
      <text fg={props.muted}>
        <b>{props.group.label}</b> · {metrics().calls}
        <Show when={formattedCost()}> · {formattedCost()}</Show>
      </text>
      <Show when={!isClaude && metrics().input > 0}>
        <text fg={props.muted}>
          Input: {tokens(metrics().input)}
          <Show when={metrics().cacheRead > 0}>
            {" "}({tokens(metrics().cacheRead)} cached
            <Show when={metrics().cacheRate !== undefined}> · {(metrics().cacheRate! * 100).toFixed(1)}%</Show>)
          </Show>
        </text>
      </Show>
      <Show when={isClaude && (metrics().cacheRead > 0 || metrics().cacheWrite > 0)}>
        <text fg={props.muted}>
          Claude <Show when={metrics().cacheWrite > 0}>build: {tokens(metrics().cacheWrite)}</Show>
          <Show when={metrics().cacheRead > 0 && metrics().cacheWrite > 0}> · </Show>
          <Show when={metrics().cacheRead > 0}>read: {tokens(metrics().cacheRead)}</Show>
        </text>
      </Show>
      <Show when={isClaude && metrics().cacheRead === 0 && metrics().cacheWrite === 0 && metrics().input > 0}>
        <text fg={props.muted}>Input: {tokens(metrics().input)}</text>
      </Show>
      <Show when={!isClaude && metrics().input === 0 && metrics().cacheRead > 0}>
        <text fg={props.muted}>
          Cache read: {tokens(metrics().cacheRead)}
          <Show when={metrics().cacheRate !== undefined}> ({(metrics().cacheRate! * 100).toFixed(1)}%)</Show>
        </text>
      </Show>
      <Show when={!isClaude && metrics().cacheWrite > 0}>
        <text fg={props.muted}>build: {tokens(metrics().cacheWrite)}</text>
      </Show>
      <text fg={props.muted}>
        Output: {tokens(metrics().output)}
        <Show when={metrics().reasoning > 0}> · Reasoning: {tokens(metrics().reasoning)}</Show>
      </text>
    </box>
  );
}

function View(props: { api: TuiPluginApi; sessionID: string }) {
  const theme = () => props.api.theme.current;
  const parentParts = createMemo(
    () => props.api.state.session.messages(props.sessionID).flatMap((message) => props.api.state.part(message.id)) as AdvisorToolPart[]
  );
  const [descendantParts, setDescendantParts] = createSignal<AdvisorToolPart[]>([]);
  const parts = createMemo(() => dedupeAdvisorParts([...parentParts(), ...descendantParts()]));
  const groups = createMemo(() => advisorMetricGroups(parts()));
  const [costs, setCosts] = createSignal<Record<string, AdvisorCost>>({});
  let active = true;
  const descendants = createRefreshScheduler(async () => {
    try {
      const value = await loadDescendantAdvisorParts(props.api.client as DescendantSessionsClient, props.sessionID);
      if (active) setDescendantParts(value);
    } catch (error) {
      advisorDebug("descendants.error", { sessionID: props.sessionID, error: String(error) });
    }
  });
  const refreshDescendants = () => descendants.schedule();

  createEffect(() => {
    props.api.state.session.messages(props.sessionID);
    refreshDescendants();
  });

  createEffect(() => {
    const targets = groups();
    if (targets.length === 0) return setCosts({});
    let active = true;
    advisorDebug("pricing.start", { sessionID: props.sessionID, calls: targets.flatMap((target) => target.calls).length });
    void Promise.all(targets.map(async (target) => [target.key, await advisorCost(target.calls)] as const)).then(
      (entries) => {
        if (!active) return;
        const value = Object.fromEntries(entries);
        setCosts(value);
        advisorDebug("pricing.complete", { sessionID: props.sessionID, targets: targets.length });
      },
      (error: unknown) => advisorDebug("pricing.error", { sessionID: props.sessionID, error: String(error) })
    );
    onCleanup(() => {
      active = false;
    });
  });

  onMount(() => {
    const sessionID = props.sessionID;
    const id = ++invocation;
    advisorDebug("view.mount", { id, sessionID, appVersion: props.api.app.version, stateReady: props.api.state.ready });
    if (advisorDebugEnabled()) {
      void loadAdvisorHistory(props.api.client as SessionMessagesClient, sessionID, {
        pageSize: 1,
        maxPages: 1,
        onRequest(event, details) {
          advisorDebug(`history.${event}`, { id, sessionID, ...details });
        }
      }).then(
        (history) => advisorDebug("history.complete", { id, sessionID, loadedMessages: history.loadedMessages, complete: history.complete }),
        (error: unknown) => advisorDebug("history.error", { id, sessionID, error: String(error) })
      );
    }
    const stopSessionUpdates = props.api.event.on("session.updated", refreshDescendants);
    const stopSessionCreated = props.api.event.on("session.created", refreshDescendants);
    const stopMessageUpdates = props.api.event.on("message.updated", refreshDescendants);
    const stopPartUpdates = props.api.event.on("message.part.updated", refreshDescendants);
    onCleanup(() => {
      stopSessionUpdates();
      stopSessionCreated();
      stopMessageUpdates();
      stopPartUpdates();
      active = false;
      descendants.dispose();
      advisorDebug("view.unmount", { id, sessionID });
    });
  });

  return (
    <Show when={groups().length > 0}>
      <box>
        <text fg={theme().text}>
          <b>Advisor</b> (loaded)
        </text>
        <For each={groups()}>{(group) => <Metrics group={group} cost={costs()[group.key]} muted={theme().textMuted} />}</For>
      </box>
    </Show>
  );
}

const tui: TuiPlugin = async (api) => {
  advisorDebug("plugin.load", { appVersion: api.app.version, stateReady: api.state.ready });
  api.slots.register({
    order: 300,
    slots: {
      sidebar_content(_ctx, props) {
        return <View api={api} sessionID={props.session_id} />;
      }
    }
  });
};

const plugin: TuiPluginModule & { id: string } = { id: "advisor-tui", tui };

export default plugin;
