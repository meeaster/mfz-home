/** @jsxImportSource @opentui/solid */
import type { TuiPlugin, TuiPluginApi, TuiPluginModule } from "@opencode-ai/plugin/tui";
import { createSignal, For, onCleanup, onMount, Show } from "solid-js";

type Rates = { input?: number; output?: number; cache_read?: number; cache_write?: number };
type Model = {
  name?: string;
  cost?: Rates;
  tiers?: Array<{ tier?: { type?: string; size?: number }; input?: number; output?: number; cache_read?: number; cache_write?: number }>;
  experimental?: { modes?: Record<string, { cost?: Rates }> };
};
type Catalog = Record<string, { models?: Record<string, Model> }>;
type AssistantMessage = {
  role: "assistant";
  providerID: string;
  modelID: string;
  variant?: string;
  time: { completed?: number };
  tokens: { input: number; output: number; reasoning: number; cache: { read: number; write: number } };
};
type MessageEntry = { info?: AssistantMessage };
type SessionClient = {
  session: {
    children(input: { sessionID: string }): Promise<{ data?: Array<{ id: string }> }>;
    messages(input: { sessionID: string; limit: number }): Promise<{ data?: MessageEntry[] }>;
  };
};
type Cost = { model: string; amount: number };

let catalog: Promise<Catalog> | undefined;

function models(): Promise<Catalog> {
  catalog ??= fetch("https://models.dev/api.json").then(async (response) => {
    if (!response.ok) throw new Error(`models.dev returned ${response.status}`);
    return (await response.json()) as Catalog;
  });
  return catalog;
}

function ratesFor(model: Model, variant: string | undefined, tokens: AssistantMessage["tokens"]): Rates | undefined {
  const prompt = tokens.input + tokens.cache.read + tokens.cache.write;
  const tier = model.tiers?.find((entry) => entry.tier?.type === "context" && prompt > (entry.tier?.size ?? 0));
  return tier ?? model.experimental?.modes?.[variant ?? ""]?.cost ?? model.cost;
}

function price(tokens: AssistantMessage["tokens"], rates: Rates): number {
  return (
    (tokens.input * (rates.input ?? 0) +
      (tokens.output + tokens.reasoning) * (rates.output ?? 0) +
      tokens.cache.read * (rates.cache_read ?? 0) +
      tokens.cache.write * (rates.cache_write ?? 0)) /
    1_000_000
  );
}

async function descendants(client: SessionClient, sessionID: string): Promise<string[]> {
  const ids = [sessionID];
  for (const id of ids) {
    const children = await client.session.children({ sessionID: id });
    for (const child of children.data ?? []) if (!ids.includes(child.id)) ids.push(child.id);
  }
  return ids;
}

async function estimate(client: SessionClient, sessionID: string): Promise<Cost[]> {
  const [catalog, ids] = await Promise.all([models(), descendants(client, sessionID)]);
  const messages = (await Promise.all(ids.map((id) => client.session.messages({ sessionID: id, limit: 1_000 })))).flatMap((result) => result.data ?? []);
  const costs = new Map<string, Cost>();

  for (const message of messages) {
    const assistant = message.info;
    if (!assistant || assistant.role !== "assistant" || assistant.providerID !== "openai" || !assistant.time?.completed || !assistant.modelID || !assistant.tokens) continue;
    const model = catalog.openai?.models?.[assistant.modelID];
    const rates = model && ratesFor(model, assistant.variant, assistant.tokens);
    if (!rates) continue;
    const key = `${assistant.modelID}${assistant.variant ? ` @ ${assistant.variant}` : ""}`;
    const item = costs.get(key) ?? { model: `${model.name ?? assistant.modelID}${assistant.variant ? ` @ ${assistant.variant}` : ""}`, amount: 0 };
    item.amount += price(assistant.tokens, rates);
    costs.set(key, item);
  }
  return [...costs.values()].sort((left, right) => right.amount - left.amount);
}

function View(props: { api: TuiPluginApi; sessionID: string }) {
  const [costs, setCosts] = createSignal<Cost[]>();
  const [error, setError] = createSignal<string>();

  onMount(() => {
    let active = true;
    let generation = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const current = ++generation;
        setError();
        void estimate(props.api.client as unknown as SessionClient, props.sessionID).then(
          (value) => active && current === generation && setCosts(value),
          (reason: unknown) => active && current === generation && setError(String(reason))
        );
      }, 150);
    };
    const unlistenMessage = props.api.event.on("message.updated", (event) => {
      const info = event.properties.info;
      if (info.role === "assistant" && info.providerID === "openai" && info.time.completed) refresh();
    });
    const unlistenCreated = props.api.event.on("session.created", refresh);
    const unlistenDeleted = props.api.event.on("session.deleted", refresh);
    refresh();
    onCleanup(() => {
      active = false;
      if (timer) clearTimeout(timer);
      unlistenMessage();
      unlistenCreated();
      unlistenDeleted();
    });
  });

  const total = () => costs()?.reduce((sum, item) => sum + item.amount, 0) ?? 0;
  return (
    <box>
      <text fg={props.api.theme.current.text}>
        <b>Session cost</b> (API estimate)
      </text>
      <Show when={costs()} fallback={<text fg={props.api.theme.current.textMuted}>Loading...</text>}>
        <For each={costs()}>{(item) => <text fg={props.api.theme.current.textMuted}>{item.model}: ${item.amount.toFixed(3)}</text>}</For>
        <text fg={props.api.theme.current.textMuted}>Total: ${total().toFixed(3)}</text>
      </Show>
      <Show when={error()}><text fg={props.api.theme.current.error}>Unavailable: {error()}</text></Show>
    </box>
  );
}

const tui: TuiPlugin = async (api) => {
  api.slots.register({
    order: 310,
    slots: { sidebar_content: (_ctx, props) => <View api={api} sessionID={props.session_id} /> }
  });
};

const plugin: TuiPluginModule & { id: string } = { id: "session-cost-tui", tui };

export default plugin;
