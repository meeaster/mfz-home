// Read-only wire shapes for a synthetic legacy-login probe. No HTTP hooks: preserve WebSocket selection.
import { appendFileSync } from "node:fs"
import { createHash } from "node:crypto"
import { Plugin } from "@opencode/plugin"
import { z } from "zod"

const Options = z.object({ output: z.string() })

const Part = z.object({ text: z.string().optional(), prompt_cache_breakpoint: z.object({ mode: z.string() }).optional() })

const Frame = z.object({ type: z.string().optional(), model: z.string().optional(), previous_response_id: z.string().optional(), input: z.array(z.object({ role: z.string().optional(), content: z.array(Part).optional() })).optional() })

const Usage = z.object({ input_tokens: z.number(), output_tokens: z.number(), input_tokens_details: z.object({ cached_tokens: z.number().optional() }).nullable().optional() })

const Received = z.object({ type: z.string(), response: z.object({ usage: Usage.nullable().optional() }).optional(), error: z.object({ code: z.string().optional() }).optional() })

export default Plugin.define({
  id: "optchat-ws-probe-observer",
  async setup(ctx) {
    const options = Options.parse(ctx.options)
    const record = <Value>(value: Value): void => appendFileSync(options.output, JSON.stringify(value) + "\n")

    await ctx.session.hook("model.request", (event) => {
      record({ type: "model-request", sessionID: event.sessionID, kind: event.kind, model: event.model.id, baseURL: event.baseURL })
    })

    await ctx.session.hook("experimental.ws.handshake", (event) => {
      const affinity = event.headers["session-id"]

      record({ type: "ws-handshake", sessionID: event.sessionID, kind: event.kind, endpoint: new URL(event.url).origin + new URL(event.url).pathname, affinityHash: affinity === undefined ? null : createHash("sha256").update(affinity).digest("hex").slice(0, 12) })
    })

    await ctx.session.hook("experimental.ws.send", (event) => {
      const frame = Frame.parse(JSON.parse(event.frame))
      const texts = frame.input?.flatMap((item) => item.content?.flatMap((part) => part.text === undefined ? [] : [part.text]) ?? []) ?? []

      record({ type: "ws-send", sessionID: event.sessionID, kind: event.kind, model: frame.model, continued: frame.previous_response_id !== undefined, inputItems: frame.input?.length, viewBytes: texts.reduce((bytes, text) => bytes + (text.startsWith("<chat>\n") ? Buffer.byteLength(text) : 0), 0), marks: frame.input?.reduce((count, item) => count + (item.content?.filter((part) => part.prompt_cache_breakpoint !== undefined).length ?? 0), 0) })
    })

    await ctx.session.hook("experimental.ws.receive", (event) => {
      const frame = Received.safeParse(JSON.parse(event.frame))

      if (!frame.success) return

      const usage = frame.data.response?.usage

      if (usage !== undefined && usage !== null) record({ type: "ws-usage", sessionID: event.sessionID, kind: event.kind, usage })

      if (frame.data.error !== undefined) record({ type: "ws-error", code: frame.data.error.code })
    })
  },
})
