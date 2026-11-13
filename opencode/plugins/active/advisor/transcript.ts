import type { Plugin } from "@opencode/plugin";
import type { SessionContext } from "@opencode/plugin/promise/session";
import { z } from "zod";

export const ADVISOR_TOOL = "advisor";

// The executor's last model request, as the `context` hook saw it: everything up to the step that called the advisor.
export type ExecutorRequest = Pick<SessionContext, "system" | "messages" | "tools">;

type RequestMessage = ExecutorRequest["messages"][number];

type RequestPart = RequestMessage["content"][number];

type ToolResult = Extract<RequestPart, { type: "tool-result" }>["result"];

type StoredMessage = Awaited<ReturnType<Plugin.Context["session"]["context"]>>[number];

// The step that called the advisor is still streaming when the tool runs, so it is read from the session store.
export type StepPart = Extract<StoredMessage, { type: "assistant" }>["content"][number];

type StepTool = Extract<StepPart, { type: "tool" }>;

type ToolContent = Extract<StepTool["state"], { status: "completed" }>["content"][number];

export function currentStep(messages: readonly StoredMessage[], messageID: string): readonly StepPart[] {
  const message = messages.findLast((candidate) => candidate.id === messageID);

  return message?.type === "assistant" ? message.content : [];
}

// Mirrors the API's `max_uses`: a turn starts at the latest user message and spans every step after it.
export function advisorCallsThisTurn(messages: readonly RequestMessage[], step: readonly StepPart[], callID: string) {
  const turnStart = messages.findLastIndex((message) => message.role === "user") + 1;

  let calls = 0;

  for (const message of messages.slice(turnStart)) {
    for (const part of message.content) {
      if (part.type === "tool-call" && part.name === ADVISOR_TOOL) calls += 1;
    }
  }

  for (const part of step) {
    if (part.type === "tool" && part.name === ADVISOR_TOOL && part.id !== callID) calls += 1;
  }

  return calls;
}

// Manual mode's gate: the latest user message has to mention the advisor.
export function userAskedForAdvisor(messages: readonly RequestMessage[]) {
  const latest = messages.findLast((message) => message.role === "user");

  return latest?.content.some((part) => part.type === "text" && /\badvisor\b/i.test(part.text)) ?? false;
}

// The parts of the executor's request that stay fixed while its conversation grows.
export function renderHeader(request: ExecutorRequest) {
  const system = request.system.map((part) => part.text).join("\n\n");

  const tools = Object.entries(request.tools)
    .map(([name, tool]) => `<tool name="${name}">\n${tool.description}\nInput schema: ${JSON.stringify(tool.input)}\n</tool>`)
    .join("\n");

  return `<system_prompt>\n${system}\n</system_prompt>\n\n<tools>\n${tools}\n</tools>`;
}

// The step that called the advisor, minus that call. It is still in progress, so the next continuation repeats it in
// its final form among the conversation messages.
export function renderStep(step: readonly StepPart[], callID: string) {
  const parts = step.flatMap((part) => (part.type === "tool" && part.id === callID ? [] : [renderStepPart(part)]));

  return ["[assistant, current step]", ...parts, "[assistant calls advisor; your reply is the result of this call]"].join("\n");
}

// The first message to a new advisor session carries the whole transcript.
export function startPrompt(header: string, messages: readonly string[], step: string) {
  return `<transcript>\n${header}\n\n<conversation>\n${[...messages, step].join("\n\n")}\n</conversation>\n</transcript>\n\nThe executor has called you. Write your advice now.`;
}

// Later messages carry only what happened since the previous call, so the advisor session's prefix stays cached.
export function continuePrompt(messages: readonly string[], step: string) {
  return `<transcript_continued>\n${[...messages, step].join("\n\n")}\n</transcript_continued>\n\nThe executor has called you again. Write your advice now.`;
}

export function renderMessage(message: RequestMessage) {
  return [`[${message.role}]`, ...message.content.map(renderPart)].join("\n");
}

function renderPart(part: RequestPart) {
  switch (part.type) {
    case "text":
      return part.text;
    case "reasoning":
      return part.text.length > 0 ? `<reasoning>\n${part.text}\n</reasoning>` : "<reasoning withheld by provider />";
    case "media":
      return `[attachment${part.filename === undefined ? "" : `: ${part.filename}`}]`;
    case "tool-call":
      return `<tool_call name="${part.name}" id="${part.id}">\n${JSON.stringify(part.input)}\n</tool_call>`;
    case "tool-result":
      return `<tool_result name="${part.name}" id="${part.id}">\n${renderResult(part.result)}\n</tool_result>`;
    case "compaction":
      return part.text ? `<compacted_history>\n${part.text}\n</compacted_history>` : "<compacted_history withheld by provider />";
    case "effort":
      return `[reasoning effort: ${part.effort ?? "default"}]`;
  }
}

function renderResult(result: ToolResult) {
  switch (result.type) {
    case "text":
      return resultText(result);
    case "json":
      return JSON.stringify(result.value);
    case "error":
      return `Error: ${resultText(result)}`;
    case "content":
      return result.value.map(renderContent).join("\n");
  }
}

function renderStepPart(part: StepPart) {
  switch (part.type) {
    case "text":
      return part.text;
    case "reasoning":
      return part.text.length > 0 ? `<reasoning>\n${part.text}\n</reasoning>` : "<reasoning withheld by provider />";
    case "tool":
      return renderStepTool(part);
  }
}

function renderStepTool(part: StepTool) {
  const call = (input: string) => `<tool_call name="${part.name}" id="${part.id}">\n${input}\n</tool_call>`;

  const result = (output: string) => `<tool_result name="${part.name}" id="${part.id}">\n${output}\n</tool_result>`;

  const { state } = part;

  switch (state.status) {
    case "streaming":
      return `${call(state.input)}\n[result pending]`;
    case "running":
      return `${call(JSON.stringify(state.input))}\n[result pending]`;
    case "completed":
      return `${call(JSON.stringify(state.input))}\n${result(state.content.map(renderContent).join("\n"))}`;
    case "error":
      return `${call(JSON.stringify(state.input))}\n${result(`Error: ${state.error.message}`)}`;
  }
}

// Text and error results carry an untyped value that is a string in practice.
function resultText(result: Extract<ToolResult, { type: "text" | "error" }>) {
  const text = z.string().safeParse(result.value);

  return text.success ? text.data : JSON.stringify(result.value);
}

function renderContent(content: ToolContent) {
  return content.type === "text" ? content.text : `[file: ${content.name ?? content.uri} (${content.mime})]`;
}
