import { expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parsePresets } from "./presets.js";

const script = new URL("./select-preset.ts", import.meta.url).pathname;

async function write(path: string, contents: string): Promise<void> {
  await mkdir(join(path, ".."), { recursive: true });

  await writeFile(path, contents, "utf8");
}

test("rewrites every eval agent-models map and records the selection", async () => {
  const root = await mkdtemp("/tmp/opencode/mfz-select-preset-");

  try {
    const presets = parsePresets(
      `${JSON.stringify(
        {
          default: "glm",
          roles: ["orchestrator", "scribe", "explore"],
          presets: {
            glm: {
              candidate: "zai-coding-plan/glm-5.3#high",
              judge: "zai-coding-plan/glm-5.3#high",
              agents: { orchestrator: "zai-coding-plan/glm-5.3#high", "*": "zai-coding-plan/glm-5.3-flash#high" },
            },
          },
        },
        null,
        2,
      )}\n`,
    );

    await write(join(root, "presets.json"), JSON.stringify(presets, null, 2));

    const evals = join(root, "evals");

    await write(join(evals, "baked-in-dispatch/workspace/.openeval/agent-models.json"), `{"orchestrator": "old"}\n`);

    await write(join(evals, "explore-evidence/overlay/.openeval/agent-models.json"), `{"orchestrator": "old"}\n`);

    // Materialized environments are copies; the walker must not rewrite inside them.
    await write(join(evals, "explore-evidence/overlay/.openeval/environment/agent-models.json"), `{"keep": true}\n`);

    const child = Bun.spawn(["bun", script, "glm", root], { stdout: "pipe", stderr: "pipe" });

    const [code, stderr] = await Promise.all([child.exited, new Response(child.stderr).text()]);

    expect(stderr).toBe("");
    expect(code).toBe(0);

    const expected = `${JSON.stringify(
      {
        orchestrator: "zai-coding-plan/glm-5.3#high",
        scribe: "zai-coding-plan/glm-5.3-flash#high",
        explore: "zai-coding-plan/glm-5.3-flash#high",
      },
      null,
      2,
    )}\n`;

    expect(await readFile(join(evals, "baked-in-dispatch/workspace/.openeval/agent-models.json"), "utf8")).toBe(
      expected,
    );

    expect(await readFile(join(evals, "explore-evidence/overlay/.openeval/agent-models.json"), "utf8")).toBe(expected);

    expect(await readFile(join(evals, "explore-evidence/overlay/.openeval/environment/agent-models.json"), "utf8")).toBe(
      `{"keep": true}\n`,
    );

    expect(await readFile(join(root, "selected-preset.json"), "utf8")).toBe(`{\n  "preset": "glm"\n}\n`);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
