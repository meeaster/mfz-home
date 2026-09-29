import { rmSync } from "node:fs";
import { build, context, type BuildOptions } from "esbuild";
import { build as buildUi } from "vite";

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
// It rebuilds the Node entries only; `pnpm dev:ui` serves the UI with reloading.
if (process.argv.includes("--watch")) {
  const watcher = await context(options);

  await watcher.watch();
} else {
  rmSync("dist", { recursive: true, force: true });
  await build(options);
  // The UI is a static app that `cairn ui` serves from dist/ui.
  await buildUi({ configFile: "vite.config.ts", logLevel: "warn" });
}
