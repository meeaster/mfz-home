/** @jsxImportSource @opentui/solid */
import type { Context } from "@opencode/plugin/tui/plugin";
import { createEffect, createMemo, createSignal, For, Match, onCleanup, Show, Switch } from "solid-js";

import { cacheLine, costLine, fit, lastStepLine, share, subagentLine, tokens, totalLine, WIDTH } from "./format.js";
import { createCostLifecycle, type UsageEstimate } from "./lifecycle.js";
import type { ModelAliases } from "./models.js";
import { catalogRenderState } from "./render-state.js";
import type { ContextUsage } from "./usage.js";

export function View(props: { context: Context; sessionID: () => string; modelAliases: ModelAliases; warnAt: number }) {
  const [estimate, setEstimate] = createSignal<UsageEstimate>();
  const [error, setError] = createSignal<string>();
  const data = props.context.data;
  const theme = props.context.theme;

  const lifecycle = createCostLifecycle({
    context: props.context,
    sessionID: props.sessionID,
    modelAliases: props.modelAliases,
    setEstimate,
    setError
  });

  createEffect(() => lifecycle.refresh(props.sessionID()));
  onCleanup(lifecycle.cleanup);

  const selected = () => estimate()?.sessions[props.sessionID()];

  // The family's other sessions that are working now: the selected session's subagents, or its parent and siblings.
  const running = createMemo(() => data.session.family(props.sessionID()).filter((id) => (
    id !== props.sessionID() && data.session.status(id) === "running"
  )));

  const limit = (sessionID: string, context: ContextUsage) => data.location.model
    .list(data.session.get(sessionID)?.location)
    ?.find((model) => model.providerID === context.providerID && model.id === context.modelID)
    ?.limit.context;

  const size = (count: number) => (
    <span style={{ fg: count > props.warnAt ? theme.text.feedback.warning.base : theme.text.muted }}>{tokens(count)}</span>
  );

  // Takes the text as a function so the line follows the estimate as it refreshes.
  const line = (text: () => string, color = theme.text.muted) => <text fg={color} wrapMode="none">{text()}</text>;

  return (
    <box gap={1}>
      <box>
        <text fg={theme.text.base}><b>Usage</b></text>
        <Switch>
          <Match when={catalogRenderState(estimate(), error()).type === "loading"}>{line(() => "Loading...")}</Match>
          <Match when={catalogRenderState(estimate(), error()).type === "error"}>
            {line(() => fit(`Unavailable: ${error()}`, WIDTH), theme.text.feedback.error.base)}
          </Match>
          <Match when={estimate()}>
            {(value) => (
              <>
                <Show when={selected()?.context}>
                  {(context) => (
                    <text fg={theme.text.muted} wrapMode="none">
                      {size(context().tokens)} tokens{share(context().tokens, limit(props.sessionID(), context()))}
                    </text>
                  )}
                </Show>
                <Show when={selected()?.input}>{(input) => line(() => cacheLine(input()))}</Show>
                <Show when={selected()?.lastStep}>
                  {(step) => <Show when={lastStepLine(step())}>{(text) => line(text)}</Show>}
                </Show>
                <For each={value().costs}>{(cost) => line(() => costLine(cost))}</For>
                {line(() => totalLine(value().costs), theme.text.base)}
              </>
            )}
          </Match>
        </Switch>
      </box>
      <Show when={running().length > 0}>
        <box>
          <text fg={theme.text.base}><b>Running</b></text>
          <For each={running()}>
            {(id) => {
              const usage = () => estimate()?.sessions[id];

              return (
                <>
                  {line(() => fit(data.session.get(id)?.title ?? id, WIDTH), theme.text.base)}
                  <Show when={usage()?.context}>
                    {(context) => {
                      const parts = () => subagentLine(context(), limit(id, context()), usage()?.cost ?? 0);

                      return <text fg={theme.text.muted} wrapMode="none">{parts().model}{size(context().tokens)}{parts().rest}</text>;
                    }}
                  </Show>
                  <Show when={usage()?.input}>{(input) => line(() => cacheLine(input()))}</Show>
                </>
              );
            }}
          </For>
        </box>
      </Show>
    </box>
  );
}
