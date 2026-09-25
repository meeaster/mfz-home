import { expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  assertEnvironmentContract,
  driftedConfigureScripts,
  materializeEnvironment,
  overridable,
  requiredComponents,
  stageEnvironment,
} from "./index.js";
import { applySourceOverrides } from "./sources.js";

const sourceHome = resolve(import.meta.dir, "../../../");

async function withTemp(prefix: string, body: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(`/tmp/opencode/${prefix}-`);

  try {
    await body(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("minimal renders the orchestration skills and agents with every linked reference", async () => {
  await withTemp("mfz-openeval-minimal", async (root) => {
    const result = await materializeEnvironment({ sourceHome, profile: "minimal", workingTree: true }, root);

    const report = await assertEnvironmentContract(result.environment);

    const required = await requiredComponents();

    const agents = report.manifest.files.filter((file) => file.component === "agents").map((file) => file.path);

    expect(agents.sort()).toEqual(required.agents.map((agent) => `agents/${agent}.md`).sort());
    expect(await readFile(resolve(result.environment, "skills/orchestrate/SKILL.md"), "utf8")).toContain("opencode/autoinvoke: false");
  });
});

test("personal adds the live roster without private skills or instructions", async () => {
  await withTemp("mfz-openeval-personal", async (root) => {
    const result = await materializeEnvironment({ sourceHome, profile: "personal", workingTree: true }, root);

    const report = await assertEnvironmentContract(result.environment);

    const paths = report.manifest.files.map((file) => file.path);

    expect(paths).toContain("agents/research.md");
    expect(paths).toContain("skills/development-principles/SKILL.md");
    expect(paths.some((path) => path.startsWith("skills/threads/") || path.startsWith("skills/tradingview/"))).toBe(false);
    expect(await readFile(resolve(root, "profile.yml"), "utf8")).not.toContain("PERSONAL");
  });
});

test("source overrides accept orchestration inputs and reject private instructions", () => {
  expect(overridable("skills/active/orchestration/references/harnesses/opencode.md")).toBe(true);
  expect(overridable("opencode/agents/explore.md")).toBe(true);
  expect(overridable("profiles/base/profile.yml")).toBe(true);
  expect(overridable("instructions/PERSONAL.md")).toBe(false);
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
