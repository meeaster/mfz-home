import { compressTask, LIMIT, mergeTask, SYSTEM, tooLong } from "./prompt.js"
import { bytes, type Kind, type Store } from "./store.js"
import { children, first, fromLabel, key, label, last, parent, shrink, sibling, type Entry } from "./tree.js"

export interface Budget {
  readonly viewHigh: number
  readonly viewLow: number
  readonly compactionHigh: number
  readonly compactionLow: number
}

export interface MemoryOptions {
  readonly store: Store
  readonly budget: Budget
  readonly concurrency: number
  /** One stateless model call; the prompt holds the whole conversation so far. */
  readonly generate: (prompt: string) => Promise<string>
  readonly report: (message: string) => void
}

const PLACEHOLDER = "(not summarized yet: zoom it)"

const CHUNK = 30_000

const ATTEMPTS = 5

const RETRY_DELAY = 3_000

/** Keeps a tool's output to its head and tail, `limit` characters in all. */
export const clip = (text: string, limit = CHUNK): string => {
  if (text.length <= limit) return text

  const half = Math.floor(limit / 2)

  return `${text.slice(0, half)}\n[… ${text.length - limit} characters clipped …]\n${text.slice(-half)}`
}

const headBytes = (text: string, size: number): string => Buffer.from(text, "utf8").subarray(0, size).toString("utf8")

const clean = (reply: string): string => reply.trim().replace(/^\d+\+\d+\|/, "").replaceAll("\n", " ")

export class Memory {
  readonly #store: Store
  readonly #options: MemoryOptions
  #chat: Entry[]
  #compaction: Entry[]
  #merging: boolean
  readonly #leaves: number[] = []
  readonly #merges: Entry[] = []
  readonly #failed: Entry[] = []
  readonly #queued = new Set<string>()
  #inflight = 0
  #nextUnbuilt = 0
  #closed = false
  readonly #waiters = new Set<{ readonly count: number; readonly resolve: () => void }>()

  constructor(options: MemoryOptions) {
    this.#options = options
    this.#store = options.store

    const saved = this.#store.loadView()

    this.#chat = saved?.chat.map(([l, i]): Entry => [l, i]) ?? []
    this.#compaction = saved?.compaction.map(([l, i]): Entry => [l, i]) ?? []
    this.#merging = saved?.merging ?? false

    // A saved view covers every logged message; extend it only if the process died between writes.
    const covered = this.#chat.length === 0 ? 0 : last(this.#chat.at(-1) ?? [0, 0]) + 1

    for (let i = covered; i < this.#store.total; i++) {
      this.#chat.push([0, i])
      this.#compaction.push([0, i])
    }

    this.#recover()
    this.#pump()
  }

  get total(): number {
    return this.#store.total
  }

  /** Whether a message source has already been logged. */
  has(source: string): boolean {
    return this.#store.sources.has(source)
  }

  /** Logs a message, splitting long text over several messages in a row. */
  append(kind: Kind, text: string, source: string): void {
    const pieces = text.length <= CHUNK ? [text] : Array.from({ length: Math.ceil(text.length / CHUNK) }, (_, n) => text.slice(n * CHUNK, (n + 1) * CHUNK))

    pieces.forEach((piece, n) => {
      const record = this.#store.append(kind, piece, n === 0 ? source : `${source}#${n}`)
      const entry: Entry = [0, record.i]

      this.#chat.push(entry)
      this.#compaction.push(entry)

      const literal = `${kind}: ${piece}`

      if (bytes(literal) <= LIMIT) this.#built(entry, literal)
      else this.#enqueue(entry)
    })

    this.#requeueFailed()
    this.#rebalance()
    this.#pump()
  }

