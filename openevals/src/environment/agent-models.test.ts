import { expect, test } from "bun:test";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

type ProjectConfig = { agents?: Record<string, { model?: string }> };

const script = resolve(
  import.meta.dir,
  "../../benchmarks/orchestrator-mode/evals/baked-in-dispatch/workspace/.openeval/configure-environment.ts",
);

async function write(path: string, contents: string): Promise<void> {
  await mkdir(resolve(path, ".."), { recursive: true });
  await writeFile(path, contents, "utf8");
}

async function readJson<T>(path: string): Promise<T> {
  // SAFETY: Test fixtures read JSON documents written by this repository.
  return JSON.parse(await readFile(path, "utf8")) as T;
}

/** A workspace with the environment files the configure step copies. */
async function fixture(root: string, overrides?: string): Promise<void> {
  const environment = join(root, "workspace", ".openeval", "environment");

  // OpenEval writes the global config before preparation; preparation merges into it.
  await write(
    join(root, "home", ".config", "opencode", "opencode.json"),
    `${JSON.stringify({ model: "opencode-go/gpt-5.6-luna" }, null, 2)}\n`,
  );

  await write(join(environment, "AGENTS.md"), "# Instructions\n");
  await write(join(environment, "references.md"), "# References\n");
  await write(join(environment, "agents", "orchestrator.md"), "---\nmodel: openai/gpt-5.6-luna\n---\nOrchestrate.\n");
  await write(join(environment, "agents", "worker.md"), "---\nmodel: openai/gpt-5.6-luna\n---\nWork.\n");
  await write(join(environment, "commands", "orchestrate.md"), "Command\n");
  await write(join(environment, "skills", "orchestrator-mode", "SKILL.md"), "# Skill\n");
  await write(
    join(environment, "opencode.json"),
    `${JSON.stringify({ instructions: ["/home/dev/.config/opencode/AGENTS.md"], skills: ["/home/dev/.config/opencode/skills"], mcp: { servers: {} } }, null, 2)}\n`,
  );

  if (overrides !== undefined) await write(join(root, "workspace", ".openeval", "agent-models.json"), overrides);
}

async function configure(root: string): Promise<void> {
  const child = Bun.spawn(["bun", script], {
    cwd: join(root, "workspace"),
    env: { ...process.env, HOME: join(root, "home") },
    stdout: "pipe",
    stderr: "pipe",
  });

  const [code, stderr] = await Promise.all([child.exited, new Response(child.stderr).text()]);

  if (code !== 0) throw new Error(stderr);
}

test("overrides defined agents and core built-ins, skipping unknown agents", async () => {
  const root = await mkdtemp("/tmp/opencode/mfz-agent-models-");

  try {
    await fixture(
      root,
      `${JSON.stringify({ orchestrator: "opencode-go/gpt-5.6-luna#max", worker: "opencode-go/deepseek-v4.1-flash#high", explore: "opencode-go/gpt-5.6-luna#high", ghost: "opencode-go/gpt-5.6-luna#low" }, null, 2)}\n`,
    );

    await configure(root);

    const project = await readJson<ProjectConfig>(join(root, "workspace", "opencode.json"));

    expect(project.agents?.orchestrator?.model).toBe("opencode-go/gpt-5.6-luna#max");
    expect(project.agents?.worker?.model).toBe("opencode-go/deepseek-v4.1-flash#high");

    // `explore` is an OpenCode core built-in: no environment definition, safe to override.
    expect(project.agents?.explore?.model).toBe("opencode-go/gpt-5.6-luna#high");
    expect(project.agents?.ghost).toBeUndefined();

    const global = await readJson<{ skills?: string[]; mcp?: unknown }>(
      join(root, "home", ".config", "opencode", "opencode.json"),
    );

    expect(global.skills).toEqual(["/home/dev/.config/opencode/skills"]);
    expect(global.mcp).toEqual({ servers: {} });
    expect(await readFile(join(root, "home", ".config", "opencode", "agents", "orchestrator.md"), "utf8")).toContain(
      "Orchestrate.",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("writes no project config when the benchmark declares no overrides", async () => {
  const root = await mkdtemp("/tmp/opencode/mfz-agent-models-");

  try {
    await fixture(root);

    await configure(root);

    expect(await Bun.file(join(root, "workspace", "opencode.json")).exists()).toBe(false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
