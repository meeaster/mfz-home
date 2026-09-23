import { resolve } from "node:path";
import { environmentNames, materializePreset } from "./environment/index.js";

const profile = process.argv[2];

const sourceHome = process.env.MFZ_SOURCE_HOME ?? resolve(import.meta.dir, "..");

const sourceCommit = process.env.MFZ_SOURCE_COMMIT;

const sourceOverrides = process.env.MFZ_SOURCE_OVERRIDES?.split(",").filter(Boolean);

const destination = process.argv[3] ?? resolve(import.meta.dir, "../.materialized", profile ?? "unknown");

const selectedProfile = environmentNames.find((name) => name === profile);

if (!selectedProfile)
  throw new Error(`Usage: bun src/materialize-cli.ts <${environmentNames.join("|")}> [destination]`);

if (!sourceCommit) throw new Error("MFZ_SOURCE_COMMIT is required");

const result = await materializePreset(
  sourceHome,
  sourceCommit,
  selectedProfile,
  destination,
  sourceOverrides,
);

console.log(JSON.stringify({ root: result.root, workspace: result.workspace, manifest: result.manifestPath }, null, 2));
