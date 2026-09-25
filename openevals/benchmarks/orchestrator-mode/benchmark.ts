import { existsSync, readFileSync } from "node:fs";
import type { Benchmark } from "@hona/openeval";
import { parsePresets, parseSelection, selectPreset } from "../../src/presets.js";

const presets = parsePresets(readFileSync(new URL("presets.json", import.meta.url), "utf8"));

const selectionUrl = new URL("selected-preset.json", import.meta.url);

const selected = existsSync(selectionUrl) ? parseSelection(readFileSync(selectionUrl, "utf8")) : presets.default;

const preset = selectPreset(presets, selected);

export default {
  name: "orchestrator-mode",
  models: [preset.candidate],
  judge: { model: preset.judge, websearch: false },
  repetitions: 1,
  concurrency: 5,
  candidate: { websearch: false },
  container: { engine: "docker", cpus: 2, memoryMiB: 4096, dockerfile: "container/Dockerfile" },
} satisfies Benchmark;
