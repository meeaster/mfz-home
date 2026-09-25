import type { Eval } from "@hona/openeval";

export default {
  prepare: [{ cwd: ".", argv: ["bun", ".openeval/configure-environment.ts"] }],
} satisfies Eval;
