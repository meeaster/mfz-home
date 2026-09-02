import { describe, expect, it, vi } from "vitest";
import plugin, { V2_ADVISOR_BLOCKER } from "./server.js";

describe("advisor V2 quarantine", () => {
  it("records the verified native API blockers", () => {
    expect(V2_ADVISOR_BLOCKER).toContain("command lifecycle");
    expect(V2_ADVISOR_BLOCKER).toContain("chat.message");
    expect(V2_ADVISOR_BLOCKER).toContain("session message-list");
    expect(V2_ADVISOR_BLOCKER).toContain("mutable tool after-hook");
  });

  it("does not register an unsafe V1-shaped adapter", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    plugin.setup();
    expect(warn).toHaveBeenCalledWith(`[advisor] ${V2_ADVISOR_BLOCKER}`);
    warn.mockRestore();
  });
});
