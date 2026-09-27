import type { Eval } from "@hona/openeval";

export default {
  prepare: [{ cwd: ".", argv: ["bun", ".openeval/configure-environment.ts", "--agent-under-test"] }],
} satisfies Eval;
