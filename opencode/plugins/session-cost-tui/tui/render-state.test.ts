import { describe, expect, it } from "vitest";

import { formatCost } from "./render-state.js";

describe("session cost render state", () => {
  it("renders the post-compaction cost before the full-session total", () => {
    expect(formatCost({ model: "Priced", amount: 1.234, sinceCompaction: 0.456 }))
      .toBe("Priced: $0.456 ($1.234)");
  });

  it("uses the full-session total when no compaction boundary exists", () => {
    expect(formatCost({ model: "Priced", amount: 1.234 })).toBe("Priced: $1.234 ($1.234)");
  });
});
