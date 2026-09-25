import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { z } from "zod";
import { environmentNames } from "./profiles.js";

/** Private stores and credential-shaped files that must never reach a candidate. */
const forbiddenPath =
  /(?:personal-knowledge|personal-sources|(?:^|\/)\.(?:claude|codex)\/|(?:^|\/)(?:\.env(?:\.[\w-]+)?|\.netrc|\.npmrc|auth\.json|credentials?\.json|[^/]+\.(?:pem|key))$)/iu;

const componentSchema = z.enum(["instructions", "skills", "commands", "agents", "config"]);

const sourceOverrideSchema = z.object({ path: z.string(), sha256: z.string().nullable() });

export const manifestSchema = z.object({
  version: z.literal(2),
  profile: z.enum(environmentNames),
  profileSha256: z.string(),
  sourceCommit: z.string(),
  sourceOverrides: z.array(sourceOverrideSchema),
  mfzVersion: z.string(),
  openEvalVersion: z.string(),
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
  if (path === "AGENTS.md" || path === "references.md") return "instructions";

  const top = path.split("/")[0];

  if (top === "skills" || top === "commands" || top === "agents") return top;

  return "config";
}

/** Digest every environment file, rejecting paths that name private material. */
export async function digestEnvironmentFiles(root: string): Promise<EnvironmentFile[]> {
  const files: EnvironmentFile[] = [];

  for (const file of await filesUnder(root)) {
    const path = relative(root, file).replaceAll("\\", "/");

    if (forbiddenPath.test(path)) throw new Error(`Private path reached environment: ${path}`);

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
