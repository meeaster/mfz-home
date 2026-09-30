# Personal Mindframe-Z Home

## Configuration sources

- The Personal profile extends `base`. Put shared configuration in `profiles/base/profile.yml` and Personal-only overrides in `profiles/personal/profile.yml`.
- This file governs repository work. Cross-repository agent guidance is rendered from `instructions/AGENTS.md` and `instructions/PERSONAL.md`; branch-specific guidance is selected through profile `instruction_references`.
- Catalog entries define available assets; profiles select them. Adding a catalog entry alone does not enable it.

## Task-specific guidance

- For OpenCode plugins, commands, agents, or TUI assets, read `opencode/AGENTS.md` before changing them.
- For OpenEval benchmarks, eval environments, or judges, read `openevals/AGENTS.md` before changing them.
- For Executor routing changes or unverified live behavior, load `/home/mark/workspace/knowledge/personal-knowledge/threads/executor-mcp-routing-evidence/digest.md` before changing configuration or renderer behavior.
- For Cairn changes, read `packages/cairn/README.md`: `opencode/plugins/cairn` is an ignored installation symlink; edit `packages/cairn/src/`. Source changes require a build before the installed CLI, MCP server, or plugin can use them.
  - Keep Cairn's designs consistent proactively: when a design change touches one place (the Pencil mock `C:\Users\chewb\OneDrive\Documents\cairn_design.pen`, the design-docs format and its example and template, the renderer, or the UI), find every other place showing the same thing and bring it in line in the same change, including disagreements that predate it. Report any left because the right version is unclear.

## Verification

- Use `pnpm` for the root workspace. Root `pnpm test` covers `opencode/**/*.test.ts` and `mcp/**/*.test.ts`; focus it with `pnpm test <path/to/file.test.ts>`. Archived plugins are excluded.
- Root `pnpm typecheck` covers OpenCode TypeScript only (excluding plugin `drive/` directories and archives), not MCP packages, Cairn, or OpenEvals.
- Cairn requires Node >=26; run `pnpm --filter @mfz/cairn check` for its own typecheck and tests.
- For Discord MCP, run `pnpm --filter @mfz/discord-mcp check`; its test script builds first because tests use compiled output.
- `openevals/` is outside the pnpm workspace and uses Bun; follow its local instructions and package scripts.

<!-- mfz:home-guidance:begin -->
This repository is a Mindframe-Z home, the source for AI tool configuration rendered by `mfz`. Before changing configuration here, run `mfz guide` and follow its topic routing. This block is managed by `mfz apply`.
<!-- mfz:home-guidance:end -->
