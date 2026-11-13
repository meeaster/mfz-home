import { describe, expect, it } from "vitest";

import {
  advisorCallsThisTurn,
  continuePrompt,
  renderHeader,
  renderMessage,
  renderStep,
  startPrompt,
  userAskedForAdvisor,
  type ExecutorRequest,
  type StepPart,
} from "./transcript.js";

type Message = ExecutorRequest["messages"][number];

const user = (text: string): Message => ({ role: "user", content: [{ type: "text", text }] });

const toolCall = (name: string, id: string): Message => ({
  role: "assistant",
  content: [{ type: "tool-call", id, name, input: {} }],
});

const toolResult = (name: string, id: string, value: string): Message => ({
  role: "tool",
  content: [{ type: "tool-result", id, name, result: { type: "text", value } }],
});

const runningTool = (name: string, id: string): StepPart => ({
  type: "tool",
  id,
  name,
  state: { status: "running", input: {}, metadata: {} },
  time: { created: 0 },
});

describe("advisorCallsThisTurn", () => {
  it("counts advisor calls since the latest user message, including earlier ones in the current step", () => {
    const messages = [
      user("first task"),
      toolCall("advisor", "a1"),
      toolResult("advisor", "a1", "old advice"),
      user("second task"),
      toolCall("advisor", "a2"),
      toolResult("advisor", "a2", "advice"),
      toolCall("read", "r1"),
      toolResult("read", "r1", "file"),
    ];

    const step = [runningTool("advisor", "a3"), runningTool("advisor", "a4")];

    expect(advisorCallsThisTurn(messages, step, "a4")).toBe(2);
  });
});

describe("userAskedForAdvisor", () => {
  it("opens only when the latest user message mentions the advisor", () => {
    const asked = [user("fix the cache"), toolCall("read", "r1"), toolResult("read", "r1", "x"), user("Consult the Advisor first")];

    expect(userAskedForAdvisor(asked)).toBe(true);
    expect(userAskedForAdvisor([...asked, user("now continue")])).toBe(false);
    expect(userAskedForAdvisor([user("check the advisory board"), toolCall("advisor", "a1")])).toBe(false);
  });
});

describe("advisor prompts", () => {
  const request: ExecutorRequest = {
    system: [{ type: "text", text: "SYSTEM PROMPT" }],
    tools: { read: { description: "Read a file", input: { type: "object" } } },
    messages: [user("fix the cache"), toolCall("read", "r1"), toolResult("read", "r1", "FILE CONTENTS")],
  };

  const step = renderStep([{ type: "text", text: "I will consult the advisor." }, runningTool("advisor", "a1")], "a1");

  it("starts with the system prompt, tools, history, and current step, but not the pending call", () => {
    const prompt = startPrompt(renderHeader(request), request.messages.map(renderMessage), step);

    for (const expected of ["SYSTEM PROMPT", "Read a file", "fix the cache", "FILE CONTENTS", "I will consult the advisor."])
      expect(prompt).toContain(expected);

    expect(prompt).not.toContain('id="a1"');
  });

  it("continues with only the messages it is given", () => {
    const prompt = continuePrompt([renderMessage(toolResult("read", "r2", "NEW RESULT"))], step);

    expect(prompt).toContain("NEW RESULT");
    expect(prompt).not.toContain("SYSTEM PROMPT");
    expect(prompt).not.toContain("FILE CONTENTS");
  });
});
