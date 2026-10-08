import { afterEach, expect, test } from "vitest"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { Chats } from "./chats.js"
import { Memory } from "./memory.js"
import type { Store } from "./store.js"

const directories: string[] = []

const registries: Chats[] = []

afterEach(() => {
  for (const chats of registries.splice(0)) chats.close()

  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true })
})

interface Opened {
  readonly chats: Chats
  readonly directory: string
}

const open = (directory?: string): Opened => {
  const root = directory ?? mkdtempSync(join(tmpdir(), "optchat-chats-"))

  if (directory === undefined) directories.push(root)

  const chats = new Chats(root, (store: Store) => new Memory({ store, budget: { viewHigh: 128_000, viewLow: 64_000, compactionHigh: 32_000, compactionLow: 16_000 }, concurrency: 1, generate: async () => "summary", report: () => {} }))

  registries.push(chats)

  return { chats, directory: root }
}

const idle = (): undefined => undefined

test("a named chat can be resumed from a new session, which then sees its messages", () => {
  const { chats, directory } = open()
  const first = chats.forSession("ses_a", "/work")

  first?.memory.append("user", "Remember the codename BLUE HERON", "m1")
  expect(chats.rename("ses_a", "Heron planning")).toBe('Named this chat "Heron planning".')
  chats.close()

  const { chats: later } = open(directory)

  later.forSession("ses_b", "/work")
  expect(later.resume("ses_b", "heron planning", idle, 0)).toContain('continues "Heron planning"')
  expect(later.chatIdOf("ses_b")).toBe(later.chatIdOf("ses_a"))
  expect(later.forSession("ses_b", "/work")?.memory.zoom(0, 1)).toBe("0+1|user: Remember the codename BLUE HERON")
})

test("resuming from a session that only holds this turn discards its empty chat", () => {
  const { chats } = open()

  chats.forSession("ses_a", "/work")
  chats.rename("ses_a", "Kept")

  chats.forSession("ses_b", "/work")
  chats.resume("ses_b", "Kept", idle, 0)

  expect(chats.list("ses_b").split("\n")).toEqual([expect.stringContaining("- Kept (this chat)")])
})

test("resuming keeps a session's earlier chat when it already had messages, unnamed or not", () => {
  const { chats } = open()

  chats.forSession("ses_a", "/work")
  chats.rename("ses_a", "Target")
  chats.forSession("ses_b", "/work")?.memory.append("user", "Earlier work", "m1")
  chats.rename("ses_b", "Earlier")
  chats.resume("ses_b", "Target", idle, 1)

  expect(chats.list("ses_b")).toContain("Earlier")
})

test("a chat in use by another session cannot be resumed, and names stay unique", () => {
  const { chats } = open()

  chats.forSession("ses_a", "/work")
  chats.rename("ses_a", "Busy one")
  chats.forSession("ses_b", "/work")

  expect(chats.resume("ses_b", "Busy one", () => "ses_a", 0)).toContain("in use by session ses_a")
  expect(chats.rename("ses_b", "busy ONE")).toContain("already named")
})
