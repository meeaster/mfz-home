import { describe, expect, it } from "vitest";

import { reactiveSessionID } from "./slot.js";

describe("session cost slot input", () => {
  it("keeps reading the host's reactive session property", () => {
    let current = "one";
    const sessionID = reactiveSessionID({ get sessionID() { return current; } });
    expect(sessionID()).toBe("one");
    current = "two";
    expect(sessionID()).toBe("two");
  });
});
