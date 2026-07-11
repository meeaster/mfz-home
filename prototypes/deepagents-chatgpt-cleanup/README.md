# Deep Agents ChatGPT Cleanup Prototype

Standalone transcript cleanup using the JavaScript `deepagents` package and
ChatGPT subscription OAuth through the Codex backend.

```bash
pnpm install --ignore-workspace
pnpm run typecheck
pnpm run login
pnpm run cleanup -- low
pnpm run cleanup -- medium
pnpm run cleanup -- high
pnpm run cleanup -- gpt-5.6-terra low
pnpm run cleanup -- gpt-5.6-terra medium
pnpm run cleanup -- gpt-5.6-terra high
```

The source transcript is read only. Output defaults to `/tmp/opencode` and
includes the reasoning effort and runtime in its YAML metadata.

The OAuth transport is an unsupported integration with the internal Codex
backend. See `NOTICE.md` and `LICENSE.openwiki` for the ported-code notice.
