import type { JudgeContext } from "@hona/openeval";
import { z } from "zod";
import { catalogCalls, changedPaths, dispatchTools, loadedSkills, outputRoot, runFacts, type RunFacts } from "../../../../src/judging/facts.js";
import { undescribedOutputs } from "../../../../src/judging/catalog.js";
import { defaultSessionOutput, rootCalls, workflowSkills } from "../../../../src/judging/default-session.js";
import { harnessChecks, underTest } from "../../../../src/judging/scenario.js";

const briefInput = z.object({ prompt: z.string() });

/**
 * Whether the root got a path from Cairn before its first dispatch and every brief assigns one under
 * Cairn's root. A composed path skips the catalog, which then cannot credit or find the file.
 */
function assignedPaths(view: RunFacts) {
  const { root, tools } = rootCalls(view);

  const dispatches = tools.filter((tool) => dispatchTools.has(tool.name) && tool.status === "succeeded");

  const [first] = dispatches;

  const locations = catalogCalls(view, "location").filter((call) => call.sessionID === root);

  const position = (callID: string) => tools.findIndex((tool) => tool.id === callID);

  const locatedFirst = first !== undefined && locations.some((call) => position(call.callID) < tools.indexOf(first));

  const briefsWithoutPath = dispatches.filter((tool) => !(briefInput.safeParse(tool.input).data?.prompt.includes(outputRoot) ?? false)).map((tool) => tool.id);

  return { assigned: first === undefined ? null : locatedFirst && briefsWithoutPath.length === 0, locations: locations.length, briefsWithoutPath };
}

/** Directly dispatched sessions that did not load `task-output`, whose contract is the assigned file. */
function producersWithoutContract(view: RunFacts): string[] {
  const { root } = rootCalls(view);

  const missing: string[] = [];

  for (const session of view.sessions) {
    if (session.parentID === undefined || session.parentID !== root) continue;

    const skills = loadedSkills(view.tools.filter((tool) => tool.sessionID === session.id));

    if (!skills.includes("task-output")) missing.push(session.id);
  }

  return missing;
}

function sessionScores(view: RunFacts | undefined) {
  if (view === undefined)
    return {
      scores: {
        no_workflow_entered: null,
        subagent_dispatched: null,
        output_path_assigned: null,
        producer_task_output: null,
        outputs_described: null,
        session_output_skills: null,
        no_session_output_file: null,
        delegated_outputs_read: null,
        workspace_unchanged: null,
      },
      // OpenEval rejects `undefined` anywhere in judge output.
      observations: null,
    };

  const skills = loadedSkills(view.tools);

  const entered = skills.filter((skill) => workflowSkills.has(skill));

  const output = defaultSessionOutput(view);

  const dispatched = output.observations.dispatched.length > 0;

  const paths = assignedPaths(view);

  const withoutContract = producersWithoutContract(view);

  const outputs = undescribedOutputs(view);

  const changed = changedPaths(view.initial, view.final);

  return {
    scores: {
      no_workflow_entered: entered.length === 0,
      subagent_dispatched: dispatched,
      output_path_assigned: paths.assigned,
      producer_task_output: dispatched ? withoutContract.length === 0 : null,
      outputs_described: outputs.described,
      ...output.scores,
      workspace_unchanged: changed.length === 0,
    },
    observations: { skills, entered, output: output.observations, paths, producersWithoutContract: withoutContract, undescribedOutputs: outputs.undescribed, changedPaths: changed },
  };
}

export function gradeSubagentFacts(facts: RunFacts) {
  const harness = harnessChecks(facts);

  const session = sessionScores(underTest(facts));

  return {
    scores: {
      harness_preamble_sent: harness.preambleSent,
      harness_one_conversation: harness.oneConversation,
      harness_driver_only_converses: harness.driverOnlyConverses,
      ...session.scores,
    },
    observations: { harness: harness.observations, session: session.observations },
  };
}

export default async (context: JudgeContext) => gradeSubagentFacts(await runFacts(context));
