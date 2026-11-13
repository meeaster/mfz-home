import { describe, expect, it } from "vitest";

import { executorPattern } from "./server.js";

describe("executorPattern", () => {
  it("matches provider/model patterns with * wildcards and literal dots", () => {
    expect(executorPattern("*").test("openai/gpt-6.1-terra")).toBe(true);
    expect(executorPattern("openai/*").test("openai/gpt-6.1-terra")).toBe(true);
    expect(executorPattern("openai/*").test("claude-agent/opus")).toBe(false);
    expect(executorPattern("claude-agent/opus").test("claude-agent/opus")).toBe(true);
    expect(executorPattern("claude-agent/opus").test("claude-agent/opus-4")).toBe(false);
    expect(executorPattern("openai/gpt-6.1-*").test("openai/gpt-6x1-terra")).toBe(false);
  });
});
