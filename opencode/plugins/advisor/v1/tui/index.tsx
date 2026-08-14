/** @jsxImportSource @opentui/solid */
import type { TuiPlugin, TuiPluginApi, TuiPluginModule } from "@opencode-ai/plugin/tui";
import { createEffect, createMemo, createSignal, For, onCleanup, onMount, Show } from "solid-js";

import { advisorDebug, advisorDebugEnabled } from "./debug.js";
import {
  advisorMetricGroups,
  advisorPanelRows,
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
import { resolveAdvisorTargets, targetLabel } from "../targets.js";
import {
  advisorSynchronizationState,
  createFileAdvisorContinuationStore,
  createFileAdvisorSettingsStore,
  createFileAdvisorModeStore,
  resolveInheritedAdvisorMode,
  type AdvisorMode,
  type AdvisorSynchronizationState,
} from "../state.js";
import { planAdvisorTranscript, type MessageEntry } from "../transcript.js";
import {
  advisorModePickerOptions,
  createAdvisorModePickerActions,
  createAdvisorModePickerBindingController,
  type AdvisorModePickerInitial,
} from "./mode-picker.js";

let invocation = 0;
const [modeRevision, setModeRevision] = createSignal(0);

const compactTokens = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

type AdvisorSyncRow = {
  target: string;
  state: AdvisorSynchronizationState;
  estimatedTokens: number;
};

type AdvisorSessionState = {
  mode: AdvisorMode;
  defaultMode: AdvisorMode;
  explicit: boolean;
  rows: AdvisorSyncRow[];
};

function notifyModeChanged(): void {
  setModeRevision((value) => value + 1);
}

function activeSessionID(api: TuiPluginApi): string | undefined {
  const route = api.route.current;
  return route.name === "session" && route.params && typeof route.params.sessionID === "string"
    ? route.params.sessionID
    : undefined;
}

type AdvisorSessionClient = {
  session: {
    get(input: { path: { id: string }; query?: { directory?: string } }): Promise<{
      data?: { parentID?: string };
    }>;
  };
};

function sessionAdvisorMode(
  api: TuiPluginApi,
  modeStore: ReturnType<typeof createFileAdvisorModeStore>,
  settingsStore: ReturnType<typeof createFileAdvisorSettingsStore>,
  sessionID: string,
) {
  const client = api.client as unknown as AdvisorSessionClient;
  return resolveInheritedAdvisorMode({
    modeStore,
    settingsStore,
    directory: api.state.path.directory,
    sessionID,
    parentID: async (currentSessionID) => {
      const result = await client.session.get({
        path: { id: currentSessionID },
        query: { directory: api.state.path.directory },
      });
      return result.data?.parentID;
    },
  });
}

function AdvisorModePicker(props: {
  api: TuiPluginApi;
  modeSessionID: string;
  modeStore: ReturnType<typeof createFileAdvisorModeStore>;
  settingsStore: ReturnType<typeof createFileAdvisorSettingsStore>;
  initial: AdvisorModePickerInitial;
  onDefaultAction: (action: (() => Promise<void>) | undefined) => void;
}) {
  const [current, setCurrent] = createSignal(props.initial.mode);
  const [defaultMode, setDefaultMode] = createSignal(props.initial.defaultMode);

  const actions = createAdvisorModePickerActions({
    initial: props.initial,
    saveSession: (mode) => props.modeStore.save({ directory: props.api.state.path.directory, sessionID: props.modeSessionID, mode }),
    saveDefault: (mode) => props.settingsStore.save(mode),
    onCurrentChange: (mode) => setCurrent(mode),
    onDefaultChange: (mode) => setDefaultMode(mode),
    onChanged: notifyModeChanged,
    onClose: () => props.api.ui.dialog.clear(),
  });

  props.onDefaultAction(async () => {
    try {
      await actions.setDefault();
      props.api.ui.toast({ title: "Advisor", message: `Global default set to ${actions.highlighted()}.`, variant: "success" });
    } catch (error) {
      props.api.ui.toast({ title: "Advisor", message: `Could not save global default: ${String(error)}`, variant: "error" });
    }
  });

  onCleanup(() => props.onDefaultAction(undefined));

  return (
    <props.api.ui.DialogSelect
      title="Advisor mode"
      options={advisorModePickerOptions(current(), defaultMode())}
      current={current()}
      onMove={(option) => actions.move(option.value)}
      onSelect={async (option) => {
        try {
          await actions.select(option.value);
          props.api.ui.toast({ title: "Advisor", message: `Session mode set to ${option.value}.`, variant: "success" });
        } catch (error) {
          props.api.ui.toast({ title: "Advisor", message: `Could not save session mode: ${String(error)}`, variant: "error" });
        }
      }}
      skipFilter
    />
  );
}

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
  const [sync, setSync] = createSignal<AdvisorSessionState>({ mode: "on", defaultMode: "on", explicit: false, rows: [] });
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
  const synchronization = createRefreshScheduler(async () => {
    try {
      const modeStore = createFileAdvisorModeStore();
      const settingsStore = createFileAdvisorSettingsStore();
      const continuationStore = createFileAdvisorContinuationStore();
      const directory = props.api.state.path.directory;
      modeRevision();
      const resolution = await sessionAdvisorMode(props.api, modeStore, settingsStore, props.sessionID);
      const records = await continuationStore.list({ directory, parentSessionID: props.sessionID });
      let messages = props.api.state.session.messages(props.sessionID).map((message) => ({
        info: message,
        parts: props.api.state.part(message.id) as unknown as Array<Record<string, unknown>>,
      })) as unknown as MessageEntry[];
      const localIDs = new Set(messages.flatMap((message) => (message.info?.id ? [message.info.id] : [])));
      if (records.some((record) => record.continuation.cursor && !localIDs.has(record.continuation.cursor))) {
        const history = await loadAdvisorHistory(props.api.client as SessionMessagesClient, props.sessionID);
        messages = history.messages as unknown as MessageEntry[];
      }
      const rows = resolveAdvisorTargets().map((target) => {
        const record = records.find((candidate) => candidate.target === targetLabel(target));
        const plan = planAdvisorTranscript(messages, record?.continuation);
        return {
          target: targetLabel(target),
          state: advisorSynchronizationState(plan, record?.continuation),
          estimatedTokens: plan.estimatedTokens,
        };
      });
      setSync({ mode: resolution.mode, defaultMode: resolution.defaultMode, explicit: resolution.explicit, rows });
    } catch (error) {
      advisorDebug("synchronization.error", { sessionID: props.sessionID, error: String(error) });
    }
  });
  const refreshSynchronization = () => synchronization.schedule();

  createEffect(() => {
    props.api.state.session.messages(props.sessionID);
    modeRevision();
    refreshDescendants();
    refreshSynchronization();
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
    const stopMessageSync = props.api.event.on("message.updated", refreshSynchronization);
    const stopPartSync = props.api.event.on("message.part.updated", refreshSynchronization);
    onCleanup(() => {
      stopSessionUpdates();
      stopSessionCreated();
      stopMessageUpdates();
      stopPartUpdates();
      stopMessageSync();
      stopPartSync();
      active = false;
      descendants.dispose();
      synchronization.dispose();
      advisorDebug("view.unmount", { id, sessionID });
    });
  });

  return (
    <box>
      <text fg={theme().text}>
        <b>Advisor</b> · {sync().mode}
      </text>
      <For each={advisorPanelRows(sync().rows)}>{(row) => <text fg={theme().textMuted}>{row}</text>}</For>
      <Show when={groups().length > 0}>
        <box height={1} />
        <For each={groups()}>{(group) => <Metrics group={group} cost={costs()[group.key]} muted={theme().textMuted} />}</For>
      </Show>
    </box>
  );
}

