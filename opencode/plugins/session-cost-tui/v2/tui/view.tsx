/** @jsxImportSource @opentui/solid */
import type { Context } from "@opencode-ai/plugin/tui/plugin";
import { createEffect, createSignal, For, Match, onCleanup, Switch } from "solid-js";

import { createCostLifecycle } from "./lifecycle.js";
import type { CostEstimate } from "./pricing.js";
import { catalogRenderState } from "./render-state.js";

export function View(props: { context: Context; sessionID: () => string }) {
  const [estimate, setEstimate] = createSignal<CostEstimate>();
  const [error, setError] = createSignal<string>();
  const lifecycle = createCostLifecycle({
    context: props.context,
    sessionID: props.sessionID,
    setEstimate,
    setError
  });
  createEffect(() => lifecycle.refresh(props.sessionID()));
  onCleanup(lifecycle.cleanup);

  const total = () => estimate()?.costs.reduce((sum, item) => sum + item.amount, 0) ?? 0;
  return (
    <box>
      <text fg={props.context.theme.text.default}><b>Session cost</b> (API estimate)</text>
      <Switch>
        <Match when={catalogRenderState(estimate(), error()).type === "loading"}>
          <text fg={props.context.theme.text.subdued}>Loading...</text>
        </Match>
        <Match when={catalogRenderState(estimate(), error()).type === "error"}>
          <text fg={props.context.theme.text.feedback.error.default}>Unavailable: {error()}</text>
        </Match>
        <Match when={estimate()}>
          {(value) => (
          <>
            <For each={value().costs}>
              {(item) => <text fg={props.context.theme.text.subdued}>{item.model}: ${item.amount.toFixed(3)}</text>}
            </For>
            <text fg={props.context.theme.text.subdued}>Total: ${total().toFixed(3)}</text>
          </>
          )}
        </Match>
      </Switch>
    </box>
  );
}
