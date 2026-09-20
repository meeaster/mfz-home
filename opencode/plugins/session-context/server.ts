import { Plugin } from "@opencode/plugin";

const DEFAULT_BYTE_BUDGET = 40_000;

const TOOL_RESULT_LIMIT = 400;

const SHELL_OUTPUT_LIMIT = 200;

const TRUNCATED_SUFFIX = "… (truncated)";

const sessionContextInput = {
  type: "object",
  properties: {
    sessionID: { type: "string" },
    sinceMarker: { type: "string" },
  },
  required: ["sessionID"],
  additionalProperties: false,
} as const;

const sessionContextDescription =
  "Loads the target session's FULL active context as a filtered transcript. WARNING: this can be very large — often tens of thousands of tokens — so call it ONLY when explicitly instructed: the user naming it in their request, or a dispatching parent's brief that explicitly directs you to call it. Never call it on your own initiative to gather background. Pass sinceMarker from a previous MARKER line to fetch only newer messages. While MORE: true, call again with the returned MARKER as sinceMarker.";

export type SessionContextInput = {
  sessionID: string;
  sinceMarker?: string;
};

type ContextMessage = Awaited<ReturnType<Plugin.Context["session"]["context"]>>[number];

export type SessionContextMessage = ContextMessage;

type AssistantMessage = Extract<ContextMessage, { type: "assistant" }>;

type AssistantPart = AssistantMessage["content"][number];

type AssistantToolPart = Extract<AssistantPart, { type: "tool" }>;

type AssistantToolState = AssistantToolPart["state"];

type ToolResultState = Extract<AssistantToolState, { status: "completed" | "error" }>;

type ToolContent = NonNullable<ToolResultState["content"]>[number];

type ToolInput = AssistantToolState["input"];

type SessionHeader = {
  id: string;
  title?: string;
};

export type SessionContextSource = {
  session: {
    get: (input: { sessionID: string }) => Promise<SessionHeader>;
    context: (input: { sessionID: string }) => Promise<readonly ContextMessage[]>;
  };
};

type PreparedRow = {
  id: string;
  originalIndex: number;
  rendered: string | undefined;
  settled: boolean;
};

type Marker = {
  id: string;
  originalIndex: number | undefined;
};

const omittedMessageTypes = new Set(["system", "agent-switched", "model-switched", "location-switched", "idle"]);

function byteLength(value: string) {
  return Buffer.byteLength(value, "utf8");
}

function stringify(value: ToolInput) {
  try {
    const result = JSON.stringify(value);

    return result === undefined ? String(value) : result;
  } catch {
    return "[unserializable]";
  }
}

function toolInputText(state: AssistantToolState) {
  if (state.status === "streaming") return state.input;

  return stringify(state.input);
}

function truncatePrefix(value: string, limit: number) {
  if (value.length <= limit) return value;

  return `${value.slice(0, limit)}${TRUNCATED_SUFFIX}`;
}

function contentText(content: readonly ToolContent[]) {
  const parts: string[] = [];

  for (const item of content) {
    if (item.type === "text") {
      parts.push(item.text);
      continue;
    }

    parts.push(`[file: ${item.name ?? item.uri}]`);
  }

  return parts.join("\n");
}

function toolResultText(state: ToolResultState) {
  const result = state.content ? contentText(state.content) : "";

  if (result) return result;

  return state.status === "error" ? `${state.error.type}: ${state.error.message}` : "";
}

function renderAssistant(message: AssistantMessage) {
  const lines = ["[ASSISTANT]"];

  for (const part of message.content) {
    if (part.type === "text") {
      lines.push(part.text);
      continue;
    }

    if (part.type !== "tool") continue;

    lines.push(`TOOL CALL ${part.name}: ${toolInputText(part.state)}`);

    if (part.state.status === "completed" || part.state.status === "error") {
      lines.push(`TOOL RESULT: ${truncatePrefix(toolResultText(part.state), TOOL_RESULT_LIMIT)}`);
    }
  }

  return lines.join("\n");
}

function renderUser(message: Extract<ContextMessage, { type: "user" }>) {
  const lines = ["[USER]", message.text];
  const files: string[] = [];
  const agents: string[] = [];
  const skills: string[] = [];

  for (const file of message.files ?? []) {
    if (file.name) files.push(file.name);
  }

  for (const agent of message.agents ?? []) agents.push(agent.name);

  for (const skill of message.skills ?? []) skills.push(skill.name);

  if (files.length > 0) lines.push(`ATTACHMENTS: ${files.join(", ")}`);

  if (agents.length > 0) lines.push(`AGENTS: ${agents.join(", ")}`);

  if (skills.length > 0) lines.push(`SKILLS: ${skills.join(", ")}`);

  return lines.join("\n");
}

function renderShell(message: Extract<ContextMessage, { type: "shell" }>) {
  const output = message.output?.output;

  return output
    ? `[SHELL] ${message.command} (${message.status}) ${truncatePrefix(output, SHELL_OUTPUT_LIMIT)}`
    : `[SHELL] ${message.command} (${message.status})`;
}

function renderMessage(message: ContextMessage) {
  switch (message.type) {
    case "user":
      return renderUser(message);
    case "synthetic":
      return `[SYNTHETIC]\n${message.text}`;
    case "assistant":
      return renderAssistant(message);
    case "skill":
      return `[SKILL] ${message.name} (body omitted — load via the skill tool)`;
    case "shell":
      return renderShell(message);
    case "compaction":
      if (message.status === "completed") return `[COMPACTION SUMMARY] ${message.summary}`;

      if (message.status === "running") return `[COMPACTION] running (${message.reason})`;

      return `[COMPACTION] failed (${message.reason}): ${message.error.message}`;
    case "system":
    case "agent-switched":
    case "model-switched":
    case "location-switched":
    case "idle":
      return undefined;
  }
}

