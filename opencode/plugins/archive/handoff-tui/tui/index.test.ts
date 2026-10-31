import type { Context } from "@opencode/plugin/tui/plugin";
import { describe, expect, it, vi } from "vitest";

import plugin from "./index.js";

type AppSlotClaim = Extract<Parameters<Context["ui"]["slot"]>[0], { readonly append: "app" }>;

describe("handoff TUI plugin registration", () => {
  it("registers the keymap from the inert app slot render", () => {
    const layer = vi.fn();
    let claim: AppSlotClaim | undefined;

    const slot = vi.fn((value: AppSlotClaim) => {
      claim = value;

      return () => {};
    });

    const contextFixture = {
      keymap: { layer },
      ui: { slot },
    };

    // SAFETY: setup only reads keymap.layer and ui.slot in this test.
    const context = Object.assign(Object.create(null), contextFixture) as Context;

    plugin.setup(context);

    expect(layer).not.toHaveBeenCalled();
    expect(claim).toEqual(expect.objectContaining({ append: "app" }));

    if (!claim) throw new Error("The plugin did not claim the app slot.");

    expect(claim.render({})).toBeNull();
    expect(layer).toHaveBeenCalledTimes(1);

    const definition = layer.mock.calls[0]?.[0]();
    expect(definition).toMatchObject({
      mode: "global",
      commands: [
        {
          id: "handoff",
          title: "Handoff and compact",
          group: "Session",
          slash: { name: "handoff", arguments: true },
        },
      ],
    });
  });
});
