import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

/** Per-eval copies of the configure script; duplication is required by OpenEval workspaces. */
const copies = [
  "baked-in-dispatch/workspace/.openeval/configure-environment.ts",
  "explore-evidence/overlay/.openeval/configure-environment.ts",
  "identified-instruction/workspace/.openeval/configure-environment.ts",
  "single-source-file/workspace/.openeval/configure-environment.ts",
];

const prompts = [
  "baked-in-dispatch/prompt.md",
  "explore-evidence/prompt.md",
  "identified-instruction/prompt.md",
  "single-source-file/prompt.md",
];

test("eval workspaces share one configure-environment script", async () => {
  const contents = await Promise.all(
    copies.map((path) =>
      readFile(resolve(import.meta.dir, "../../benchmarks/orchestrator-mode/evals", path), "utf8"),
    ),
  );

  for (const copy of contents.slice(1)) expect(copy).toBe(contents[0]);
});

test("direct-mode prompts use the current command loader", async () => {
  const command = await readFile(resolve(import.meta.dir, "../../../opencode/commands/orchestrate.md"), "utf8");

  const loader = command.split("## User prompt")[0].split("---\n", 3)[2]?.trim();

  expect(loader).toBeTruthy();

  for (const path of prompts) {
    const prompt = await readFile(resolve(import.meta.dir, "../../benchmarks/orchestrator-mode/evals", path), "utf8");

    expect(prompt.split("## User prompt")[0].trim()).toBe(loader);
  }
});
