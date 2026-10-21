import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const launcher = join(repositoryRoot, "skills/active/anti-slop/scripts/anti-slop.mjs");

const cases = [
  {
    name: "groups plain, exported, and mixed single-line bindings",
    source: [
      "const first = 1;",
      "let second = 2;",
      "var third = 3;",
      "export const fourth = 4;",
      "export const fifth = 5;",
      "export let sixth = 6;",
      "export var seventh = 7;",
      "",
      "function localBindings() {",
      "  const firstLocal = 8;",
      "  const secondLocal = 9;",
      "",
      "  return firstLocal + secondLocal;",
      "}",
      "",
    ].join("\n"),
    expectedStatus: 0,
  },
  {
    name: "keeps a comment heading a binding group and trailing comments together",
    source: [
      "/** Group heading. */",
      "const first = 1; // trailing note",
      "const second = 2;",
      "",
    ].join("\n"),
    expectedStatus: 0,
  },
  {
    name: "requires space before a binding with its own leading comment",
    source: "const first = 1;\n/** Second binding. */\nconst second = 2;\n",
    expectedStatus: 1,
  },
  {
    name: "requires space around a multiline binding",
    source: "const first = 1;\nconst config = {\n  value: 2,\n};\nconst last = 3;\n",
    expectedStatus: 1,
  },
  {
    name: "requires space before a following executable statement",
    source: "const first = 1;\nconsume(first);\n",
    expectedStatus: 1,
  },
  {
    name: "keeps existing blank lines without modifying the target",
    source: "const first = 1;\n\nconst second = 2;\n",
    expectedStatus: 0,
  },
];

for (const { name, source, expectedStatus } of cases) {
  test(name, () => {
    const directory = mkdtempSync(join(tmpdir(), "anti-slop-spacing-"));
    const target = join(directory, "case.ts");

    try {
      writeFileSync(target, source);

      const result = spawnSync(process.execPath, [launcher, target], {
        cwd: repositoryRoot,
        encoding: "utf8",
      });

      if (result.error) {
        throw result.error;
      }

      const output = `${result.stdout}\n${result.stderr}`;

      assert.equal(result.status, expectedStatus, output);

      if (expectedStatus !== 0) {
        assert.match(output, /Expected blank line before this statement\./);
      }

      assert.equal(readFileSync(target, "utf8"), source);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
}
