// Reads a chat's state for the sidebar from the plugin's data directory. The plugin may be writing while this reads,
// so a half-written line or file is skipped and the next read picks it up.

import { closeSync, existsSync, openSync, readFileSync, readSync, statSync } from "node:fs"
import { join } from "node:path"
import type { z } from "zod"
import { Registry } from "../chats.js"
import { PLACEHOLDER } from "../memory.js"
import { bytes, NodeRecord, ViewRecord } from "../store.js"
import { key, label } from "../tree.js"

export interface ChatStatus {
  readonly id: string
  readonly name: string | undefined
  /** The view's size in bytes, measured the way the plugin measures it against `high`. */
  readonly size: number
  /** The size at which the view merges down, when the plugin has recorded it. */
  readonly high: number | undefined
  readonly lines: number
  /** View lines whose summaries aren't written yet. */
  readonly pending: number
  /** Whether the view is merging down to its low size. */
  readonly merging: boolean
}

/** Reads each chat's state on demand, keeping what it has read of each chat's append-only tree between reads. */
export class StatusReader {
  readonly #dataDir: string
  readonly #trees = new Map<string, Tree>()
  // The last readable registry and views, kept for a read that catches a file mid-write.
  #registry: z.infer<typeof Registry> | undefined
  readonly #views = new Map<string, ViewRecord>()

  constructor(dataDir: string) {
    this.#dataDir = dataDir
  }

  /** The state of the chat the session belongs to, or undefined when the session has no chat. */
  read(sessionID: string): ChatStatus | undefined {
    const registry = readJson(join(this.#dataDir, "chats.json"), Registry) ?? this.#registry

    this.#registry = registry

    const id = registry?.sessions[sessionID]

    if (id === undefined) return undefined

    const directory = join(this.#dataDir, "chats", id)
    const view = readJson(join(directory, "view.json"), ViewRecord) ?? this.#views.get(id)

    if (view !== undefined) this.#views.set(id, view)

    const tree = this.#trees.get(id) ?? new Tree(join(directory, "tree.jsonl"))

    this.#trees.set(id, tree)
    tree.update()

    let size = 0
    let pending = 0

    for (const entry of view?.chat ?? []) {
      const text = tree.nodes.get(key(entry))

      if (text === undefined) pending++

      size += bytes(`${label(entry)}|${(text ?? PLACEHOLDER).replaceAll("\n", " ")}`) + 1
    }

    return {
      id,
      name: registry?.chats.find((chat) => chat.id === id)?.name,
      size,
      high: view?.high,
      lines: view?.chat.length ?? 0,
      pending,
      merging: view?.merging ?? false,
    }
  }
}

/** A chat's summary nodes, read from `tree.jsonl` as it grows. */
class Tree {
  readonly nodes = new Map<string, string>()
  readonly #path: string
  #offset = 0
  // The bytes after the last complete line, which the plugin may still be writing.
  #rest = Buffer.alloc(0)

  constructor(path: string) {
    this.#path = path
  }

  update(): void {
    if (!existsSync(this.#path)) return

    const end = statSync(this.#path).size

    if (end <= this.#offset) return

    const chunk = Buffer.alloc(end - this.#offset)
    const fd = openSync(this.#path, "r")

    try {
      readSync(fd, chunk, 0, chunk.length, this.#offset)
    } finally {
      closeSync(fd)
    }

    this.#offset = end

    let text = Buffer.concat([this.#rest, chunk])
    let newline = text.indexOf(0x0a)

    while (newline !== -1) {
      const node = parse(NodeRecord, text.subarray(0, newline).toString("utf8"))

      if (node !== undefined) this.nodes.set(key([node.l, node.i]), node.text)

      text = text.subarray(newline + 1)
      newline = text.indexOf(0x0a)
    }

    this.#rest = text
  }
}

const readJson = <Schema extends z.ZodType>(path: string, schema: Schema): z.infer<Schema> | undefined =>
  existsSync(path) ? parse(schema, readFileSync(path, "utf8")) : undefined

/** The record in `text`, or undefined if it is not valid JSON or doesn't match the schema. */
const parse = <Schema extends z.ZodType>(schema: Schema, text: string): z.infer<Schema> | undefined => {
  try {
    const parsed = schema.safeParse(JSON.parse(text))

    return parsed.success ? parsed.data : undefined
  } catch {
    return undefined
  }
}
