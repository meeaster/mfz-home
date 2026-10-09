import type { ChatStatus } from "./status.js"

/** The columns a sidebar line has before it wraps: OpenCode's 42-column sidebar less its padding. */
export const WIDTH = 37

/** Cuts text to `width` columns, ending in "…" when it is cut. */
export const fit = (text: string, width = WIDTH): string => (text.length <= width ? text : `${text.slice(0, Math.max(0, width - 1))}…`)

/** A byte count in at most five characters: 812, 41.2k, 128k, 1.2M. */
export const size = (count: number): string => {
  if (count < 1_000) return String(count)

  if (count < 99_950) return `${(count / 1_000).toFixed(1)}k`

  if (count < 999_500) return `${Math.round(count / 1_000)}k`

  return `${(count / 1_000_000).toFixed(1)}M`
}

/** The view's size against the size it merges at, then its line count, or that it's merging. */
export const viewLine = (status: ChatStatus): string => {
  const limit = status.high === undefined ? "" : ` / ${size(status.high)}`
  const lines = status.merging ? "merging" : `${status.lines.toLocaleString("en-US")} ${status.lines === 1 ? "line" : "lines"}`

  return fit(`View ${size(status.size)}${limit} · ${lines}`)
}

export const pendingLine = ({ pending }: ChatStatus): string =>
  pending === 0 ? "No summaries pending" : `${pending.toLocaleString("en-US")} ${pending === 1 ? "summary" : "summaries"} pending`
