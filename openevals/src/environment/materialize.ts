import { cp, mkdir, mkdtemp, readdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { z } from "zod";
import {
  cairnDirectory,
  digestEnvironmentFiles,
  manifestJson,
  mindframeDirectory,
  pluginBundle,
  profileDirectory,
  referencesDirectory,
  sha256,
  type EnvironmentManifest,
} from "./manifest.js";
import { environmentPlugins, profileName, writeProfile, type EnvironmentOptions } from "./profiles.js";
import { applySourceOverrides, archiveSource, resolveCommit, run, workingTreeChanges } from "./sources.js";

/** Candidate container home; rendered paths under the staging and host homes are rewritten to it. */
export const candidateHome = "/home/dev";

export type EnvironmentSpec = {
  /** `mfz-home` checkout to read source from. */
  sourceHome: string;
  options: EnvironmentOptions;
  /** Commit or revision to archive. Defaults to `HEAD`. */
  revision?: string;
  /** Capture in-scope working-tree changes over the commit. */
  workingTree?: boolean;
};

export type MaterializedEnvironment = {
  root: string;
  /** Rendered `.openeval/environment/` directory. */
  environment: string;
  manifest: EnvironmentManifest;
};

const packageSchema = z.object({ version: z.string() });

/** Renderer bookkeeping that records host staging state; the candidate needs none of it. */
const bookkeeping = [".mfz-owned.json", "overrides.json", "references-state.json", "configs/.active-profile"];

async function openEvalVersion(): Promise<string> {
  const path = resolve(import.meta.dirname, "../../node_modules/@hona/openeval/package.json");

  return packageSchema.parse(JSON.parse(await readFile(path, "utf8"))).version;
}

/** Text files under `root`, skipping the reference checkouts. */
async function textFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { recursive: true, withFileTypes: true });

  const references = resolve(root, "references");

  const files: string[] = [];

  for (const entry of entries) {
    const path = resolve(entry.parentPath, entry.name);

    if (entry.isFile() && !path.startsWith(`${references}/`)) files.push(path);
  }

  return files;
}

/** Record each reference checkout's revision, then drop its Git metadata. */
async function pinReferences(references: string): Promise<EnvironmentManifest["references"]> {
  const entries = await readdir(references, { withFileTypes: true }).catch(() => []);

  const pinned: EnvironmentManifest["references"] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const checkout = resolve(references, entry.name);

    pinned.push({ name: entry.name, revision: (await run(["git", "-C", checkout, "rev-parse", "HEAD"])).stdout });

    await rm(resolve(checkout, ".git"), { recursive: true, force: true });
  }

  return pinned.sort((left, right) => left.name.localeCompare(right.name));
}

/**
 * Copy the rendered `.mindframe-z` tree and rewrite the staging home and the
 * host home to the candidate's, so every rendered path resolves where the
 * candidate installs it, including absolute host paths written in the source.
 * The staging home lives under the host home, so it is rewritten first.
 */
async function copyRenderedEnvironment(runtimeHome: string, destination: string): Promise<EnvironmentManifest["references"]> {
  const mindframe = resolve(destination, mindframeDirectory);

  await mkdir(destination, { recursive: true });
  await cp(resolve(runtimeHome, ".mindframe-z"), mindframe, { recursive: true });

  for (const path of bookkeeping) await rm(resolve(mindframe, path), { force: true });

  await rm(resolve(destination, profileDirectory, "opencode", "skills", ".mfz-manifest.yml"), { force: true });

  for (const file of await textFiles(mindframe)) {
    const text = await readFile(file, "utf8");

    const rewritten = text.replaceAll(runtimeHome, candidateHome).replaceAll(homedir(), candidateHome);

    if (rewritten !== text) await writeFile(file, rewritten, "utf8");
  }

  return pinReferences(resolve(destination, referencesDirectory));
}

/**
 * Build the Cairn package from the archived source, working-tree overrides included, into the environment.
 *
 * The build borrows the source home's installed dependencies and runs at a fixed depth inside the source home,
 * because the bundles name each module by its path relative to the build directory: building elsewhere would
 * write host paths into them and change their digests.
 */
