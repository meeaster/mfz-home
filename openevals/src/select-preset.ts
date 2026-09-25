import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { defaultBenchmark, evalFixtures } from "./environment/stage.js";
import { parsePresets, resolveAgents, selectPreset } from "./presets.js";

const name = process.argv[2];

const benchmark = process.argv[3] === undefined ? defaultBenchmark : resolve(process.argv[3]);

if (name === undefined) throw new Error("Usage: bun src/select-preset.ts <preset-name> [benchmark-dir]");

const file = parsePresets(await readFile(join(benchmark, "presets.json"), "utf8"));

const preset = selectPreset(file, name);

const contents = `${JSON.stringify(resolveAgents(preset, file.roles), null, 2)}\n`;

const fixtures = await evalFixtures(benchmark);

for (const fixture of fixtures) {
  await mkdir(fixture, { recursive: true });
  await writeFile(join(fixture, "agent-models.json"), contents, "utf8");
}

await writeFile(join(benchmark, "selected-preset.json"), `${JSON.stringify({ preset: name }, null, 2)}\n`, "utf8");

console.log(`Selected preset ${name}: candidate ${preset.candidate}`);

console.log(`Wrote ${fixtures.length} agent-models.json files; changed inputs re-execute on the next run.`);
