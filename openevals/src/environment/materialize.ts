import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { z } from "zod";
import { digestEnvironmentFiles, manifestJson, sha256, type EnvironmentManifest } from "./manifest.js";
import { writeProfile, type EnvironmentName } from "./profiles.js";
import { applySourceOverrides, archiveSource, resolveCommit, run, workingTreeChanges } from "./sources.js";

/** Candidate container home, and the path that receives the global OpenCode configuration. */
const candidateHome = "/home/dev";

export const candidateConfigRoot = `${candidateHome}/.config/opencode`;

export type EnvironmentSpec = {
  /** `mfz-home` checkout to read source from. */
  sourceHome: string;
  profile: EnvironmentName;
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

const configSchema = z
  .object({
    instructions: z.array(z.string()).optional(),
    skills: z.array(z.string()).optional(),
    permissions: z.array(z.object({ resource: z.string().optional() }).passthrough()).optional(),
  })
  .passthrough();

async function openEvalVersion(): Promise<string> {
  const path = resolve(import.meta.dirname, "../../node_modules/@hona/openeval/package.json");

  return packageSchema.parse(JSON.parse(await readFile(path, "utf8"))).version;
}

/** Point rendered host paths at the candidate container and deny every write outside the workspace defaults. */
async function writeCandidateConfig(runtimeHome: string, renderedConfig: string, destination: string): Promise<void> {
  const config = configSchema.parse(JSON.parse(await readFile(renderedConfig, "utf8")));

  const permissions = (config.permissions ?? []).map((permission) => {
    if (permission.resource?.includes("references")) return { ...permission, resource: `${candidateConfigRoot}/references/*` };

    if (permission.resource?.startsWith(`${runtimeHome}/`))
      return { ...permission, resource: `${candidateHome}${permission.resource.slice(runtimeHome.length)}` };

    return permission;
  });

  permissions.push(
    { action: "*", resource: "*", effect: "deny" },
    { action: "read", resource: "*", effect: "allow" },
  );

  const rewritten = {
    ...config,
    instructions: (config.instructions ?? []).map((path) =>
      path.endsWith("AGENTS.md") ? `${candidateConfigRoot}/AGENTS.md` : `${candidateConfigRoot}/references.md`,
    ),
    skills: (config.skills ?? []).map(() => `${candidateConfigRoot}/skills`),
    permissions,
  };

  await writeFile(resolve(destination, "opencode.json"), `${JSON.stringify(rewritten, null, 2)}\n`, "utf8");
}

async function copyRenderedEnvironment(runtimeHome: string, profile: EnvironmentName, destination: string): Promise<void> {
  const rendered = resolve(runtimeHome, ".mindframe-z", "configs", profile);

  await mkdir(destination, { recursive: true });
  await cp(resolve(rendered, "AGENTS.md"), resolve(destination, "AGENTS.md"));
  await cp(resolve(runtimeHome, ".mindframe-z", "references.md"), resolve(destination, "references.md"));

  for (const directory of ["agents", "skills"])
    await cp(resolve(rendered, "opencode", directory), resolve(destination, directory), { recursive: true });

  // Renderer bookkeeping records host staging paths; the candidate needs only the skills.
  await rm(resolve(destination, "skills", ".mfz-manifest.yml"), { force: true });

  await writeCandidateConfig(runtimeHome, resolve(rendered, "opencode", "opencode.jsonc"), destination);
}

/**
 * Render one environment from `mfz-home` source into `<destination>/environment`.
 *
 * Archives the commit, optionally captures in-scope working-tree changes under
 * `<destination>/source-overrides/`, writes the selected profile, renders it with
 * the canonical `mfz` renderer, and records file digests in `manifest.json`.
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

    await writeProfile(source, spec.profile);

    const profileBytes = await readFile(resolve(source, "profiles", spec.profile, "profile.yml"));

    await writeFile(resolve(destination, "profile.yml"), profileBytes);

    await run([
      "mfz", "--root", source, "--home", runtimeHome, "--profile", spec.profile,
      "apply", "--agent", "opencode", "--target", "all", "--no-link",
    ]);

    await copyRenderedEnvironment(runtimeHome, spec.profile, environment);

    const manifest: EnvironmentManifest = {
      version: 2,
      profile: spec.profile,
      profileSha256: sha256(profileBytes),
      sourceCommit,
      sourceOverrides,
      mfzVersion: (await run(["mfz", "--version"])).stdout,
      openEvalVersion: await openEvalVersion(),
      files: await digestEnvironmentFiles(environment),
    };

    await writeFile(resolve(environment, "manifest.json"), manifestJson(manifest), "utf8");

    return { root: destination, environment, manifest };
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}
