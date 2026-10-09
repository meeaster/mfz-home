// Turns OpenCode's model messages into the chat messages OptChat logs.

import { createHash } from "node:crypto"
import type { Message } from "@opencode/ai"
import { z } from "zod"
import { clip } from "./memory.js"
import type { Kind } from "./store.js"

export interface Logged {
  readonly kind: Kind
  readonly text: string
  /** A stable key for the message part, so a part is logged once however often OpenCode resends it. */
  readonly source: string
}

/** The key for an assistant text part, shared by the context hook and the `session.text.ended` event. */
export const textKey = (messageID: string, text: string): string =>
  `${messageID}:text:${createHash("sha1").update(text).digest("hex").slice(0, 16)}`

type ToolResult = Message["content"][number] & { type: "tool-result" }

const resultText = (result: ToolResult): string => {
  const { value } = result.result

  if (result.result.type === "content" && Array.isArray(value)) {
    return value.map((part: { type: string; text?: string; uri?: string }) => part.text ?? `[file ${part.uri ?? ""}]`).join("\n")
  }

  const plain = z.string().safeParse(value)
  const text = plain.success ? plain.data : JSON.stringify(value)

  return result.result.type === "error" ? `error: ${text}` : text
}

// OpenCode wraps a finished subagent's reply, as a tool result or a background notice, in this element.
// Other plugins may append to it, so it need not end the text: their tags are dropped and their notes kept.
const SUBAGENT_REPORT = /^<subagent sessionID="([^"]+)" state="([^"]+)"(?: description="([^"]*)")?>\n?([\s\S]*?)\n?<\/subagent>/

const TAG = /^<[^>]*>$/

/** A subagent's result becomes one `work` message, "[agent: task] report: ...", followed by any note appended to it. */
const subagentReport = (text: string, label: (sessionID: string) => string | undefined): string | undefined => {
  const trimmed = text.trim()
  const match = SUBAGENT_REPORT.exec(trimmed)

  if (match === null) return undefined

  const [whole, sessionID = "", state = "", description, output = ""] = match
  const name = label(sessionID) ?? description ?? sessionID
  const status = state === "completed" ? "" : ` (${state})`
  const notes = trimmed.slice(whole.length).split("\n").map((line) => line.trim()).filter((line) => line !== "" && !TAG.test(line))

  return [`[${name}] report${status}: ${clip(output)}`, ...notes].join(" ")
}

/**
 * Splits one model message into logged chat messages. Reasoning is never logged; tool output is clipped;
 * subagent results become `work` messages. `label` names a subagent session for its report.
 */
export const toLogged = (message: Message, position: number, sessionID: string, label: (sessionID: string) => string | undefined): Logged[] => {
  const id = message.id ?? `${sessionID}#${position}`
  const logged: Logged[] = []

  message.content.forEach((part, n) => {
    const source = `${id}:${n}`

    if (message.role === "user" && part.type === "text") {
      const work = subagentReport(part.text, label)

      logged.push(work === undefined ? { kind: "user", text: part.text, source } : { kind: "work", text: work, source })
    } else if (message.role === "user" && part.type === "media") logged.push({ kind: "user", text: `[attachment ${part.filename ?? ""}]`, source })
    else if (message.role === "assistant" && part.type === "text") logged.push({ kind: "agent", text: part.text, source: textKey(id, part.text) })
    else if (part.type === "tool-call") logged.push({ kind: "tool", text: `${part.name} ${JSON.stringify(part.input)}`, source })
    else if (part.type === "tool-result") {
      const text = resultText(part)
      const work = part.name === "subagent" ? subagentReport(text, label) : undefined

      logged.push(work === undefined ? { kind: "echo", text: `${part.name}: ${clip(text)}`, source } : { kind: "work", text: work, source })
    }
  })

  return logged
}

// OpenCode wraps a loaded skill's instructions in this element, whether the skill tool loaded it or the user attached it.
const SKILL_CONTENT = /<skill_content name="([^"]+)">[\s\S]*?<\/skill_content>/g

/**
 * The skills loaded anywhere in the session, each once in the order first loaded, with the files read from each
 * skill's folder except its scripts. A view line can't carry a skill's instructions, so they go in full at the start
 * of every request and stay in effect for the whole chat.
 */
export const loadedSkills = (messages: readonly Message[]): string | undefined => {
  const skills = new Map<string, { readonly block: string; readonly directory: string | undefined }>()
  const readPaths = new Map<string, string>()
  // The latest read of each file, in the order first read.
  const reads = new Map<string, string>()

  for (const message of messages) {
    for (const part of message.content) {
      if (part.type === "tool-call" && part.name === "read") {
        const input = readInput.safeParse(part.input)

        if (input.success) readPaths.set(part.id, input.data.path)

        continue
      }

      const text = part.type === "tool-result" ? resultText(part) : message.role === "user" && part.type === "text" ? part.text : undefined

      if (text === undefined) continue

      // Only the skill tool and the user's attachments load a skill; a zoom or a subagent's report may quote one.
      const loads = part.type === "tool-result" ? part.name === "skill" : !SUBAGENT_REPORT.test(text.trim())

      if (loads) {
        for (const [block, name = ""] of text.matchAll(SKILL_CONTENT)) skills.set(name, { block, directory: BASE_DIRECTORY.exec(block)?.[1] })
      }

      const path = part.type === "tool-result" && part.name === "read" && part.result.type !== "error" ? readPaths.get(part.id) : undefined

      if (path !== undefined) reads.set(path, text)
    }
  }

  if (skills.size === 0) return undefined

  const sections = [...skills.values()].flatMap((skill) => [skill.block, ...skillFiles(skill.directory, reads)])

  return ["Skills loaded in this chat, with the files read from them. Their instructions stay in effect:", ...sections].join("\n\n")
}

const readInput = z.object({ path: z.string() })

// OpenCode names the skill's folder inside its <skill_content> block.
const BASE_DIRECTORY = /^Base directory for this skill: (.+)$/m

// The files read from a skill's folder, leaving out its scripts, which are code rather than instructions.
const skillFiles = (directory: string | undefined, reads: ReadonlyMap<string, string>): string[] =>
  directory === undefined
    ? []
    : [...reads].flatMap(([path, text]) =>
        path.startsWith(`${directory}/`) && !path.startsWith(`${directory}/scripts/`) ? [`<skill_file path="${path}">\n${text}\n</skill_file>`] : [],
      )

export const messageKey = (message: Message | undefined, position: number, sessionID: string): string =>
  message?.id ?? `${sessionID}#${position}`

/**
 * Where the input the model hasn't answered yet begins: the trailing user messages, and any system messages just
 * before them. OpenCode records instruction changes as system messages, which can sit between the last reply and the
 * user's new message; they belong to the new turn. Returns the message count when the session ends with a reply.
 */
export const pendingInput = (messages: readonly Message[]): number => {
  let start = messages.length

  while (start > 0 && messages[start - 1]?.role === "user") start--

  while (start < messages.length && start > 0 && messages[start - 1]?.role === "system") start--

  return start
}

/** Whether a message is a finished assistant reply (no pending tool call), so a following user message starts a new turn. */
export const completedReply = (message: Message | undefined): boolean =>
  message === undefined || (message.role === "assistant" && !message.content.some((part) => part.type === "tool-call"))
