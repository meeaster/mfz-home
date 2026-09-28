import { expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { mkdtemp, mkdir, readFile, realpath, rm, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

type ProjectConfig = { agents?: Record<string, { model?: string }> };

type Permission = { action: string; resource: string; effect: string };

type GlobalConfig = {
  permissions?: Permission[];
  plugins?: string[];
  websearch?: boolean;
  experimental?: { subagent_depth?: number };
  agents?: Record<string, { permissions?: Permission[] }>;
};

const script = resolve(import.meta.dir, "configure-environment.ts");

async function write(path: string, contents: string): Promise<void> {
  await mkdir(resolve(path, ".."), { recursive: true });
  await writeFile(path, contents, "utf8");
}

async function readJson<T>(path: string): Promise<T> {
  // SAFETY: Test fixtures read JSON documents written by this repository.
  return JSON.parse(await readFile(path, "utf8")) as T;
}

/** A workspace with the rendered environment the configure step installs. */
async function fixture(root: string, overrides?: string): Promise<void> {
  const environment = join(root, "workspace", ".openeval", "environment");

  const profile = join(environment, "mindframe-z", "configs", "openeval");

  // OpenEval writes the global config before preparation; preparation merges into it.
  await write(
    join(root, "home", ".config", "opencode", "opencode.json"),
    `${JSON.stringify({ plugins: ["/opt/opencode/noninteractive"], permissions: [{ action: "*", resource: "*", effect: "allow" }], websearch: false }, null, 2)}\n`,
  );

  await write(join(profile, "AGENTS.md"), "# Instructions\n");
  await write(join(profile, "opencode", "agents", "orchestrator.md"), "---\nmodel: openai/gpt-6-luna\n---\nOrchestrate.\n");
  await write(join(profile, "opencode", "agents", "worker.md"), "---\nmodel: openai/gpt-6-luna\n---\nWork.\n");
  await write(join(profile, "opencode", "skills", "orchestrate", "SKILL.md"), "# Skill\n");
  await write(join(environment, "manifest.json"), "{}\n");
  await write(
    join(profile, "opencode", "opencode.jsonc"),
    `// Rendered by mfz.\n${JSON.stringify(
      {
        instructions: ["/home/dev/.mindframe-z/configs/openeval/AGENTS.md"],
        skills: ["/home/dev/.mindframe-z/configs/openeval/opencode/skills"],
        permissions: [{ action: "read", resource: "/home/dev/.mindframe-z/references/*", effect: "allow" }],
        experimental: { subagent_depth: 3 },
        agents: { explore: { permissions: [{ action: "edit", resource: "*", effect: "deny" }] } },
        mcp: { servers: {} },
      },
      null,
      2,
    )}\n`,
  );

  if (overrides !== undefined) await write(join(root, "workspace", ".openeval", "agent-models.json"), overrides);
}

/** Add a Cairn build to a fixture's environment. */
async function withCairn(root: string): Promise<void> {
  const cairn = join(root, "workspace", ".openeval", "environment", "cairn");

  await write(join(cairn, "package.json"), `{ "name": "@mfz/cairn" }\n`);

  for (const entry of ["cli.js", "mcp.js", "opencode/server.js"]) await write(join(cairn, "dist", entry), "#!/usr/bin/env node\n");
}

async function configure(root: string, ...args: string[]): Promise<void> {
  const child = Bun.spawn(["bun", script, ...args], {
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
      `${JSON.stringify({ orchestrator: "openai/gpt-6-luna#max", worker: "opencode-go/deepseek-v4.1-flash#high", explore: "openai/gpt-6-luna#high", ghost: "openai/gpt-6-luna#low" }, null, 2)}\n`,
    );

    await configure(root);

    const project = await readJson<ProjectConfig>(join(root, "workspace", "opencode.json"));

    expect(project.agents?.orchestrator?.model).toBe("openai/gpt-6-luna#max");
    expect(project.agents?.worker?.model).toBe("opencode-go/deepseek-v4.1-flash#high");

    // `explore` is an OpenCode core built-in: no environment definition, safe to override.
    expect(project.agents?.explore?.model).toBe("openai/gpt-6-luna#high");
    expect(project.agents?.ghost).toBeUndefined();

    const global = await readJson<GlobalConfig>(join(root, "home", ".config", "opencode", "opencode.jsonc"));

    // The rendered config replaces OpenEval's allow-all rule and keeps its plugins and websearch setting.
    expect(global.permissions).toEqual([{ action: "read", resource: "/home/dev/.mindframe-z/references/*", effect: "allow" }]);
    expect(global.plugins).toEqual(["/opt/opencode/noninteractive"]);
    expect(global.websearch).toBe(false);
    expect(global.experimental).toEqual({ subagent_depth: 3 });
    expect(global.agents).toEqual({ explore: { permissions: [{ action: "edit", resource: "*", effect: "deny" }] } });

    // OpenCode would load a leftover `opencode.json` as a second global layer.
    expect(await Bun.file(join(root, "home", ".config", "opencode", "opencode.json")).exists()).toBe(false);
    expect(await readFile(join(root, "home", ".mindframe-z", "configs", "openeval", "opencode", "skills", "orchestrate", "SKILL.md"), "utf8")).toBe("# Skill\n");
    expect(await readFile(join(root, "home", ".config", "opencode", "AGENTS.md"), "utf8")).toBe("# Instructions\n");
    expect(await readFile(join(root, "home", ".config", "opencode", "agents", "orchestrator.md"), "utf8")).toContain(
      "Orchestrate.",
    );

    // Harness files leave the workspace before OpenEval takes the initial snapshot.
    expect(await Bun.file(join(root, "workspace", ".openeval", "agent-models.json")).exists()).toBe(false);
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

test("installs the agent under test one level deeper only when a scenario eval asks for it", async () => {
  const root = await mkdtemp("/tmp/opencode/mfz-agent-models-");

  const overrides = `${JSON.stringify({ "agent-under-test": "openai/gpt-6-sol#medium" }, null, 2)}\n`;

  const definition = join(root, "home", ".config", "opencode", "agents", "agent-under-test.md");

  try {
    await fixture(root, overrides);

    await configure(root, "--agent-under-test");

    const global = await readJson<GlobalConfig>(join(root, "home", ".config", "opencode", "opencode.jsonc"));

    expect(global.experimental).toEqual({ subagent_depth: 4 });

    // An empty body keeps OpenCode's default system prompt, as the built-in `build` has.
    expect((await readFile(definition, "utf8")).endsWith("---\n")).toBe(true);

    const project = await readJson<ProjectConfig>(join(root, "workspace", "opencode.json"));

    expect(project.agents?.["agent-under-test"]?.model).toBe("openai/gpt-6-sol#medium");
  } finally {
    await rm(root, { recursive: true, force: true });
  }

  const plain = await mkdtemp("/tmp/opencode/mfz-agent-models-");

  try {
    await fixture(plain, overrides);

    await configure(plain);

    expect(await Bun.file(join(plain, "home", ".config", "opencode", "agents", "agent-under-test.md")).exists()).toBe(false);
    expect(await Bun.file(join(plain, "workspace", "opencode.json")).exists()).toBe(false);
  } finally {
    await rm(plain, { recursive: true, force: true });
  }
});

test("installs Cairn and the server plugins and loads them beside OpenEval's", async () => {
  const root = await mkdtemp("/tmp/opencode/mfz-agent-models-");

  const home = join(root, "home");

  const installed = join(home, ".local", "share", "mfz-packages", "node_modules", "@mfz", "cairn");

  try {
    await fixture(root);
    await withCairn(root);
    await write(join(root, "workspace", ".openeval", "environment", "plugins", "session-context", "server.js"), "export default {};\n");

    await configure(root);

    const global = await readJson<GlobalConfig>(join(home, ".config", "opencode", "opencode.jsonc"));

    const plugin = join(home, ".local", "share", "mfz-plugins", "session-context");

    expect(global.plugins).toEqual(["/opt/opencode/noninteractive", `file://${plugin}`, `file://${join(installed, "dist", "opencode")}`]);
    expect(await Bun.file(join(plugin, "server.js")).exists()).toBe(true);
    expect(await realpath(join(home, ".local", "bin", "cairn-mcp"))).toBe(join(installed, "dist", "mcp.js"));
    expect(await realpath(join(home, ".local", "bin", "cairn"))).toBe(join(installed, "dist", "cli.js"));
    expect((await stat(join(installed, "dist", "mcp.js"))).mode & 0o111).not.toBe(0);
    expect(existsSync(join(root, "workspace", ".openeval"))).toBe(false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
