#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const skillDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = join(skillDir, "vendor", "anti-slop");
const args = process.argv.slice(2);
if (args.length === 0 || args[0] === "--help") {
	console.error("Usage: anti-slop.mjs <target-path>");
	process.exit(args.length === 0 ? 2 : 0);
}

const target = resolve(args.shift());
if (args.length > 0) {
	console.error(`anti-slop: unsupported argument: ${args[0]}`);
	process.exit(2);
}
if (!existsSync(target)) {
  console.error(`anti-slop: target does not exist: ${target}`);
  process.exit(2);
}

const tempDir = mkdtempSync(join(process.env.TMPDIR ?? "/tmp", "anti-slop-"));
const config = join(tempDir, "oxlint.json");
const runtimeDir = join(tempDir, "plugin");
const plugin = join(runtimeDir, "index.ts");
const rules = [
  "no-chained-type-assertions",
  "no-conditional-empty-object-spread",
  "no-known-value-widening",
  "no-module-mocking",
  "no-object-parameters",
  "no-reflect-apply",
  "no-reflect-get",
  "no-runtime-typeof",
  "no-shape-in-symbol-names",
  "no-unknown-parameters",
  "no-unknown-returns",
  "no-unknown-type-aliases",
  "no-unsafe-dictionary-type",
  "no-widen-then-assert",
  "require-safety-comment-for-type-assertion",
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
mkdirSync(join(runtimeDir, "node_modules", "@oxlint"), { recursive: true });
symlinkSync(join(misePackageRoot, "node_modules", "@oxlint", "plugins"), join(runtimeDir, "node_modules", "@oxlint", "plugins"));
writeFileSync(config, JSON.stringify({
  jsPlugins: [plugin],
  rules: Object.fromEntries(rules.map((rule) => [`anti-slop/${rule}`, "error"])),
}, null, 2));

let exitCode = 1;
try {
	const result = spawnSync(oxlint, [
		"--config", config,
		"--disable-nested-config",
		"--allow", "correctness",
		"--disable-oxc-plugin",
		"--disable-typescript-plugin",
		"--disable-unicorn-plugin",
		target,
	], {
    cwd: tempDir,
    stdio: "inherit",
    env: { ...process.env, OXLINT_DISABLE_CONFIG_LOOKUP: "true" },
  });
  if (result.error) throw result.error;
  exitCode = result.status ?? 1;
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
process.exit(exitCode);
