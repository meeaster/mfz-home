import { Message } from "@opencode/ai"
import { expect, test } from "vitest"
import { toLogged } from "./messages.js"

const noLabel = (): undefined => undefined

test("a subagent result becomes one work message, even with another plugin's tag after it", () => {
  const result = Message.tool({
    id: "call_1",
    name: "subagent",
    result: '<subagent sessionID="ses_child" state="completed">\nThe codename is GREEN FALCON.\n</subagent>\n<session-usage tokens="10"/>',
  })

  expect(toLogged(result, 3, "ses_parent", (sessionID) => (sessionID === "ses_child" ? "general: Recall codename" : undefined))).toEqual([
    { kind: "work", text: "[general: Recall codename] report: The codename is GREEN FALCON.", source: "ses_parent#3:0" },
  ])
})

test("a background subagent's completion notice is logged as work, not as the user's words", () => {
  const notice = Message.user('<subagent sessionID="ses_bg" state="error" description="Find parsers">\nTimed out\n</subagent>')

  expect(toLogged(notice, 0, "ses_parent", noLabel)).toEqual([{ kind: "work", text: "[Find parsers] report (error): Timed out", source: "ses_parent#0:0" }])
})

test("reasoning is never logged, and replies, tool calls and results are", () => {
  const reply = Message.make({
    role: "assistant",
    content: [
      { type: "reasoning", text: "thinking about it" },
      { type: "text", text: "Reading the file." },
      { type: "tool-call", id: "call_2", name: "read", input: { path: "server.ts" } },
    ],
  })

  expect(toLogged(reply, 1, "ses_parent", noLabel).map((entry) => [entry.kind, entry.text])).toEqual([
    ["agent", "Reading the file."],
    ["tool", 'read {"path":"server.ts"}'],
  ])
})
