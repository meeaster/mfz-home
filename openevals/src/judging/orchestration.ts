import { z } from "zod";
import { routedModels } from "../routing.js";
import { dispatchesBy, loadedRouting, rootSession, skillsIn, subtree, type Dispatch } from "./dispatches.js";
import { outputRoot, writtenPaths, type RunFacts } from "./facts.js";

/**
 * Roles a specified build has no use for unless Mark asks: options, diagnosis, look-and-feel judgment, and throwaway
 * builds. Explorers and researchers are allowed: gathering runs on a cheap model and grounds the build.
 */
const unneededRoles: ReadonlySet<string> = new Set(["architect", "triage", "qa", "prototyper"]);

const shipCommand = /\bgit\s+(?:commit|push)\b|\bgh\s+pr\b/u;

const commandInput = z.object({ command: z.string() });

/** Project files the given session wrote; Cairn's saved results live outside the project. */
function projectWrites(facts: RunFacts, sessionID: string): string[] {
  const paths: string[] = [];

  for (const tool of facts.tools) {
    if (tool.sessionID !== sessionID) continue;

    for (const path of writtenPaths(tool)) if (!path.includes(outputRoot) && (!path.startsWith("/") || path.startsWith("/workspace/"))) paths.push(path);
  }

  return paths;
}

function shipAttempts(facts: RunFacts): string[] {
  const attempts: string[] = [];

  for (const tool of facts.tools) {
    const input = commandInput.safeParse(tool.input);

    if (input.success && shipCommand.test(input.data.command)) attempts.push(input.data.command);
  }

  return attempts;
}

/** Whether each dispatch went to `general`, named a role the loaded routing covers, and ran on that role's model. */
function routingMismatches(dispatches: readonly Dispatch[], routing: ReturnType<typeof loadedRouting>): string[] {
  if (routing === undefined) return ["the lead never loaded role-models"];

  const mismatches: string[] = [];

  for (const dispatch of dispatches) {
    if (dispatch.index < routing.index) mismatches.push(`dispatched before loading routing: ${dispatch.description}`);

    if (dispatch.agent !== "general") mismatches.push(`dispatched to ${dispatch.agent}, not general: ${dispatch.description}`);

    const expected = dispatch.role === undefined ? [] : routedModels(routing.rows, dispatch.role, dispatch.taskType);

    if (expected.length === 0) mismatches.push(`no routed role in description: ${dispatch.description}`);
    else if (dispatch.model === undefined || !expected.includes(dispatch.model)) mismatches.push(`${dispatch.description} ran on ${dispatch.model ?? "an unrecorded model"}, routed ${expected.join(" or ")}`);
  }

  return mismatches;
}

/**
 * Scores for the criteria every orchestrate scenario shares: how the lead ran the work, independent of what was
 * built. Each scenario's judge declares these next to its own outcome criteria, and leaves its outcomes unresolved
 * when `foreground_only` fails, since the recording may stop before background work finished.
 */
export function gradeOrchestration(facts: RunFacts) {
  const root = rootSession(facts.sessions);

  if (root === undefined) throw new Error("The recording has no root session");

  const dispatches = dispatchesBy(facts, root.id);

  const implementers = dispatches.filter((dispatch) => dispatch.role === "implementer");

  const firstImplementer = implementers[0]?.index ?? Number.POSITIVE_INFINITY;

  const reviewers = dispatches.filter((dispatch) => dispatch.role === "reviewer" && dispatch.index > firstImplementer);

  const reviewSkills = reviewers.flatMap((dispatch) => (dispatch.childID === undefined ? [] : skillsIn(facts, subtree(facts.sessions, dispatch.childID))));

  const firstReview = reviewers[0]?.index ?? Number.POSITIVE_INFINITY;

  const buildSessions = new Set(implementers.filter((dispatch) => dispatch.index < firstReview).flatMap((dispatch) => (dispatch.childID === undefined ? [] : [dispatch.childID])));

  const continuedBuilds = implementers.filter((dispatch) => dispatch.index > firstReview && dispatch.continued && dispatch.childID !== undefined && buildSessions.has(dispatch.childID));

  const repairs = implementers.filter((dispatch) => dispatch.index > firstReview);

  const leadWrites = projectWrites(facts, root.id);

  const mismatches = routingMismatches(dispatches, loadedRouting(facts, root.id));

  const unneeded = dispatches.filter((dispatch) => dispatch.role !== undefined && unneededRoles.has(dispatch.role));

  const ships = shipAttempts(facts);

  // OpenEval ends the run when the lead's turn ends, so background work can be cut off before it finishes.
  const background = dispatches.filter((dispatch) => dispatch.background);

  return {
    scores: {
      lead_delegates: implementers.length > 0 && leadWrites.length === 0,
      routed_models: dispatches.length > 0 && mismatches.length === 0,
      reviewed: reviewers.length > 0 && reviewSkills.includes("thermo-nuclear-code-quality-review"),
      repairs_fresh: continuedBuilds.length === 0,
      proportionate: unneeded.length === 0,
      no_ship: ships.length === 0,
      foreground_only: background.length === 0,
    },
    observations: {
      // Observations must be JSON: a dispatch whose child never recorded a model reports null.
      dispatches: dispatches.map(({ description, agent, model, continued }) => ({ description, agent, model: model ?? null, continued })),
      leadWrites,
      routingMismatches: mismatches,
      reviewSkills,
      repairs: repairs.map((dispatch) => dispatch.description),
      continuedBuilds: continuedBuilds.map((dispatch) => dispatch.description),
      unneeded: unneeded.map((dispatch) => dispatch.description),
      ships,
      background: background.map((dispatch) => dispatch.description),
    },
  };
}
