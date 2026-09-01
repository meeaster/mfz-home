import type { Context } from "@opencode-ai/plugin/tui/plugin";
import { describe, expect, it, vi } from "vitest";

import plugin, { registerCommands } from "../src/tui.js";

describe("Work Ledger TUI plugin", () => {
  it("claims the app slot", () => {
    const slot = vi.fn(() => vi.fn());
    const contextFixture = {
      options: { root: "/ledgers" },
      ui: { slot },
    };
    // SAFETY: The plugin only reads options and ui.slot in this test.
    const context = Object.assign(Object.create(null), contextFixture) as Context;
    plugin.setup(context);
    expect(slot).toHaveBeenCalledWith(expect.objectContaining({ append: "app" }));
  });

  it("registers the palette command from the mounted slot", () => {
    const layer = vi.fn();
    const contextFixture = { keymap: { layer } };
    // SAFETY: registerCommands only reads keymap.layer until the command runs.
    const context = Object.assign(Object.create(null), contextFixture) as Context;
    registerCommands(context, "/ledgers");
    const definition = layer.mock.calls[0]?.[0]();
    expect(definition).toMatchObject({
      mode: "global",
      commands: [
        {
          id: "work-ledger.select",
          title: "Work Ledger: Select",
          group: "Work Ledger",
          palette: true,
        },
      ],
    });
  });
});
