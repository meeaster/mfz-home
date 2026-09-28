import type { JudgeContext } from "@hona/openeval";
import { z } from "zod";
import { catalogCalls, changedPaths, loadedSkills, outputRoot, pathsWrittenBy, runFacts, type RunFacts } from "../../../../src/judging/facts.js";
import { rootCalls, workflowSkills } from "../../../../src/judging/default-session.js";
import { harnessChecks, underTest } from "../../../../src/judging/scenario.js";

/** A `catalog_session` call that attaches the session to an effort, by slug or by creating one. */
const attachInput = z.object({ attach: z.array(z.union([z.string(), z.object({ create: z.object({}).passthrough() })])).min(1) });

/** An effort's validated state, which capture writes at a path from `catalog_location`. */
const effortContext = new RegExp(`${outputRoot}efforts/[^/]+/context\\.md$`, "u");

function sessionScores(view: RunFacts | undefined) {
  if (view === undefined)
    return {
      scores: {
        no_workflow_entered: null,
        effort_context_loaded: null,
        no_task_output: null,
        effort_attached: null,
        context_recorded: null,
        workspace_unchanged: null,
      },
      // OpenEval rejects `undefined` anywhere in judge output.
      observations: null,
    };

  const skills = loadedSkills(view.tools);

  const entered = skills.filter((skill) => workflowSkills.has(skill));

  const rootSkills = loadedSkills(rootCalls(view).tools);

  const attached = catalogCalls(view, "session").filter((call) => attachInput.safeParse(call.input).success);

  const written = pathsWrittenBy(view, new Set(view.sessions.map((session) => session.id)));

  const contexts = written.filter((path) => effortContext.test(path));

  const changed = changedPaths(view.initial, view.final);

  return {
    scores: {
      no_workflow_entered: entered.length === 0,
      effort_context_loaded: rootSkills.includes("effort-context"),
      no_task_output: !rootSkills.includes("task-output"),
      effort_attached: attached.length > 0,
      context_recorded: contexts.length > 0,
      workspace_unchanged: changed.length === 0,
    },
    observations: {
      skills,
      rootSkills,
      entered,
      attachInputs: attached.map((call) => call.input),
      outputFiles: written.filter((path) => path.includes(outputRoot)),
      changedPaths: changed,
    },
  };
}

export function gradeCaptureFacts(facts: RunFacts) {
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

export default async (context: JudgeContext) => gradeCaptureFacts(await runFacts(context));
