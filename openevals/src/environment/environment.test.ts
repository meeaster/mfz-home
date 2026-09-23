import { expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { assertEnvironmentContract, environmentNames, materializePreset } from "./index.js";

async function sourceCommit(): Promise<{ home: string; commit: string }> {
  const home = resolve(import.meta.dir, "../../../");
  const child = Bun.spawn(["git", "-C", home, "rev-parse", "HEAD"], { stdout: "pipe", stderr: "pipe" });

  const [code, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]);

  if (code !== 0) throw new Error(stderr);

  return { home, commit: stdout.trim() };
}

test("exposes exactly the two controlled environment presets", () => {
  expect(environmentNames).toEqual(["minimal", "personal"]);
});

test("materializes minimal from canonical source and records digests", async () => {
  const root = await mkdtemp("/tmp/opencode/mfz-openeval-minimal-");

  try {
    const source = await sourceCommit();
    const result = await materializePreset(source.home, source.commit, "minimal", root);
    const report = await assertEnvironmentContract(`${result.workspace}/.openeval/environment`);

    expect(report.ok).toBe(true);
    expect(report.manifest.sourceCommit).toBe(source.commit);
    expect(report.manifest.components.commands).toContain("commands/orchestrate.md");
    expect(report.manifest.components.agents).toContain("agents/orchestrator.md");
    expect(await readFile(resolve(result.workspace, ".openeval/environment/opencode.json"), "utf8")).toContain('"*": "deny"');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("materializes sanitized personal without private runtime material", async () => {
  const root = await mkdtemp("/tmp/opencode/mfz-openeval-personal-");

  try {
    const source = await sourceCommit();
    const result = await materializePreset(source.home, source.commit, "personal", root);
    const report = await assertEnvironmentContract(`${result.workspace}/.openeval/environment`);
    const files = report.files.map((file) => file.path).join("\n");

    expect(report.ok).toBe(true);
    expect(files).not.toMatch(/PERSONAL_KNOWLEDGE|personal-knowledge|personal-sources/iu);
    expect(files).not.toMatch(/\.claude|\.codex/iu);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("archives explicit local source overrides and records their digests", async () => {
  const root = await mkdtemp("/tmp/opencode/mfz-openeval-override-");

  try {
    const source = await sourceCommit();
    const path = "skills/active/orchestrator-mode/SKILL.md";
    const result = await materializePreset(source.home, source.commit, "minimal", root, [path]);
    const captured = await readFile(resolve(root, "source-overrides", path), "utf8");
    const rendered = await readFile(resolve(result.workspace, ".openeval/environment/skills/orchestrator-mode/SKILL.md"), "utf8");

    expect(captured).toBe(await readFile(resolve(source.home, path), "utf8"));
    expect(rendered).toBe(captured);
    expect(result.manifest.sourceOverrides).toEqual([
      { path, sha256: new Bun.CryptoHasher("sha256").update(captured).digest("hex") },
    ]);
    expect((await assertEnvironmentContract(`${result.workspace}/.openeval/environment`)).ok).toBe(true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects source overrides outside the scoped orchestration assets", async () => {
  const root = await mkdtemp("/tmp/opencode/mfz-openeval-override-");

  try {
    const source = await sourceCommit();

    await expect(materializePreset(source.home, source.commit, "minimal", root, ["instructions/PERSONAL.md"]))
      .rejects.toThrow("outside orchestration scope");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
