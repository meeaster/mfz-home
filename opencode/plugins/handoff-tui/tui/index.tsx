import type { Definition } from "@opencode/plugin/tui/plugin";

import { runHandoff } from "./command.js";

const plugin = {
  id: "handoff-tui",
  setup(context) {
    context.ui.slot({
      append: "app",
      render: () => {
        context.keymap.layer(() => ({
          mode: "global",
          commands: [
            {
              id: "handoff",
              title: "Handoff and compact",
              group: "Session",
              slash: { name: "handoff", arguments: true },
              run: (input) => runHandoff(context, input),
            },
          ],
        }));

        return null;
      },
    });
  },
} satisfies Definition;

export default plugin;
