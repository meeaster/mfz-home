// Gives a Claude Code run an MCP tool that runs a task on another model, such as GPT, through OpenCode. Each
// call runs a real OpenCode child session under the session Claude is serving. Claude Code's own Agent tool
// stays the way to delegate everything else.
import { createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";
import type { Plugin } from "@opencode/plugin";
import { z } from "zod";
import { PROVIDER_ID } from "./registry.js";

export const SERVER_NAME = "opencode";

const TOOL = "delegate_to_model";

export const TOOL_NAME = `mcp__${SERVER_NAME}__${TOOL}`;

// OpenCode agent the child session runs when the call names none.
const DEFAULT_AGENT = "general";

type Context = Plugin.Context;

type SessionID = Parameters<Context["session"]["prompt"]>[0]["sessionID"];

type Model = { id: string; providerID: string; variant?: string };

type Message = Awaited<ReturnType<Context["session"]["context"]>>[number];

type Reply = Extract<Message, { type: "assistant" }>;

// The SDK passes the MCP request's extra data, which carries the call's abort signal.
const HandlerExtra = z.object({ signal: z.instanceof(AbortSignal) });

const Input = {
  model: z.string().describe("Model to run, as provider/model or provider/model#variant, for example openai/gpt-6-luna#high"),
  description: z.string().describe("Short 3-5 word label for the task"),
  prompt: z.string().describe("Complete, self-contained instructions; the other model sees nothing else"),
  agent: z.string().optional().describe(`OpenCode agent to run the task, when the user names one; defaults to ${DEFAULT_AGENT}`),
  sessionID: z.string().optional().describe("Continue an earlier session started by this tool"),
};

export async function openCodeSubagentServer(context: Context, parentID: SessionID) {
  const { data: agents } = await context.agent.list();

  // Agents that already run on Claude Code would only start another Claude run.
  const catalog = agents.flatMap((agent) => {
    if (agent.mode === "primary" || agent.hidden || agent.model?.providerID === PROVIDER_ID) return [];

    const model = agent.model ? ` (default model ${agent.model.providerID}/${agent.model.id})` : "";

    return [`- ${agent.id}${model}: ${agent.description ?? "no description"}`];
  });

  const delegate = tool(
    TOOL,
    [
      "Run a task on a non-Claude model, such as GPT, in an OpenCode child session and return its answer.",
      "Use it only when the user asks for a different model or names an OpenCode agent, for example \"have GPT review this\".",
      "For everything else, including exploring, research and other delegation, use your own Agent tool and its subagent types such as Explore.",
      "",
      "OpenCode agents that can run the task:",
      ...catalog,
    ].join("\n"),
    Input,
    async (args, extra) => {
      try {
        const sessionID = args.sessionID ?? (await createChild(context, parentID, args));
        const reply = await ask(context, sessionID, args.prompt, HandlerExtra.safeParse(extra).data?.signal);

        return {
          content: [{ type: "text", text: `<delegated sessionID="${sessionID}" model="${args.model}">\n${reply.text}\n</delegated>` }],
          isError: reply.failed,
        };
      } catch (error) {
        return { content: [{ type: "text", text: `Delegation through OpenCode failed: ${String(error)}` }], isError: true };
      }
    },
    { searchHint: "run a task on another model such as GPT, OpenAI or Gemini through OpenCode" },
  );

  return createSdkMcpServer({ name: SERVER_NAME, tools: [delegate] });
}

async function createChild(context: Context, parentID: SessionID, args: { model: string; description: string; agent?: string }) {
  const session = await context.session.create({
    parentID,
    title: args.description,
    agent: args.agent ?? DEFAULT_AGENT,
    model: parseModel(args.model),
  });

  return session.id;
}

// `wait` returns as soon as the session is idle, so it repeats until a reply newer than the prompt has completed.
async function ask(context: Context, sessionID: SessionID, text: string, signal: AbortSignal | undefined) {
  const sent = Date.now();
  const stop = () => void context.session.interrupt({ sessionID }).catch(() => undefined);

  signal?.addEventListener("abort", stop, { once: true });

  try {
    await context.session.prompt({ sessionID, text });

    while (!signal?.aborted) {
      await context.session.wait({ sessionID });

      const messages = await context.session.context({ sessionID });
      const reply = messages.findLast((message): message is Reply => message.type === "assistant");

      if (!reply || reply.time.created < sent || reply.time.completed === undefined) continue;

      const answer = reply.content
        .flatMap((part) => (part.type === "text" ? [part.text] : []))
        .join("\n")
        .trim();

      return { text: answer || "(the model finished without a text answer)", failed: reply.finish === "error" };
    }

    return { text: "(interrupted)", failed: true };
  } finally {
    signal?.removeEventListener("abort", stop);
  }
}

function parseModel(value: string): Model {
  const [ref, variant] = value.split("#");
  const slash = ref.indexOf("/");

  if (slash < 1) throw new Error(`model must be provider/model, got ${value}`);

  const model = { providerID: ref.slice(0, slash), id: ref.slice(slash + 1) };

  return variant ? { ...model, variant } : model;
}
