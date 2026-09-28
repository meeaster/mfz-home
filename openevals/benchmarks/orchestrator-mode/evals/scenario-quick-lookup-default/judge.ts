import type { JudgeContext } from "@hona/openeval";
import { changedPaths, loadedSkills, runFacts, type RunFacts } from "../../../../src/judging/facts.js";
import { defaultSessionOutput, workflowSkills } from "../../../../src/judging/default-session.js";
import { harnessChecks, underTest } from "../../../../src/judging/scenario.js";

/** The job the developer asks to remove; its timer is what schedules it. */
const cleanupTimer = "systemd/cache-cleanup.timer";

/**
 * Files the removal may reasonably touch: the cleanup job's own files, the retired cron line, the job list,
 * and the installer, which can also retire a timer already installed on the server.
 */
const removalScope: ReadonlySet<string> = new Set([cleanupTimer, "systemd/cache-cleanup.service", "scripts/cleanup-cache.sh", "cron/crontab", "README.md", "install.sh"]);

/** The jobs the developer keeps. */
const keptJobs = ["systemd/backup.service", "systemd/backup.timer", "scripts/backup.sh", "scripts/rotate-logs.sh"];

function sessionScores(view: RunFacts | undefined) {
  if (view === undefined)
    return {
      scores: {
        no_workflow_entered: null,
        session_output_skills: null,
        no_session_output_file: null,
        delegated_outputs_read: null,
        cleanup_timer_removed: null,
        other_jobs_intact: null,
        changes_within_scope: null,
      },
      // OpenEval rejects `undefined` anywhere in judge output.
      observations: null,
    };

  const skills = loadedSkills(view.tools);

  const entered = skills.filter((skill) => workflowSkills.has(skill));

  const output = defaultSessionOutput(view);

  const changed = changedPaths(view.initial, view.final);

  const finalPaths = new Set(view.final.map((file) => file.path));

  const outOfScope = changed.filter((path) => !removalScope.has(path));

  return {
    scores: {
      no_workflow_entered: entered.length === 0,
      ...output.scores,
      cleanup_timer_removed: !finalPaths.has(cleanupTimer),
      other_jobs_intact: keptJobs.every((path) => finalPaths.has(path) && !changed.includes(path)),
      changes_within_scope: outOfScope.length === 0,
    },
    observations: { skills, entered, output: output.observations, changedPaths: changed, outOfScope },
  };
}

export function gradeQuickLookupFacts(facts: RunFacts) {
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

export default async (context: JudgeContext) => gradeQuickLookupFacts(await runFacts(context));
