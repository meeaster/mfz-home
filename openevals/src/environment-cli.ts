import { relative, resolve } from "node:path";
import { parseArgs } from "node:util";
import {
  assertEnvironmentContract,
  environmentLabel,
  materializeEnvironment,
  stageEnvironment,
  syncConfigureScripts,
} from "./environment/index.js";

const usage = `Usage:
  bun src/environment-cli.ts materialize [--no-instructions] [--no-extra-skills] [--revision <rev>] [--working-tree] [--out <dir>]
  bun src/environment-cli.ts stage [--no-instructions] [--no-extra-skills] [--revision <rev>] [--working-tree]
  bun src/environment-cli.ts sync

materialize  Render the environment from mfz-home source into --out (default .materialized/<label>).
stage        Materialize, check the contract, and install the environment into every eval fixture.
sync         Copy the canonical configure script into every eval fixture.

--no-instructions  Omit the global instructions and their capability, reference, and extra-folder pointers.
--no-extra-skills  Keep only the required orchestration skills.
--revision         mfz-home commit to archive (default HEAD).
--working-tree     Capture uncommitted instruction, catalog, profile, agent, and skill changes over the commit.`;

const openevals = resolve(import.meta.dirname, "..");

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    "no-instructions": { type: "boolean", default: false },
    "no-extra-skills": { type: "boolean", default: false },
    revision: { type: "string" },
    "working-tree": { type: "boolean", default: false },
    out: { type: "string" },
    help: { type: "boolean", default: false },
  },
});

const [command] = positionals;

function report(label: string, paths: readonly string[]): void {
  console.log(`${label}:`);

  for (const path of paths) console.log(`  ${relative(openevals, path)}`);
}

if (values.help || command === undefined) {
  console.log(usage);
} else if (command === "sync") {
  report("Synced configure-environment.ts", await syncConfigureScripts());
} else if (command === "materialize" || command === "stage") {
  const options = { instructions: !values["no-instructions"], extraSkills: !values["no-extra-skills"] };

  const label = environmentLabel(options);

  const result = await materializeEnvironment(
    { sourceHome: resolve(openevals, ".."), options, revision: values.revision, workingTree: values["working-tree"] },
    resolve(values.out ?? resolve(openevals, ".materialized", label)),
  );

  await assertEnvironmentContract(result.environment);

  const overrides = result.manifest.sourceOverrides.length;

  console.log(`Rendered ${label} from ${result.manifest.sourceCommit}${overrides > 0 ? ` with ${overrides} working-tree overrides` : ""}`);
  console.log(`Environment: ${relative(openevals, result.environment)}`);

  if (command === "stage") report("Staged into", await stageEnvironment(result.environment));
} else {
  console.error(usage);
  process.exitCode = 1;
}
