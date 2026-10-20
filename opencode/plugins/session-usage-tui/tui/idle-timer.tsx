/** @jsxImportSource @opentui/solid */
import type { Context } from "@opencode/plugin/tui/plugin";
import { createMemo, createSignal, onCleanup, Show } from "solid-js";

import type { ModelLifetime } from "./cache-lifetime.js";
import { idleStatus, idleThresholds, lastStep, type IdleLevel, type IdleThresholds } from "./idle.js";
import type { ModelAliases } from "./models.js";
import { loadCatalog, resumeCost, type Catalog } from "./pricing.js";

/**
 * How long the session has been idle since its latest completed step, shown only while it isn't running, colored by
 * the learned prompt-cache lifetime of the model that step used. Once the cache has likely expired, it adds what
 * resuming would cost to read the session's context back uncached.
 */
export function IdleTimer(props: {
  context: Context;
  sessionID: () => string | undefined;
  thresholds: IdleThresholds;
  lifetimes: () => Record<string, ModelLifetime>;
  modelAliases: ModelAliases;
}) {
  const data = props.context.data;
  const theme = props.context.theme;
  const [now, setNow] = createSignal(Date.now());
  const timer = setInterval(() => setNow(Date.now()), 1_000);

  onCleanup(() => clearInterval(timer));

  const [catalog, setCatalog] = createSignal<Catalog>();

  // Without a catalog the timer shows no cost; the sidebar reports why pricing is unavailable.
  loadCatalog().then(setCatalog, () => undefined);

  // The host keeps the open session's latest messages synced, so this reads no transcript of its own.
  const last = createMemo(() => {
    const id = props.sessionID();

    if (id === undefined || data.session.status(id) === "running") return undefined;

    return lastStep(data.session.message.list(id), data.session.get(id)?.revert?.messageID);
  });

  const thresholds = createMemo(() => {
    const model = last()?.model;

    return idleThresholds(model && props.lifetimes()[`${model.providerID}/${model.modelID}`]?.lifetime, props.thresholds);
  });

  const resume = createMemo(() => {
    const usage = last()?.usage;
    const prices = catalog();

    return usage && prices ? resumeCost(usage, prices, props.modelAliases) : undefined;
  });

  const color = (level: IdleLevel) => {
    if (level === "expired") return theme.text.feedback.error.base;

    if (level === "warning") return theme.text.feedback.warning.base;

    return theme.text.muted;
  };

  return (
    <Show when={last()}>
      {(step) => {
        const status = () => idleStatus((now() - step().completed) / 1_000, thresholds(), step().model, props.context.ui.model.current(), resume());

        return (
          <box flexShrink={0} marginLeft={1}>
            <text fg={color(status().level)} wrapMode="none">{status().text}</text>
          </box>
        );
      }}
    </Show>
  );
}
