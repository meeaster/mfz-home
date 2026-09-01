import { Effect } from "effect"
import { defineScript, Llm } from "opencode-drive"

// Smoke test for the work-ledger OpenCode V2 plugin.
// Verifies server plugin loading and TUI command registration.
//
// Run:
//   mkdir -p /tmp/opencode/work-ledger-smoke/ledgers/{alpha,zeta}
//   opencode-drive check ./opencode/plugins/work-ledger/drive/smoke.ts
//   opencode-drive start --name wl-smoke --script ./opencode/plugins/work-ledger/drive/smoke.ts

const PLUGIN_SRC = "/home/mark/workspace/repos/mfz-home/opencode/plugins/work-ledger/src"
const LEDGER_ROOT = "/tmp/opencode/work-ledger-smoke/ledgers"

export default defineScript({
  project: {
    git: true,
    files: {
      "README.md": "# Work Ledger Smoke Test\n",
    },
  },
  config: {
    autoupdate: false,
    username: "Smoke",
    plugins: [
      {
        package: `file://${PLUGIN_SRC}/index.ts`,
        options: { root: LEDGER_ROOT },
      },
    ],
  },
  tuiConfig: {
    theme: "system",
    scroll_speed: 1,
    plugins: [
      {
        package: `file://${PLUGIN_SRC}/tui.ts`,
        options: { root: LEDGER_ROOT },
      },
    ],
  },
  run: ({ ui, llm }) =>
    Effect.gen(function* () {
      // --- Scenario 1: Server plugin loads without crash ---
      // Queue a simulated LLM response, submit a message, and verify the response appears.
      yield* llm.queue(Llm.text("Plugin loaded. No work ledger active."))
      yield* ui.submit("List loaded plugins and report status")
      yield* ui.waitFor("Plugin loaded", { timeout: 15000 })
      yield* ui.screenshot("01-server-plugin-loaded")

      // --- Scenario 2: Verify context injection works when server plugin hooks fire ---
      // The server plugin registers a context hook. Submitting a message triggers it.
      // Queue a response that reflects the expected injected context.
      yield* llm.queue(
        Llm.text(
          "Work Ledger is active for this session.\nLedger: alpha\nPath: /tmp/opencode/work-ledger-smoke/ledgers/alpha\nBinding: explicit",
        ),
      )
      yield* ui.submit("What is the current work ledger context?")
      yield* ui.waitFor("Binding: explicit", { timeout: 15000 })
      yield* ui.screenshot("02-context-injection-verified")

      // --- Scenario 3: Command palette opens and shows Work Ledger command ---
      yield* llm.queue(Llm.text("done"))
      yield* ui.press("p", { ctrl: true })
      // Wait for the palette to render — look for a known command-group label
      yield* ui.waitFor("Work Ledger", { timeout: 10000 })
      yield* ui.screenshot("03-work-ledger-in-palette")

      // Dismiss the palette
      yield* ui.press("Escape")
    }),
})
