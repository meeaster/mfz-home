import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";

export const defaultBenchmark = resolve(import.meta.dirname, "../../benchmarks/orchestrator-mode");

/** Canonical candidate preparation script; each eval fixture carries a byte-identical copy. */
export const configureScript = resolve(import.meta.dirname, "../candidate/configure-environment.ts");

const evalSchema = z.object({ default: z.object({ workspace: z.object({ overlay: z.string().optional() }).optional() }) });

/**
 * The `.openeval/` directory OpenEval copies into each eval's candidate workspace:
 * under `overlay` for a repository workspace, otherwise under `workspace/`.
 */
export async function evalFixtures(benchmark = defaultBenchmark): Promise<string[]> {
  const evals = resolve(benchmark, "evals");

  const fixtures: string[] = [];

  for (const entry of await readdir(evals, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;

    const directory = resolve(evals, entry.name);

    const declaration = evalSchema.parse(await import(pathToFileURL(resolve(directory, "eval.ts")).href));

    fixtures.push(resolve(directory, declaration.default.workspace?.overlay ?? "workspace", ".openeval"));
  }

  return fixtures.sort();
}

/** Fixtures whose configure script differs from the canonical copy. */
export async function driftedConfigureScripts(benchmark = defaultBenchmark): Promise<string[]> {
  const canonical = await readFile(configureScript, "utf8");

  const drifted: string[] = [];

  for (const fixture of await evalFixtures(benchmark)) {
    const copy = await readFile(resolve(fixture, "configure-environment.ts"), "utf8").catch(() => "");

    if (copy !== canonical) drifted.push(fixture);
  }

  return drifted;
}

/** Copy the canonical configure script into every eval fixture. */
export async function syncConfigureScripts(benchmark = defaultBenchmark): Promise<string[]> {
  const canonical = await readFile(configureScript);

  const fixtures = await evalFixtures(benchmark);

  for (const fixture of fixtures) {
    await mkdir(fixture, { recursive: true });
    await writeFile(resolve(fixture, "configure-environment.ts"), canonical);
  }

  return fixtures;
}

/** Replace every eval fixture's rendered environment and refresh its configure script. */
export async function stageEnvironment(environment: string, benchmark = defaultBenchmark): Promise<string[]> {
  const fixtures = await syncConfigureScripts(benchmark);

  for (const fixture of fixtures) {
    const target = resolve(fixture, "environment");

    await rm(target, { recursive: true, force: true });
    await cp(environment, target, { recursive: true });
  }

  return fixtures;
}
