import { readFile } from "node:fs/promises";
import { dirname, join, normalize, resolve } from "node:path";
import { z } from "zod";
import { manifestSchema, verifyManifestFiles, type EnvironmentManifest } from "./manifest.js";
import { requiredComponents } from "./profiles.js";

/** Private stores, host home paths other than the candidate's, and secret variable names. */
const privateMaterial =
  /(?:personal-knowledge|personal-sources|\/home\/(?!dev\/)[a-z_][\w-]*\/|EXA_API_KEY|UNIFI_NETWORK_PASSWORD|TRUENAS_API_KEY)/iu;

/** Relative Markdown links, without their fragment. */
const markdownLink = /\]\((?!https?:|#)([^)\s#]+\.md)(?:#[^)\s]*)?\)/gu;

const configSchema = z
  .object({
    mcp: z.object({ servers: z.record(z.string(), z.object({}).passthrough()).optional() }).optional(),
    permissions: z
      .array(z.object({ action: z.string(), resource: z.string(), effect: z.enum(["allow", "ask", "deny"]) }))
      .optional(),
  })
  .passthrough();

export type EnvironmentContractReport = {
  ok: boolean;
  errors: string[];
  manifest: EnvironmentManifest;
};

/** Links from required skill files whose targets were not rendered. */
function brokenSkillLinks(files: ReadonlyMap<string, string>, skills: readonly string[]): string[] {
  const broken: string[] = [];

  for (const [path, text] of files) {
    if (!skills.some((skill) => path.startsWith(`skills/${skill}/`))) continue;

    for (const [, target] of text.matchAll(markdownLink)) {
      const linked = normalize(join(dirname(path), target ?? ""));

      if (!files.has(linked)) broken.push(`${path} -> ${linked}`);
    }
  }

  return broken;
}

/**
 * Check a rendered environment: digests match, the orchestration skills and
 * agents declared by the minimal overlay rendered with every linked reference,
 * writes are denied, no MCP server is configured, and no private marker appears.
 */
export async function checkEnvironmentContract(root: string): Promise<EnvironmentContractReport> {
  const manifest = manifestSchema.parse(JSON.parse(await readFile(resolve(root, "manifest.json"), "utf8")));

  const errors = await verifyManifestFiles(root, manifest);

  const config = configSchema.parse(JSON.parse(await readFile(resolve(root, "opencode.json"), "utf8")));

  const files = new Map<string, string>();

  for (const file of manifest.files) files.set(file.path, await readFile(resolve(root, file.path), "utf8"));

  const required = await requiredComponents();

  const expected = [
    "AGENTS.md",
    ...required.skills.map((skill) => `skills/${skill}/SKILL.md`),
    ...required.agents.map((agent) => `agents/${agent}.md`),
  ];

  for (const path of expected) if (!files.has(path)) errors.push(`Missing required file: ${path}`);

  for (const link of brokenSkillLinks(files, required.skills)) errors.push(`Broken skill reference: ${link}`);

  const deniesWrites = config.permissions?.some(
    (permission) => permission.action === "*" && permission.resource === "*" && permission.effect === "deny",
  );

  if (deniesWrites !== true) errors.push("External writes are not denied by the environment permission overlay");

  if (Object.keys(config.mcp?.servers ?? {}).length > 0) errors.push("MCP servers are enabled in the sanitized environment");

  for (const [path, text] of files) {
    if (privateMaterial.test(`${path}\n${text}`)) errors.push(`Private material marker found: ${path}`);
  }

  return { ok: errors.length === 0, errors, manifest };
}

export async function assertEnvironmentContract(root: string): Promise<EnvironmentContractReport> {
  const report = await checkEnvironmentContract(root);

  if (!report.ok) throw new Error(`Environment contract failed:\n${report.errors.join("\n")}`);

  return report;
}
