// Rebuilds shiki.bundle.mjs from a pinned Shiki release, so the skill builds docs with plain Node and nothing to
// install. Run it only to upgrade or add a language: node build-shiki.mjs [shiki version] [esbuild version].
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

const [shiki = "4.5.0", esbuild = "0.28.2"] = process.argv.slice(2);

const work = mkdtempSync(join(tmpdir(), "shiki-bundle-"));

try {
  writeFileSync(join(work, "package.json"), "{}");
  execFileSync("npm", ["install", "--no-save", "--silent", `shiki@${shiki}`, `esbuild@${esbuild}`], { cwd: work, stdio: "inherit" });
  copyFileSync(join(here, "shiki-entry.mjs"), join(work, "entry.mjs"));
  execFileSync(join(work, "node_modules", ".bin", "esbuild"), ["entry.mjs", "--bundle", "--format=esm", "--platform=node", "--minify", "--legal-comments=none", "--metafile=meta.json", `--banner:js=// Shiki ${shiki} and its dependencies, bundled by build-shiki.mjs; licences in SHIKI-LICENSE.`, `--outfile=${join(here, "shiki.bundle.mjs")}`], { cwd: work, stdio: "inherit" });

  // Every package with code in the bundle, with its licence text.
  const inputs = Object.keys(JSON.parse(readFileSync(join(work, "meta.json"), "utf8")).inputs);
  const packages = [...new Set(inputs.map((input) => /node_modules\/((?:@[^/]+\/)?[^/]+)/.exec(input)?.[1]).filter((name) => name !== undefined))].sort();

  const sections = packages.map((name) => {
    const folder = join(work, "node_modules", name);
    const meta = JSON.parse(readFileSync(join(folder, "package.json"), "utf8"));
    const licence = ["LICENSE", "LICENSE.md", "license", "LICENCE"].map((file) => join(folder, file)).find((path) => existsSync(path));

    return `${name} ${meta.version} (${meta.license})\n\n${licence === undefined ? "See the package's licence field." : readFileSync(licence, "utf8").trim()}`;
  });

  writeFileSync(join(here, "SHIKI-LICENSE"), `${sections.join("\n\n----------------------------------------\n\n")}\n`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
