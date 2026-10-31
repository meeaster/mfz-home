import { appendFileSync, mkdirSync, readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { z } from "zod"
import { Kind } from "./store.js"

export const SubagentMeta = z.object({ sessionID: z.string(), agent: z.string(), title: z.string() })

export const SubagentEntry = z.object({ kind: Kind, text: z.string(), source: z.string() })

export type AgentEntry = z.infer<typeof SubagentEntry>

interface AgentLog {
  readonly meta: z.infer<typeof SubagentMeta>
  readonly entries: AgentEntry[]
  readonly sources: Set<string>
}

const LIMIT = 30_000

/** Each subagent's own steps, kept out of the main chat; the first line of each file names the agent. */
export class SubagentLogs {
  readonly #directory: string
  readonly #logs = new Map<string, AgentLog>()

  constructor(directory: string) {
    this.#directory = directory
    mkdirSync(directory, { recursive: true })

    for (const file of readdirSync(directory).filter((name) => name.endsWith(".jsonl"))) {
      const [head, ...rest] = readFileSync(join(directory, file), "utf8").split("\n").filter((line) => line !== "")
      const meta = SubagentMeta.safeParse(JSON.parse(head ?? "null"))

      if (!meta.success) continue

      const entries = rest.flatMap((line) => {
        const entry = SubagentEntry.safeParse(JSON.parse(line))

        return entry.success ? [entry.data] : []
      })

      this.#logs.set(meta.data.sessionID, { meta: meta.data, entries, sources: new Set(entries.map((entry) => entry.source)) })
    }
  }

  register(sessionID: string, agent: string, title: string): void {
    if (this.#logs.has(sessionID)) return

    const meta = { sessionID, agent, title }

    appendFileSync(this.#path(sessionID), `${JSON.stringify(meta)}\n`)
    this.#logs.set(sessionID, { meta, entries: [], sources: new Set() })
  }

  append(sessionID: string, entry: AgentEntry): void {
    const log = this.#logs.get(sessionID)

    if (log === undefined || log.sources.has(entry.source)) return

    appendFileSync(this.#path(sessionID), `${JSON.stringify(entry)}\n`)
    log.entries.push(entry)
    log.sources.add(entry.source)
  }

  label(sessionID: string): string | undefined {
    const log = this.#logs.get(sessionID)

    return log === undefined ? undefined : `${log.meta.agent}: ${log.meta.title}`
  }

  /** An agent's whole chat, found by session ID, task title or agent name (most recent match wins). */
  render(name: string): string {
    const wanted = name.trim().toLowerCase()
    const logs = [...this.#logs.values()]

    const match =
      this.#logs.get(name.trim()) ??
      logs.findLast((log) => log.meta.title.toLowerCase() === wanted) ??
      logs.findLast((log) => log.meta.agent.toLowerCase() === wanted) ??
      logs.findLast((log) => `${log.meta.agent}: ${log.meta.title}`.toLowerCase() === wanted)

    if (match === undefined) {
      const known = logs.map((log) => `${log.meta.agent}: ${log.meta.title} (${log.meta.sessionID})`).join("; ")

      return `zoom: no agent named "${name}". Known agents: ${known === "" ? "none" : known}`
    }

    const text = match.entries.map((entry) => `${entry.kind}: ${entry.text}`).join("\n")
    const body = text.length <= LIMIT ? text : `${text.slice(0, LIMIT / 2)}\n[… ${text.length - LIMIT} characters clipped …]\n${text.slice(-LIMIT / 2)}`

    return `[${match.meta.agent}: ${match.meta.title}] (${match.meta.sessionID})\n${body}`
  }

  #path(sessionID: string): string {
    return join(this.#directory, `${sessionID.replaceAll(/[^A-Za-z0-9_-]/g, "_")}.jsonl`)
  }
}

