import { z } from "zod";
import { rootCalls } from "./default-session.js";
import { catalogCalls, dispatchTools, outputRoot, pathsWrittenBy, producerSessions, type RunFacts } from "./facts.js";

/**
 * A `catalog_session` attach list, each item parsed to whether it creates a provisional effort: an item is an
 * existing effort's slug or an effort to create.
 */
const attachInput = z.object({
  attach: z.array(
    z.union([z.string().transform(() => false), z.object({ create: z.object({ provisional: z.boolean().optional() }) }).transform((item) => item.create.provisional === true)]),
  ),
});

const describeInput = z.object({ path: z.string() });

/**
 * Whether the root attached a new provisional effort before its first dispatch. Human-facing orchestration keeps
 * records from its first decision, and with no effort named it creates a provisional one. Without a dispatch, an
 * attach anywhere in the root counts.
 */
export function provisionalEffortFirst(view: Pick<RunFacts, "tools" | "sessions" | "catalog">) {
  const { root, tools } = rootCalls(view);

  const firstDispatch = tools.findIndex((tool) => dispatchTools.has(tool.name));

  const attaches = catalogCalls(view, "session").filter((call) => call.sessionID === root);

  const provisional = attaches.filter((call) => attachInput.safeParse(call.input).data?.attach.includes(true) ?? false);

  const attached = provisional.some((call) => firstDispatch === -1 || tools.findIndex((tool) => tool.id === call.callID) < firstDispatch);

  return { attached, attachInputs: attaches.map((call) => call.input) };
}

/**
 * Files under Cairn's root that a dispatched producer wrote without describing them itself, which `task-output`
 * requires before its reply. Null when no producer wrote one.
 */
export function undescribedOutputs(view: Pick<RunFacts, "tools" | "sessions" | "catalog">) {
  const written: string[] = [];

  const missing: string[] = [];

  for (const session of producerSessions(view.sessions).keys()) {
    const described = new Set(catalogCalls(view, "describe").filter((call) => call.sessionID === session).map((call) => describeInput.safeParse(call.input).data?.path));

    for (const path of new Set(pathsWrittenBy(view, new Set([session])).filter((path) => path.includes(outputRoot)))) {
      written.push(path);

      if (!described.has(path)) missing.push(path);
    }
  }

  return { described: written.length === 0 ? null : missing.length === 0, undescribed: missing };
}
