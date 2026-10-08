import { randomUUID } from "node:crypto"
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { z } from "zod"
import { SubagentLogs } from "./subagent-logs.js"
import type { Memory } from "./memory.js"
import { Store } from "./store.js"

const ChatInfo = z.object({
  id: z.string(),
  name: z.string().optional(),
  createdAt: z.string(),
  lastActiveAt: z.string(),
  createdBy: z.string(),
  directory: z.string(),
  messages: z.number().default(0),
  opening: z.string().default(""),
})

export type ChatInfo = z.infer<typeof ChatInfo>

export const Registry = z.object({ chats: z.array(ChatInfo).default([]), sessions: z.record(z.string(), z.string()).default({}) })

/** One chat's open memory: its log and tree, and its subagents' own logs. */
export interface Chat {
  readonly info: ChatInfo
  readonly store: Store
  readonly memory: Memory
  readonly subagents: SubagentLogs
}

const NAME = /^[\p{L}\p{N}][\p{L}\p{N} ._-]{0,59}$/u

/**
 * Every optchat session belongs to one chat. A new session starts a new chat; a session can resume a named
 * chat, after which it reads and extends that chat's memory.
 */
export class Chats {
  readonly #directory: string
  readonly #open: (store: Store) => Memory
  readonly #chats = new Map<string, Chat>()
  #registry: z.infer<typeof Registry>

  constructor(directory: string, open: (store: Store) => Memory) {
    this.#directory = directory
    this.#open = open
    mkdirSync(join(directory, "chats"), { recursive: true })

    const path = this.#registryPath()
    const parsed = existsSync(path) ? Registry.safeParse(JSON.parse(readFileSync(path, "utf8"))) : undefined

    this.#registry = parsed?.success ? parsed.data : { chats: [], sessions: {} }
  }

  chatIdOf(sessionID: string): string | undefined {
    return this.#registry.sessions[sessionID]
  }

  /** The session's chat, created on first use; undefined when another OpenCode process holds it. */
  forSession(sessionID: string, location: string): Chat | undefined {
    const known = this.chatIdOf(sessionID)

    if (known !== undefined) return this.#load(known)

    const now = new Date().toISOString()
    const info: ChatInfo = { id: `chat_${randomUUID().replaceAll("-", "").slice(0, 16)}`, createdAt: now, lastActiveAt: now, createdBy: sessionID, directory: location, messages: 0, opening: "" }

    this.#registry.chats.push(info)
    this.#registry.sessions[sessionID] = info.id
    this.#save()

    return this.#load(info.id)
  }

  /** Records activity after a turn starts, for listing. */
  touch(chat: Chat): void {
    const info = this.#find(chat.info.id)

    if (info === undefined) return

    info.lastActiveAt = new Date().toISOString()
    info.messages = chat.memory.total

    const first = chat.store.messages.find((message) => message.kind === "user")

    if (first !== undefined) info.opening = first.text.replaceAll(/\s+/g, " ").slice(0, 120)

    this.#save()
  }

  rename(sessionID: string, name: string): string {
    const id = this.chatIdOf(sessionID)
    const info = id === undefined ? undefined : this.#find(id)

    if (info === undefined) return "chat_rename: this session has no chat yet"

    const clean = name.trim()

    if (!NAME.test(clean)) return "chat_rename: use 1-60 letters, digits, spaces, dots, dashes or underscores"

    const taken = this.#registry.chats.find((chat) => chat.id !== info.id && chat.name?.toLowerCase() === clean.toLowerCase())

    if (taken !== undefined) return `chat_rename: another chat is already named "${taken.name ?? ""}"`

    const before = info.name

    info.name = clean
    this.#save()

    return before === undefined ? `Named this chat "${clean}".` : `Renamed this chat from "${before}" to "${clean}".`
  }

  list(sessionID: string): string {
    const current = this.chatIdOf(sessionID)
    const named = this.#registry.chats.filter((chat) => chat.name !== undefined || chat.id === current)

    if (named.length === 0) return "No chats yet."

    return named
      .toSorted((a, b) => b.lastActiveAt.localeCompare(a.lastActiveAt))
      .map((chat) => {
        const marker = chat.id === current ? " (this chat)" : ""
        const opening = chat.opening === "" ? "" : ` — opened with: ${chat.opening}`

        return `- ${chat.name ?? "(unnamed)"}${marker}: ${chat.messages} messages, last active ${chat.lastActiveAt}, started in ${chat.directory}${opening}`
      })
      .join("\n")
  }

  /**
   * Points the session at a named chat. The session's previous chat stays listed, unless it only holds this
   * turn, which is discarded so "start a session and resume" leaves nothing behind.
   */
  resume(sessionID: string, name: string, busy: (chatID: string) => string | undefined, turnStartTotal: number | undefined): string {
    const target = this.#registry.chats.find((chat) => chat.name?.toLowerCase() === name.trim().toLowerCase())

    if (target === undefined) return `chat_resume: no chat named "${name}". Use chat_list to see the chats.`

    const previous = this.chatIdOf(sessionID)

    if (previous === target.id) return `This session is already in "${target.name ?? ""}".`

    const holder = busy(target.id)

    if (holder !== undefined && holder !== sessionID) return `chat_resume: "${target.name ?? ""}" is in use by session ${holder} right now; try again when its turn ends.`

    this.#registry.sessions[sessionID] = target.id

    const old = previous === undefined ? undefined : this.#find(previous)
    const onlyThisTurn = old !== undefined && old.createdBy === sessionID && old.name === undefined && (turnStartTotal ?? 0) === 0

    if (old !== undefined && onlyThisTurn) this.#discard(old.id)

    this.#save()

    return `This session now continues "${target.name ?? ""}" (${target.messages} messages). Its memory is the view from your next step on.`
  }

  close(): void {
    for (const chat of this.#chats.values()) {
      chat.memory.close()
      chat.store.close()
    }

    this.#chats.clear()
  }

  #load(id: string): Chat | undefined {
    const open = this.#chats.get(id)

    if (open !== undefined) return open

    const info = this.#find(id)

    if (info === undefined) return undefined

    const store = Store.open(join(this.#directory, "chats", id))

    if (store === undefined) return undefined

    const chat: Chat = { info, store, memory: this.#open(store), subagents: new SubagentLogs(join(this.#directory, "chats", id, "agents")) }

    this.#chats.set(id, chat)

    return chat
  }

  #discard(id: string): void {
    const chat = this.#chats.get(id)

    if (chat !== undefined) {
      chat.memory.close()
      chat.store.close()
      this.#chats.delete(id)
    }

    rmSync(join(this.#directory, "chats", id), { recursive: true, force: true })
    this.#registry.chats = this.#registry.chats.filter((entry) => entry.id !== id)
  }

  #find(id: string): ChatInfo | undefined {
    return this.#registry.chats.find((chat) => chat.id === id)
  }

  #registryPath(): string {
    return join(this.#directory, "chats.json")
  }

  #save(): void {
    const path = this.#registryPath()
    const temporary = `${path}.tmp`

    writeFileSync(temporary, JSON.stringify(this.#registry, null, 2))
    renameSync(temporary, path)
  }
}
