import { readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { judgeEvidence, recordEvidence } from "@hona/openeval";
import { z } from "zod";
import benchmark from "../benchmarks/orchestrator-mode/benchmark.js";
import { defaultBenchmark } from "./environment/stage.js";

/**
 * Grade constructed controls with an eval's Markdown rubric and compare each
 * criterion with its expected label. Controls live in
 * `calibration/<eval>/controls.json`, each response in `<id>.md` beside it.
 * Constructed controls test grading boundaries, not real execution.
 */

const controlsSchema = z.array(
  z.object({
    id: z.string().regex(/^[a-z0-9-]+$/u),
    label: z.string(),
    expected: z.record(z.string(), z.enum(["pass", "fail"])),
  }),
);

const evalId = process.argv[2];

if (evalId === undefined) throw new Error("Usage: bun src/calibrate-judge.ts <eval-id>");

const controlsDir = resolve(defaultBenchmark, "calibration", evalId);

const evaluation = resolve(defaultBenchmark, "evals", evalId);

const output = resolve(import.meta.dirname, "../.materialized/calibration", evalId);

const controls = controlsSchema.parse(JSON.parse(await readFile(resolve(controlsDir, "controls.json"), "utf8")));

const [rubric, prompt] = await Promise.all([
  readFile(resolve(evaluation, "judge.md"), "utf8"),
  readFile(resolve(evaluation, "prompt.md"), "utf8"),
]);

let mismatches = 0;

for (const control of controls) {
  const directory = resolve(output, control.id);

  await rm(directory, { recursive: true, force: true });

  const response = await readFile(resolve(controlsDir, `${control.id}.md`), "utf8");

  const evidence = await recordEvidence({ directory, prompt, response });

  const result = await judgeEvidence({ evidence, rubric, judge: benchmark.judge, directory: resolve(directory, "judge") });

  const scores = result.judgment?.scores ?? {};

  console.log(`\n${control.id} (${control.label})`);

  for (const [criterion, expected] of Object.entries(control.expected)) {
    const value = scores[criterion]?.value ?? null;

    const observed = value === null ? "unknown" : value === 1 ? "pass" : "fail";

    if (observed !== expected) mismatches += 1;

    console.log(`  ${observed === expected ? "ok  " : "MISS"} ${criterion}: expected ${expected}, observed ${observed}`);
  }
}

console.log(mismatches === 0 ? "\nAll criteria agreed with their expected labels." : `\n${mismatches} criterion labels disagreed.`);

if (mismatches > 0) process.exitCode = 1;
