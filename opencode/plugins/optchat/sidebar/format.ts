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

/**
 * The summary calls the chat has made and their estimated cost, or undefined before the first is logged. The cost is
 * marked "~" because it's estimated from bytes, and "+" when some calls' model had no price.
 */
export const summariesLine = ({ summaries }: ChatStatus): string | undefined => {
  if (summaries.calls === 0) return undefined

  const calls = `Summaries ${summaries.calls.toLocaleString("en-US")} ${summaries.calls === 1 ? "call" : "calls"}`

  if (summaries.unpriced === summaries.calls) return fit(calls)

  const cost = summaries.cost < 0.01 ? "<$0.01" : `~$${summaries.cost.toFixed(2)}`

  return fit(`${calls} · ${cost}${summaries.unpriced > 0 ? "+" : ""}`)
}

/** A duration in at most five characters: 850ms, 4.2s, 38s, 12m, 3.4h. */
export const duration = (ms: number): string => {
  if (ms < 1_000) return `${Math.round(ms)}ms`

  if (ms < 9_950) return `${(ms / 1_000).toFixed(1)}s`

  if (ms < 59_500) return `${Math.round(ms / 1_000)}s`

  if (ms < 3_570_000) return `${Math.round(ms / 60_000)}m`

  return `${(ms / 3_600_000).toFixed(1)}h`
}

/** How long a summary call takes on average, and the time all of them took, or undefined before the first. */
export const summaryTimeLine = ({ summaries }: ChatStatus): string | undefined =>
  summaries.calls === 0 ? undefined : fit(`Avg ${duration(summaries.ms / summaries.calls)} a call · ${duration(summaries.ms)} total`)
