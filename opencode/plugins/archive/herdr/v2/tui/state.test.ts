import { describe, expect, it } from "vitest";

import { stateForEvent } from "./state.js";

describe("stateForEvent", () => {
  it("maps root status and blocking events", () => {
    expect(stateForEvent("session.status", "busy", false)).toBe("working");
    expect(stateForEvent("session.status", "retry", false)).toBe("working");
    expect(stateForEvent("session.status", "idle", false)).toBe("idle");
    expect(stateForEvent("permission.asked", undefined, false)).toBe("blocked");
    expect(stateForEvent("form.replied", undefined, false)).toBe("working");
    expect(stateForEvent("session.execution.failed", undefined, false)).toBe("blocked");
  });

  it("projects only child blocking transitions", () => {
    expect(stateForEvent("permission.asked", undefined, true)).toBe("blocked");
    expect(stateForEvent("form.cancelled", undefined, true)).toBe("working");
    expect(stateForEvent("session.status", "idle", true)).toBeUndefined();
    expect(stateForEvent("session.execution.failed", undefined, true)).toBeUndefined();
  });
});
