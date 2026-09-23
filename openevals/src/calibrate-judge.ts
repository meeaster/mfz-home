import { readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { judgeEvidence, recordEvidence } from "@hona/openeval";

type Expected = "pass" | "fail";

type Criteria = {
  mode_selection: Expected;
  dispatch_decision: Expected;
  brief_adequacy: Expected;
  acceptance: Expected;
  authority_restraint: Expected;
  return_surface: Expected;
};

type CalibrationCase = {
  id: string;
  label: string;
  expected: Expected;
  criteria: Criteria;
};

const benchmark = resolve(import.meta.dir, "../benchmarks/orchestrator-mode");

const evaluation = resolve(benchmark, "evals/baked-in-dispatch");

const controls = resolve(benchmark, "calibration/baked-in-dispatch");

const output = resolve(import.meta.dir, "../.materialized/calibration");

const model = "openai/gpt-6-luna#high";

const failAll: Criteria = {
  mode_selection: "fail",
  dispatch_decision: "fail",
  brief_adequacy: "fail",
  acceptance: "fail",
  authority_restraint: "fail",
  return_surface: "fail",
};

const passAll: Criteria = {
  mode_selection: "pass",
  dispatch_decision: "pass",
  brief_adequacy: "pass",
  acceptance: "pass",
  authority_restraint: "pass",
  return_surface: "pass",
};

const cases: CalibrationCase[] = [
  {
    id: "clear-fail",
    label: "Gateway answer that claims a child ran",
    expected: "fail",
    criteria: failAll,
  },
  {
    id: "alternative-wording",
    label: "Correct answer with different vocabulary",
    expected: "pass",
    criteria: passAll,
  },
];

const rubric = await readFile(resolve(evaluation, "judge.md"), "utf8");

const prompt = await readFile(resolve(evaluation, "prompt.md"), "utf8");

let mismatches = 0;

for (const item of cases) {
  const directory = resolve(output, item.id);

  await rm(directory, { recursive: true, force: true });

  const response = await readFile(resolve(controls, `${item.id}.md`), "utf8");

  const evidence = await recordEvidence({ directory, prompt, response });

  const result = await judgeEvidence({
    evidence,
    rubric,
    judge: { model, websearch: false },
    directory: resolve(directory, "judge"),
  });

  const scores = result.judgment?.scores ?? {};

  console.log(`\n${item.id} (${item.label}) expected ${item.expected}`);

  for (const [criterion, expected] of Object.entries(item.criteria)) {
    const value = scores[criterion]?.value ?? null;

    const observed: Expected | "unknown" =
      value === null ? "unknown" : value === 1 ? "pass" : "fail";

    const agrees = observed === expected;

    if (!agrees) mismatches += 1;

    console.log(
      `  ${agrees ? "ok  " : "MISS"} ${criterion}: expected ${expected}, observed ${observed}`,
    );
  }
}

console.log(
  mismatches === 0
    ? "\nAll calibration cases agreed with their expected labels."
    : `\n${mismatches} criterion labels disagreed with expectations.`,
);

if (mismatches > 0) process.exitCode = 1;
