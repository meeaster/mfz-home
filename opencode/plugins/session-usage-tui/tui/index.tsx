/** @jsxImportSource @opentui/solid */
import type { Definition } from "@opencode/plugin/tui/plugin";

import { View } from "./view.js";
import type { ModelAliases } from "./models.js";
import { reactiveSessionID } from "./slot.js";

const plugin = {
  id: "session-usage-tui",
  setup(context) {
    // SAFETY: MFZ renders these options from the profile's reviewed plugin configuration.
    const options = context.options as { modelAliases?: ModelAliases; warnAt?: number };

    return context.ui.slot({
      append: "sidebar.content",
      render: (input) => (
        <View
          context={context}
          sessionID={reactiveSessionID(input)}
          modelAliases={options.modelAliases ?? {}}
          warnAt={options.warnAt ?? 200_000}
        />
      )
    });
  }
} satisfies Definition;

export default plugin;
