import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { z } from "zod";
import { profileName } from "./profiles.js";

/** The rendered `.mindframe-z` tree, installed as the candidate's `~/.mindframe-z`. */
export const mindframeDirectory = "mindframe-z";

/** The rendered profile: global instructions and the OpenCode agents, commands, and skills. */
export const profileDirectory = `${mindframeDirectory}/configs/${profileName}`;

/** The rendered OpenCode config, which preparation merges into the candidate's `opencode.jsonc`. */
export const renderedConfig = `${profileDirectory}/opencode/opencode.jsonc`;

/** Reference checkouts, recorded by revision rather than digested file by file. */
export const referencesDirectory = `${mindframeDirectory}/references`;

/** Credential-shaped files that must never reach a candidate. */
const forbiddenPath =
  /(?:(?:^|\/)\.(?:claude|codex)\/|(?:^|\/)(?:\.env(?:\.[\w-]+)?|\.netrc|\.npmrc|auth\.json|credentials?\.json|[^/]+\.(?:pem|key))$)/iu;

const componentSchema = z.enum(["instructions", "skills", "commands", "agents", "config"]);

const sourceOverrideSchema = z.object({ path: z.string(), sha256: z.string().nullable() });

export const manifestSchema = z.object({
  version: z.literal(3),
  options: z.object({ instructions: z.boolean(), extraSkills: z.boolean() }),
  profileSha256: z.string(),
  sourceCommit: z.string(),
  sourceOverrides: z.array(sourceOverrideSchema),
  mfzVersion: z.string(),
  openEvalVersion: z.string(),
  references: z.array(z.object({ name: z.string(), revision: z.string() })),
  files: z.array(z.object({ path: z.string(), sha256: z.string(), component: componentSchema })),
});

export type EnvironmentManifest = z.infer<typeof manifestSchema>;

export type EnvironmentFile = EnvironmentManifest["files"][number];

/** A working-tree file captured over the commit; `sha256: null` records a deletion. */
export type SourceOverride = z.infer<typeof sourceOverrideSchema>;

export function sha256(bytes: Uint8Array | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

async function filesUnder(root: string): Promise<string[]> {
  const entries = await readdir(root, { recursive: true, withFileTypes: true });

  const files: string[] = [];

  for (const entry of entries) if (entry.isFile()) files.push(resolve(entry.parentPath, entry.name));

  return files.sort();
}

function componentFor(path: string): EnvironmentFile["component"] {
  const opencode = `${profileDirectory}/opencode/`;

  if (path.startsWith(opencode)) {
    const top = path.slice(opencode.length).split("/")[0];

    if (top === "skills" || top === "commands" || top === "agents") return top;
  }

  if (path.startsWith(`${mindframeDirectory}/`) && path.endsWith(".md")) return "instructions";

  return "config";
}

/** Digest every environment file outside the reference checkouts, rejecting credential-shaped paths. */
export async function digestEnvironmentFiles(root: string): Promise<EnvironmentFile[]> {
  const files: EnvironmentFile[] = [];

  for (const file of await filesUnder(root)) {
    const path = relative(root, file).replaceAll("\\", "/");

    if (path.startsWith(`${referencesDirectory}/`)) continue;

    if (forbiddenPath.test(path)) throw new Error(`Credential-shaped path reached environment: ${path}`);

    files.push({ path, sha256: sha256(await readFile(file)), component: componentFor(path) });
  }

  return files;
}

export async function verifyManifestFiles(root: string, manifest: EnvironmentManifest): Promise<string[]> {
  const errors: string[] = [];

  const absoluteRoot = resolve(root);

  for (const file of manifest.files) {
    const path = resolve(absoluteRoot, file.path);

    if (!path.startsWith(`${absoluteRoot}/`)) {
      errors.push(`Manifest path escapes environment: ${file.path}`);
      continue;
    }

    if (!(await stat(path).then((value) => value.isFile()).catch(() => false))) {
      errors.push(`Manifest file is missing: ${file.path}`);
      continue;
    }

    if (sha256(await readFile(path)) !== file.sha256) errors.push(`Digest mismatch: ${file.path}`);
  }

  return errors;
}

export function manifestJson(manifest: EnvironmentManifest): string {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}
