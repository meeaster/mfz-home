import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { chatMessage, chatTree, listChats } from "./data.js"

const seed = (): string => {
  const dataDir = mkdtempSync(join(tmpdir(), "optchat-viewer-"))
  const directory = join(dataDir, "chats", "chat_abc123")
  const date = "2026-10-08T12:00:00.000Z"

  mkdirSync(join(directory, "agents"), { recursive: true })

  writeFileSync(
    join(dataDir, "chats.json"),
    JSON.stringify({
      chats: [
        { id: "chat_abc123", name: "Reading list", createdAt: date, lastActiveAt: date, createdBy: "ses_1", directory: "/work", messages: 3, opening: "hi" },
        { id: "chat_old", createdAt: date, lastActiveAt: "2026-10-01T00:00:00.000Z", createdBy: "ses_0", directory: "/work", messages: 0, opening: "" },
      ],
      sessions: { ses_1: "chat_abc123" },
    }),
  )

  const message = (i: number, text: string): string => JSON.stringify({ i, kind: "user", text, size: text.length, date, source: `m${i}` })

  // The last line is cut off mid-write, as it can be while the plugin appends.
  writeFileSync(join(directory, "main.jsonl"), `${message(0, "first")}\n${message(1, "second")}\n{"i":2,"kind":"us`)
  writeFileSync(join(directory, "tree.jsonl"), `${JSON.stringify({ l: 1, i: 0, text: "first and second", size: 16 })}\n`)
  writeFileSync(join(directory, "view.json"), JSON.stringify({ chat: [[1, 0]], compaction: [[1, 0]], merging: false }))
  writeFileSync(join(directory, "agents", "ses_2.jsonl"), `${JSON.stringify({ sessionID: "ses_2", agent: "explore", title: "Look" })}\n${JSON.stringify({ kind: "tool", text: "read", source: "p1" })}\n`)

  return dataDir
}

describe("viewer data", () => {
  it("lists chats newest first and counts only complete messages", () => {
    const chats = listChats(seed())

    expect(chats.map((chat) => [chat.id, chat.name, chat.messages])).toEqual([
      ["chat_abc123", "Reading list", 2],
      ["chat_old", null, 0],
    ])
  })

  it("returns the tree, views and subagents of a chat", () => {
    const tree = chatTree(seed(), "chat_abc123")

    expect(tree?.messages.map((message) => message.preview)).toEqual(["first", "second"])
    expect(tree?.nodes).toEqual([{ l: 1, i: 0, text: "first and second" }])
    expect(tree?.view).toEqual([[1, 0]])
    expect(tree?.subagents).toEqual([{ sessionID: "ses_2", agent: "explore", title: "Look", entries: 1 }])
  })

  it("refuses chat ids that could leave the data directory", () => {
    const dataDir = seed()

    expect(chatTree(dataDir, "../chats")).toBeUndefined()
    expect(chatMessage(dataDir, "chat_abc123/..", 0)).toBeUndefined()
    expect(chatMessage(dataDir, "chat_abc123", 1)?.text).toBe("second")
  })
})
