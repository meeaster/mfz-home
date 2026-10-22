import { z } from "zod";
import type { ToolCall } from "@hona/openeval";
import { routingTable, type RoutingRow } from "../routing.js";
import { loadedSkills, type RecordedSession, type RunFacts } from "./facts.js";

/**
 * Facts about role-based delegation under `orchestrate`: every assignment goes to the built-in `general`
 * subagent, its description starts with the role (`implementer: build the CLI`, `reviewer/code: review it`),
 * and its model comes from the `role-models` skill the dispatcher loaded.
 */
export type Dispatch = {
  /** Position of the `subagent` call among all recorded tool calls. */
  index: number;
  agent: string;
  description: string;
  /** Lowercased role before the description's colon; undefined when the description names none. */
  role?: string;
  taskType?: string;
  /** Session the call started or continued. */
  childID?: string;
  /** Whether the call continued an earlier subagent session rather than starting a new one. */
  continued: boolean;
  /** Whether the call returned at once and left the child running in the background. */
  background: boolean;
  /** The model the child session ran on, as `provider/model#variant`. */
  model?: string;
};

const subagentInput = z.object({ agent: z.string(), description: z.string(), sessionID: z.string().optional(), background: z.boolean().optional() });

const textContent = z.array(z.object({ type: z.string(), text: z.string().optional() }));

/**
 * A subagent result names its session: `<subagent sessionID="ses_…" state="completed">`. A failed call names it
 * only in its error: `Subagent failed (sessionID: ses_…): …`.
 */
const subagentSession = /<subagent sessionID="(ses_[A-Za-z0-9]+)"|Subagent failed \(sessionID: (ses_[A-Za-z0-9]+)\)/u;

const toolError = z.object({ message: z.string() });

/** Role prefix of a dispatch description: `reviewer/code: …` or `implementer: …`. */
const rolePrefix = /^\s*([A-Za-z-]+)(?:\/([A-Za-z-]+))?\s*:/u;

function contentText(tool: ToolCall): string {
  const content = textContent.safeParse(tool.content);

  if (!content.success) return "";

  return content.data.map((part) => part.text ?? "").join("\n");
}

export function modelRef(model: RecordedSession["model"]): string | undefined {
  if (model === undefined) return undefined;

  return `${model.providerID}/${model.id}${model.variant === undefined ? "" : `#${model.variant}`}`;
}

/** The session without a parent: the lead. */
export function rootSession(sessions: RunFacts["sessions"]): RecordedSession | undefined {
  return sessions.find((session) => session.parentID === undefined);
}

/** A session and every session it dispatched, directly or through nested subagents. */
export function subtree(sessions: RunFacts["sessions"], id: string): Set<string> {
  const members = new Set([id]);

  let grew = true;

  while (grew) {
    grew = false;

    for (const session of sessions) {
      if (session.parentID !== undefined && members.has(session.parentID) && !members.has(session.id)) {
        members.add(session.id);
        grew = true;
      }
    }
  }

  return members;
}

/** `subagent` calls a session made, in call order, with the child session and the model it ran on. */
export function dispatchesBy(facts: Pick<RunFacts, "tools" | "sessions">, sessionID: string): Dispatch[] {
  const models = new Map<string, string | undefined>();

  for (const session of facts.sessions) models.set(session.id, modelRef(session.model));

  const dispatches: Dispatch[] = [];

  for (const [index, tool] of facts.tools.entries()) {
    if (tool.name !== "subagent" || tool.sessionID !== sessionID) continue;

    const input = subagentInput.safeParse(tool.input);

    if (!input.success) continue;

    const prefix = rolePrefix.exec(input.data.description);

    const named = subagentSession.exec(contentText(tool)) ?? subagentSession.exec(toolError.safeParse(tool.error).data?.message ?? "");

    const childID = input.data.sessionID ?? named?.[1] ?? named?.[2];

    dispatches.push({
      index,
      agent: input.data.agent,
      description: input.data.description,
      role: prefix?.[1]?.toLowerCase(),
      taskType: prefix?.[2]?.toLowerCase(),
      childID,
      continued: input.data.sessionID !== undefined,
      background: input.data.background === true,
      model: childID === undefined ? undefined : models.get(childID),
    });
  }

  return dispatches;
}

/** The routing table from a session's first successful `role-models` load, with its call position. */
export function loadedRouting(facts: Pick<RunFacts, "tools">, sessionID: string): { index: number; rows: RoutingRow[] } | undefined {
  for (const [index, tool] of facts.tools.entries()) {
    if (tool.sessionID !== sessionID || loadedSkills([tool])[0] !== "role-models") continue;

    return { index, rows: routingTable(contentText(tool)) };
  }

  return undefined;
}

/** Skills loaded anywhere in a set of sessions. */
export function skillsIn(facts: Pick<RunFacts, "tools">, sessionIDs: ReadonlySet<string>): string[] {
  return loadedSkills(facts.tools.filter((tool) => tool.sessionID !== undefined && sessionIDs.has(tool.sessionID)));
}
