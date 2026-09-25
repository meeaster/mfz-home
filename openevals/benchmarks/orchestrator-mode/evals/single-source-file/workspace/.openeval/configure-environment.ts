/**
 * Candidate-side preparation step. This is the canonical copy: `bun src/environment-cli.ts stage`
 * or `sync` copies it into every eval fixture's `.openeval/`, because OpenEval runs
 * preparation inside the candidate workspace and cannot reach files outside it.
 */
import { existsSync } from "node:fs";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

/** Model overrides keyed by agent name; each value is a `provider/model#variant` ref. */
type AgentModels = { [agent: string]: string };

const configRoot = join(homedir(), ".config", "opencode");

const workspace = process.cwd();

/**
 * Directory that receives the project `opencode.json`. Preparation runs inside a
 * nested checkout for repository workspaces, so the caller may pass the workspace
 * root instead. Defaults to the current directory.
 */
const projectRoot = resolve(workspace, process.argv[2] ?? ".");

const environment = join(workspace, ".openeval", "environment");

const projectConfig = join(projectRoot, "opencode.json");

const overridesPath = join(workspace, ".openeval", "agent-models.json");

/**
 * Agents that OpenCode core defines with their own prompt and `subagent` mode.
 * A config entry merges into the built-in definition, so overriding their model
 * cannot create a promptless placeholder.
 */
const builtinAgents: ReadonlySet<string> = new Set(["explore"]);

if (!existsSync(join(environment, "manifest.json")))
  throw new Error("No rendered environment: run `bun src/environment-cli.ts stage <profile>` on the host first");

/**
 * OpenCode writes `opencode.json` before preparation; the materializer writes the
 * rendered environment. Both are JSON objects.
 */
async function readObject(path: string): Promise<Record<string, JsonValue>> {
  // SAFETY: Both documents are JSON objects produced by the evaluator or materializer.
  return JSON.parse(await readFile(path, "utf8")) as Record<string, JsonValue>;
}

/**
 * Apply per-benchmark agent model overrides.
 *
 * OpenCode applies a project `opencode.json` after global agent markdown, so this
 * is the only config surface that overrides a model declared in agent
 * frontmatter. Agents without a definition in the environment are skipped, which
 * avoids creating promptless placeholder agents. Core built-ins such as
 * `explore` are exempt: OpenCode supplies their definition itself.
 */
async function writeAgentOverrides(): Promise<void> {
  if (!existsSync(overridesPath)) return;

  // SAFETY: `agent-models.json` is committed in this repository as a flat agent-to-model map.
  const overrides = JSON.parse(await readFile(overridesPath, "utf8")) as AgentModels;

  const agents: Record<string, { model: string }> = {};

  for (const [name, model] of Object.entries(overrides)) {
    const defined = existsSync(join(environment, "agents", `${name}.md`));

    if (defined || builtinAgents.has(name)) agents[name] = { model };
  }

  if (Object.keys(agents).length === 0) return;

  const existing = existsSync(projectConfig) ? await readObject(projectConfig) : {};

  // SAFETY: A project `opencode.json` stores `agents` as an object when present.
  const current = (existing.agents ?? {}) as Record<string, { model: string }>;

  const contents = `${JSON.stringify(
    {
      ...existing,
      $schema: "https://opencode.ai/config.json",
      agents: { ...current, ...agents },
    },
    null,
    2,
  )}\n`;

  await writeFile(projectConfig, contents, "utf8");
}

await mkdir(configRoot, { recursive: true });

for (const file of ["AGENTS.md", "references.md"])
  await cp(join(environment, file), join(configRoot, file));

for (const directory of ["skills", "commands", "agents"]) {
  const rendered = join(environment, directory);

  if (existsSync(rendered)) await cp(rendered, join(configRoot, directory), { recursive: true });
}

const generated = await readObject(join(configRoot, "opencode.json"));

const rendered = await readObject(join(environment, "opencode.json"));

// SAFETY: The materializer renders `instructions` and `skills` as string arrays.
const instructions = rendered.instructions as string[];

// SAFETY: The materializer renders `skills` as a string array of skill directories.
const skills = rendered.skills as string[];

const merged = {
  ...generated,
  instructions,
  skills,
  mcp: rendered.mcp,
};

const contents = `${JSON.stringify(merged, null, 2)}\n`;

await writeFile(join(configRoot, "opencode.json"), contents, "utf8");

await writeFile(join(configRoot, "opencode.jsonc"), contents, "utf8");

await writeAgentOverrides();

// OpenEval snapshots the initial workspace after preparation; the candidate sees only task files.
await rm(join(workspace, ".openeval"), { recursive: true, force: true });
