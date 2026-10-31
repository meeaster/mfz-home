import { ACCEPT, compressTask, LIMIT, mergeTask, SYSTEM, tooLong } from "./prompt.js"
import { bytes, type Kind, type Store } from "./store.js"
import { children, first, fromLabel, key, label, last, parent, shrink, sibling, type Entry } from "./tree.js"

export interface Budget {
  readonly viewHigh: number
  readonly viewLow: number
  readonly compactionHigh: number
  readonly compactionLow: number
}

/**
 * One summary call: the compaction view, the task, and each earlier attempt that came back too long with the note
 * that asked for it again, oldest first.
 */
export interface Compaction {
  readonly view: string
  readonly task: string
  readonly attempts: readonly { readonly line: string; readonly note: string }[]
}

export interface MemoryOptions {
  readonly store: Store
  readonly budget: Budget
  readonly concurrency: number
  /** One model call that answers the compaction's latest message with a line. */
  readonly generate: (compaction: Compaction) => Promise<string>
  readonly report: (message: string) => void
}

/** A compaction as one stateless prompt: the system prompt, view and task, then each attempt and the note after it. */
export const flatPrompt = ({ view, task, attempts }: Compaction): string =>
  attempts.reduce((prompt, { line, note }) => `${prompt}\n\n<your-line>\n${line}\n</your-line>\n\n${note}`, `${SYSTEM}\n\n${view}\n\n${task}`)

/** A view line's text until its summary is written. */
export const PLACEHOLDER = "(not summarized yet: zoom it)"

const CHUNK = 30_000

/** How many times a compaction is asked for its line before the shortest is kept. */
export const ATTEMPTS = 5

/** How soon failed compactions are asked again while a turn waits on them. */
const RETRY_DELAY = 3_000

/**
 * How soon they are asked again with no turn waiting, doubling after each failed retry up to `IDLE_RETRY_MAX`: an outage
 * only delays a summary, and a long one costs a call every few minutes per chat.
 */
const IDLE_RETRY_FIRST = 15_000

const IDLE_RETRY_MAX = 300_000

/** Keeps a tool's output to its head and tail, `limit` characters in all. */
export const clip = (text: string, limit = CHUNK): string => {
  if (text.length <= limit) return text

  const half = Math.floor(limit / 2)

  return `${text.slice(0, half)}\n[… ${text.length - limit} characters clipped …]\n${text.slice(-half)}`
}

// A character cut in half decodes as U+FFFD; it is dropped.
const headBytes = (text: string, size: number): string => Buffer.from(text, "utf8").subarray(0, size).toString("utf8").replace(/\uFFFD+$/, "")

/** A reply as a view line: trimmed, without an id+n| head, on one line. */
export const clean = (reply: string): string => reply.trim().replace(/^\d+\+\d+\|/, "").replaceAll("\n", " ")

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
  #retryTimer: { readonly due: number; readonly handle: ReturnType<typeof setTimeout> } | undefined
  #idleRetryDelay = IDLE_RETRY_FIRST
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
    clearTimeout(this.#retryTimer?.handle)

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

    this.#store.saveView({ chat: this.#chat.map(([l, i]) => [l, i]), compaction: this.#compaction.map(([l, i]) => [l, i]), merging: this.#merging, high: viewHigh })
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

  /**
   * Asks the failed compactions again after `delay` ms, unless a retry is already due sooner. Each retry doubles the
   * idle delay, so the compactions that fail together in one outage back off as one.
   */
  #scheduleRetry(delay: number): void {
    const due = Date.now() + delay

    if (this.#closed || (this.#retryTimer !== undefined && this.#retryTimer.due <= due)) return

    clearTimeout(this.#retryTimer?.handle)

    const handle = setTimeout(() => {
      this.#retryTimer = undefined
      this.#idleRetryDelay = Math.min(this.#idleRetryDelay * 2, IDLE_RETRY_MAX)
      this.#retry()
    }, delay)

    this.#retryTimer = { due, handle }
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
    const request = this.#request(entry)

    if (request === undefined) return

    const { source, ...compaction } = request

    try {
      const text = await this.#write(compaction, source)

      // Closed while summarizing, as on a plugin reload: the store's files are closed, and whoever opens the chat next
      // summarizes this entry again.
      if (this.#closed) return

      this.#idleRetryDelay = IDLE_RETRY_FIRST
      this.#built(entry, text)
    } catch (error) {
      if (this.#closed) return

      this.#queued.delete(key(entry))
      this.#failed.push(entry)
      this.#options.report(`compaction ${label(entry)} failed: ${error instanceof Error ? error.message : String(error)}`)

      // No new message may come to retry it; a turn waiting on it gets it sooner.
      this.#scheduleRetry(this.#waiters.size > 0 ? RETRY_DELAY : this.#idleRetryDelay)
    }
  }

  /** The compaction for an entry, and the text it summarizes: a message with its kind, or its two lines. */
  #request(entry: Entry): (Omit<Compaction, "attempts"> & { readonly source: string }) | undefined {
    if (entry[0] === 0) {
      const message = this.#store.messages[entry[1]]

      if (message === undefined) return undefined

      return { view: this.#context(entry[1] - 1), task: compressTask(entry[1], message.kind, message.text), source: `${message.kind}: ${message.text}` }
    }

    const [left, right] = children(entry)
    const source = `${this.#store.node(left) ?? ""} ${this.#store.node(right) ?? ""}`

    return { view: this.#context(last(entry)), task: mergeTask(label(left), label(right), first(entry), last(entry), this.#line(left), this.#line(right)), source }
  }

  /**
   * Asks for a line, re-asking in the same conversation with the ruler cut until it is within `ACCEPT`; keeps the
   * shortest. An empty reply, as a refusal gives, ends the asking: asked again, it would refuse alike. With no line at
   * all, the line is the source's first `LIMIT` bytes, so no node is ever stored empty.
   */
  async #write(request: Omit<Compaction, "attempts">, source: string): Promise<string> {
    const attempts: { line: string; note: string }[] = []
    let shortest: string | undefined

    for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
      const line = clean(await this.#options.generate({ ...request, attempts: [...attempts] }))

      if (line === "") break

      if (shortest === undefined || bytes(line) < bytes(shortest)) shortest = line

      if (bytes(line) <= ACCEPT) return line

      attempts.push({ line, note: tooLong(line.split(/\s+/).filter(Boolean).length, bytes(line), headBytes(line, LIMIT)) })
    }

    if (shortest === undefined) this.#options.report(`compaction returned no line; kept its source clipped to ${LIMIT} bytes`)

    return shortest ?? headBytes(source.replaceAll("\n", " "), LIMIT)
  }
}
