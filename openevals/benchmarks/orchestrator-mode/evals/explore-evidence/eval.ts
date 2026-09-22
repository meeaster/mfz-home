import type { Eval } from "@hona/openeval";

export default {
  workspace: {
    repository: "https://github.com/Hona/openeval.git",
    commit: "b969dc4967a2ff1558f3b6c3408889413a833b1a",
    ref: "main",
    overlay: "overlay",
  },
  prepare: [{ cwd: "checkout", argv: ["bun", ".openeval/configure-environment.ts", ".."] }],
} satisfies Eval;
