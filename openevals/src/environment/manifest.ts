import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import { relative, resolve } from "node:path";
import type { EnvironmentComponent, EnvironmentFile, EnvironmentManifest } from "./types.js";

const forbiddenPath = /(?:personal-knowledge|personal-sources|\.claude|\.codex|browser|credential|secret|token)/iu;

async function filesUnder(root: string): Promise<string[]> {
  const files: string[] = [];

  async function visit(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);

      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile()) files.push(path);
    }
  }

  await visit(root);

  return files.sort();
}

function componentFor(path: string): EnvironmentComponent | "config" {
  if (path === "AGENTS.md" || path === "references.md") return "instructions";

  if (path.startsWith("skills/")) return "skills";

  if (path.startsWith("commands/")) return "commands";

  if (path.startsWith("agents/")) return "agents";

  return "config";
}

export async function digestEnvironmentFiles(root: string): Promise<EnvironmentFile[]> {
  const files: EnvironmentFile[] = [];

  for (const file of await filesUnder(root)) {
    const path = relative(root, file).replaceAll("\\", "/");

    if (forbiddenPath.test(path)) throw new Error(`Private path reached environment: ${path}`);

    files.push({
      path,
      sha256: createHash("sha256").update(await readFile(file)).digest("hex"),
      component: componentFor(path),
    });
  }

  return files;
}

export async function verifyManifestFiles(
  root: string,
  manifest: EnvironmentManifest,
): Promise<string[]> {
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

    const actual = createHash("sha256").update(await readFile(path)).digest("hex");

    if (actual !== file.sha256) errors.push(`Digest mismatch: ${file.path}`);
  }

  return errors;
}

export function manifestJson(manifest: EnvironmentManifest): string {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}
