import { createHash } from "node:crypto";
import { lstat, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { SourceOverride } from "./manifest.js";

type CommandResult = { stdout: string; stderr: string };

export async function run(command: readonly string[], cwd?: string): Promise<CommandResult> {
  const child = Bun.spawn([...command], { cwd, stdout: "pipe", stderr: "pipe" });

  const [exitCode, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]);

  if (exitCode !== 0) throw new Error(`${command[0]} failed: ${stderr.trim()}`);

  return { stdout: stdout.trim(), stderr: stderr.trim() };
}

/** Resolve a revision in the source home to its full commit SHA. */
export async function resolveCommit(sourceHome: string, revision: string): Promise<string> {
  return (await run(["git", "-C", sourceHome, "rev-parse", "--verify", `${revision}^{commit}`])).stdout;
}

/** Extract the committed source tree. */
export async function archiveSource(sourceHome: string, sourceCommit: string, destination: string): Promise<void> {
  const child = Bun.spawn(["git", "-C", sourceHome, "archive", sourceCommit], { stdout: "pipe", stderr: "pipe" });

  const [exitCode, bytes, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).arrayBuffer(),
    new Response(child.stderr).text(),
  ]);

  if (exitCode !== 0) throw new Error(`git archive failed: ${stderr.trim()}`);

  const archive = resolve(destination, "source.tar");

  await Bun.write(archive, bytes);
  await run(["tar", "-xf", archive, "-C", destination]);
  await rm(archive, { force: true });
}

/**
 * Working-tree files that may replace committed source: the global instructions,
 * the skill, reference, and MCP catalogs, the profiles, agent definitions, and
 * skills. Everything outside these paths stays at the commit.
 */
export function overridable(path: string): boolean {
  return /^instructions\/[A-Z_]+\.md$/u.test(path) ||
    /^catalog\/(?:skills|references|mcp)\.yml$/u.test(path) ||
    /^profiles\/(?:base|personal)\/profile\.yml$/u.test(path) ||
    /^opencode\/agents\/[a-z-]+\.md$/u.test(path) ||
    /^skills\/active\/[a-z0-9-]+\/[\w./-]+$/u.test(path);
}

/** In-scope paths that differ between the commit and the working tree, including untracked and deleted files. */
export async function workingTreeChanges(sourceHome: string, sourceCommit: string): Promise<string[]> {
  const [changed, untracked] = await Promise.all([
    run(["git", "-C", sourceHome, "diff", "--name-only", sourceCommit, "--"]),
    run(["git", "-C", sourceHome, "ls-files", "--others", "--exclude-standard"]),
  ]);

  const paths = `${changed.stdout}\n${untracked.stdout}`.split("\n").filter((path) => path !== "" && overridable(path));

  return [...new Set(paths)].sort();
}

/**
 * Copy working-tree bytes over the archived source and keep a captured copy for
 * reproduction. A path missing from the working tree is removed from the source.
 */
export async function applySourceOverrides(
  sourceHome: string,
  source: string,
  captureRoot: string,
  paths: readonly string[],
): Promise<SourceOverride[]> {
  const overrides: SourceOverride[] = [];

  for (const path of [...new Set(paths)].sort()) {
    if (!overridable(path)) throw new Error(`Source override is outside the overridable scope: ${path}`);

    const stat = await lstat(resolve(sourceHome, path)).catch(() => undefined);

    if (stat === undefined) {
      await rm(resolve(source, path), { force: true });

      overrides.push({ path, sha256: null });

      continue;
    }

    if (!stat.isFile()) throw new Error(`Source override must be a regular file: ${path}`);

    const bytes = await readFile(resolve(sourceHome, path));

    for (const root of [source, captureRoot]) {
      const target = resolve(root, path);

      await mkdir(resolve(target, ".."), { recursive: true });
      await writeFile(target, bytes);
    }

    overrides.push({ path, sha256: createHash("sha256").update(bytes).digest("hex") });
  }

  return overrides;
}
