# Personal Mindframe-Z Home

The Personal profile extends the shared `base` profile. Keep shared behavior in `base` and Personal-only configuration in `personal`.

- For OpenCode plugins, commands, agents, or TUI assets, read `opencode/AGENTS.md` before changing them.
- For Executor routing changes or unverified live behavior, load `/home/mark/workspace/knowledge/personal-knowledge/threads/executor-mcp-routing-evidence/digest.md` before changing configuration or renderer behavior.

<!-- mfz:home-guidance:begin -->
This repo is a mindframe-z home: the source of truth for the AI tool
configuration rendered onto this machine by the `mfz` CLI. This block is
managed by `mfz apply` and rewritten on every run.

- Before configuring anything here (profiles, catalog entries, skills, MCP,
  instructions, dotfiles), run `mfz guide`; before adding or changing skills,
  run `mfz guide skills`.
- Edit source files in this repo, then run `mfz apply --target all --agent all`.
- Never edit rendered output (`~/.mindframe-z/configs/` or globally linked
  tool config). Use `mfz sync` only to promote unmanaged configuration keys;
  skill source changes belong in the home and require `mfz apply`.
- Executor-routed integrations are shared inventory. If one integration has
  multiple named connections, add each one in the Executor app using the exact
  profile connection name. Call tools with the full integration/owner/connection
  address; never infer an account or organization.
<!-- mfz:home-guidance:end -->
