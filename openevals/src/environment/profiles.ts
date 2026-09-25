import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import YAML from "yaml";
import { z } from "zod";

export const environmentNames = ["minimal", "personal"] as const;

export type EnvironmentName = (typeof environmentNames)[number];

export function isEnvironmentName(value: string): value is EnvironmentName {
  return environmentNames.some((name) => name === value);
}

const minimalOverlay = resolve(import.meta.dirname, "../../overlays/minimal/profile.yml");

/** Instruction files that describe the live host, workspace, or private knowledge. */
const privateInstruction = /(?:personal|knowledge)/iu;

/** Skills whose content depends on private stores or live host sessions. */
const privateSkills: ReadonlySet<string> = new Set([
  "session-derived-knowledge",
  "threads",
  "work-context",
  "tradingview",
  "browser-control",
]);

const agentToggle = z.object({ opencode: z.boolean().optional() }).passthrough();

const permission = z.object({ action: z.string(), resource: z.string(), effect: z.string() });

const profileSchema = z
  .object({
    instructions: z.array(z.string()).optional(),
    skills: z.record(z.string(), z.object({ agents: agentToggle.optional() }).passthrough()).optional(),
    opencode: z
      .object({
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

async function readProfile(path: string): Promise<Profile> {
  return profileSchema.parse(YAML.parse(await readFile(path, "utf8")));
}

/** Skills enabled for OpenCode, in declaration order; later profiles override earlier toggles. */
function enabledSkills(...profiles: Profile[]): string[] {
  const enabled = new Map<string, boolean>();

  for (const profile of profiles) {
    for (const [name, skill] of Object.entries(profile.skills ?? {})) enabled.set(name, skill.agents?.opencode === true);
  }

  const names: string[] = [];

  for (const [name, on] of enabled) if (on) names.push(name);

  return names;
}

/** Skills and agents every environment must render, declared once by the minimal overlay. */
export async function requiredComponents(): Promise<{ skills: string[]; agents: string[] }> {
  const minimal = await readProfile(minimalOverlay);

  return { skills: enabledSkills(minimal), agents: minimal.opencode?.agents ?? [] };
}

/**
 * Flatten the live base and Personal profiles into one sanitized profile.
 *
 * Keeps what shapes agent behavior: shared instructions, every OpenCode skill and
 * agent, per-agent permissions, and experimental settings. Drops what reaches live
 * state: private instructions and skills, references, extra folders, MCP servers,
 * plugins, and model pins, which the benchmark presets own instead.
 */
function sanitizedPersonal(base: Profile, personal: Profile, required: { skills: string[]; agents: string[] }) {
  const instructions = [...(base.instructions ?? []), ...(personal.instructions ?? [])].filter(
    (path) => !privateInstruction.test(path),
  );

  const skills = new Set([
    ...enabledSkills(base, personal).filter((name) => !privateSkills.has(name)),
    ...required.skills,
  ]);

  const agents = [
    ...new Set([...(base.opencode?.agents ?? []), ...(personal.opencode?.agents ?? []), ...required.agents]),
  ];

  const permissions: AgentPermissions = {};

  for (const profile of [base, personal]) {
    for (const [name, agent] of Object.entries(profile.opencode?.config?.agents ?? {})) {
      if (agent.permissions !== undefined && agents.includes(name)) permissions[name] = { permissions: agent.permissions };
    }
  }

  return {
    name: "personal",
    description: "Sanitized Personal environment derived from the live base and Personal profiles.",
    agents: ["opencode"],
    instructions,
    skills: Object.fromEntries([...skills].map((name) => [name, { agents: { opencode: true } }])),
    opencode: {
      config: { experimental: base.opencode?.config?.experimental ?? {}, agents: permissions },
      commands: [],
      agents,
    },
    mcp: {},
  };
}

/** Write the selected environment's profile into an archived source home. */
export async function writeProfile(sourceRoot: string, profile: EnvironmentName): Promise<void> {
  const target = resolve(sourceRoot, "profiles", profile, "profile.yml");

  await mkdir(resolve(target, ".."), { recursive: true });

  if (profile === "minimal") {
    await writeFile(target, await readFile(minimalOverlay, "utf8"), "utf8");

    return;
  }

  const [base, personal] = await Promise.all([
    readProfile(resolve(sourceRoot, "profiles", "base", "profile.yml")),
    readProfile(resolve(sourceRoot, "profiles", "personal", "profile.yml")),
  ]);

  await writeFile(target, YAML.stringify(sanitizedPersonal(base, personal, await requiredComponents())), "utf8");
}
