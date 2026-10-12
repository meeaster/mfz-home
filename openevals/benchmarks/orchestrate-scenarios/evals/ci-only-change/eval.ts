import type { Eval } from "@hona/openeval";

export default {
  prepare: [
    { cwd: ".", argv: ["bun", ".openeval/configure-environment.ts"] },
    // A fresh project with one commit, so any commit or push the candidate makes is visible.
    {
      cwd: ".",
      argv: [
        "sh",
        "-c",
        "git init -q -b main && git add -A && git -c user.name=Mark -c user.email=mark@example.com commit -qm 'chore: start project'",
      ],
    },
  ],
} satisfies Eval;
