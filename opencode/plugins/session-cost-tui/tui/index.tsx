/** @jsxImportSource @opentui/solid */
import type { Definition } from "@opencode-ai/plugin/tui/plugin";

import { View } from "./view.js";
import { reactiveSessionID } from "./slot.js";

const plugin = {
  id: "mindframe-z.session-cost-tui",
  setup(context) {
    return context.ui.slot({
      append: "sidebar.content",
      render: (input) => <View context={context} sessionID={reactiveSessionID(input)} />
    });
  }
} satisfies Definition;

export default plugin;
