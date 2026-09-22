import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { parsePresets, resolveAgents, selectPreset } from "./presets.js";

const benchmarkDir = process.argv[3]
  ? resolve(process.argv[3])
  : resolve(import.meta.dir, "..", "benchmarks", "orchestrator-mode");

const name = process.argv[2];

if (name === undefined) throw new Error("Usage: bun src/select-preset.ts <preset-name> [benchmark-dir]");

// SAFETY: `presets.json` is committed in this repository as a JSON document.
const file = parsePresets(await readFile(join(benchmarkDir, "presets.json"), "utf8"));

const preset = selectPreset(file, name);

const agents = resolveAgents(preset, file.roles);

const contents = `${JSON.stringify(agents, null, 2)}\n`;

/** Collect every per-eval `agent-models.json`, excluding materialized environments. */
async function agentModelFiles(root: string): Promise<string[]> {
  const found: string[] = [];

  const pending = [root];

  while (pending.length > 0) {
    // SAFETY: Entries are pushed only after a truthy existence check above.
    const directory = pending.pop()!;

    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.name === "environment" || entry.name === "node_modules") continue;

      const path = join(directory, entry.name);

      if (entry.isDirectory()) pending.push(path);
      else if (entry.name === "agent-models.json") found.push(path);
    }
  }

  return found;
}

let rewritten = 0;

for (const path of await agentModelFiles(join(benchmarkDir, "evals"))) {
  await writeFile(path, contents, "utf8");

  rewritten += 1;
}

await writeFile(
  join(benchmarkDir, "selected-preset.json"),
  `${JSON.stringify({ preset: name }, null, 2)}\n`,
  "utf8",
);

console.log(`Selected preset ${name}: candidate ${preset.candidate}`);

console.log(`Rewrote ${rewritten} agent-models.json files; changed inputs re-execute on the next run.`);
