// The view cache of an OptChat turn: how a backend saves the skills and the earlier view, so a new turn reads them
// from its cache instead of processing them again. The view goes as blocks of whole lines of at least a given size:
// complete blocks keep their text as lines are added, so the next turn finds them unchanged. This is the gist's "view
// in blocks of lines, with a cache mark on the last whole block", in each backend's terms. Blocks are sized in bytes
// rather than lines because OpenAI saves an entry only when it lies at least 1,024 tokens past the previous one, so a
// block of short lines would never be saved.
//
// - `openai`: `prompt_cache_breakpoint` on the skills and every complete view block (GPT-5.6 and later on the OpenAI
//   API and Azure Standard deployments). Lookups consider the latest 50 breakpoints, and a request writes at most
//   the newest few, so earlier blocks are written on earlier turns and read on later ones.
// - `anthropic`: `cache_control` for Claude through an OpenAI-compatible proxy such as LiteLLM, which turns it into
//   Anthropic or Bedrock cache points. Anthropic allows four marks and looks back from each for an earlier entry, so
//   the skills (or the system prompt), the last complete view block, and the request's end are marked.
// - `warm`: for OpenAI backends that reject marks, such as the ChatGPT login. They save an entry only at the end of a
//   request's last message, and a new turn's lookup checks the endings of its latest messages. So each block goes as
//   its own message, and a warm-up request at the end of each turn (`warmBody`) ends at the last complete block:
//   its entry sits at a message ending the next turn's request shares.

import { z } from "zod"

export type ViewCacheMode = "openai" | "anthropic" | "warm"

type MarkMode = "openai" | "anthropic"

export interface TurnParts {
  readonly skills: string | undefined
  readonly view: string
}

const BREAKPOINT = { mode: "explicit" } as const

const CACHE_CONTROL = { type: "ephemeral" } as const

// OpenAI reads the latest 50 explicit breakpoints; marks past that are never read.
const MAX_BREAKPOINTS = 48

// The least output a warm-up may ask for: OpenAI's minimum, so the reply (reasoning included) stops at once.
const WARM_OUTPUT = 16

const Text = z.looseObject({ type: z.enum(["input_text", "text"]), text: z.string() })

const ResponsesBody = z.looseObject({ input: z.array(z.unknown()) })

const ResponsesUser = z.looseObject({ role: z.literal("user"), content: z.tuple([Text]) })

const ChatBody = z.looseObject({ messages: z.array(z.unknown()) })

const PlainContent = z.string()

const PartsContent = z.array(z.unknown())

const ChatMessage = z.looseObject({ role: z.string(), content: z.union([PlainContent, PartsContent]) })

type Part = z.infer<typeof Text> & { readonly prompt_cache_breakpoint?: typeof BREAKPOINT; readonly cache_control?: typeof CACHE_CONTROL }

/** The request body with the turn's cache marks or block messages, or undefined when the body holds neither the skills nor the view. */
export const markCache = (body: string, parts: TurnParts, mode: ViewCacheMode, size: number): string | undefined => {
  const parsed: unknown = JSON.parse(body)
  const responses = ResponsesBody.safeParse(parsed)

  if (responses.success) {
    return mode === "anthropic" ? undefined : markResponses(responses.data, parts, mode, size)
  }

  const chat = ChatBody.safeParse(parsed)

  return chat.success ? markChat(chat.data, parts, mode, size) : undefined
}

const markResponses = (body: z.infer<typeof ResponsesBody>, parts: TurnParts, mode: "openai" | "warm", size: number): string | undefined => {
  let marked = false

  const input = body.input.flatMap((item) => {
    const message = ResponsesUser.safeParse(item)

    if (!message.success) return [item]

    const [part] = message.data.content

    if (part.text === parts.view) {
      marked = true

      return mode === "warm"
        ? splitView(parts.view, size).map((block) => ({ ...message.data, content: [{ type: part.type, text: block.text }] }))
        : [{ ...message.data, content: viewParts(parts.view, size, part.type, mode) }]
    }

    if (mode === "openai" && parts.skills !== undefined && part.text === parts.skills) {
      marked = true

      return [{ ...message.data, content: [{ ...part, prompt_cache_breakpoint: BREAKPOINT }] }]
    }

    return [item]
  })

  return marked ? JSON.stringify({ ...body, input }) : undefined
}

const markChat = (body: z.infer<typeof ChatBody>, parts: TurnParts, mode: ViewCacheMode, size: number): string | undefined => {
  let marked = false
  let skillsMarked = false

  const messages = body.messages.flatMap((item) => {
    const message = ChatMessage.safeParse(item)
    const text = message.success ? soleText(message.data.content) : undefined

    if (!message.success || message.data.role !== "user" || text === undefined) return [item]

    if (text === parts.view) {
      marked = true

      return mode === "warm"
        ? splitView(parts.view, size).map((block) => ({ ...message.data, content: block.text }))
        : [{ ...message.data, content: viewParts(parts.view, size, "text", mode) }]
    }

    if (mode !== "warm" && parts.skills !== undefined && text === parts.skills) {
      marked = true
      skillsMarked = true

      return [{ ...message.data, content: [{ type: "text", text, ...mark(mode) }] }]
    }

    return [item]
  })

  if (!marked) return undefined

  // Anthropic: without loaded skills, the system prompt's end is the stable mark ahead of the view; the request's end
  // lets the turn's next step reuse this one.
  if (mode === "anthropic") {
    if (!skillsMarked) markEdge(messages, messages.findLastIndex((item) => ChatMessage.safeParse(item).data?.role === "system"))

    markEdge(messages, messages.length - 1)
  }

  return JSON.stringify({ ...body, messages })
}

