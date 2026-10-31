// Read-only access to the plugin's data directory for the viewer. The plugin may be appending while this reads,
// so a half-written last line is skipped rather than treated as an error.

import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { z } from "zod"
import { Registry } from "../chats.js"
import { MessageRecord, NodeRecord, ViewRecord } from "../store.js"
import { SubagentEntry, SubagentMeta } from "../subagent-logs.js"

const PREVIEW = 160

// Any kind is shown rather than dropped: a dropped line would shift every later message's position.
const LoggedMessage = MessageRecord.extend({ kind: z.string() })

const readJsonl = <Schema extends z.ZodType>(path: string, schema: Schema): z.infer<Schema>[] => {
  if (!existsSync(path)) return []

  const records: z.infer<Schema>[] = []

  for (const line of readFileSync(path, "utf8").split("\n")) {
    if (line.trim() === "") continue

    const record = parse(schema, line)

    if (record !== undefined) records.push(record)
  }

  return records
}

/** The record in `text`, or undefined if it is not valid JSON or doesn't match the schema. */
const parse = <Schema extends z.ZodType>(schema: Schema, text: string): z.infer<Schema> | undefined => {
  try {
    const parsed = schema.safeParse(JSON.parse(text))

    return parsed.success ? parsed.data : undefined
  } catch {
    return undefined
  }
}

const readRegistry = (dataDir: string): z.infer<typeof Registry> => {
  const path = join(dataDir, "chats.json")
  const registry = existsSync(path) ? parse(Registry, readFileSync(path, "utf8")) : undefined

  return registry ?? { chats: [], sessions: {} }
}

const chatDirectory = (dataDir: string, chatID: string): string | undefined => {
  // Chat IDs come from the URL; only names the registry wrote are accepted.
  if (!/^chat_[A-Za-z0-9]+$/.test(chatID)) return undefined

  const directory = join(dataDir, "chats", chatID)

  return existsSync(directory) ? directory : undefined
}

export interface ChatSummary {
  readonly id: string
  readonly name: string | null
  readonly messages: number
  readonly createdAt: string
  readonly lastActiveAt: string
  readonly directory: string
  readonly opening: string
}

/** Every chat in the registry, most recently active first. */
export const listChats = (dataDir: string): ChatSummary[] =>
  readRegistry(dataDir)
    .chats.map((chat) => {
      const directory = chatDirectory(dataDir, chat.id)
      const messages = directory === undefined ? 0 : readJsonl(join(directory, "main.jsonl"), LoggedMessage).length

      return { id: chat.id, name: chat.name ?? null, messages, createdAt: chat.createdAt, lastActiveAt: chat.lastActiveAt, directory: chat.directory, opening: chat.opening }
    })
    .toSorted((a, b) => b.lastActiveAt.localeCompare(a.lastActiveAt))

export interface ChatTree {
  readonly id: string
  readonly name: string | null
  readonly messages: readonly { readonly i: number; readonly kind: string; readonly size: number; readonly date: string; readonly preview: string }[]
  readonly nodes: readonly { readonly l: number; readonly i: number; readonly text: string }[]
  /** The view turns start from, and the smaller compaction view, as [level, index] pairs. */
  readonly view: readonly (readonly [number, number])[]
  readonly compaction: readonly (readonly [number, number])[]
  readonly subagents: readonly { readonly sessionID: string; readonly agent: string; readonly title: string; readonly entries: number }[]
}

/** A chat's messages (as previews), its summary tree and its current views. */
export const chatTree = (dataDir: string, chatID: string): ChatTree | undefined => {
  const directory = chatDirectory(dataDir, chatID)

  if (directory === undefined) return undefined

  const info = readRegistry(dataDir).chats.find((chat) => chat.id === chatID)

  const messages = readJsonl(join(directory, "main.jsonl"), LoggedMessage).map((message) => ({
    i: message.i,
    kind: message.kind,
    size: message.size,
    date: message.date,
    preview: message.text.replaceAll(/\s+/g, " ").slice(0, PREVIEW),
  }))

  const nodes = readJsonl(join(directory, "tree.jsonl"), NodeRecord).map((node) => ({ l: node.l, i: node.i, text: node.text }))
  const viewPath = join(directory, "view.json")
  const view = existsSync(viewPath) ? parse(ViewRecord, readFileSync(viewPath, "utf8")) : undefined
  const agentsPath = join(directory, "agents")

  const subagents = existsSync(agentsPath)
    ? readdirSync(agentsPath)
        .filter((file) => file.endsWith(".jsonl"))
        .flatMap((file) => {
          const [head, ...rest] = readFileSync(join(agentsPath, file), "utf8").split("\n").filter((line) => line.trim() !== "")
          const meta = parse(SubagentMeta, head ?? "")

          if (meta === undefined) return []

          const entries = rest.filter((line) => parse(SubagentEntry, line) !== undefined).length

          return [{ sessionID: meta.sessionID, agent: meta.agent, title: meta.title, entries }]
        })
    : []

  return {
    id: chatID,
    name: info?.name ?? null,
    messages,
    nodes,
    view: view?.chat ?? [],
    compaction: view?.compaction ?? [],
    subagents,
  }
}

export type ChatMessage = z.infer<typeof LoggedMessage>

/** One message, whole. */
export const chatMessage = (dataDir: string, chatID: string, index: number): ChatMessage | undefined => {
  const directory = chatDirectory(dataDir, chatID)

  return directory === undefined ? undefined : readJsonl(join(directory, "main.jsonl"), LoggedMessage).find((message) => message.i === index)
}
