import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { z } from "zod";
import { verifyManifestFiles } from "./manifest.js";
import type { EnvironmentContractReport, EnvironmentManifest } from "./types.js";

const privateMaterial = /(?:personal-knowledge|personal-sources|\/home\/[^\s/]+\/workspace\/knowledge|~\/(?:\.claude|\.codex)|\.claude|\.codex|EXA_API_KEY|UNIFI_NETWORK_PASSWORD|TRUENAS_API_KEY)/iu;

const manifestSchema = z.object({
  version: z.literal(1),
  profile: z.enum(["minimal", "personal"]),
  sourceCommit: z.string(),
  mfzVersion: z.string(),
  openEvalVersion: z.string(),
  overlays: z.array(z.string()),
  sourceOverrides: z.array(z.object({ path: z.string(), sha256: z.string() })).optional(),
  components: z.object({
    instructions: z.array(z.string()),
    skills: z.array(z.string()),
    commands: z.array(z.string()),
    agents: z.array(z.string()),
    mcp: z.array(z.string()),
  }),
  files: z.array(z.object({
    path: z.string(),
    sha256: z.string(),
    component: z.enum(["instructions", "skills", "commands", "agents", "mcp", "config", "manifest"]),
  })),
});

const configSchema = z.object({
  mcp: z.object({ servers: z.record(z.string(), z.object({}).passthrough()).optional() }).optional(),
  permissions: z.array(
    z.object({
      action: z.string(),
      resource: z.string(),
      effect: z.enum(["allow", "ask", "deny"]),
    }),
  ).optional(),
}).passthrough();

function includesEvery(value: string[], expected: string[], label: string, errors: string[]): void {
  for (const item of expected) {
    if (!value.includes(item)) errors.push(`Missing ${label}: ${item}`);
  }
}

export async function checkEnvironmentContract(root: string): Promise<EnvironmentContractReport> {
  const manifest = manifestSchema.parse(
    JSON.parse(await readFile(resolve(root, "manifest.json"), "utf8")),
  ) satisfies EnvironmentManifest;

  const errors = await verifyManifestFiles(root, manifest);

  const config = configSchema.parse(JSON.parse(await readFile(resolve(root, "opencode.json"), "utf8")));

  includesEvery(manifest.components.instructions, ["AGENTS.md"], "instruction", errors);
  includesEvery(
    manifest.components.skills,
    [
      "skills/orchestrator-mode/SKILL.md",
      "skills/orchestrator-mode/references/child-contracts.md",
      "skills/orchestrator-mode/references/routing-and-roles.md",
      "skills/orchestrator-mode/references/recovery-and-continuity.md",
      "skills/orchestrator-mode/references/workspace-and-coordination.md",
    ],
    "skill file",
    errors,
  );
  includesEvery(manifest.components.commands, ["commands/orchestrate.md"], "command", errors);
  includesEvery(manifest.components.agents, ["agents/orchestrator.md"], "agent", errors);

  if (!config.permissions?.some(
    (permission) =>
      permission.action === "*" && permission.resource === "*" && permission.effect === "deny",
  ))
    errors.push("External writes are not denied by the environment permission overlay");

  if (Object.keys(config.mcp?.servers ?? {}).length > 0)
    errors.push("MCP servers are enabled in the sanitized environment");

  const contents = await Promise.all(
    manifest.files.map(async (file) => `${file.path}\n${await readFile(resolve(root, file.path), "utf8")}`),
  );

  const privateMatches = contents.filter((content) => privateMaterial.test(content));

  if (privateMatches.length > 0) errors.push("Private material marker found in environment files");

  return {
    ok: errors.length === 0,
    errors,
    manifest,
    files: manifest.files,
    observations: {
      fileCount: manifest.files.length,
      mcpServerCount: Object.keys(config.mcp?.servers ?? {}).length,
      privateMaterialExcluded: privateMatches.length === 0,
    },
  };
}

export async function assertEnvironmentContract(root: string): Promise<EnvironmentContractReport> {
  const report = await checkEnvironmentContract(root);

  if (!report.ok) throw new Error(`Environment contract failed:\n${report.errors.join("\n")}`);

  return report;
}
