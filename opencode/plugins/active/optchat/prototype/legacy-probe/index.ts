// Disposable legacy-login probe: normal OptChat behavior, with shape-only stateless summary evidence.
import { appendFileSync } from "node:fs"
import { Plugin } from "@opencode/plugin"
import { z } from "zod"
import OptChat from "../core.js"
import CurrentOptChat from "../../server.js"

const Options = z.object({ output: z.string(), current: z.boolean().default(false) })

export default Plugin.define({
  id: "optchat-legacy-probe",
  async setup(ctx) {
    const options = Options.parse(ctx.options)
    const record = <Value>(value: Value): void => appendFileSync(options.output, JSON.stringify(value) + "\n")

    const plugin = options.current ? CurrentOptChat : OptChat

    return plugin.setup({
      ...ctx,
      generate: {
        ...ctx.generate,
        text: async (input) => {
          record({ type: "summary-start", model: input.model, promptBytes: Buffer.byteLength(input.prompt) })

          const result = await ctx.generate.text(input)

          record({ type: "summary-finish", model: input.model, replyBytes: Buffer.byteLength(result.text) })

          return result
        },
      },
    })
  },
})
