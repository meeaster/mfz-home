import { afterEach, expect, test } from "vitest"
import { appendFileSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { Memory } from "../memory.js"
import { Store } from "../store.js"
import { StatusReader } from "./status.js"

const directories: string[] = []

afterEach(() => {
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true })
})

const budget = { viewHigh: 6_000, viewLow: 3_000, compactionHigh: 2_000, compactionLow: 1_000 }

// A data directory with one chat, "Trip planning", that session ses_a belongs to.
const dataDir = () => {
  const directory = mkdtempSync(join(tmpdir(), "optchat-sidebar-"))
  const now = new Date().toISOString()

  directories.push(directory)
  writeFileSync(
    join(directory, "chats.json"),
    JSON.stringify({
      chats: [{ id: "chat_a", name: "Trip planning", createdAt: now, lastActiveAt: now, createdBy: "ses_a", directory: "/tmp" }],
      sessions: { ses_a: "chat_a" },
    }),
  )

  const store = Store.open(join(directory, "chats", "chat_a"))

  if (store === undefined) throw new Error("store is locked")

  return { dataDir: directory, store }
}

test("reports the chat's view as the plugin measures it, with the summaries still being written", () => {
  const { dataDir: directory, store } = dataDir()
  // Summaries of the long messages never finish, so their lines stay pending.
  const memory = new Memory({ store, budget, concurrency: 8, generate: () => new Promise(() => {}), report: () => {} })

  memory.append("user", "short question", "m0")
  memory.append("agent", "long answer ".padEnd(800, "."), "m1")
  memory.append("user", "another long message ".padEnd(900, "."), "m2")

  expect(new StatusReader(directory).read("ses_a")).toEqual({
    id: "chat_a",
    name: "Trip planning",
    size: memory.viewBytes(),
    high: budget.viewHigh,
    lines: memory.viewLines(),
    pending: 2,
    merging: false,
  })
})

test("has nothing for a session without a chat", () => {
  expect(new StatusReader(dataDir().dataDir).read("ses_other")).toBeUndefined()
})

test("picks up a summary the plugin was still writing at the last read", () => {
  const { dataDir: directory, store } = dataDir()
  const memory = new Memory({ store, budget, concurrency: 8, generate: () => new Promise(() => {}), report: () => {} })
  const reader = new StatusReader(directory)
  const tree = join(directory, "chats", "chat_a", "tree.jsonl")
  const node = JSON.stringify({ l: 0, i: 0, text: "user: a long question, summarized", size: 33 })

  memory.append("user", "a long question ".padEnd(800, "."), "m0")
  appendFileSync(tree, node.slice(0, 20))
  expect(reader.read("ses_a")?.pending).toBe(1)
  appendFileSync(tree, `${node.slice(20)}\n`)
  expect(reader.read("ses_a")?.pending).toBe(0)
})
