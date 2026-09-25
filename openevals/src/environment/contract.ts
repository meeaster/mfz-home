import { readFile } from "node:fs/promises";
import { dirname, join, normalize, resolve } from "node:path";
import { z } from "zod";
import { manifestSchema, profileDirectory, renderedConfig, verifyManifestFiles, type EnvironmentManifest } from "./manifest.js";
import { docsServers, requiredComponents } from "./profiles.js";

/** Secret variable names; a rendered file that names one could carry its value. */
const secretMarker = /(?:EXA_API_KEY|UNIFI_NETWORK_PASSWORD|TRUENAS_API_KEY)/u;

/** Relative Markdown links, without their fragment. */
const markdownLink = /\]\((?!https?:|#)([^)\s#]+\.md)(?:#[^)\s]*)?\)/gu;

const configSchema = z
  .object({
    mcp: z.object({ servers: z.record(z.string(), z.object({}).passthrough()).optional() }).optional(),
  })
  .passthrough();

export type EnvironmentContractReport = {
  ok: boolean;
  errors: string[];
  manifest: EnvironmentManifest;
};

const skillsDirectory = `${profileDirectory}/opencode/skills`;

/** Links from required skill files whose targets were not rendered. */
function brokenSkillLinks(files: ReadonlyMap<string, string>, skills: readonly string[]): string[] {
  const broken: string[] = [];

  for (const [path, text] of files) {
    if (!skills.some((skill) => path.startsWith(`${skillsDirectory}/${skill}/`))) continue;

    for (const [, target] of text.matchAll(markdownLink)) {
      const linked = normalize(join(dirname(path), target ?? ""));

      if (!files.has(linked)) broken.push(`${path} -> ${linked}`);
    }
  }

  return broken;
}

/**
 * Check a rendered environment: digests match, the required skills and agents
 * rendered with every linked reference, global instructions are present exactly
 * when selected, only credential-free documentation servers are configured, and
 * no secret variable name appears. The candidate container is the isolation
 * boundary; agents keep their live permissions.
 */
export async function checkEnvironmentContract(root: string): Promise<EnvironmentContractReport> {
  const manifest = manifestSchema.parse(JSON.parse(await readFile(resolve(root, "manifest.json"), "utf8")));

  const errors = await verifyManifestFiles(root, manifest);

  const config = configSchema.parse(Bun.JSONC.parse(await readFile(resolve(root, renderedConfig), "utf8")));

  const files = new Map<string, string>();

  for (const file of manifest.files) files.set(file.path, await readFile(resolve(root, file.path), "utf8"));

  const required = await requiredComponents();

  const expected = [
    ...required.skills.map((skill) => `${skillsDirectory}/${skill}/SKILL.md`),
    ...required.agents.map((agent) => `${profileDirectory}/opencode/agents/${agent}.md`),
  ];

  for (const path of expected) if (!files.has(path)) errors.push(`Missing required file: ${path}`);

  for (const link of brokenSkillLinks(files, required.skills)) errors.push(`Broken skill reference: ${link}`);

  const instructions = files.has(`${profileDirectory}/AGENTS.md`);

  if (instructions !== manifest.options.instructions)
    errors.push(`Global instructions ${instructions ? "rendered" : "missing"} against the selected option`);

  for (const name of Object.keys(config.mcp?.servers ?? {}))
    if (!docsServers.has(name)) errors.push(`MCP server outside the documentation allowlist: ${name}`);

  for (const [path, text] of files) if (secretMarker.test(text)) errors.push(`Secret variable name found: ${path}`);

  return { ok: errors.length === 0, errors, manifest };
}

export async function assertEnvironmentContract(root: string): Promise<EnvironmentContractReport> {
  const report = await checkEnvironmentContract(root);

  if (!report.ok) throw new Error(`Environment contract failed:\n${report.errors.join("\n")}`);

  return report;
}