// Marks the last text part of the message at `index`, turning plain string content into one text part.
const markEdge = (messages: unknown[], index: number): void => {
  const message = ChatMessage.safeParse(messages[index])

  if (!message.success) return

  const plain = PlainContent.safeParse(message.data.content)

  if (plain.success) {
    messages[index] = { ...message.data, content: [{ type: "text", text: plain.data, cache_control: CACHE_CONTROL }] }

    return
  }

  const content = PartsContent.parse(message.data.content)
  const last = content.findLastIndex((part) => Text.safeParse(part).success)

  if (last < 0) return

  messages[index] = { ...message.data, content: content.map((part, position) => (position === last ? { ...Text.parse(part), cache_control: CACHE_CONTROL } : part)) }
}

// The text of content that is one string or one text part, or undefined otherwise.
const soleText = (content: string | unknown[]): string | undefined => {
  const plain = PlainContent.safeParse(content)

  if (plain.success) return plain.data

  const [part, ...rest] = PartsContent.parse(content)
  const text = Text.safeParse(part)

  return rest.length === 0 && text.success ? text.data.text : undefined
}

const mark = (mode: MarkMode) => (mode === "openai" ? { prompt_cache_breakpoint: BREAKPOINT } : { cache_control: CACHE_CONTROL })

// The view as text parts. `openai` marks every complete block (up to the latest MAX_BREAKPOINTS); `anthropic` marks only
// the last complete block, keeping within Anthropic's four marks.
export const viewParts = (view: string, size: number, type: "input_text" | "text", mode: MarkMode): Part[] => {
  const blocks = splitView(view, size)
  const complete = blocks.filter((block) => block.complete).length

  return blocks.map((block, index) => {
    const fromEnd = complete - index
    const marked = block.complete && (mode === "openai" ? fromEnd <= MAX_BREAKPOINTS : fromEnd === 1)

    return marked ? { type, text: block.text, ...mark(mode) } : { type, text: block.text }
  })
}

/**
 * A warm-up request built from `template`, the session's latest turn request, so it shares that request's model,
 * instructions and tools byte for byte: its input is the skills and the complete view blocks, one message each, and
 * its output is capped. Undefined when there is nothing complete to warm or the template is neither a Responses nor a
 * Chat Completions body.
 */
export const warmBody = (template: string, parts: TurnParts, size: number): string | undefined => {
  const texts = [...(parts.skills === undefined ? [] : [parts.skills]), ...splitView(parts.view, size).flatMap((block) => (block.complete ? [block.text] : []))]

  if (texts.length === 0) return undefined

  const parsed: unknown = JSON.parse(template)
  const responses = ResponsesBody.safeParse(parsed)

  if (responses.success) {
    const input = texts.map((text) => ({ type: "message", role: "user", content: [{ type: "input_text", text }] }))

    return JSON.stringify({ ...responses.data, input, max_output_tokens: WARM_OUTPUT })
  }

  const chat = ChatBody.safeParse(parsed)

  if (!chat.success) return undefined

  const leading = chat.data.messages.filter((item) => {
    const role = ChatMessage.safeParse(item).data?.role

    return role === "system" || role === "developer"
  })

  const limit = "max_tokens" in chat.data ? { max_tokens: WARM_OUTPUT } : { max_completion_tokens: WARM_OUTPUT }

  return JSON.stringify({ ...chat.data, messages: [...leading, ...texts.map((text) => ({ role: "user", content: text }))], ...limit })
}

const OPEN = "<chat>\n"

const CLOSE = "\n</chat>"

/** The view cut to its first `lines` lines, so that its complete blocks are the view's complete blocks within them. */
export const viewPrefix = (view: string, lines: number): string => {
  const inner = view.startsWith(OPEN) && view.endsWith(CLOSE) ? view.slice(OPEN.length, -CLOSE.length) : ""

  if (inner === "") return view

  return `${OPEN}${inner.split("\n").slice(0, lines).join("\n")}${CLOSE}`
}

// Splits the view into blocks that join back to the same text: each complete block is the shortest run of whole lines
// of at least `size` bytes, and ends with its newline, so its text stays the same as lines are added after it; the
// remainder and the closing tag go last.
export const splitView = (view: string, size: number): { readonly text: string; readonly complete: boolean }[] => {
  const inner = view.startsWith(OPEN) && view.endsWith(CLOSE) ? view.slice(OPEN.length, -CLOSE.length) : ""

  if (inner === "") return [{ text: view, complete: false }]

  const all = inner.split("\n")
  const blocks: { readonly text: string; readonly complete: boolean }[] = []
  let start = 0
  let bytes = 0

  all.forEach((line, index) => {
    bytes += Buffer.byteLength(line) + 1

    if (bytes < size) return

    blocks.push({ text: `${start === 0 ? OPEN : ""}${all.slice(start, index + 1).join("\n")}\n`, complete: true })
    start = index + 1
    bytes = 0
  })

  const rest = all.slice(start).join("\n")

  blocks.push({ text: start === 0 ? `${OPEN}${rest}${CLOSE}` : rest === "" ? "</chat>" : `${rest}${CLOSE}`, complete: false })

  return blocks
}
