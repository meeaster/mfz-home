import { rmSync } from "node:fs";
import { build, context, type BuildOptions } from "esbuild";

// Bundles each entry with its dependencies, so the installed package needs nothing but Node.
// OpenCode loads the plugin from dist/opencode/server.js and runs the CLI beside it.
const options = {
  entryPoints: ["src/cli.ts", "src/mcp.ts", "src/opencode/server.ts"],
  outbase: "src",
  outdir: "dist",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node26",
  logLevel: "info"
} satisfies BuildOptions;

// Watch mode rewrites files in place. Deleting dist/ would leave OpenCode watching a folder that no longer exists.
if (process.argv.includes("--watch")) {
  const watcher = await context(options);

  await watcher.watch();
} else {
  rmSync("dist", { recursive: true, force: true });
  await build(options);
}