function isSettled(message: ContextMessage) {
  if (message.type === "assistant") {
    if (message.time.completed === undefined) return false;

    for (const part of message.content) {
      if (part.type === "tool" && (part.state.status === "streaming" || part.state.status === "running")) {
        return false;
      }
    }

    return true;
  }

  if (message.type === "compaction") return message.status !== "running";

  if (message.type === "shell") return message.status !== "running";

  return true;
}

function prepareRows(messages: readonly ContextMessage[]) {
  const rows: PreparedRow[] = [];

  for (const [originalIndex, message] of messages.entries()) {
    rows.push({
      id: message.id,
      originalIndex,
      rendered: omittedMessageTypes.has(message.type) ? undefined : renderMessage(message),
      settled: isSettled(message),
    });
  }

  return rows;
}

function markerFor(rows: readonly PreparedRow[], count: number): Marker {
  for (let index = count - 1; index >= 0; index -= 1) {
    const row = rows[index];

    if (row.settled) return { id: row.id, originalIndex: row.originalIndex };
  }

  return { id: "none", originalIndex: undefined };
}

function inFlightCount(rows: readonly PreparedRow[], marker: Marker) {
  const start = marker.originalIndex === undefined ? 0 : marker.originalIndex + 1;
  let count = 0;

  for (const row of rows) {
    if (row.originalIndex >= start && !row.settled) count += 1;
  }

  return count;
}

function transcriptFor(rows: readonly PreparedRow[], count: number) {
  const blocks: string[] = [];

  for (let index = 0; index < count; index += 1) {
    const rendered = rows[index].rendered;

    if (rendered !== undefined) blocks.push(rendered);
  }

  return blocks.join("\n\n");
}

function outputFor(
  rows: readonly PreparedRow[],
  count: number,
  sessionTitle: string,
  sessionID: string,
  sinceMarker: string | undefined,
  markerFound: boolean,
  skipped: number,
) {
  const marker = markerFor(rows, count);
  const more = count < rows.length;
  const metadata = [`SESSION: ${sessionTitle} (${sessionID})`];

  if (sinceMarker !== undefined && markerFound) {
    metadata.push(`DELTA: ${count} messages after ${sinceMarker} (${skipped} skipped)`);
  } else if (sinceMarker !== undefined) {
    metadata.push(`NOTICE: marker ${sinceMarker} not found in current window — returning full context`);
  } else {
    metadata.push(`CONTEXT: ${count} messages, active post-compaction window`);
  }

  metadata.push(`MARKER: ${marker.id}`, `MORE: ${more}`);

  const unsettled = inFlightCount(rows, marker);

  if (unsettled > 0) {
    metadata.push(`IN FLIGHT: ${unsettled} unsettled message(s) after the marker; re-read with sinceMarker to fetch their completion`);
  }

  const transcript = transcriptFor(rows, count);

  return `${metadata.join("\n")}\n\n${transcript}`;
}

export function formatSessionContext(
  messages: readonly ContextMessage[],
  sessionTitle: string,
  sessionID: string,
  sinceMarker?: string,
  byteBudget = DEFAULT_BYTE_BUDGET,
) {
  const allRows = prepareRows(messages);
  const requestedMarker = sinceMarker !== undefined;
  const markerIndex = requestedMarker ? messages.findIndex((message) => message.id === sinceMarker) : -1;
  const markerFound = !requestedMarker || markerIndex >= 0;
  const startIndex = markerFound && markerIndex >= 0 ? markerIndex + 1 : 0;
  const rows = allRows.slice(startIndex);
  const skipped = markerFound && markerIndex >= 0 ? startIndex : 0;
  const budget = Math.max(1, byteBudget);

  if (rows.length === 0) return outputFor(rows, 0, sessionTitle, sessionID, sinceMarker, markerFound, skipped);

  let count = 0;

  for (let candidate = 1; candidate <= rows.length; candidate += 1) {
    const output = outputFor(rows, candidate, sessionTitle, sessionID, sinceMarker, markerFound, skipped);

    if (byteLength(output) <= budget) {
      count = candidate;
      continue;
    }

    if (count === 0) count = 1;
    break;
  }

  return outputFor(rows, count, sessionTitle, sessionID, sinceMarker, markerFound, skipped);
}

export async function readSessionContext(context: SessionContextSource, input: SessionContextInput) {
  try {
    const [session, messages] = await Promise.all([
      context.session.get({ sessionID: input.sessionID }),
      context.session.context({ sessionID: input.sessionID }),
    ]);

    return {
      content: formatSessionContext(messages, session.title ?? "Untitled", input.sessionID, input.sinceMarker),
    };
  } catch (error) {
    const message = error instanceof Error && error.message ? error.message : "unable to decode the session context";

    return { content: `ERROR: ${message}` };
  }
}

export async function setupSessionContext(context: Plugin.Context) {
  const registration = await context.tool.transform((editor) => {
    editor.add({
      name: "session_context",
      description: sessionContextDescription,
      input: sessionContextInput,
      execute: async (rawInput) => {
        // SAFETY: OpenCode validates rawInput against the JSON schema declared above before execution.
        const input = rawInput as SessionContextInput;

        return readSessionContext(context, input);
      },
    });
  });

  return async () => {
    await registration.dispose();
  };
}

export default Plugin.define({
  id: "session-context",
  setup: setupSessionContext,
});
