import { expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

const script = new URL("./select-preset.ts", import.meta.url).pathname;

async function write(path: string, contents: string): Promise<void> {
  await mkdir(join(path, ".."), { recursive: true });

  await writeFile(path, contents, "utf8");
}

test("writes the resolved agent map into every eval fixture and records the selection", async () => {
  const root = await mkdtemp("/tmp/opencode/mfz-select-preset-");

  try {
    await write(
      join(root, "presets.json"),
      JSON.stringify({
        default: "glm",
        roles: ["orchestrator", "scribe", "explore"],
        presets: {
          glm: {
            candidate: "zai-coding-plan/glm-5.3#high",
            judge: "zai-coding-plan/glm-5.3#high",
            agents: { orchestrator: "zai-coding-plan/glm-5.3#high", "*": "zai-coding-plan/glm-5.3-flash#high" },
          },
        },
      }),
    );

    await write(join(root, "evals/local/eval.ts"), "export default {};\n");

    await write(join(root, "evals/local/workspace/.openeval/agent-models.json"), `{"orchestrator": "old"}\n`);

    // A repository eval without an existing map still receives one, under its overlay.
    await write(join(root, "evals/remote/eval.ts"), `export default { workspace: { ref: "main", overlay: "overlay" } };\n`);

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

    for (const path of ["evals/local/workspace/.openeval/agent-models.json", "evals/remote/overlay/.openeval/agent-models.json"])
      expect(await readFile(join(root, path), "utf8")).toBe(expected);

    expect(await readFile(join(root, "selected-preset.json"), "utf8")).toBe(`{\n  "preset": "glm"\n}\n`);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
