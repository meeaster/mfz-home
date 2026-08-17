import type { Definition } from "@opencode-ai/plugin/tui/plugin";

import { createHerdrLifecycle } from "./lifecycle.js";

const plugin = {
  id: "herdr.opencode.v2",
  setup: createHerdrLifecycle
} satisfies Definition;

export default plugin;
