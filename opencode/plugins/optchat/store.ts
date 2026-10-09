import { randomUUID } from "node:crypto"
import { closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, renameSync, rmSync, writeFileSync, writeSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import { z } from "zod"
import { key, type Entry } from "./tree.js"

export const Kind = z.enum(["user", "agent", "tool", "echo", "work", "note"])

export type Kind = z.infer<typeof Kind>

export const MessageRecord = z.object({
  i: z.number().int(),
  kind: Kind,
  text: z.string(),
  size: z.number().int(),
  date: z.string(),
  source: z.string(),
})

export type MessageRecord = z.infer<typeof MessageRecord>

export const NodeRecord = z.object({ l: z.number().int(), i: z.number().int(), text: z.string(), size: z.number().int() })

const EntryRecord = z.tuple([z.number().int(), z.number().int()])

// `high` is the view's merge threshold when it was saved, for readers that don't get the plugin's options.
export const ViewRecord = z.object({ chat: z.array(EntryRecord), compaction: z.array(EntryRecord), merging: z.boolean(), high: z.number().int().optional() })

export type ViewRecord = z.infer<typeof ViewRecord>

/** Where chats are stored unless the `dataDir` option says otherwise. */
export const defaultDataDir = (): string => join(process.env.XDG_DATA_HOME ?? join(homedir(), ".local", "share"), "optchat")

export const bytes = (text: string): number => Buffer.byteLength(text, "utf8")

const readLines = <T>(path: string, schema: z.ZodType<T>): T[] => {
  if (!existsSync(path)) return []

  const records: T[] = []

  for (const line of readFileSync(path, "utf8").split("\n")) {
    if (line.trim() === "") continue

    const parsed = schema.safeParse(JSON.parse(line))

    if (parsed.success) records.push(parsed.data)
  }

  return records
}

/** Append-only chat log and tree, owned by one process through a lock file. */
export class Store {
  readonly messages: MessageRecord[]
  readonly nodes = new Map<string, string>()
  readonly sources = new Set<string>()
  readonly #mainFd: number
  readonly #treeFd: number
  readonly #viewPath: string
  readonly #lockPath: string
  readonly #lock: string
  #closed = false

  private constructor(directory: string, lock: string) {
    this.#lock = lock
    this.#viewPath = join(directory, "view.json")
    this.#lockPath = join(directory, "lock")

    const mainPath = join(directory, "main.jsonl")
    const treePath = join(directory, "tree.jsonl")

    this.messages = readLines(mainPath, MessageRecord)

    for (const message of this.messages) this.sources.add(message.source)

    for (const node of readLines(treePath, NodeRecord)) this.nodes.set(key([node.l, node.i]), node.text)

    this.#mainFd = openSync(mainPath, "a")
    this.#treeFd = openSync(treePath, "a")
  }

  /** Returns undefined when another live process holds the chat. */
  static open(directory: string): Store | undefined {
    mkdirSync(directory, { recursive: true })

    const lockPath = join(directory, "lock")

    if (existsSync(lockPath)) {
      const holder = Number(readFileSync(lockPath, "utf8").split(" ")[0])

      if (holder !== process.pid && isAlive(holder)) return undefined
    }

    // The token tells this store's lock from a later one in the same process, such as a reloaded plugin's.
    const lock = `${process.pid} ${randomUUID()}`

    writeFileSync(lockPath, lock)

    return new Store(directory, lock)
  }

  get total(): number {
    return this.messages.length
  }

  append(kind: Kind, text: string, source: string): MessageRecord {
    this.#assertOpen()

    const record: MessageRecord = {
      i: this.messages.length,
      kind,
      text,
      size: bytes(text),
      date: new Date().toISOString(),
      source,
    }

    writeSync(this.#mainFd, `${JSON.stringify(record)}\n`)
    fsyncSync(this.#mainFd)
    this.messages.push(record)
    this.sources.add(source)

    return record
  }

  node(entry: Entry): string | undefined {
    return this.nodes.get(key(entry))
  }

  putNode([l, i]: Entry, text: string): void {
    if (this.nodes.has(key([l, i]))) return

    this.#assertOpen()
    writeSync(this.#treeFd, `${JSON.stringify({ l, i, text, size: bytes(text) })}\n`)
    fsyncSync(this.#treeFd)
    this.nodes.set(key([l, i]), text)
  }

  loadView(): ViewRecord | undefined {
    if (!existsSync(this.#viewPath)) return undefined

    const parsed = ViewRecord.safeParse(JSON.parse(readFileSync(this.#viewPath, "utf8")))

    return parsed.success ? parsed.data : undefined
  }

  saveView(view: ViewRecord): void {
    this.#assertOpen()

    const temporary = `${this.#viewPath}.tmp`

    writeFileSync(temporary, JSON.stringify(view))
    renameSync(temporary, this.#viewPath)
  }

  close(): void {
    if (this.#closed) return

    this.#closed = true
    closeSync(this.#mainFd)
    closeSync(this.#treeFd)

    // A later store for this chat may already hold the lock; leave its lock in place.
    if (existsSync(this.#lockPath) && readFileSync(this.#lockPath, "utf8") === this.#lock) rmSync(this.#lockPath, { force: true })
  }

  // The descriptors of a closed store may already belong to another file, so a late write must not reach them.
  #assertOpen(): void {
    if (this.#closed) throw new Error("the chat's store is closed")
  }
}

const isAlive = (pid: number): boolean => {
  if (!Number.isInteger(pid) || pid <= 0) return false

  try {
    process.kill(pid, 0)

    return true
  } catch {
    return false
  }
}
