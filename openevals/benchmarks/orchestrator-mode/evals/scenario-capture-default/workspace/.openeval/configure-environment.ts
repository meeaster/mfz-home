/**
 * Candidate-side preparation step. This is the canonical copy: `bun src/environment-cli.ts stage`
 * or `sync` copies it into every eval fixture's `.openeval/`, because OpenEval runs
 * preparation inside the candidate workspace and cannot reach files outside it.
 */
import { existsSync } from "node:fs";
import { chmod, cp, mkdir, readdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

/** Model overrides keyed by agent name; each value is a `provider/model#variant` ref. */
type AgentModels = { [agent: string]: string };

const home = homedir();

const configRoot = join(home, ".config", "opencode");

/** The rendered profile, installed where the live setup keeps it. */
const profile = join(home, ".mindframe-z", "configs", "openeval");

const workspace = process.cwd();

const { values: options, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: { "agent-under-test": { type: "boolean", default: false } },
  allowPositionals: true,
});

/**
 * Directory that receives the project `opencode.json`. Preparation runs inside a
 * nested checkout for repository workspaces, so the caller may pass the workspace
 * root instead. Defaults to the current directory.
 */
const projectRoot = resolve(workspace, positionals[0] ?? ".");

const environment = join(workspace, ".openeval", "environment");

const projectConfig = join(projectRoot, "opencode.json");

const overridesPath = join(workspace, ".openeval", "agent-models.json");

/** Cairn built from the environment's source; its MCP server, CLI, and OpenCode plugin. */
const cairnBuild = join(environment, "cairn");

/** Where live installs Cairn. Its commands link into `~/.local/bin`, which the container image puts on PATH. */
const cairnPackage = join(home, ".local", "share", "mfz-packages", "node_modules", "@mfz", "cairn");

/** Server plugins bundled from the environment's source, one directory each. */
const pluginBuilds = join(environment, "plugins");

/** Where preparation installs the server plugins; live loads them from the source home instead. */
const pluginRoot = join(home, ".local", "share", "mfz-plugins");

/**
 * Agents that OpenCode core defines with their own prompt and `subagent` mode.
 * A config entry merges into the built-in definition, so overriding their model
 * cannot create a promptless placeholder.
 */
const builtinAgents: ReadonlySet<string> = new Set(["explore"]);

/**
 * Scenario evals, selected with `--agent-under-test`, have the root session act as the human and
 * converse with this agent in its place. It mirrors OpenCode's built-in `build`: an empty body keeps
 * the default system prompt, `question` is the one permission `build` adds, and `hidden` keeps it out
 * of every session's list of dispatchable agents.
 */
const agentUnderTest = `---
description: Stands in for the primary session in scenario evals.
mode: subagent
hidden: true
permissions:
  - action: question
    resource: "*"
    effect: allow
---
`;

if (!existsSync(join(environment, "manifest.json")))
  throw new Error("No rendered environment: run `bun src/environment-cli.ts stage` on the host first");

/**
 * OpenEval writes `opencode.json` before preparation; mfz renders `opencode.jsonc`.
 * Both are JSON objects, and the rendered one may carry comments.
 */
async function readObject(path: string): Promise<Record<string, JsonValue>> {
  // SAFETY: Both documents are JSON objects produced by the evaluator or the renderer.
  return Bun.JSONC.parse(await readFile(path, "utf8")) as Record<string, JsonValue>;
}

/** Allow one more level of nested subagents than the rendered config does. */
function deeperSubagents(experimental: JsonValue | undefined): JsonValue {
  // SAFETY: The rendered config stores `experimental` as an object whose `subagent_depth` is a number when present.
  const current = (experimental ?? {}) as { subagent_depth?: number };

  return { ...current, subagent_depth: (current.subagent_depth ?? 1) + 1 };
}

