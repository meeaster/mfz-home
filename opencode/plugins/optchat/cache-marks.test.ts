import { expect, test } from "vitest"
import { markCache, splitView, viewParts, viewPrefix, warmBody } from "./cache-marks.js"

const view = (count: number): string => `<chat>\n${Array.from({ length: count }, (_, line) => `${line}|line ${line}`).join("\n")}\n</chat>`

const skills = "Skills loaded in this chat..."

const message = (text: string) => ({ type: "message", role: "user", content: [{ type: "input_text", text }] })

test("view blocks join back to the view, and complete blocks keep their text as the view grows", () => {
  for (const count of [1, 3, 4, 5, 8, 9]) expect(splitView(view(count), 36).map((block) => block.text).join("")).toBe(view(count))

  expect(splitView(view(9), 36).slice(0, 2)).toEqual(splitView(view(8), 36).slice(0, 2))
})

test("openai marks every complete view block; anthropic marks only the last", () => {
  const marks = (mode: "openai" | "anthropic") => viewParts(view(9), 36, "text", mode).map((part) => Object.keys(part).filter((key) => key !== "type" && key !== "text"))

  expect(marks("openai")).toEqual([["prompt_cache_breakpoint"], ["prompt_cache_breakpoint"], []])
  expect(marks("anthropic")).toEqual([[], ["cache_control"], []])
})

test("a Responses body gets breakpoints on its skills and view messages only", () => {
  const body = JSON.stringify({ model: "gpt-6.1-sol", input: [message(skills), message(view(5)), message("<turn/>")] })
  const marked = JSON.parse(markCache(body, { skills, view: view(5) }, "openai", 36) ?? "{}")

  expect(marked.input[0].content).toEqual([{ type: "input_text", text: skills, prompt_cache_breakpoint: { mode: "explicit" } }])
  expect(marked.input[1].content).toEqual(viewParts(view(5), 36, "input_text", "openai"))
  expect(marked.input[2]).toEqual(message("<turn/>"))
  expect(markCache(body, { skills, view: view(5) }, "anthropic", 36)).toBeUndefined()
})

test("warm sends each view block as its own message and leaves the skills alone", () => {
  const body = JSON.stringify({ model: "gpt-6-luna", input: [message(skills), message(view(9)), message("<turn/>")] })
  const split = JSON.parse(markCache(body, { skills, view: view(9) }, "warm", 36) ?? "{}")

  expect(split.input.map((item: { content: { text: string }[] }) => item.content[0].text)).toEqual([skills, ...splitView(view(9), 36).map((block) => block.text), "<turn/>"])
  expect(JSON.stringify(split)).not.toContain("prompt_cache_breakpoint")

  const chat = JSON.parse(markCache(JSON.stringify({ messages: [{ role: "user", content: view(9) }] }), { skills, view: view(9) }, "warm", 36) ?? "{}")

  expect(chat.messages.map((item: { content: string }) => item.content)).toEqual(splitView(view(9), 36).map((block) => block.text))
})

test("a warm-up request keeps the turn request's prefix and ends at the last complete block with its output capped", () => {
  const template = JSON.stringify({
    model: "gpt-6-luna",
    instructions: "System prompt",
    tools: [{ type: "function", name: "zoom" }],
    reasoning: { effort: "high" },
    max_output_tokens: 32_000,
    prompt_cache_key: "optchat-abc",
    input: [message(skills), message(view(9)), message("<turn/>"), { type: "message", role: "assistant", content: [{ type: "output_text", text: "Done." }] }],
  })

  const warm = JSON.parse(warmBody(template, { skills, view: view(9) }, 36) ?? "{}")
  const blocks = splitView(view(9), 36)

  expect(warm.input).toEqual([message(skills), message(blocks[0]?.text ?? ""), message(blocks[1]?.text ?? "")])
  expect(warm).toMatchObject({ model: "gpt-6-luna", instructions: "System prompt", tools: [{ type: "function", name: "zoom" }], reasoning: { effort: "high" }, prompt_cache_key: "optchat-abc", max_output_tokens: 16 })
  expect(warmBody(template, { skills: undefined, view: view(3) }, 36)).toBeUndefined()

  const chat = JSON.parse(warmBody(JSON.stringify({ messages: [{ role: "system", content: "System prompt" }, { role: "user", content: view(5) }], max_tokens: 4000 }), { skills: undefined, view: view(5) }, 36) ?? "{}")

  expect(chat).toEqual({ messages: [{ role: "system", content: "System prompt" }, { role: "user", content: blocks[0]?.text }], max_tokens: 16 })
})

test("a Chat Completions body for Claude gets at most four marks: skills, last view block, and the request's end", () => {
  const body = JSON.stringify({
    model: "bedrock/claude",
    messages: [
      { role: "system", content: "System prompt" },
      { role: "user", content: skills },
      { role: "user", content: view(9) },
      { role: "user", content: "<turn/>" },
      { role: "tool", tool_call_id: "call_1", content: "result" },
    ],
  })

  const marked = markCache(body, { skills, view: view(9) }, "anthropic", 36) ?? ""

  expect(marked.match(/cache_control/g)).toHaveLength(3)
  expect(JSON.parse(marked).messages[0]).toEqual({ role: "system", content: "System prompt" })
  expect(JSON.parse(marked).messages[4].content).toEqual([{ type: "text", text: "result", cache_control: { type: "ephemeral" } }])
})

test("without loaded skills, the system prompt's end is marked instead", () => {
  const body = JSON.stringify({ messages: [{ role: "system", content: "System prompt" }, { role: "user", content: view(5) }, { role: "user", content: "hi" }] })
  const marked = JSON.parse(markCache(body, { skills: undefined, view: view(5) }, "anthropic", 36) ?? "{}")

  expect(marked.messages[0].content).toEqual([{ type: "text", text: "System prompt", cache_control: { type: "ephemeral" } }])
  expect(markCache(JSON.stringify({ messages: [{ role: "user", content: "hi" }] }), { skills, view: view(5) }, "anthropic", 36)).toBeUndefined()
})

test("a view's prefix keeps exactly the complete blocks that end within its lines", () => {
  const full = splitView(view(9), 36).filter((block) => block.complete)

  expect(splitView(viewPrefix(view(9), 5), 36).filter((block) => block.complete)).toEqual(full.slice(0, 1))
  expect(splitView(viewPrefix(view(9), 8), 36).filter((block) => block.complete)).toEqual(full)
  expect(viewPrefix("not a view", 3)).toBe("not a view")
})
