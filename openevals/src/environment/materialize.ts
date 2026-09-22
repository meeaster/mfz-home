import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { z } from "zod";
import { environmentSpec, isEnvironmentName } from "./presets.js";
import { digestEnvironmentFiles, manifestJson } from "./manifest.js";
import { writeOverlay } from "./overlays.js";
import type {
  EnvironmentManifest,
  EnvironmentName,
  EnvironmentSpec,
  MaterializedEnvironment,
} from "./types.js";

type CommandResult = { stdout: string; stderr: string };

const packageSchema = z.object({ version: z.string() });

const configSchema = z
  .object({
    instructions: z.array(z.string()).optional(),
    skills: z.array(z.string()).optional(),
    permissions: z.array(z.object({ resource: z.string().optional() }).passthrough()).optional(),
  })
  .passthrough();

async function run(command: string[], cwd?: string): Promise<CommandResult> {
  const child = Bun.spawn(command, { cwd, stdout: "pipe", stderr: "pipe" });

  const [exitCode, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]);

  if (exitCode !== 0) throw new Error(`${command[0]} failed: ${stderr.trim()}`);

  return { stdout: stdout.trim(), stderr: stderr.trim() };
}

async function archiveSource(sourceHome: string, sourceCommit: string, destination: string): Promise<void> {
  await run(["git", "-C", sourceHome, "rev-parse", "--verify", `${sourceCommit}^{commit}`]);
  const archive = resolve(destination, "source.tar");

  const child = Bun.spawn(["git", "-C", sourceHome, "archive", sourceCommit], {
    stdout: "pipe",
    stderr: "pipe",
  });

  const [exitCode, bytes, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).arrayBuffer(),
    new Response(child.stderr).text(),
  ]);

  if (exitCode !== 0) throw new Error(`git archive failed: ${stderr.trim()}`);

  await Bun.write(archive, bytes);
  await run(["tar", "-xf", archive, "-C", destination]);
  await rm(archive, { force: true });
}

async function mfzVersion(): Promise<string> {
  return (await run(["mfz", "--version"])).stdout;
}

async function openEvalVersion(): Promise<string> {
  const packageJson = packageSchema.parse(
    JSON.parse(
      await readFile(resolve(import.meta.dir, "../../node_modules/@hona/openeval/package.json"), "utf8"),
    ),
  );

  return packageJson.version;
}

function expectedComponents(
  files: Awaited<ReturnType<typeof digestEnvironmentFiles>>,
): EnvironmentManifest["components"] {
  const components: EnvironmentManifest["components"] = {
    instructions: [],
    skills: [],
    commands: [],
    agents: [],
    mcp: [],
  };

  for (const file of files) {
    if (file.component === "instructions") components.instructions.push(file.path);

    if (file.component === "skills") components.skills.push(file.path);

    if (file.component === "commands") components.commands.push(file.path);

    if (file.component === "agents") components.agents.push(file.path);
  }

  return components;
}

async function rewriteConfig(runtimeRoot: string, destination: string): Promise<void> {
  const source = resolve(runtimeRoot, "opencode.jsonc");

  const config = configSchema.parse(JSON.parse(await readFile(source, "utf8")));

  const targetRoot = "/home/dev/.config/opencode";

  const rewritten = {
    ...config,
    instructions: (config.instructions ?? []).map((path) =>
      path.endsWith("AGENTS.md") ? `${targetRoot}/AGENTS.md` : `${targetRoot}/references.md`,
    ),
    skills: (config.skills ?? []).map(() => `${targetRoot}/skills`),
    permissions: (config.permissions ?? []).map((permission) =>
      permission.resource?.includes("references")
        ? { ...permission, resource: `${targetRoot}/references/*` }
        : permission,
    ),
  };

  await writeFile(resolve(destination, "opencode.json"), `${JSON.stringify(rewritten, null, 2)}\n`, "utf8");
  await writeFile(resolve(destination, "opencode.jsonc"), `${JSON.stringify(rewritten, null, 2)}\n`, "utf8");
}

async function copyRenderedEnvironment(
  runtimeHome: string,
  profile: EnvironmentName,
  destination: string,
): Promise<void> {
  const rendered = resolve(runtimeHome, ".mindframe-z", "configs", profile);
  await mkdir(destination, { recursive: true });
  await cp(resolve(rendered, "AGENTS.md"), resolve(destination, "AGENTS.md"));
  await cp(resolve(runtimeHome, ".mindframe-z", "references.md"), resolve(destination, "references.md"));
  await cp(resolve(rendered, "opencode", "commands"), resolve(destination, "commands"), { recursive: true });
  await cp(resolve(rendered, "opencode", "agents"), resolve(destination, "agents"), { recursive: true });
  await cp(resolve(rendered, "opencode", "skills"), resolve(destination, "skills"), { recursive: true });
  await rewriteConfig(resolve(rendered, "opencode"), destination);
}

export async function materializeEnvironment(
  spec: EnvironmentSpec,
  destination: string,
): Promise<MaterializedEnvironment> {
  if (!isEnvironmentName(spec.profile)) throw new Error(`Unsupported environment preset: ${spec.profile}`);

  if (!/^[a-f0-9]{40}$/u.test(spec.sourceCommit)) throw new Error("sourceCommit must be a full commit SHA");

  await rm(destination, { recursive: true, force: true });
  await mkdir(destination, { recursive: true });
  const staging = await mkdtemp(resolve(destination, ".staging-"));
  const source = resolve(staging, "source");
  const runtimeHome = resolve(staging, "runtime-home");
  const workspace = resolve(destination, "workspace");
  const environment = resolve(workspace, ".openeval", "environment");

  try {
    await mkdir(source, { recursive: true });
    await archiveSource(spec.sourceHome, spec.sourceCommit, source);
    await writeOverlay(source, spec.profile, source);
    await run([
      "mfz",
      "--root",
      source,
      "--home",
      runtimeHome,
      "--profile",
      spec.profile,
      "apply",
      "--agent",
      "opencode",
      "--target",
      "all",
      "--no-link",
    ]);
    await copyRenderedEnvironment(runtimeHome, spec.profile, environment);

    const files = await digestEnvironmentFiles(environment);

    const manifest: EnvironmentManifest = {
      version: 1,
      profile: spec.profile,
      sourceCommit: spec.sourceCommit,
      mfzVersion: await mfzVersion(),
      openEvalVersion: await openEvalVersion(),
      overlays: spec.overlays ?? [spec.profile],
      components: expectedComponents(files),
      files,
    };

    const manifestPath = resolve(destination, "manifest.json");

    await writeFile(manifestPath, manifestJson(manifest), "utf8");
    await writeFile(resolve(environment, "manifest.json"), manifestJson(manifest), "utf8");

    return { root: destination, workspace, manifestPath, manifest };
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}

export async function materializePreset(
  sourceHome: string,
  sourceCommit: string,
  profile: EnvironmentName,
  destination: string,
): Promise<MaterializedEnvironment> {
  return materializeEnvironment(environmentSpec(sourceHome, sourceCommit, profile), destination);
}
