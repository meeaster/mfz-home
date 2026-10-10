// Disposable automatic route/cache prototype; the normal plugin and profiles are unchanged.
import { Plugin } from "@opencode/plugin"
import OptChat from "./core.js"
import { gatewayMode } from "./strategy.js"

export default Plugin.define({
  id: "optchat-request-prototype",
  async setup(ctx) {
    await ctx.model.transform((editor) => {
      for (const id of ["sol", "luna", "sonnet", "haiku"]) {
        const mode = gatewayMode(id)

        if (mode === undefined || editor.get("tyler", id) === undefined) continue

        editor.update("tyler", id, (draft) => {
          draft.package = mode === "openai" ? "@opencode/ai/providers/openai-compatible/responses" : "@opencode/ai/providers/openai-compatible"
        })
      }
    })

    return OptChat.setup({ ...ctx, options: { ...ctx.options, viewCache: "auto" } })
  },
})
