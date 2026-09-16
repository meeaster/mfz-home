import { describe, expect, it } from "vitest";

import { formatCachedInputCost } from "./render-state.js";

describe("cached input render state", () => {
  it("renders one concise approximate currency line", () => {
    expect(formatCachedInputCost(0.14)).toBe("Cached input now: ~$0.140");
  });

  it("omits the line when the estimate is unavailable", () => {
    expect(formatCachedInputCost(undefined)).toBeUndefined();
  });
});
