/** @jsxImportSource @opentui/solid */
import type { TuiPlugin, TuiPluginApi, TuiPluginModule } from "@opencode-ai/plugin/tui";
import { createEffect, createMemo, createSignal, onCleanup, onMount, Show } from "solid-js";

import { advisorDebug, advisorDebugEnabled } from "./debug.js";
import { advisorCalls, advisorMetrics, loadAdvisorHistory, type AdvisorMetrics, type AdvisorToolPart, type SessionMessagesClient } from "./metrics.js";
import { advisorCost, type AdvisorCost } from "./pricing.js";

let invocation = 0;

const compactTokens = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

function Metrics(props: { metrics: AdvisorMetrics; cost?: AdvisorCost; muted: TuiPluginApi["theme"]["current"]["textMuted"] }) {
  const tokens = (value: number) => compactTokens.format(value);
  const formattedCost = () => props.cost && `$${props.cost.amount.toFixed(props.cost.amount < 1 ? 3 : 2)}`;
  return (
    <box>
      <text fg={props.muted}>Calls: {props.metrics.calls}</text>
      <text fg={props.muted}>Input: {tokens(props.metrics.input)} ({tokens(props.metrics.cacheRead)} cached)</text>
      <text fg={props.muted}>Output: {tokens(props.metrics.output)}</text>
      <text fg={props.muted}>Reasoning: {tokens(props.metrics.reasoning)}</text>
      <Show when={props.metrics.cacheRate !== undefined}>
        <text fg={props.muted}>Cache rate: {(props.metrics.cacheRate! * 100).toFixed(1)}%</text>
      </Show>
      <text fg={props.muted}>Total: {tokens(props.metrics.total)}</text>
      <Show when={formattedCost()}>
        <text fg={props.muted}>
          Cost: {formattedCost()}
          <Show when={props.cost!.pricedCalls < props.cost!.totalCalls}> ({props.cost!.pricedCalls}/{props.cost!.totalCalls} priced)</Show>
        </text>
      </Show>
    </box>
  );
}

function View(props: { api: TuiPluginApi; sessionID: string }) {
  const theme = () => props.api.theme.current;
  const parts = createMemo(
    () => props.api.state.session.messages(props.sessionID).flatMap((message) => props.api.state.part(message.id)) as AdvisorToolPart[]
  );
  const metrics = createMemo(() => advisorMetrics(parts()));
  const modelLabel = createMemo(() => {
    const model = [...advisorCalls(parts())].reverse().find((call) => call.model.modelID)?.model;
    return model?.modelID ? `${model.modelID}${model.variant ? ` @ ${model.variant}` : ""}` : undefined;
  });
  const [cost, setCost] = createSignal<AdvisorCost>();

  createEffect(() => {
    const calls = advisorCalls(parts());
    if (calls.length === 0) return setCost();
    let active = true;
    advisorDebug("pricing.start", { sessionID: props.sessionID, calls: calls.length });
    void advisorCost(calls).then(
      (value) => {
        if (!active) return;
        setCost(value);
        advisorDebug("pricing.complete", { sessionID: props.sessionID, pricedCalls: value.pricedCalls, totalCalls: value.totalCalls });
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
    onCleanup(() => advisorDebug("view.unmount", { id, sessionID }));
  });

  return (
    <Show when={metrics().calls > 0}>
      <box>
        <text fg={theme().text}>
          <b>Advisor</b>
          <Show when={cost()?.latestModel ?? modelLabel()}> - {cost()?.latestModel ?? modelLabel()}</Show> (loaded)
        </text>
        <Metrics metrics={metrics()} cost={cost()} muted={theme().textMuted} />
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
