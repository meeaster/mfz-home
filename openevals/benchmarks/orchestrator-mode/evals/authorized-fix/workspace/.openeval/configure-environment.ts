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

const home = homedir();

const configRoot = join(home, ".config", "opencode");

/** The rendered profile, installed where the live setup keeps it. */
const profile = join(home, ".mindframe-z", "configs", "openeval");

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
  throw new Error("No rendered environment: run `bun src/environment-cli.ts stage` on the host first");

/**
 * OpenEval writes `opencode.json` before preparation; mfz renders `opencode.jsonc`.
 * Both are JSON objects, and the rendered one may carry comments.
 */
async function readObject(path: string): Promise<Record<string, JsonValue>> {
  // SAFETY: Both documents are JSON objects produced by the evaluator or the renderer.
  return Bun.JSONC.parse(await readFile(path, "utf8")) as Record<string, JsonValue>;
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
    const defined = existsSync(join(profile, "opencode", "agents", `${name}.md`));

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

// The rendered permissions replace OpenEval's allow-all rule; OpenEval keeps its plugins and websearch setting.
const merged = { ...generated, ...rendered, plugins: generated.plugins, websearch: generated.websearch };

const contents = `${JSON.stringify(merged, null, 2)}\n`;

// OpenCode loads `opencode.json` and `opencode.jsonc` as separate layers; the live setup has only the rendered `opencode.jsonc`.
await writeFile(join(configRoot, "opencode.jsonc"), contents, "utf8");

await rm(join(configRoot, "opencode.json"));

await writeAgentOverrides();

// OpenEval snapshots the initial workspace after preparation; the candidate sees only task files.
await rm(join(workspace, ".openeval"), { recursive: true, force: true });