async function buildCairn(sourceHome: string, source: string, environment: string): Promise<void> {
  const builds = resolve(sourceHome, "openevals", ".materialized");

  await mkdir(builds, { recursive: true });

  const build = await mkdtemp(resolve(builds, ".cairn-build-"));

  const cairn = resolve(build, "packages", "cairn");

  try {
    await cp(resolve(source, "packages", "cairn"), cairn, { recursive: true });
    await symlink(resolve(sourceHome, "packages", "cairn", "node_modules"), resolve(cairn, "node_modules"));
    await run(["node", "build.ts"], cairn);

    const target = resolve(environment, cairnDirectory);

    await cp(resolve(cairn, "dist"), resolve(target, "dist"), { recursive: true });
    await cp(resolve(cairn, "package.json"), resolve(target, "package.json"));
  } finally {
    await rm(build, { recursive: true, force: true });
  }
}

/**
 * Bundle each allowed server plugin the live profiles enable from the archived source into one self-contained
 * file, as live loads it from the source home with its installed dependencies. Like Cairn's build, it runs at a
 * fixed depth inside the source home so the bundle names modules by relative path.
 */
async function buildPlugins(sourceHome: string, source: string, environment: string): Promise<void> {
  const builds = resolve(sourceHome, "openevals", ".materialized");

  await mkdir(builds, { recursive: true });

  for (const name of await environmentPlugins(source)) {
    const build = await mkdtemp(resolve(builds, ".plugin-build-"));

    const plugin = resolve(build, "opencode", "plugins", name);

    try {
      await cp(resolve(source, "opencode", "plugins", name), plugin, { recursive: true });
      await symlink(resolve(sourceHome, "opencode", "plugins", name, "node_modules"), resolve(plugin, "node_modules"));

      const bundled = await Bun.build({ entrypoints: [resolve(plugin, "index.ts")], root: plugin, target: "node", format: "esm" });

      const [output] = bundled.outputs;

      if (!bundled.success || output === undefined) throw new Error(`Plugin build failed: ${name}\n${bundled.logs.join("\n")}`);

      const target = resolve(environment, pluginBundle(name));

      await mkdir(resolve(target, ".."), { recursive: true });
      await writeFile(target, await output.text(), "utf8");
    } finally {
      await rm(build, { recursive: true, force: true });
    }
  }
}

/**
 * Render the environment from `mfz-home` source into `<destination>/environment`.
 *
 * Archives the commit, optionally captures in-scope working-tree changes under
 * `<destination>/source-overrides/`, writes the environment profile, renders it
 * with the canonical `mfz` renderer, builds Cairn and the allowed server plugins from the same source, and
 * records file digests and reference revisions in `manifest.json`.
 */
export async function materializeEnvironment(spec: EnvironmentSpec, destination: string): Promise<MaterializedEnvironment> {
  const sourceCommit = await resolveCommit(spec.sourceHome, spec.revision ?? "HEAD");

  await rm(destination, { recursive: true, force: true });
  await mkdir(destination, { recursive: true });

  const staging = await mkdtemp(resolve(destination, ".staging-"));

  const source = resolve(staging, "source");

  const runtimeHome = resolve(staging, "runtime-home");

  const environment = resolve(destination, "environment");

  try {
    await mkdir(source, { recursive: true });
    await archiveSource(spec.sourceHome, sourceCommit, source);

    const overridePaths = spec.workingTree === true ? await workingTreeChanges(spec.sourceHome, sourceCommit) : [];

    const sourceOverrides = await applySourceOverrides(
      spec.sourceHome,
      source,
      resolve(destination, "source-overrides"),
      overridePaths,
    );

    await writeProfile(source, spec.options);

    const profileBytes = await readFile(resolve(source, "profiles", profileName, "profile.yml"));

    await writeFile(resolve(destination, "profile.yml"), profileBytes);

    await run([
      "mfz", "--root", source, "--home", runtimeHome, "--profile", profileName,
      "apply", "--agent", "opencode", "--target", "all", "--no-link",
    ]);

    const references = await copyRenderedEnvironment(runtimeHome, environment);

    await buildCairn(spec.sourceHome, source, environment);
    await buildPlugins(spec.sourceHome, source, environment);

    const manifest: EnvironmentManifest = {
      version: 3,
      options: spec.options,
      profileSha256: sha256(profileBytes),
      sourceCommit,
      sourceOverrides,
      mfzVersion: (await run(["mfz", "--version"])).stdout,
      openEvalVersion: await openEvalVersion(),
      references,
      files: await digestEnvironmentFiles(environment),
    };

    await writeFile(resolve(environment, "manifest.json"), manifestJson(manifest), "utf8");

    return { root: destination, environment, manifest };
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}