/**
 * Apply per-benchmark agent model overrides.
 *
 * OpenCode applies a project `opencode.json` after global agent markdown, so this
 * is the only config surface that overrides a model declared in agent
 * frontmatter. Agents without an installed definition are skipped, which
 * avoids creating promptless placeholder agents. Core built-ins such as
 * `explore` are exempt: OpenCode supplies their definition itself.
 */
async function writeAgentOverrides(): Promise<void> {
  if (!existsSync(overridesPath)) return;

  // SAFETY: `agent-models.json` is committed in this repository as a flat agent-to-model map.
  const overrides = JSON.parse(await readFile(overridesPath, "utf8")) as AgentModels;

  const agents: Record<string, { model: string }> = {};

  for (const [name, model] of Object.entries(overrides)) {
    const defined = existsSync(join(configRoot, "agents", `${name}.md`));

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

/**
 * Install Cairn as `mise run cairn:install` does live and return its OpenCode plugin. Its catalog root is the
 * live default under the candidate's home, outside the task workspace, and starts empty.
 */
async function installCairn(): Promise<string[]> {
  if (!existsSync(cairnBuild)) return [];

  await cp(cairnBuild, cairnPackage, { recursive: true });

  const bin = join(home, ".local", "bin");

  await mkdir(bin, { recursive: true });

  for (const [command, entry] of [["cairn", "cli.js"], ["cairn-mcp", "mcp.js"]] as const) {
    const target = join(cairnPackage, "dist", entry);

    await chmod(target, 0o755);
    await symlink(target, join(bin, command));
  }

  return [`file://${join(cairnPackage, "dist", "opencode")}`];
}

/** Install each bundled server plugin and return the plugins OpenCode loads, as the live profile enables them. */
async function installPlugins(): Promise<string[]> {
  if (!existsSync(pluginBuilds)) return [];

  const names = (await readdir(pluginBuilds)).sort();

  await cp(pluginBuilds, pluginRoot, { recursive: true });

  return names.map((name) => `file://${join(pluginRoot, name)}`);
}

await cp(join(environment, "mindframe-z"), join(home, ".mindframe-z"), { recursive: true });

await mkdir(configRoot, { recursive: true });

// The live setup links these from `~/.config/opencode` into the rendered profile.
if (existsSync(join(profile, "AGENTS.md"))) await cp(join(profile, "AGENTS.md"), join(configRoot, "AGENTS.md"));

for (const directory of ["agents", "commands"]) {
  const source = join(profile, "opencode", directory);

  if (existsSync(source)) await cp(source, join(configRoot, directory), { recursive: true });
}

const generated = await readObject(join(configRoot, "opencode.json"));

const rendered = await readObject(join(profile, "opencode", "opencode.jsonc"));

if (options["agent-under-test"]) {
  await mkdir(join(configRoot, "agents"), { recursive: true });

  await writeFile(join(configRoot, "agents", "agent-under-test.md"), agentUnderTest, "utf8");
}

// The agent under test runs one level below the root, so one more level keeps its live depth.
const experimental = options["agent-under-test"] ? deeperSubagents(rendered.experimental) : rendered.experimental;

const plugins = [...(Array.isArray(generated.plugins) ? generated.plugins : []), ...(await installPlugins()), ...(await installCairn())];

// The rendered permissions replace OpenEval's allow-all rule; OpenEval keeps its plugins and websearch setting, and the environment's plugins join them.
const merged = { ...generated, ...rendered, plugins, websearch: generated.websearch, experimental };

const contents = `${JSON.stringify(merged, null, 2)}\n`;

// OpenCode loads `opencode.json` and `opencode.jsonc` as separate layers; the live setup has only the rendered `opencode.jsonc`.
await writeFile(join(configRoot, "opencode.jsonc"), contents, "utf8");

await rm(join(configRoot, "opencode.json"));

await writeAgentOverrides();

// OpenEval snapshots the initial workspace after preparation; the candidate sees only task files.
await rm(join(workspace, ".openeval"), { recursive: true, force: true });
