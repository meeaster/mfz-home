import { describe, expect, it } from "vitest";

import { appendUsageContent, summarizeUsage, usageTag } from "./server.js";

describe("subagent usage V2", () => {
  it("reports invocation and session cost without repeating the child session ID", () => {
    expect(usageTag(0.0123, 0.0847, 12_640)).toBe(
      '<subagent-usage invocation-cost-usd="0.0123" session-cost-usd="0.0847" current-context-tokens="12640" />',
    );
  });

  it("appends usage to the text-part content returned by the built-in subagent", () => {
    expect(appendUsageContent([{ type: "text", text: "child output" }], "<subagent-usage />")).toEqual([
      { type: "text", text: "child output" },
      { type: "text", text: "<subagent-usage />" },
    ]);
  });

  it("sums invocation steps while using the latest step for current context", () => {
    expect(
      summarizeUsage([
        {
          sessionID: "ses_child",
          model: { providerID: "openai", id: "model" },
          tokens: { input: 10_000, output: 2_000, reasoning: 0, cache: { read: 20_000, write: 0 } },
          step: true,
        },
        {
          sessionID: "ses_child",
          model: { providerID: "openai", id: "model" },
          tokens: { input: 12_000, output: 1_000, reasoning: 50, cache: { read: 40_000, write: 500 } },
          step: true,
        },
      ]),
    ).toEqual({
      tokens: {
        input: 22_000,
        output: 3_000,
        reasoning: 50,
        cache: { read: 60_000, write: 500 },
      },
      currentContext: 52_500,
    });
  });
});
