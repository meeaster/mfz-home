import { Message } from "@opencode/ai"
import { expect, test } from "vitest"
import { hintedText, hintedView, withEndHint } from "./cache-hints.js"
import { splitView } from "./cache-marks.js"

const view = (count: number): string => `<chat>\n${Array.from({ length: count }, (_, line) => `${line}|line ${line}`).join("\n")}\n</chat>`

const hinted = (message: Message): boolean[] => message.content.map((part) => "cache" in part && part.cache !== undefined)

const texts = (message: Message): string[] => message.content.flatMap((part) => (part.type === "text" ? [part.text] : []))

test("the view goes as its blocks, with a hint on the last complete block only", () => {
  const message = hintedView(view(9), 36)

  expect(texts(message).join("")).toBe(view(9))
  expect(texts(message)).toEqual(splitView(view(9), 36).map((block) => block.text))
  expect(hinted(message)).toEqual([false, true, false])
  expect(hinted(hintedView(view(2), 36))).toEqual([false])
})

test("the end hint goes on the last message's last text part, and on a tool result when it ends the request", () => {
  const assistant = Message.assistant([{ type: "text", text: "Reading." }, { type: "tool-call", id: "call_1", name: "read", input: {} }])
  const result = Message.tool({ id: "call_1", name: "read", result: "40 lines" })
  const messages = withEndHint([hintedText("skills"), hintedView(view(9), 36), Message.user("<turn/>"), assistant, result])

  expect(messages.map(hinted)).toEqual([[true], [false, true, false], [false], [false, false], [true]])
  expect(withEndHint([Message.user("<turn/>"), assistant]).map(hinted)).toEqual([[false], [true, false]])
})

test("a turn carries at most three hints, leaving OpenCode at least one of Anthropic's four marks", () => {
  const messages = withEndHint([hintedText("skills"), hintedView(view(40), 36), Message.user("<turn/>"), Message.user("hello")])

  expect(messages.flatMap(hinted).filter(Boolean)).toHaveLength(3)
})
