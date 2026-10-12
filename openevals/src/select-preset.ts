import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { defaultBenchmark, evalFixtures, routingFixture } from "./environment/stage.js";
import { parsePresets, resolveAgents, selectPreset } from "./presets.js";

const name = process.argv[2];

const benchmark = process.argv[3] === undefined ? defaultBenchmark : resolve(process.argv[3]);

if (name === undefined) throw new Error("Usage: bun src/select-preset.ts <preset-name> [benchmark-dir]");

const file = parsePresets(await readFile(join(benchmark, "presets.json"), "utf8"));

const preset = selectPreset(file, name);

const agentModels = file.roles.length > 0 ? `${JSON.stringify(resolveAgents(preset, file.roles), null, 2)}\n` : undefined;

const routing = preset.routing === undefined ? undefined : await readFile(resolve(benchmark, preset.routing), "utf8");

const fixtures = await evalFixtures(benchmark);

for (const fixture of fixtures) {
  await mkdir(fixture, { recursive: true });

  if (agentModels === undefined) await rm(join(fixture, "agent-models.json"), { force: true });
  else await writeFile(join(fixture, "agent-models.json"), agentModels, "utf8");

  if (routing === undefined) await rm(join(fixture, routingFixture), { force: true });
  else await writeFile(join(fixture, routingFixture), routing, "utf8");
}

await writeFile(join(benchmark, "selected-preset.json"), `${JSON.stringify({ preset: name }, null, 2)}\n`, "utf8");

console.log(`Selected preset ${name}: candidate ${preset.candidate}${preset.routing === undefined ? "" : `, routing ${preset.routing}`}`);

console.log(`Updated ${fixtures.length} eval fixtures; changed inputs re-execute on the next run.`);
