/** @jsxImportSource @opentui/solid */
import type { TuiPlugin, TuiPluginApi, TuiPluginModule } from "@opencode-ai/plugin/tui";
import { createSignal, For, onCleanup, onMount, Show } from "solid-js";

import { runMfz, type MfzRunner } from "../mfz.js";
import {
  compactStatus,
  inspectionLines,
  parseCheckpointsOutput,
  parseContextOutput,
  parseReceiptsOutput,
  receiptsForSession,
  type WorkContext,
  type WorkReceipt,
} from "./state.js";

type Status = { text?: string; error?: string };
type Inspection = {
  context?: WorkContext;
  receipts?: WorkReceipt[];
  checkpoints?: Array<{ created_at: string }>;
  error?: string;
};

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function activeSessionID(api: TuiPluginApi): string | undefined {
  const route = api.route.current;
  return route.name === "session" && typeof route.params?.sessionID === "string" ? route.params.sessionID : undefined;
}

export async function loadStatus(runner: MfzRunner, sessionID: string): Promise<Status> {
  try {
    const context = parseContextOutput(await runner(["work", "context", "--session", `opencode:${sessionID}`, "--json"]));
    return { text: compactStatus(context) };
  } catch (error) {
    return { error: errorText(error) };
  }
}

export async function loadInspection(runner: MfzRunner, sessionID: string): Promise<Inspection> {
  let context: WorkContext;
  try {
    context = parseContextOutput(await runner(["work", "context", "--session", `opencode:${sessionID}`, "--json"]));
  } catch (error) {
    return { error: errorText(error) };
  }
  if (!context.bound) return { context };

  try {
    const [receipts, checkpoints] = await Promise.all([
      runner(["work", "receipts", context.unit.slug, "--json"]).then(parseReceiptsOutput),
      runner(["work", "checkpoints", context.unit.slug, "--json"]).then(parseCheckpointsOutput),
    ]);
    return {
      context,
      receipts: receiptsForSession(receipts, sessionID),
      checkpoints,
    };
  } catch (error) {
    return { context, error: errorText(error) };
  }
}

function StatusView(props: { api: TuiPluginApi; sessionID: string }) {
  const [status, setStatus] = createSignal<Status>({});
  let active = true;
  const refresh = () => void loadStatus(runMfz, props.sessionID).then((value) => active && setStatus(value));

  onMount(() => {
    refresh();
    const stopSession = props.api.event.on("session.updated", refresh);
    const stopMessage = props.api.event.on("message.updated", refresh);
    const stopPart = props.api.event.on("message.part.updated", refresh);
    onCleanup(() => {
      active = false;
      stopSession();
      stopMessage();
      stopPart();
    });
  });

  return (
    <Show when={status().text ?? status().error}>
      <text fg={status().error ? props.api.theme.current.error : props.api.theme.current.textMuted}>
        {status().text ?? `work-context unavailable`}
      </text>
    </Show>
  );
}

function InspectionDialog(props: { api: TuiPluginApi; inspection: Inspection }) {
  return (
    <props.api.ui.Dialog size="large" onClose={() => props.api.ui.dialog.clear()}>
      <box flexDirection="column">
        <text fg={props.api.theme.current.text}>
          <b>Work context</b>
        </text>
        <For each={inspectionLines(props.inspection)}>{(line) => <text fg={props.api.theme.current.textMuted}>{line}</text>}</For>
      </box>
    </props.api.ui.Dialog>
  );
}

const tui: TuiPlugin = async (api) => {
  const unregister = api.command?.register(() => [
    {
      title: "Work context: Inspect",
      value: "work-context.inspect",
      description: "Show the latest work-context delivery",
      category: "Work context",
      onSelect: async () => {
        const sessionID = activeSessionID(api);
        if (!sessionID) {
          api.ui.toast({ title: "Work context", message: "Open a session first.", variant: "info" });
          return;
        }
        const inspection = await loadInspection(runMfz, sessionID);
        api.ui.dialog.replace(() => <InspectionDialog api={api} inspection={inspection} />);
      },
    },
  ]);
  api.lifecycle.onDispose(() => unregister?.());
  api.slots.register({
    slots: {
      session_prompt_right(_context, props) {
        return <StatusView api={api} sessionID={props.session_id} />;
      },
    },
  });
};

const plugin: TuiPluginModule & { id: string } = { id: "work-context-tui", tui };

export default plugin;
