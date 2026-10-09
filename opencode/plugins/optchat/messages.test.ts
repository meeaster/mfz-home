import { Message } from "@opencode/ai"
import { expect, test } from "vitest"
import { completedReply, loadedSkills, pendingInput, toLogged } from "./messages.js"

const noLabel = (): undefined => undefined

test("a subagent result becomes one work message that keeps another plugin's note and drops its tags", () => {
  const result = Message.tool({
    id: "call_1",
    name: "subagent",
    result: '<subagent sessionID="ses_child" state="completed">\nThe codename is GREEN FALCON.\n</subagent>\n<session-usage tokens="10"/>\n\nCairn saved this response to /saved/recall.md.',
  })

  expect(toLogged(result, 3, "ses_parent", (sessionID) => (sessionID === "ses_child" ? "general: Recall codename" : undefined))).toEqual([
    { kind: "work", text: "[general: Recall codename] report: The codename is GREEN FALCON. Cairn saved this response to /saved/recall.md.", source: "ses_parent#3:0" },
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

test("loaded skills are kept once each, in the order first loaded, from tool results and user attachments", () => {
  const block = (name: string, body: string): string => `<skill_content name="${name}">\n# Skill: ${name}\n\n${body}\n</skill_content>`
  const attached = Message.user(`@orchestrate build it\n${block("orchestrate", "Lead the work.")}`)
  const loaded = Message.tool({ id: "call_3", name: "skill", result: block("design-partner", "Think with them.") })
  const reloaded = Message.tool({ id: "call_4", name: "skill", result: block("orchestrate", "Lead the work, revised.") })

  expect(loadedSkills([attached, loaded, reloaded])).toBe(
    ["Skills loaded in this chat, with the files read from them. Their instructions stay in effect:", block("orchestrate", "Lead the work, revised."), block("design-partner", "Think with them.")].join("\n\n"),
  )
  expect(loadedSkills([Message.user("no skills here")])).toBeUndefined()
})

test("files read from a loaded skill's folder are kept with it, except its scripts", () => {
  const skill = '<skill_content name="impeccable">\n# Skill: impeccable\n\nBase directory for this skill: /skills/impeccable\n</skill_content>'

  const read = (id: string, path: string, result: string): Message[] => [
    Message.make({ role: "assistant", content: [{ type: "tool-call", id, name: "read", input: { path } }] }),
    Message.tool({ id, name: "read", result }),
  ]

  const messages = [
    Message.tool({ id: "call_1", name: "skill", result: skill }),
    ...read("call_2", "/skills/impeccable/reference/new-work.md", "old text"),
    ...read("call_3", "/skills/impeccable/scripts/context.sh", "echo hi"),
    ...read("call_4", "/elsewhere/notes.md", "unrelated"),
    ...read("call_5", "/skills/impeccable/reference/new-work.md", "new text"),
  ]

  expect(loadedSkills(messages)).toBe(
    [
      "Skills loaded in this chat, with the files read from them. Their instructions stay in effect:",
      skill,
      '<skill_file path="/skills/impeccable/reference/new-work.md">\nnew text\n</skill_file>',
    ].join("\n\n"),
  )
})

test("a skill quoted by a zoom or a subagent's report is not loaded", () => {
  const quoted = '<skill_content name="development-principles">\n# Skill: development-principles\n</skill_content>'
  const zoom = Message.tool({ id: "call_6", name: "zoom", result: `[general: architect] user: ...\n${quoted}` })
  const report = Message.user(`<subagent sessionID="ses_child" state="completed">\n${quoted}\n</subagent>`)

  expect(loadedSkills([zoom, report])).toBeUndefined()
})

test("a system message between the last reply and the user's new message belongs to the new turn", () => {
  const reply = Message.make({ role: "assistant", content: [{ type: "text", text: "one" }] })
  const messages = [Message.user("Reply with one"), reply, Message.system("Instructions changed."), Message.user("Reply with two")]
  const start = pendingInput(messages)

  expect(start).toBe(2)
  expect(completedReply(messages[start - 1])).toBe(true)
  expect(pendingInput([Message.user("hi"), reply])).toBe(2)
})
