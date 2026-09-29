/** @jsxImportSource @opentui/solid */
import type { Definition } from "@opencode/plugin/tui/plugin";

import { View } from "./view.js";
import type { ModelAliases } from "./models.js";
import { reactiveSessionID } from "./slot.js";

const plugin = {
  id: "session-cost-tui",
  setup(context) {
    // SAFETY: MFZ renders modelAliases from the Work profile's reviewed plugin configuration.
    const aliases = context.options.modelAliases as ModelAliases | undefined;

    return context.ui.slot({
      append: "sidebar.content",
      render: (input) => (
        <View
          context={context}
          sessionID={reactiveSessionID(input)}
          modelAliases={aliases ?? {}}
        />
      )
    });
  }
} satisfies Definition;

export default plugin;