const tui: TuiPlugin = async (api) => {
  advisorDebug("plugin.load", { appVersion: api.app.version, stateReady: api.state.ready });
  const modeStore = createFileAdvisorModeStore();
  const settingsStore = createFileAdvisorSettingsStore();
  let activeDefaultAction: (() => Promise<void>) | undefined;
  const pickerBindings = createAdvisorModePickerBindingController(
    (layer) => api.keymap.registerLayer(layer),
    () => activeDefaultAction?.(),
  );

  const openModePicker = async () => {
    const sessionID = activeSessionID(api);
    if (!sessionID) {
      api.ui.toast({ title: "Advisor", message: "Open an advisor session first.", variant: "info" });
      return;
    }

    const initial = await sessionAdvisorMode(api, modeStore, settingsStore, sessionID);
    const close = () => {
      pickerBindings.close();
      activeDefaultAction = undefined;
      notifyModeChanged();
    };

    api.ui.dialog.replace(
      () => (
        <AdvisorModePicker
          api={api}
          modeSessionID={initial.modeSessionID}
          modeStore={modeStore}
          settingsStore={settingsStore}
          initial={initial}
          onDefaultAction={(action) => (activeDefaultAction = action)}
        />
      ),
      close,
    );
    pickerBindings.open();
  };

  const unregisterKeymap = api.keymap.registerLayer({
    commands: [
      {
        namespace: "palette",
        name: "advisor.mode.change",
        title: "Advisor: Change mode",
        desc: "Choose the current session mode or global default",
        category: "Advisor",
        run: () => void openModePicker(),
      },
    ],
    bindings: [
      { key: "<leader>v", cmd: "advisor.mode.change", desc: "Advisor: Change mode" },
    ],
  });
  api.lifecycle.onDispose(() => {
    pickerBindings.close();
    unregisterKeymap();
    activeDefaultAction = undefined;
  });

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
