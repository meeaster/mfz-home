// The `hints` writer: OpenCode cache hints on an OptChat turn, for protocols OpenCode lowers them on (Anthropic
// Messages and its kin). OpenCode counts these hints against Anthropic's four marks and fills only what is left with
// its own, so a turn never sends more than four. This is the gist's marking: one hint on the last whole view block
// and one on the request's end, plus one on the loaded skills so a merge batch, which rewrites the view, still reads
// them from the cache.

import { CacheHint, Message, type ContentPart } from "@opencode/ai"
import { splitView } from "./cache-marks.js"

const HINT = new CacheHint({ type: "ephemeral" })

type Cacheable = Extract<ContentPart, { readonly type: "text" | "media" | "tool-call" | "tool-result" | "reasoning" }>

const cacheable = (part: ContentPart): part is Cacheable =>
  part.type === "text" || part.type === "media" || part.type === "tool-call" || part.type === "tool-result" || part.type === "reasoning"

/** The view as one user message of blocks, with a hint on the last complete block. */
export const hintedView = (view: string, size: number): Message => {
  const blocks = splitView(view, size)
  const last = blocks.findLastIndex((block) => block.complete)

  return Message.user(blocks.map((block, index) => (index === last ? { type: "text", text: block.text, cache: HINT } : { type: "text", text: block.text })))
}

export const hintedText = (text: string): Message => Message.user({ type: "text", text, cache: HINT })

/** The messages with a hint on the request's end: the last message's last text part, or its last cacheable part. */
export const withEndHint = (messages: readonly Message[]): Message[] => {
  const result = [...messages]
  const index = result.findLastIndex((message) => message.content.some(cacheable))
  const target = result[index]

  if (target === undefined) return result

  const textIndex = target.content.findLastIndex((part) => part.type === "text")
  const markAt = textIndex >= 0 ? textIndex : target.content.findLastIndex(cacheable)

  result[index] = Message.make({ ...target, content: target.content.map((part, position) => (position === markAt && cacheable(part) ? { ...part, cache: HINT } : part)) })

  return result
}
