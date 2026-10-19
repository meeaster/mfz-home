/** @jsxImportSource @opentui/solid */
import type { Definition } from "@opencode/plugin/tui/plugin";
import { createSignal } from "solid-js";

import type { ModelLifetime } from "./cache-lifetime.js";
import { IdleTimer } from "./idle-timer.js";
import { createLifetimeLearner } from "./lifetime-learner.js";
import { View } from "./view.js";
import type { ModelAliases } from "./models.js";
import { reactiveSessionID } from "./slot.js";

const plugin = {
  id: "session-usage-tui",
  setup(context) {
    // SAFETY: MFZ renders these options from the profile's reviewed plugin configuration.
    const options = context.options as {
      modelAliases?: ModelAliases;
      warnAt?: number;
      idleWarnAfter?: number;
      idleExpiredAfter?: number;
    };

    const thresholds = { warnAfter: options.idleWarnAfter ?? 1_200, expiredAfter: options.idleExpiredAfter ?? 1_800 };
    const [lifetimes, setLifetimes] = createSignal<Record<string, ModelLifetime>>({});

    // One learner per TUI process, outside the sidebar, which mounts and unmounts with the layout.
    const learner = createLifetimeLearner({ client: context.client, onEstimates: setLifetimes });

    const finished = (event: { data: { sessionID: string } }) => learner.request(event.data.sessionID);

    const unsubscribe = [
      context.data.on("session.execution.succeeded", finished),
      context.data.on("session.execution.failed", finished),
      context.data.on("session.execution.interrupted", finished)
    ];

    const removeFooter = context.ui.slot({
      append: "prompt.footer.status",
      render: (input) => (
        <IdleTimer context={context} sessionID={() => input.sessionID} thresholds={thresholds} lifetimes={lifetimes} />
      )
    });

    const removeSidebar = context.ui.slot({
      append: "sidebar.content",
      render: (input) => (
        <View
          context={context}
          sessionID={reactiveSessionID(input)}
          modelAliases={options.modelAliases ?? {}}
          warnAt={options.warnAt ?? 200_000}
          lifetimes={lifetimes}
          observe={learner.observe}
        />
      )
    });

    return async () => {
      removeFooter();
      removeSidebar();

      for (const stop of unsubscribe) stop();

      await learner.dispose();
    };
  }
} satisfies Definition;

export default plugin;
