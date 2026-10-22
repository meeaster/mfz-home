import { expect, test } from "bun:test";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parsePresets } from "./presets.js";
import { routedModels, routingDrift, routingTable } from "./routing.js";

const openevals = resolve(import.meta.dirname, "..");

const liveSkill = resolve(openevals, "../skills/active/role-models/SKILL.md");

const table = `| Role | Task type | Model |
| --- | --- | --- |
| reviewer | default | \`openai/gpt-6-astra#medium\` |
| reviewer | pr | \`openai/gpt-6.1-sol#high\` |
| implementer | default | \`openai/gpt-6.1-sol#medium\` |`;

test("a task-specific row takes precedence over its role's default", () => {
  const rows = routingTable(table);

  expect(rows).toHaveLength(3);
  expect(routedModels(rows, "reviewer", "pr")).toEqual(["openai/gpt-6.1-sol#high"]);
  expect(routedModels(rows, "reviewer", "code")).toEqual(["openai/gpt-6-astra#medium"]);
  expect(routedModels(rows, "implementer")).toEqual(["openai/gpt-6.1-sol#medium"]);
  expect(routedModels(rows, "implementer", "frontend")).toEqual(["openai/gpt-6.1-sol#medium"]);
  expect(routedModels(rows, "architect")).toEqual([]);
});

test("a role named without its task type may use any of its rows when it has no default", () => {
  const rows = routingTable(table.replace("| reviewer | default |", "| reviewer | code |"));

  expect(routedModels(rows, "reviewer")).toEqual(["openai/gpt-6-astra#medium", "openai/gpt-6.1-sol#high"]);
  expect(routedModels(rows, "reviewer", "qa")).toEqual([]);
});

test("drift ignores model cells and reports other changes", () => {
  const changedModel = table.replace("gpt-6.1-sol#medium", "gpt-6-luna#max");

  expect(routingDrift(table, changedModel)).toEqual([]);
  expect(routingDrift(`Intro\n${table}`, `Changed intro\n${changedModel}`)).toEqual(["text outside the model table differs"]);
  expect(routingDrift(table, table.replace("| reviewer | pr |", "| reviewer | code |"))).toEqual(["the table's roles or task types differ"]);
});

test("every benchmark's routing variants match the live skill outside their model cells", async () => {
  const live = await readFile(liveSkill, "utf8");

  const benchmarks = resolve(openevals, "benchmarks");

  for (const benchmark of await readdir(benchmarks)) {
    const presets = parsePresets(await readFile(resolve(benchmarks, benchmark, "presets.json"), "utf8"));

    for (const preset of Object.values(presets.presets)) {
      if (preset.routing === undefined) continue;

      expect({ variant: preset.routing, drift: routingDrift(live, await readFile(resolve(benchmarks, benchmark, preset.routing), "utf8")) }).toEqual({ variant: preset.routing, drift: [] });
    }
  }
});
