import { describe, expect, it } from "vitest";

import plugin from "../src/index.js";

describe("Work Ledger", () => {
  it("exports a loadable server plugin", () => {
    expect(plugin.id).toBe("work-ledger");
    expect(plugin.setup).toBeTypeOf("function");
  });
});
