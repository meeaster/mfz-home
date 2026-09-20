import { existsSync } from "node:fs"
import { resolve } from "node:path"
import { Effect, Stream } from "effect"
import { Llm, OpenCodeDriver } from "opencode-drive"

const modulePackagePath = resolve(import.meta.dirname, "..")

// Drive bundles one-shot modules into a temporary directory; the package script keeps this package as cwd.
const pluginPath = existsSync(resolve(modulePackagePath, "package.json")) ? modulePackagePath : process.cwd()

const pluginSourcePath = resolve(pluginPath, "server.ts")

const childMarker = "SESSION_USAGE_PROBE_OK"

export default OpenCodeDriver.use(
  {
    opencode: { compatibility: "required" },
    project: {
      git: false,
      files: {
        ".opencode/opencode.json": JSON.stringify({
          $schema: "https://opencode.ai/config.json",
          plugins: [pluginPath],
        }),
      },
    },
  },
  ({ ui, llm, opencode }) =>
    Effect.gen(function* () {
      yield* llm.serve((_request, index) => Stream.fromIterable(responseFor(index)))

      yield* ui.submit(
        "Make exactly one foreground direct-child subagent call. Ask it to return only SESSION_USAGE_PROBE_OK without tools or file changes. Then call session_usage exactly once with no arguments. Make no other tool calls.",
      )
      yield* ui.waitFor(childMarker, { timeout: 30_000 })
      yield* ui.waitFor("Session usage query completed.", { timeout: 30_000 })

      const info = yield* opencode.server.info().pipe(Effect.orDie)
      assert(info.version === "2.0.9", `Expected OpenCode 2.0.9, got ${info.version}`)

      const plugins = yield* opencode.plugin.list().pipe(Effect.orDie)
      const plugin = plugins.data.find((entry) => entry.id === "session-usage")
      assert(plugin?.state.status === "active", "session-usage plugin was not active")
      assert(plugin?.source.type === "local" && plugin.source.path === pluginSourcePath, "Unexpected session-usage plugin source")

      const sessions = yield* opencode.session.list().pipe(Effect.orDie)
      assert(sessions.data.length === 2, `Expected one parent and one child, got ${sessions.data.length} sessions`)

      const parents = sessions.data.filter((session) => session.parentID === undefined)
      assert(parents.length === 1, `Expected one parent session, got ${parents.length}`)
      const parent = parents[0]

      const children = sessions.data.filter((session) => session.parentID === parent.id)
      assert(children.length === 1, `Expected one direct child, got ${children.length}`)
      const child = children[0]
      assert(child.outcome === "succeeded", `Direct child did not succeed: ${child.outcome}`)

      const messages = yield* Effect.forEach([parent, child], (session) =>
        opencode.message.list({ sessionID: session.id }).pipe(Effect.orDie, Effect.map((result) => ({ sessionID: session.id, result }))),
      )

      const parentMessages = messages.find((entry) => entry.sessionID === parent.id)?.result.data ?? []
      const childMessages = messages.find((entry) => entry.sessionID === child.id)?.result.data ?? []

      const childText = childMessages
        .filter((message) => message.type === "assistant")
        .flatMap((message) => message.content.filter((part) => part.type === "text").map((part) => part.text))
        .join("\n")

      assert(childText === childMarker, `Unexpected direct-child result: ${childText}`)

      const toolParts = parentMessages
        .filter((message) => message.type === "assistant")
        .flatMap((message) => message.content.filter((part) => part.type === "tool"))

      assert(toolParts.filter((part) => part.name === "subagent").length === 1, "Expected exactly one subagent call")

      const sessionUsageParts = toolParts.filter((part) => part.name === "session_usage")
      assert(sessionUsageParts.length === 1, "Expected exactly one session_usage call")
      const sessionUsage = sessionUsageParts[0]

      if (sessionUsage.state.status === "error") {
        throw new Error(`session_usage failed: ${sessionUsage.state.error.message}`)
      }

      assert(sessionUsage.state.status === "completed", `session_usage was ${sessionUsage.state.status}`)

      const sessionUsageText = sessionUsage.state.content
        .filter((part) => part.type === "text")
        .map((part) => part.text)
        .join("\n")

      assert(sessionUsageText.includes("Current session"), `Unexpected session_usage result: ${sessionUsageText}`)

      // Drive's simulation model has zero usage and no proven models.dev price.
      // This boundary check intentionally does not assert the optional usage tag;
      // focused tests cover priced tag settlement.
      yield* Effect.log(
        JSON.stringify({
          kind: "session-usage-drive-regression",
          serverVersion: info.version,
          plugin: plugin.id,
          parentID: parent.id,
          childID: child.id,
          childMarker,
          subagentCalls: 1,
          sessionUsageCalls: 1,
          sessionUsageState: "completed",
          pricingTag: "not asserted for zero-usage Drive simulation",
        }),
      )
    }),
).pipe(Effect.orDie)

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function responseFor(index: number): ReadonlyArray<Llm.Output> {
  switch (index) {
    case 0:
      return [
        Llm.toolCall({
          index: 0,
          id: "call_subagent",
          name: "subagent",
          input: {
            description: "Run the session usage probe",
            prompt: `Return only ${childMarker}. Do not use tools or change files.`,
            agent: "explore",
          },
        }),
        Llm.finish("tool-calls"),
      ]
    case 1:
      return [Llm.text(childMarker)]
    case 2:
      return [
        Llm.toolCall({
          index: 0,
          id: "call_session_usage",
          name: "session_usage",
          input: {},
        }),
        Llm.finish("tool-calls"),
      ]
    default:
      return [Llm.text(`${childMarker}\nSession usage query completed.`)]
  }
}
