#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";

const skillDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const sourceDir = join(skillDir, "vendor", "anti-slop");

const args = process.argv.slice(2);

const usage = "Usage: anti-slop.mjs <target-path>... [--effect] [--fix-spacing]";

if (args.length === 0 || args[0] === "--help") {
	console.error(usage);
	process.exit(args.length === 0 ? 2 : 0);
}

let effect = false;

let fixSpacing = false;

const positionalArgs = [];

for (const arg of args) {
  if (arg === "--effect") {
    effect = true;
    continue;
  }

  if (arg === "--fix-spacing") {
    fixSpacing = true;
    continue;
  }

  if (arg.startsWith("--")) {
    console.error(`anti-slop: unsupported argument: ${arg}`);
    process.exit(2);
  }

  positionalArgs.push(arg);
}

if (positionalArgs.length === 0) {
	console.error("anti-slop: expected at least one target path");
	process.exit(2);
}

const targets = [];

for (const positionalArg of positionalArgs) {
  if (positionalArg.length === 0) {
    console.error("anti-slop: target path must not be empty");
    process.exit(2);
  }

  const target = resolve(positionalArg);

  if (!existsSync(target)) {
    console.error(`anti-slop: target does not exist: ${target}`);
    process.exit(2);
  }

  targets.push(target);
}

const tempDir = mkdtempSync(join(process.env.TMPDIR ?? "/tmp", "anti-slop-"));

const config = join(tempDir, "oxlint.json");

const spacingConfig = join(tempDir, "oxlint-fix-spacing.json");

const runtimeDir = join(tempDir, "plugin");

const plugin = join(runtimeDir, "index.ts");

const effectPlugin = join(runtimeDir, "effect", "index.ts");

const rules = [
  "no-array-filter-map",
  "no-chained-type-assertions",
  "no-conditional-empty-object-spread",
  "no-known-value-widening",
  "no-module-mocking",
  "no-object-parameters",
  "no-reflect-apply",
  "no-reflect-get",
  "no-reduce-accumulator-copy",
  "no-runtime-typeof",
  "no-shape-in-symbol-names",
  "no-unknown-parameters",
  "no-unknown-returns",
  "no-unknown-type-aliases",
  "no-unsafe-dictionary-type",
  "no-widen-then-assert",
  "require-readable-spacing",
  "require-safety-comment-for-type-assertion",
];

const effectRules = [
  "no-manual-effect-error-tag",
  "no-manual-tag-comparison",
  "no-manual-tagged-construction",
  "no-service-constructor-imports",
  "prefer-effect-match",
];

const misePackageRoot = spawnSync("mise", ["where", "npm:@oxlint/plugins"], { encoding: "utf8" }).stdout.trim();

const npmOxlintRoot = spawnSync("mise", ["where", "npm:oxlint"], { encoding: "utf8" }).stdout.trim();

const oxlint = npmOxlintRoot
  ? join(npmOxlintRoot, "node_modules", ".bin", "oxlint")
  : spawnSync("mise", ["which", "oxlint"], { encoding: "utf8" }).stdout.trim();

if (!misePackageRoot || !oxlint) {
  console.error("anti-slop: install the pinned mise tools with `mise install` first");
  rmSync(tempDir, { recursive: true, force: true });
  process.exit(2);
}

cpSync(sourceDir, runtimeDir, { recursive: true });

if (effect) {
  cpSync(join(sourceDir, "effect"), join(runtimeDir, "effect"), { recursive: true });
}

mkdirSync(join(runtimeDir, "node_modules", "@oxlint"), { recursive: true });

symlinkSync(join(misePackageRoot, "node_modules", "@oxlint", "plugins"), join(runtimeDir, "node_modules", "@oxlint", "plugins"));

const enabledRules = Object.fromEntries(rules.map((rule) => [`anti-slop/${rule}`, "error"]));

enabledRules["oxc/no-accumulating-spread"] = "error";

if (effect) {
  for (const rule of effectRules) {
    enabledRules[`anti-slop-effect/${rule}`] = "error";
  }
}

writeFileSync(config, JSON.stringify({
  jsPlugins: effect ? [plugin, effectPlugin] : [plugin],
  rules: enabledRules,
}, null, 2));

if (fixSpacing) {
  writeFileSync(spacingConfig, JSON.stringify({
    jsPlugins: [plugin],
    rules: { "anti-slop/require-readable-spacing": "error" },
  }, null, 2));
}

const commonArgs = [
  "--disable-nested-config",
  "--allow", "correctness",
  "--disable-typescript-plugin",
  "--disable-unicorn-plugin",
  ...targets,
];

const finalArgs = ["--config", config, ...commonArgs];

const childOptions = {
  cwd: tempDir,
  stdio: "inherit",
  env: { ...process.env, OXLINT_DISABLE_CONFIG_LOOKUP: "true" },
};

const spacingDiagnosticMarker = "anti-slop(require-readable-spacing)";

const spacingHint = "anti-slop: rerun the same command with --fix-spacing; do not hand-edit this spacing.";

function runOxlint(args, detectSpacing) {
  return new Promise((resolve, reject) => {
    const child = spawn(oxlint, args, {
      ...childOptions,
      stdio: ["inherit", "pipe", "pipe"],
    });

    let spacingDiagnostic = false;

    const forwardOutput = (stream, destination) => {
      let markerTail = "";
      stream.on("data", (chunk) => {
        if (detectSpacing) {
          const output = markerTail + chunk.toString();

          if (output.includes(spacingDiagnosticMarker)) {
            spacingDiagnostic = true;
          }

          markerTail = output.slice(-(spacingDiagnosticMarker.length - 1));
        }
      });
      stream.pipe(destination, { end: false });
    };

    forwardOutput(child.stdout, process.stdout);
    forwardOutput(child.stderr, process.stderr);
    child.on("error", reject);
    child.on("close", (status) => resolve({ status, spacingDiagnostic }));
  });
}

let exitCode = 1;

try {
  if (fixSpacing) {
    const fixResult = await runOxlint([
      "--config", spacingConfig,
      "--fix",
      ...commonArgs,
    ], false);

    if (fixResult.status !== 0) {
      exitCode = fixResult.status ?? 1;
    } else {
      const finalResult = await runOxlint(finalArgs, false);

      exitCode = finalResult.status ?? 1;
    }
  } else {
    const result = await runOxlint(finalArgs, true);

    exitCode = result.status ?? 1;

    if (result.spacingDiagnostic) {
      process.stderr.write(`${spacingHint}\n`);
    }
  }
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}

process.exitCode = exitCode;
