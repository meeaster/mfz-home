# pstack for OpenCode V2

This local Mindframe-Z plugin is a skills-first OpenCode V2 adaptation of [Cursor pstack](https://github.com/cursor/plugins/tree/main/pstack).

The first slice provides:

- `/poteto-mode` as an explicit OpenCode skill.
- Namespaced portable pstack principles and implementation skills.
- OpenCode-native `pstack-how` and `pstack-no-comments` workflows.
- `pstack-poteto-agent` and the read-only `pstack-comment-sicko` subagent.

It deliberately excludes Cursor model setup, transcript readers, Benny automations, Graphite workflows, PR polling, TUI code, hooks, and background services. Those need separate OpenCode-native designs and runtime evidence.

The plugin reads its package-local `skills/` directory and registers each complete skill through the V2 skill transform. Supporting files remain relative to each `SKILL.md`.

## Verification

```sh
pnpm --dir opencode/plugins/pstack check
mfz smoke-opencode-v2
opencode api get /api/plugin
```

The plugin targets OpenCode 2.0.0 with the `opencode` CLI and
`@opencode/plugin@2.0.0`. Its package manifest pins the stable SDK for local
typechecking and plugin loading.
