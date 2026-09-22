import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

/** Per-eval copies of the configure script; duplication is required by OpenEval workspaces. */
const copies = [
  "baked-in-dispatch/workspace/.openeval/configure-environment.ts",
  "explore-evidence/overlay/.openeval/configure-environment.ts",
];

test("eval workspaces share one configure-environment script", async () => {
  const contents = await Promise.all(
    copies.map((path) =>
      readFile(resolve(import.meta.dir, "../../benchmarks/orchestrator-mode/evals", path), "utf8"),
    ),
  );

  expect(contents[0]).toBe(contents[1]);
});
