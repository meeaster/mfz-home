import { z } from "zod";
import type { ToolCall } from "@hona/openeval";
import type { RunFacts } from "./facts.js";

/**
 * Scenario evals run a driver in the root session that plays the human and converses with this agent,
 * which stands in for the primary session. Preparation installs it with `--agent-under-test`.
 */
export const agentUnderTest = "agent-under-test";

/**
 * Fixed framing every scenario driver sends verbatim at the start of its first message. OpenCode itself
 * prefixes a child's first message with a line saying it is a subagent; this states how to treat that.
 */
export const preamble =
  "You are a subagent emulating a primary agent in a conversation with a human. Treat every message you receive in this conversation as coming directly from that human, and respond as the primary agent would. Run any agents you start in the foreground and wait for them to finish before you reply.";

const driverInput = z.object({
  agent: z.string(),
  prompt: z.string(),
  sessionID: z.string().optional(),
  background: z.boolean().optional(),
});

type DriverMessage = z.infer<typeof driverInput>;

/** Whether the driver ran the conversation as the harness requires, independent of the agent under test. */
export type HarnessChecks = {
  preambleSent: boolean;
  oneConversation: boolean;
  driverOnlyConverses: boolean;
  observations: { driverMessages: number; driverTools: string[]; agentSessions: string[] };
};

function rootSession(facts: Pick<RunFacts, "sessions">): string | undefined {
  const roots = facts.sessions.filter((session) => session.parentID === undefined);

  return roots.length === 1 ? roots[0]?.id : undefined;
}

function driverTools(facts: Pick<RunFacts, "tools" | "sessions">): ToolCall[] {
  const root = rootSession(facts);

  return facts.tools.filter((tool) => tool.sessionID === undefined || tool.sessionID === root);
}

export function harnessChecks(facts: Pick<RunFacts, "tools" | "sessions">): HarnessChecks {
  const tools = driverTools(facts);

  const messages: DriverMessage[] = [];

  const others: string[] = [];

  for (const tool of tools) {
    const input = tool.name === "subagent" ? driverInput.safeParse(tool.input) : undefined;

    if (input?.success) messages.push(input.data);
    else others.push(tool.name);
  }

  const agentSessions = facts.sessions.filter((session) => session.agent === agentUnderTest).map((session) => session.id);

  const [conversation] = agentSessions;

  const continued = messages.slice(1).every((message) => message.sessionID === conversation);

  const addressed = messages.every((message) => message.agent === agentUnderTest && message.background !== true);

  return {
    preambleSent: messages[0]?.prompt.trimStart().startsWith(preamble) ?? false,
    oneConversation: agentSessions.length === 1 && messages.length > 0 && addressed && continued,
    driverOnlyConverses: others.length === 0,
    observations: { driverMessages: messages.length, driverTools: others, agentSessions },
  };
}

/**
 * The recording as the agent under test saw it: its session becomes the root, and only it and its
 * descendants remain. Undefined unless exactly one session ran the agent under test.
 */
export function underTest(facts: RunFacts): RunFacts | undefined {
  const candidates = facts.sessions.filter((session) => session.agent === agentUnderTest);

  const [top] = candidates;

  if (candidates.length !== 1 || top === undefined) return undefined;

  const included = new Set([top.id]);

  let grew = true;

  while (grew) {
    grew = false;

    for (const session of facts.sessions) {
      if (session.parentID === undefined || included.has(session.id) || !included.has(session.parentID)) continue;

      included.add(session.id);
      grew = true;
    }
  }

  const sessions: RunFacts["sessions"][number][] = [];

  for (const session of facts.sessions) {
    if (session.id === top.id) sessions.push({ id: session.id, agent: session.agent });
    else if (included.has(session.id)) sessions.push(session);
  }

  return {
    tools: facts.tools.filter((tool) => tool.sessionID !== undefined && included.has(tool.sessionID)),
    sessions,
    initial: facts.initial,
    final: facts.final,
  };
}