  /** Resolves once every message before `count` is summarized, or after `timeout` ms. */
  async waitFor(count: number, timeout: number): Promise<boolean> {
    if (this.#summarizedBefore(count)) return true

    this.#retry()

    return new Promise((resolve) => {
      const waiter = {
        count,
        resolve: () => {
          clearTimeout(timer)
          this.#waiters.delete(waiter)
          resolve(true)
        },
      }

      const timer = setTimeout(() => {
        this.#waiters.delete(waiter)
        resolve(false)
      }, timeout)

      this.#waiters.add(waiter)
    })
  }

  /** The turn view: one line per chat-view node, oldest first. */
  render(): string {
    return `<chat>\n${this.#chat.map((entry) => this.#line(entry)).join("\n")}\n</chat>`
  }

  /** The smaller compaction view (16–32 KB by default), covering the same chat more coarsely. */
  renderCompaction(): string {
    return `<chat>\n${this.#compaction.map((entry) => this.#line(entry)).join("\n")}\n</chat>`
  }

  viewBytes(): number {
    return this.#size(this.#chat)
  }

  viewLines(): number {
    return this.#chat.length
  }

  /** How many leading view lines are final, with their summary written rather than the placeholder. */
  builtLines(): number {
    const pending = this.#chat.findIndex((entry) => !this.#isBuilt(entry))

    return pending < 0 ? this.#chat.length : pending
  }

  zoom(id: number, n: number): string {
    const entry = fromLabel(id, n)

    if (entry === undefined) return `zoom: n must be a power of 2 and id a multiple of n (got ${id}, ${n})`

    if (first(entry) >= this.total) return `zoom: message ${id} does not exist yet (the chat has ${this.total})`

    if (n === 1) {
      const message = this.#store.messages[id]

      return message === undefined ? `zoom: message ${id} is missing` : `${id}+1|${message.kind}: ${message.text}`
    }

    return children(entry)
      .filter((child) => first(child) < this.total)
      .map((child) => this.#line(child))
      .join("\n")
  }

  date(id: number): string {
    return this.#store.messages[id]?.date ?? `date: message ${id} does not exist`
  }

  close(): void {
    this.#closed = true

    for (const waiter of this.#waiters) waiter.resolve()
  }

  #line(entry: Entry): string {
    return `${label(entry)}|${(this.#store.node(entry) ?? PLACEHOLDER).replaceAll("\n", " ")}`
  }

  #size(view: readonly Entry[]): number {
    let total = 0

    for (const entry of view) total += bytes(this.#line(entry)) + 1

    return total
  }

  #isBuilt = (entry: Entry): boolean => this.#store.node(entry) !== undefined

  #rebalance(): void {
    const { viewHigh, viewLow, compactionHigh, compactionLow } = this.#options.budget

    if (this.#size(this.#chat) > viewHigh) this.#merging = true

    if (this.#merging) {
      this.#chat = this.#shrinkTo(this.#chat, viewLow)
      this.#merging = this.#size(this.#chat) > viewLow
      this.#compaction = this.#shrinkTo(this.#chat, compactionLow)
      this.#options.report(`view merged to ${this.#chat.length} lines, ${this.#size(this.#chat)} bytes`)
    } else if (this.#size(this.#compaction) > compactionHigh) {
      this.#compaction = this.#shrinkTo(this.#compaction, compactionLow)
    }

    this.#store.saveView({ chat: this.#chat.map(([l, i]) => [l, i]), compaction: this.#compaction.map(([l, i]) => [l, i]), merging: this.#merging })
  }

  #shrinkTo(view: readonly Entry[], target: number): Entry[] {
    return shrink({ view, total: this.total, isBuilt: this.#isBuilt, done: (candidate) => this.#size(candidate) <= target })
  }

  /** Compaction context: compaction-view lines that end by `bound`, stopping at the first unbuilt one. */
  #context(bound: number): string {
    const lines: string[] = []

    for (const entry of this.#compaction) {
      if (last(entry) > bound || !this.#isBuilt(entry)) break

      lines.push(this.#line(entry))
    }

    return `<chat>\n${lines.join("\n")}\n</chat>`
  }

  #enqueue(entry: Entry): void {
    if (this.#queued.has(key(entry)) || this.#isBuilt(entry)) return

    this.#queued.add(key(entry))

    if (entry[0] === 0) this.#leaves.push(entry[1])
    else this.#merges.push(entry)
  }

  #retry(): void {
    this.#requeueFailed()
    this.#pump()
  }

  #requeueFailed(): void {
    for (const entry of this.#failed.splice(0)) this.#enqueue(entry)
  }

  #built(entry: Entry, text: string): void {
    this.#store.putNode(entry, text)
    this.#queued.delete(key(entry))

    while (this.#nextUnbuilt < this.total && this.#isBuilt([0, this.#nextUnbuilt])) this.#nextUnbuilt++

    for (const waiter of this.#waiters) if (this.#summarizedBefore(waiter.count)) waiter.resolve()

    const pair = sibling(entry)
    const up = parent(entry)

    if (!this.#isBuilt(pair) || this.#isBuilt(up)) return

    const [left, right] = children(up)
    const joined = `${this.#store.node(left) ?? ""}\n${this.#store.node(right) ?? ""}`

    if (bytes(joined) <= LIMIT) this.#built(up, joined)
    else this.#enqueue(up)
  }

  #summarizedBefore(count: number): boolean {
    return this.#closed || this.#nextUnbuilt >= count
  }

  #recover(): void {
    for (let i = 0; i < this.total; i++) if (!this.#isBuilt([0, i])) this.#enqueue([0, i])

    for (const nodeKey of [...this.#store.nodes.keys()]) {
      const [l = 0, i = 0] = nodeKey.split(":").map(Number)
      const entry: Entry = [l, i]
      const up = parent(entry)

      if (i % 2 === 0 && this.#isBuilt(sibling(entry)) && !this.#isBuilt(up)) this.#enqueue(up)
    }

    while (this.#nextUnbuilt < this.total && this.#isBuilt([0, this.#nextUnbuilt])) this.#nextUnbuilt++
  }

  #pump(): void {
    while (!this.#closed && this.#inflight < this.#options.concurrency) {
      const leaf = this.#leaves.shift()
      const entry: Entry | undefined = leaf === undefined ? this.#merges.shift() : [0, leaf]

      if (entry === undefined) return

      this.#inflight++
      void this.#build(entry).finally(() => {
        this.#inflight--
        this.#pump()
      })
    }
  }

  async #build(entry: Entry): Promise<void> {
    const prompt = this.#prompt(entry)

    if (prompt === undefined) return

    try {
      const text = await this.#write(prompt)

      // Closed while summarizing, as on a plugin reload: the store's files are closed, and whoever opens the chat next
      // summarizes this entry again.
      if (this.#closed) return

      this.#built(entry, text)
    } catch (error) {
      if (this.#closed) return

      this.#queued.delete(key(entry))
      this.#failed.push(entry)
      this.#options.report(`compaction ${label(entry)} failed: ${error instanceof Error ? error.message : String(error)}`)

      // A turn may be waiting on this node with no new message coming to retry it.
      if (this.#waiters.size > 0) setTimeout(() => this.#retry(), RETRY_DELAY)
    }
  }

  #prompt(entry: Entry): string | undefined {
    if (entry[0] === 0) {
      const message = this.#store.messages[entry[1]]

      if (message === undefined) return undefined

      return `${SYSTEM}\n\n${this.#context(entry[1] - 1)}\n\n${compressTask(entry[1], message.kind, message.text)}`
    }

    const [left, right] = children(entry)
    const task = mergeTask(label(left), label(right), first(entry), last(entry), this.#line(left), this.#line(right))

    return `${SYSTEM}\n\n${this.#context(last(entry))}\n\n${task}`
  }

  /** Asks for a line, re-asking with the ruler cut until it fits; keeps the shortest. */
  async #write(prompt: string): Promise<string> {
    let conversation = prompt
    let shortest: string | undefined

    for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
      const line = clean(await this.#options.generate(conversation))

      if (shortest === undefined || bytes(line) < bytes(shortest)) shortest = line

      if (bytes(line) <= LIMIT) return line

      conversation = `${conversation}\n\n<your-line>\n${line}\n</your-line>\n\n${tooLong(bytes(line), headBytes(line, LIMIT))}`
    }

    return shortest ?? ""
  }
}
