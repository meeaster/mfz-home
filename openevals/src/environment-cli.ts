import { relative, resolve } from "node:path";
import { parseArgs } from "node:util";
import {
  assertEnvironmentContract,
  environmentNames,
  isEnvironmentName,
  materializeEnvironment,
  stageEnvironment,
  syncConfigureScripts,
} from "./environment/index.js";

const usage = `Usage:
  bun src/environment-cli.ts materialize <${environmentNames.join("|")}> [--revision <rev>] [--working-tree] [--out <dir>]
  bun src/environment-cli.ts stage <${environmentNames.join("|")}> [--revision <rev>] [--working-tree]
  bun src/environment-cli.ts sync

materialize  Render an environment from mfz-home source into --out (default .materialized/<profile>).
stage        Materialize, check the contract, and install the environment into every eval fixture.
sync         Copy the canonical configure script into every eval fixture.

--revision      mfz-home commit to archive (default HEAD).
--working-tree  Capture uncommitted instruction, catalog, profile, agent, and skill changes over the commit.`;

const openevals = resolve(import.meta.dirname, "..");

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    revision: { type: "string" },
    "working-tree": { type: "boolean", default: false },
    out: { type: "string" },
    help: { type: "boolean", default: false },
  },
});

const [command, profile] = positionals;

function report(label: string, paths: readonly string[]): void {
  console.log(`${label}:`);

  for (const path of paths) console.log(`  ${relative(openevals, path)}`);
}

if (values.help || command === undefined) {
  console.log(usage);
} else if (command === "sync") {
  report("Synced configure-environment.ts", await syncConfigureScripts());
} else if ((command === "materialize" || command === "stage") && profile !== undefined && isEnvironmentName(profile)) {
  const result = await materializeEnvironment(
    { sourceHome: resolve(openevals, ".."), profile, revision: values.revision, workingTree: values["working-tree"] },
    resolve(values.out ?? resolve(openevals, ".materialized", profile)),
  );

  await assertEnvironmentContract(result.environment);

  const overrides = result.manifest.sourceOverrides.length;

  console.log(`Rendered ${profile} from ${result.manifest.sourceCommit}${overrides > 0 ? ` with ${overrides} working-tree overrides` : ""}`);
  console.log(`Environment: ${relative(openevals, result.environment)}`);

  if (command === "stage") report("Staged into", await stageEnvironment(result.environment));
} else {
  console.error(usage);
  process.exitCode = 1;
}
