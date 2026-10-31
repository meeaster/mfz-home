/** @jsxImportSource @opentui/solid */
// The OptChat box in the session sidebar: which chat this is, how full its view is, how many summaries are pending,
// and what the summaries have cost and how long they take.
// OpenCode loads it as this server plugin's TUI part, without the plugin's options, so it reads the default data
// directory.

import type { Context, Definition } from "@opencode/plugin/tui/plugin"
import { createSignal, onCleanup, Show } from "solid-js"
import { defaultDataDir } from "../store.js"
import { fit, pendingLine, summariesLine, summaryTimeLine, viewLine } from "./format.js"
import { type ChatStatus, StatusReader } from "./status.js"

// The view and summaries change in the background, after the turn's events, so the box rereads on a timer.
const POLL = 2_000

function Sidebar(props: { context: Context; sessionID: () => string; reader: StatusReader }) {
  const theme = props.context.theme
  const [status, setStatus] = createSignal<ChatStatus>()
  const optchat = () => props.context.data.session.get(props.sessionID())?.agent === "optchat"
  const refresh = () => setStatus(optchat() ? props.reader.read(props.sessionID()) : undefined)
  const timer = setInterval(refresh, POLL)

  refresh()
  onCleanup(() => clearInterval(timer))

  const line = (text: () => string, color = theme.text.muted) => <text fg={color} wrapMode="none">{text()}</text>

  return (
    <Show when={optchat() && status()}>
      {(value) => (
        <box>
          <text fg={theme.text.base}><b>OptChat</b></text>
          {line(() => fit(value().name ?? "(unnamed)"), theme.text.base)}
          {line(() => value().id)}
          {line(() => viewLine(value()))}
          {line(() => pendingLine(value()))}
          <Show when={summariesLine(value())}>{(text) => line(text)}</Show>
          <Show when={summaryTimeLine(value())}>{(text) => line(text)}</Show>
        </box>
      )}
    </Show>
  )
}

const plugin = {
  id: "optchat-sidebar",
  setup(context) {
    const reader = new StatusReader(defaultDataDir())

    return context.ui.slot({
      append: "sidebar.content",
      render: (input) => <Sidebar context={context} sessionID={() => input.sessionID} reader={reader} />,
    })
  },
} satisfies Definition

export default plugin
