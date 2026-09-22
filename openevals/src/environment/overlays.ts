import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import YAML from "yaml";
import { z } from "zod";
import type { EnvironmentName } from "./types.js";

const overlayNames = ["minimal", "personal"] as const satisfies readonly EnvironmentName[];

function overlayPath(profile: EnvironmentName): string {
  return resolve(import.meta.dirname, "../../overlays", profile, "profile.yml");
}

const profileSchema = z
  .object({
    instructions: z.array(z.string()).optional(),
    skills: z.record(z.string(), z.object({}).passthrough()).optional(),
    opencode: z
      .object({ commands: z.array(z.string()).optional(), agents: z.array(z.string()).optional() })
      .passthrough()
      .optional(),
  })
  .passthrough();

type ProfileDocument = z.infer<typeof profileSchema>;

function safePersonalProfile(
  sourceProfile: ProfileDocument,
  baseProfile: ProfileDocument,
) {
  const instructions = [...(baseProfile.instructions ?? []), ...(sourceProfile.instructions ?? [])].filter(
    (value) => !/(personal|knowledge|source)/iu.test(value),
  );

  const commands = (baseProfile.opencode?.commands ?? []).filter((value) => value === "orchestrate");

  const agents = (baseProfile.opencode?.agents ?? []).filter(
    (value) => value === "orchestrator" || value === "scribe",
  );

  const skills = Object.fromEntries(
    Object.keys(baseProfile.skills ?? {})
      .filter((name) => name.startsWith("orchestrator-"))
      .map((name) => [name, { agents: { opencode: true } }]),
  );

  return {
    name: "personal",
    description: "Sanitized Personal Orchestrator Mode environment.",
    agents: ["opencode"],
    instructions: instructions.length > 0 ? instructions : ["instructions/AGENTS.md"],
    skills,
    opencode: {
      commands: commands.length > 0 ? commands : ["orchestrate"],
      agents: agents.length > 0 ? agents : ["orchestrator", "scribe"],
      config: { permission: { "*": "deny", read: "allow" } },
    },
    mcp: {},
  };
}

export async function writeOverlay(
  sourceRoot: string,
  profile: EnvironmentName,
  destination: string,
): Promise<void> {
  if (!overlayNames.includes(profile)) throw new Error(`Unsupported environment preset: ${profile}`);

  await mkdir(resolve(destination, "profiles", profile), { recursive: true });

  if (profile === "minimal") {
    await cp(overlayPath(profile), resolve(destination, "profiles", profile, "profile.yml"));

    return;
  }

  const sourceProfile = profileSchema.parse(
    YAML.parse(await readFile(resolve(sourceRoot, "profiles", "personal", "profile.yml"), "utf8")),
  );

  const baseProfile = profileSchema.parse(
    YAML.parse(await readFile(resolve(sourceRoot, "profiles", "base", "profile.yml"), "utf8")),
  );

  await writeFile(
    resolve(destination, "profiles", profile, "profile.yml"),
    YAML.stringify(safePersonalProfile(sourceProfile, baseProfile)),
    "utf8",
  );
}
