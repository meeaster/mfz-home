import { describe, expect, it, vi } from "vitest";

import plugin, { V2_USAGE_LOOKUP_BLOCKER } from "./server";

describe("subagent usage V2 quarantine", () => {
  it("does not register unsupported V2 behavior", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    plugin.setup();
    expect(warn).toHaveBeenCalledWith(`[subagent-usage] ${V2_USAGE_LOOKUP_BLOCKER}`);
    warn.mockRestore();
  });
});
