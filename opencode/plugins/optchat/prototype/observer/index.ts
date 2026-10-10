// Synthetic-run evidence only: record request shape and usage, never bodies or credentials.
import { appendFileSync } from "node:fs"
import { createHash } from "node:crypto"
import { Plugin } from "@opencode/plugin"
import { z } from "zod"

const Options = z.object({ output: z.string() })

const Text = z.object({ type: z.string().optional(), text: z.string().optional(), prompt_cache_breakpoint: z.object({ mode: z.string() }).optional(), cache_control: z.object({ type: z.string() }).optional() })

const Content = z.union([z.string(), z.array(Text)])

const Item = z.object({ role: z.string().optional(), type: z.string().optional(), content: Content.nullable().optional() })

const Body = z.object({ model: z.string(), reasoning: z.object({ effort: z.string().optional() }).optional(), instructions: z.string().optional(), input: z.array(Item).optional(), messages: z.array(Item).optional(), tools: z.array(z.object({ name: z.string().optional(), function: z.object({ name: z.string() }).optional() })).optional() })

const Usage = z.object({
  input_tokens: z.number().optional(), output_tokens: z.number().optional(),
  prompt_tokens: z.number().optional(), completion_tokens: z.number().optional(),
  input_tokens_details: z.object({ cached_tokens: z.number().optional(), cache_write_tokens: z.number().optional() }).optional(),
  prompt_tokens_details: z.object({ cached_tokens: z.number().optional(), cache_write_tokens: z.number().optional() }).optional(),
})

const Chunk = z.object({ usage: Usage.nullable().optional(), response: z.object({ usage: Usage.nullable().optional() }).optional() })

const digest = (value: string): string => createHash("sha256").update(value).digest("hex").slice(0, 16)

export default Plugin.define({
  id: "optchat-prototype-observer",
  async setup(ctx) {
    const options = Options.parse(ctx.options)
    const record = <Value>(value: Value): void => appendFileSync(options.output, JSON.stringify(value) + "\n")

    record({ type: "ready", version: ctx.app.version })

    await ctx.model.transform((editor) => {
      record({ type: "models", models: editor.list("tyler").map((model) => ({ id: model.id, modelID: model.modelID, family: model.family, canonical: model.canonical, package: model.package, capabilities: model.capabilities, compatibility: model.compatibility })) })
    })

    await ctx.permission.hook("evaluate", (event) => {
      record({ type: "permission", action: event.action, resources: event.resources, effect: event.effect })
    })

    await ctx.session.hook("http.request", async (event) => {
      const body = Body.parse(JSON.parse(await event.request.clone().text()))
      const items = body.input ?? body.messages ?? []
      const textOf = (item: z.infer<typeof Item>): string => Array.isArray(item.content) ? item.content.map((part) => part.text ?? "").join("") : item.content ?? ""
      const system = body.instructions ?? items.filter((item) => item.role === "system" || item.role === "developer").map(textOf).join("\n")
      const view = items.find((item) => textOf(item).startsWith("<chat>\n"))
      const blocks = view !== undefined && Array.isArray(view.content) ? view.content : []
      const marks = blocks.flatMap((part) => part.prompt_cache_breakpoint !== undefined ? ["openai"] : part.cache_control !== undefined ? ["anthropic"] : [])
      const skills = items.find((item) => textOf(item).startsWith("Skills loaded in this chat,"))
      const skillText = skills === undefined ? "" : textOf(skills)
      const images = items.flatMap((item) => Array.isArray(item.content) ? item.content.flatMap((part) => part.type === "input_image" || part.type === "image_url" ? [part.type] : []) : [])

      record({ type: "request", sessionID: event.sessionID, agent: event.agent, kind: event.kind, model: body.model, endpoint: new URL(event.request.url).pathname, affinityHash: digest(event.request.headers.get("session-id") ?? event.request.headers.get("x-litellm-session-id") ?? ""), systemHash: digest(system), toolsHash: digest(JSON.stringify(body.tools ?? [])), reasoningEffort: body.reasoning?.effort, optchatSystem: system.includes("You are OptChat"), viewBytes: view === undefined ? 0 : Buffer.byteLength(textOf(view)), viewPrefixHash: digest(blocks[0]?.text ?? ""), viewHash: digest(view === undefined ? "" : textOf(view)), skillsBytes: Buffer.byteLength(skillText), skillsHash: digest(skillText), skillsCount: (skillText.match(/<skill_content name=/g) ?? []).length, skillsFileCount: (skillText.match(/<skill_file path=/g) ?? []).length, scriptRetained: skillText.includes("SCRIPT-CONTENT-MUST-NOT-BECOME-SKILL-INSTRUCTIONS"), images, totalMarks: items.reduce((count, item) => count + (Array.isArray(item.content) ? item.content.filter((part) => part.cache_control !== undefined || part.prompt_cache_breakpoint !== undefined).length : 0), 0), marks, tools: body.tools?.map((tool) => tool.name ?? tool.function?.name) ?? [] })
    })

    await ctx.session.hook("http.response", (event) => {
      const identity = { sessionID: event.sessionID, kind: event.kind, model: event.model.id, status: event.response.status }

      if (!event.response.ok) {
        record({ type: "response", ...identity })

        return
      }

      void event.response.clone().text().then((text) => {
        const lines = text.includes("\ndata: ") || text.startsWith("data: ") ? text.split("\n").flatMap((line) => line.startsWith("data: ") && line !== "data: [DONE]" ? [line.slice(6)] : []) : [text]

        for (const line of lines) {
          if (!line.trim().startsWith("{")) continue

          const parsed = Chunk.safeParse(JSON.parse(line))

          if (!parsed.success) continue

          const usage = parsed.data.usage ?? parsed.data.response?.usage

          if (usage !== undefined && usage !== null) record({ type: "usage", ...identity, usage })
        }
      }).catch((error) => record({ type: "observer-error", ...identity, error: error instanceof Error ? error.name : "unknown" }))
    })
  },
})
