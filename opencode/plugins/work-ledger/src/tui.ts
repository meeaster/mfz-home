import type { Context, Definition } from "@opencode-ai/plugin/tui/plugin";

import { resolveOptions } from "./core.js";
import { selectLedger } from "./tui/command.js";

export function registerCommands(context: Context, root?: string, configurationError?: string) {
  context.keymap.layer(() => ({
    mode: "global",
    commands: [
      {
        id: "work-ledger.select",
        title: "Work Ledger: Select",
        group: "Work Ledger",
        palette: true,
        async run() {
          if (!root) {
            await context.ui.dialog.alert({
              title: "Work Ledger unavailable",
              message: configurationError ?? "The ledger root is not configured.",
            });
            return;
          }
          await selectLedger(context, root);
        },
      },
    ],
  }));
}

const plugin = {
  id: "work-ledger.tui",
  setup(context) {
    let root: string | undefined;
    let configurationError: string | undefined;
    try {
      root = resolveOptions(context.options).root;
    } catch (error) {
      configurationError = error instanceof Error ? error.message : "The ledger root is not configured.";
    }
    context.ui.slot({
      append: "app",
      render: () => {
        registerCommands(context, root, configurationError);
        return null;
      },
    });
  },
} satisfies Definition;

export default plugin;
