import { afterEach, expect, test } from "vitest"
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { Memory, type MemoryOptions } from "./memory.js"
import { Store, bytes } from "./store.js"

const directories: string[] = []

afterEach(() => {
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true })
})

const budget = { viewHigh: 6_000, viewLow: 3_000, compactionHigh: 2_000, compactionLow: 1_000 }

// A stand-in compactor that writes a 300-byte line naming what it summarized.
const fakeGenerate = async (prompt: string): Promise<string> => {
  const task = prompt.slice(prompt.lastIndexOf("Compaction:"))
  const subject = /compress message (\d+)|merge lines (\S+) and (\S+)/.exec(task)?.[0] ?? "?"

  return `${subject} `.padEnd(300, "x")
}

const open = (directory: string, generate: MemoryOptions["generate"] = fakeGenerate) => {
  const store = Store.open(directory)

  if (store === undefined) throw new Error("store is locked")

  return { store, memory: new Memory({ store, budget, concurrency: 8, generate, report: () => {} }) }
}

const fresh = (): string => {
  const directory = mkdtempSync(join(tmpdir(), "optchat-"))

  directories.push(directory)

  return directory
}

const lines = (view: string): string[] => view.split("\n").slice(1, -1)

test("the view stays within budget, covers every message in order, and zooms down to a message", async () => {
  const { store, memory } = open(fresh())

  for (let i = 0; i < 400; i++) {
    memory.append(i % 2 === 0 ? "user" : "agent", `message ${i} `.padEnd(800, "."), `m${i}`)
    await memory.waitFor(memory.total, 5_000)
    expect(memory.viewBytes()).toBeLessThanOrEqual(budget.viewHigh + 600)
  }

  const view = lines(memory.render())
  let next = 0

  for (const line of view) {
    const [id = "", n = ""] = line.slice(0, line.indexOf("|")).split("+")

    expect(Number(id)).toBe(next)
    next += Number(n)
  }

  expect(next).toBe(400)

  const oldest = view[0] ?? ""
  let [id, n] = oldest.slice(0, oldest.indexOf("|")).split("+").map(Number)

  expect(n).toBeGreaterThan(1)

  while (n !== undefined && id !== undefined && n > 1) {
    const opened = memory.zoom(id, n).split("\n")

    expect(opened).toHaveLength(2)
    n /= 2
  }

  expect(memory.zoom(0, 1).startsWith("0+1|user: message 0 ")).toBe(true)

  memory.close()
  store.close()
}, 30_000)

test("a reopened chat renders the same view instead of rebuilding it", async () => {
  const directory = fresh()
  const first = open(directory)

  for (let i = 0; i < 120; i++) {
    first.memory.append("user", `message ${i} `.padEnd(800, "."), `m${i}`)
    await first.memory.waitFor(first.memory.total, 5_000)
  }

  const before = first.memory.render()

  first.memory.close()
  first.store.close()

  const second = open(directory)

  expect(second.memory.render()).toBe(before)
  expect(second.memory.has("m7")).toBe(true)
  second.memory.close()
  second.store.close()
})

test("an over-long line is re-asked with the ruler cut until it fits", async () => {
  const prompts: string[] = []

  const generate = async (prompt: string): Promise<string> => {
    prompts.push(prompt)

    return prompts.length === 1 ? "y".repeat(900) : "short enough"
  }

  const { store, memory } = open(fresh(), generate)

  memory.append("echo", "z".repeat(2_000), "long")
  await memory.waitFor(1, 5_000)

  expect(memory.zoom(0, 1)).toContain("z".repeat(100))
  expect(lines(memory.render())[0]).toBe("0+1|short enough")
  expect(prompts[1]).toContain("Too long: your line is 900 bytes")
  expect(bytes(prompts[1]?.slice(prompts[1].lastIndexOf("\n") + 1).replace("| ← LIMIT", "") ?? "")).toBe(512)

  memory.close()
  store.close()
})

test("a turn waiting on a failed compaction gets it retried without a new message", async () => {
  let calls = 0

  const generate = async (prompt: string): Promise<string> => {
    calls++

    if (calls === 1) throw new Error("HTTP 503")

    return fakeGenerate(prompt)
  }

  const { store, memory } = open(fresh(), generate)

  memory.append("echo", "z".repeat(2_000), "long")

  expect(await memory.waitFor(1, 10_000)).toBe(true)
  expect(calls).toBe(2)

  memory.close()
  store.close()
})

test("a chat reopened while a summary is in flight, as on a plugin reload, keeps the new store's files and lock", async () => {
  const directory = fresh()
  let finish: (text: string) => void = () => {}

  const first = open(directory, () => new Promise((resolve) => (finish = resolve)))

  first.memory.append("echo", "z".repeat(2_000), "long")

  const second = open(directory)

  first.memory.close()
  first.store.close()
  finish("late summary from the closed chat")
  await new Promise((resolve) => setTimeout(resolve, 0))

  expect(existsSync(join(directory, "lock"))).toBe(true)
  expect(await second.memory.waitFor(1, 5_000)).toBe(true)
  expect(readFileSync(join(directory, "tree.jsonl"), "utf8")).not.toContain("late summary")
  second.memory.close()
  second.store.close()
})
