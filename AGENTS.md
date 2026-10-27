# Personal Mindframe-Z Home

## Configuration sources

- The Personal profile extends `base`. Put shared configuration in `profiles/base/profile.yml` and Personal-only overrides in `profiles/personal/profile.yml`.
- This file governs repository work. Cross-repository agent guidance is rendered from `instructions/global.md` and `instructions/personal.md`; branch-specific guidance is selected through profile `instruction_references`.
- Catalog entries define available assets; profiles select them. Adding a catalog entry alone does not enable it.

## Task-specific guidance

- For OpenCode plugins, commands, agents, or TUI assets, read `opencode/AGENTS.md` before changing them.
- For Executor routing changes or unverified live behavior, load `/home/mark/workspace/knowledge/personal-knowledge/threads/executor-mcp-routing-evidence/digest.md` before changing configuration or renderer behavior.
- Cairn, its skills (including orchestration, design-docs, and knowledge-base), its role model bindings, and its OpenEval benchmarks live in its own repository at `~/workspace/repos/cairn`; change them there, not here. This home only enables it: `mise run cairn:link` builds the checkout and links its commands and OpenCode plugin, and the profiles enable the plugin, Claude Code marketplace, hooks, and MCP server.

## Verification

- Use `pnpm` for the root workspace. Root `pnpm test` covers `opencode/**/*.test.ts` and `mcp/**/*.test.ts`; focus it with `pnpm test <path/to/file.test.ts>`. Archived plugins are excluded.
- Root `pnpm typecheck` covers OpenCode TypeScript only (excluding plugin `drive/` directories and archives), not MCP packages.
- For Discord MCP, run `pnpm --filter @mfz/discord-mcp check`; its test script builds first because tests use compiled output.

<!-- mfz:home-guidance:begin -->
This repository is a Mindframe-Z home, the source for AI tool configuration rendered by `mfz`. Before changing configuration here, run `mfz guide` and follow its topic routing. This block is managed by `mfz apply`.
<!-- mfz:home-guidance:end -->
