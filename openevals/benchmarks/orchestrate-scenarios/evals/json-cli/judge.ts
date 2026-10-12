import type { JudgeContext, VerificationResult } from "@hona/openeval";
import { z } from "zod";
import { runFacts, type RunFacts } from "../../../../src/judging/facts.js";
import { gradeOrchestration } from "../../../../src/judging/orchestration.js";

export const criteria = {
  cli_works: { name: "The CLI does what was asked" },
  lead_delegates: { name: "The lead delegates the build" },
  routed_models: { name: "Dispatches follow routing" },
  reviewed: { name: "A code reviewer checks the finished work" },
  repairs_fresh: { name: "Review repairs go to a fresh implementer" },
  proportionate: { name: "No stages the task doesn't need" },
  no_ship: { name: "Nothing committed or pushed" },
  foreground_only: { name: "Nothing runs in the background" },
} as const;

/**
 * Runs the delivered CLI in the verification container, through the command the prompt names, and prints which
 * requirements held. `--silent` keeps Bun's command echo out of stderr, so a silent failure has no error message.
 */
const checkSource = `
const input = '{"b":[1,{"c":null}],"a":"x"}';
const parsed = JSON.parse(input);
const file = "/tmp/json-cli-check-input.json";
await Bun.write(file, input);
const run = (args, stdin) => {
  const child = Bun.spawnSync(["bun", "run", "--silent", "fmt", ...args], {
    stdin: stdin === undefined ? "ignore" : new TextEncoder().encode(stdin),
    stdout: "pipe",
    stderr: "pipe",
    timeout: 15_000,
  });
  return { exitCode: child.exitCode, stdout: child.stdout.toString(), stderr: child.stderr.toString() };
};
const formats = (result, indent) => result.exitCode === 0 && result.stdout.trimEnd() === JSON.stringify(parsed, null, indent);
const fileRun = run([file]);
const stdinRun = run([], input);
const indentRuns = [run(["--indent", "4", file]), run([file, "--indent", "4"])];
const invalidRun = run([], '{"a":');
console.log(JSON.stringify({
  file: formats(fileRun, 2),
  stdin: formats(stdinRun, 2),
  indent: indentRuns.some((result) => formats(result, 4)),
  invalid: invalidRun.exitCode !== 0 && invalidRun.stderr.trim().length > 0 && invalidRun.stdout.trim() === "",
  runs: { fileRun, stdinRun, indentRuns, invalidRun },
}));
`;

const cliChecks = z.object({ file: z.boolean(), stdin: z.boolean(), indent: z.boolean(), invalid: z.boolean() });

export type CliChecks = z.infer<typeof cliChecks>;

export function gradeJsonCli(facts: RunFacts, cli: CliChecks | undefined) {
  const orchestration = gradeOrchestration(facts);

  return {
    // Background work may not have finished when the recording stopped, so the CLI check cannot settle the outcome.
    scores: { cli_works: cli === undefined || !orchestration.scores.foreground_only ? null : cli.file && cli.stdin && cli.indent && cli.invalid, ...orchestration.scores },
    observations: { cli, ...orchestration.observations },
  };
}

/** The check's verdict from its last stdout line; undefined when the check itself did not complete. */
function parseChecks(result: VerificationResult, stdout: string): CliChecks | undefined {
  if (result.state !== "completed" || result.exitCode !== 0) return undefined;

  const parsed = cliChecks.safeParse(JSON.parse(stdout.trim().split("\n").at(-1) ?? "null"));

  return parsed.success ? parsed.data : undefined;
}

export default async (context: JudgeContext) => {
  const result = await context.verification.run({
    revision: "final",
    timeoutMs: 120_000,
    commands: [["bun", "/verification/check.mjs"]],
    files: { "check.mjs": checkSource },
  });

  // The result holds retained log paths; the logs themselves are read through the verification reader.
  const [stdout, stderr] = await Promise.all([context.verification.text(result, "stdout"), context.verification.text(result, "stderr")]);

  const graded = gradeJsonCli(await runFacts(context), parseChecks(result, stdout));

  return { ...graded, observations: { ...graded.observations, verification: { id: result.id, state: result.state, exitCode: result.exitCode, stderr: stderr.slice(0, 2000) } } };
};
