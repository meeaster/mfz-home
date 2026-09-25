import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import YAML from "yaml";
import { z } from "zod";

/** Profile name the environment renders under, in the archived source and the candidate's `.mindframe-z`. */
export const profileName = "openeval";

/** What the candidate sees beyond the live agents, their permissions, and the orchestration skills. */
export type EnvironmentOptions = {
  /** Global instructions with their instruction, capability, reference, and extra-folder pointers. */
  instructions: boolean;
  /** Every other skill the live profiles enable for OpenCode. */
  extraSkills: boolean;
};

export const defaultOptions: EnvironmentOptions = { instructions: true, extraSkills: true };

/**
 * Agents OpenCode core defines with their own prompt. Their config entries merge into the built-in
 * definition, so their permissions render without an agent file, as they do live.
 */
const builtinAgents: ReadonlySet<string> = new Set(["explore"]);

/** Directory name that keeps each option combination's rendering apart. */
export function environmentLabel(options: EnvironmentOptions): string {
  const omitted = [options.instructions ? "" : "no-instructions", options.extraSkills ? "" : "no-extra-skills"];

  return ["live", ...omitted.filter((part) => part !== "")].join("-");
}

const requiredOverlay = resolve(import.meta.dirname, "../../overlays/required.yml");

/** Documentation MCP servers that need no credential; the environment keeps those the live profiles enable. */
export const docsServers: ReadonlySet<string> = new Set(["openai-docs", "aws-knowledge", "cloudflare-docs", "x-docs"]);

/** A few small reference repositories the renderer checks out at their catalog revisions. */
const selectedReferences: ReadonlySet<string> = new Set(["openevals", "openspec", "opencode-plugins", "mattpocock-skills"]);

const agentToggle = z.object({ opencode: z.boolean().optional() }).passthrough();

const permission = z.object({ action: z.string(), resource: z.string(), effect: z.string() });

const entry = z.object({}).passthrough();

const mcpToggle = z
  .object({ agents: z.union([z.array(z.string()), z.object({ disabled: z.array(z.string()) })]).optional() })
  .passthrough();

const profileSchema = z
  .object({
    instructions: z.array(z.string()).optional(),
    instruction_references: z.array(entry).optional(),
    capability_groups: z.array(entry).optional(),
    references: z.array(z.string()).optional(),
    extra_folders: z.array(entry).optional(),
    skills: z.record(z.string(), z.object({ agents: agentToggle.optional() }).passthrough()).optional(),
    mcp: z.record(z.string(), mcpToggle).optional(),
    opencode: z
      .object({
        global_instructions: z.boolean().optional(),
        agents: z.array(z.string()).optional(),
        config: z
          .object({
            experimental: z.record(z.string(), z.json()).optional(),
            agents: z
              .record(z.string(), z.object({ permissions: z.array(permission).optional() }).passthrough())
              .optional(),
          })
          .passthrough()
          .optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

type Profile = z.infer<typeof profileSchema>;

type AgentPermissions = Record<string, { permissions: z.infer<typeof permission>[] }>;

const requiredSchema = z.object({ skills: z.array(z.string()), agents: z.array(z.string()) });

async function readProfile(path: string): Promise<Profile> {
  return profileSchema.parse(YAML.parse(await readFile(path, "utf8")));
}

/** Names whose latest toggle across the profiles enables them; later profiles override earlier ones. */
function enabled(entries: Iterable<[string, boolean]>): string[] {
  const toggles = new Map(entries);

  const names: string[] = [];

  for (const [name, on] of toggles) if (on) names.push(name);

  return names;
}

function enabledSkills(...profiles: Profile[]): string[] {
  return enabled(
    profiles.flatMap((profile) =>
      Object.entries(profile.skills ?? {}).map(([name, skill]): [string, boolean] => [name, skill.agents?.opencode === true]),
    ),
  );
}

function enabledDocsServers(...profiles: Profile[]): string[] {
  const servers = enabled(
    profiles.flatMap((profile) =>
      Object.entries(profile.mcp ?? {}).map(([name, server]): [string, boolean] => [
        name,
        Array.isArray(server.agents) && server.agents.includes("opencode"),
      ]),
    ),
  );

  return servers.filter((name) => docsServers.has(name));
}

/** Skills and agents every environment must render, declared once in the required overlay. */
export async function requiredComponents(): Promise<{ skills: string[]; agents: string[] }> {
  return requiredSchema.parse(YAML.parse(await readFile(requiredOverlay, "utf8")));
}

/**
 * Flatten the live base and Personal profiles into the environment's profile.
 *
 * Keeps every OpenCode agent with its live permissions and the experimental
 * settings, and the credential-free documentation servers. The options decide
 * whether global instructions with their pointers and the skills beyond the
 * required set are included. Drops plugins, other MCP servers, and model pins,
 * which the benchmark presets own instead. Pointers to host paths render as
 * written and resolve to nothing in the candidate container.
 */
function environmentProfile(base: Profile, personal: Profile, required: { skills: string[]; agents: string[] }, options: EnvironmentOptions) {
  const skills = new Set([...(options.extraSkills ? enabledSkills(base, personal) : []), ...required.skills]);

  const agents = [...new Set([...(base.opencode?.agents ?? []), ...(personal.opencode?.agents ?? []), ...required.agents])];

  const permissions: AgentPermissions = {};

  for (const profile of [base, personal]) {
    for (const [name, agent] of Object.entries(profile.opencode?.config?.agents ?? {})) {
      if (agent.permissions !== undefined && (agents.includes(name) || builtinAgents.has(name))) permissions[name] = { permissions: agent.permissions };
    }
  }

  const profile = {
    name: profileName,
    description: "OpenEval environment derived from the live base and Personal profiles.",
    agents: ["opencode"],
    skills: Object.fromEntries([...skills].map((name) => [name, { agents: { opencode: true } }])),
    opencode: {
      config: { experimental: base.opencode?.config?.experimental ?? {}, agents: permissions },
      commands: [],
      agents,
    },
    mcp: Object.fromEntries(enabledDocsServers(base, personal).map((name) => [name, { agents: ["opencode"] }])),
  };

  if (!options.instructions) return profile;

  const references = [...new Set([...(base.references ?? []), ...(personal.references ?? [])])];

  return {
    ...profile,
    instructions: [...(base.instructions ?? []), ...(personal.instructions ?? [])],
    instruction_references: [...(base.instruction_references ?? []), ...(personal.instruction_references ?? [])],
    capability_groups: [...(base.capability_groups ?? []), ...(personal.capability_groups ?? [])],
    references: references.filter((name) => selectedReferences.has(name)),
    extra_folders: [...(base.extra_folders ?? []), ...(personal.extra_folders ?? [])],
    opencode: { ...profile.opencode, global_instructions: base.opencode?.global_instructions === true },
  };
}

/** Write the environment's profile into an archived source home. */
export async function writeProfile(sourceRoot: string, options: EnvironmentOptions): Promise<void> {
  const target = resolve(sourceRoot, "profiles", profileName, "profile.yml");

  await mkdir(resolve(target, ".."), { recursive: true });

  const [base, personal] = await Promise.all([
    readProfile(resolve(sourceRoot, "profiles", "base", "profile.yml")),
    readProfile(resolve(sourceRoot, "profiles", "personal", "profile.yml")),
  ]);

  await writeFile(target, YAML.stringify(environmentProfile(base, personal, await requiredComponents(), options)), "utf8");
}
