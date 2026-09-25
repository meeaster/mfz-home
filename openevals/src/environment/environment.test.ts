import { expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { z } from "zod";
import {
  assertEnvironmentContract,
  defaultOptions,
  driftedConfigureScripts,
  materializeEnvironment,
  overridable,
  profileDirectory,
  referencesDirectory,
  renderedConfig,
  requiredComponents,
  stageEnvironment,
} from "./index.js";
import { applySourceOverrides } from "./sources.js";

const sourceHome = resolve(import.meta.dir, "../../../");

const renderedConfigSchema = z.object({
  experimental: z.record(z.string(), z.number()),
  agents: z.object({ explore: z.object({ permissions: z.array(z.object({ action: z.string() })) }) }),
});

async function withTemp(prefix: string, body: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(`/tmp/opencode/${prefix}-`);

  try {
    await body(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("the default environment renders the live roster, instructions, references, and documentation servers", async () => {
  await withTemp("mfz-openeval-live", async (root) => {
    const result = await materializeEnvironment({ sourceHome, options: defaultOptions, workingTree: true }, root);

    const report = await assertEnvironmentContract(result.environment);

    const paths = report.manifest.files.map((file) => file.path);

    expect(paths).toContain(`${profileDirectory}/AGENTS.md`);
    expect(paths).toContain(`${profileDirectory}/opencode/agents/worker.md`);
    expect(paths).toContain(`${profileDirectory}/opencode/skills/development-principles/SKILL.md`);
    expect(report.manifest.references.map((reference) => reference.name)).toContain("openevals");
    expect(await Bun.file(resolve(result.environment, referencesDirectory, "openevals/README.md")).exists()).toBe(true);

    const config = renderedConfigSchema.parse(Bun.JSONC.parse(await readFile(resolve(result.environment, renderedConfig), "utf8")));

    expect(config.experimental).toEqual({ subagent_depth: 3 });
    expect(config.agents.explore.permissions.length).toBeGreaterThan(0);

    for (const file of report.manifest.files) {
      const text = await readFile(resolve(result.environment, file.path), "utf8");

      expect(text).not.toContain(".staging-");
      expect(text).not.toContain(homedir());
    }
  });
}, 300_000);

test("options omit the global instructions and the skills beyond the required set", async () => {
  await withTemp("mfz-openeval-bare", async (root) => {
    const result = await materializeEnvironment(
      { sourceHome, options: { instructions: false, extraSkills: false }, workingTree: true },
      root,
    );

    const report = await assertEnvironmentContract(result.environment);

    const required = await requiredComponents();

    const skills = new Set(
      report.manifest.files.filter((file) => file.component === "skills").map((file) => file.path.split("/")[5]),
    );

    // The renderer always installs its own `mindframe-z` skill.
    expect([...skills].filter((skill) => !required.skills.includes(skill))).toEqual(["mindframe-z"]);
    expect(required.skills.every((skill) => skills.has(skill))).toBe(true);
    expect(report.manifest.files.some((file) => file.path.endsWith("/AGENTS.md"))).toBe(false);
    expect(report.manifest.files.map((file) => file.path)).toContain(`${profileDirectory}/opencode/agents/worker.md`);
  });
}, 300_000);

test("source overrides accept rendered inputs and reject everything else", () => {
  expect(overridable("skills/active/orchestration/references/harnesses/opencode.md")).toBe(true);
  expect(overridable("opencode/agents/explore.md")).toBe(true);
  expect(overridable("profiles/base/profile.yml")).toBe(true);
  expect(overridable("instructions/PERSONAL.md")).toBe(true);
  expect(overridable("catalog/references.yml")).toBe(true);
  expect(overridable("mcp/server/index.ts")).toBe(false);
});

test("source overrides copy present files, delete missing ones, and record both", async () => {
  await withTemp("mfz-openeval-override", async (root) => {
    const home = resolve(root, "home");

    const source = resolve(root, "source");

    await mkdir(resolve(home, "skills/active/orchestrate"), { recursive: true });
    await writeFile(resolve(home, "skills/active/orchestrate/SKILL.md"), "current\n");
    await mkdir(resolve(source, "skills/active/orchestrator-mode"), { recursive: true });
    await writeFile(resolve(source, "skills/active/orchestrator-mode/SKILL.md"), "retired\n");

    const overrides = await applySourceOverrides(home, source, resolve(root, "capture"), [
      "skills/active/orchestrate/SKILL.md",
      "skills/active/orchestrator-mode/SKILL.md",
    ]);

    expect(overrides.map((override) => [override.path, override.sha256 === null])).toEqual([
      ["skills/active/orchestrate/SKILL.md", false],
      ["skills/active/orchestrator-mode/SKILL.md", true],
    ]);
    expect(await readFile(resolve(source, "skills/active/orchestrate/SKILL.md"), "utf8")).toBe("current\n");
    expect(await readFile(resolve(root, "capture/skills/active/orchestrate/SKILL.md"), "utf8")).toBe("current\n");
    expect(await Bun.file(resolve(source, "skills/active/orchestrator-mode/SKILL.md")).exists()).toBe(false);
  });
});

test("staging installs the environment and configure script into every eval fixture", async () => {
  await withTemp("mfz-openeval-stage", async (root) => {
    const environment = resolve(root, "environment");

    await mkdir(environment, { recursive: true });
    await writeFile(resolve(environment, "AGENTS.md"), "# Instructions\n");

    await mkdir(resolve(root, "benchmark/evals/local/workspace/.openeval/environment"), { recursive: true });
    await writeFile(resolve(root, "benchmark/evals/local/workspace/.openeval/environment/stale.md"), "stale\n");
    await writeFile(resolve(root, "benchmark/evals/local/eval.ts"), "export default {};\n");
    await mkdir(resolve(root, "benchmark/evals/remote"), { recursive: true });
    await writeFile(resolve(root, "benchmark/evals/remote/eval.ts"), `export default { workspace: { ref: "main", overlay: "overlay" } };\n`);

    const benchmark = resolve(root, "benchmark");

    await stageEnvironment(environment, benchmark);

    for (const fixture of ["evals/local/workspace/.openeval", "evals/remote/overlay/.openeval"])
      expect(await readFile(resolve(benchmark, fixture, "environment/AGENTS.md"), "utf8")).toBe("# Instructions\n");

    expect(await Bun.file(resolve(benchmark, "evals/local/workspace/.openeval/environment/stale.md")).exists()).toBe(false);
    expect(await driftedConfigureScripts(benchmark)).toEqual([]);
  });
});

test("committed eval fixtures carry the canonical configure script", async () => {
  expect(await driftedConfigureScripts()).toEqual([]);
});
