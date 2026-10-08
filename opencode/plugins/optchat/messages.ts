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
// Other plugins may append their own tags after it, so it need not end the text.
const SUBAGENT_REPORT = /^<subagent sessionID="([^"]+)" state="([^"]+)"(?: description="([^"]*)")?>\n?([\s\S]*?)\n?<\/subagent>/

/** A subagent's result becomes one `work` message, "[agent: task] report: ...". */
const subagentReport = (text: string, label: (sessionID: string) => string | undefined): string | undefined => {
  const match = SUBAGENT_REPORT.exec(text.trim())

  if (match === null) return undefined

  const [, sessionID = "", state = "", description, output = ""] = match
  const name = label(sessionID) ?? description ?? sessionID
  const status = state === "completed" ? "" : ` (${state})`

  return `[${name}] report${status}: ${clip(output)}`
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

export const messageKey = (message: Message | undefined, position: number, sessionID: string): string =>
  message?.id ?? `${sessionID}#${position}`

/** Whether a message is a finished assistant reply (no pending tool call), so a following user message starts a new turn. */
export const completedReply = (message: Message | undefined): boolean =>
  message === undefined || (message.role === "assistant" && !message.content.some((part) => part.type === "tool-call"))
