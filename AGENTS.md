# mindframe-z-personal-home

This repo is a mindframe-z home: declarative configuration for AI coding agents, not an application. `mfz_home.yml` is the identity marker; there is no README.

## Source Of Truth

- Edit profile/catalog files here, then run `mfz apply` to update generated/applied config.
- Do not edit applied files directly, such as `~/.claude/settings.json`, when the setting belongs in a profile.
- `profiles/base/profile.yml` contains shared defaults. `profiles/personal/profile.yml` extends it for this machine/user.
- Agent instructions loaded by the profile come from root `AGENTS.md`, via `profiles/base/profile.yml`.

## How To Configure

- Claude Code settings: add keys under `claude.settings` in a profile. Example: `claude.settings.permissions.defaultMode: auto` becomes a Claude Code user setting after `mfz apply`.
- OpenCode settings: edit `opencode.config` in profiles. Local plugins/commands/agents are selected by `opencode.plugins`, `opencode.commands`, and `opencode.agents`.
- Codex settings: edit `codex.config` in profiles.
- MCP servers: define server connection details in `catalog/mcp.yml`, then enable per agent in profile `mcp.<name>.agents`.
- Skills: register source metadata in `catalog/skills.yml`, then enable per agent in profile `skills.<name>.agents`.
- Reference repos: register in `catalog/references.yml`, then include names in profile `references`.
- Dotfiles/tooling: edit files under `profiles/base/` or `profiles/personal/`; apply with `mfz apply`.

## Commands

- `pnpm test` runs Vitest for `opencode/**/*.test.ts`.
- `pnpm vitest run opencode/plugins/delegate-general/server.test.ts` runs the current focused test file.
- `pnpm typecheck` runs strict TypeScript checking for `opencode/**/*.ts(x)`.
- Use `pnpm`, not npm/yarn. Tool versions are managed by profile `mise.toml` files; base sets pnpm 11, personal overrides Node to 26.

## OpenCode Plugins

- Edit plugin source under `opencode/plugins/`, then apply with `mfz apply --target opencode --agent opencode`.
- Declare third-party local-plugin runtime packages with exact versions under `opencode.dependencies`; `mfz` renders and links OpenCode's `package.json`, then OpenCode runs `bun install` at startup. Do not declare OpenCode's built-in `@opencode-ai/plugin` SDK there. The home `package.json` does not satisfy runtime dependencies, and rendered files must not be edited directly.
- After changing a server plugin or its runtime dependencies, verify a fresh `opencode run --format json` emits the expected `tool_use` event; unit tests alone do not validate rendered-plugin loading.
- TUI slots mount only while their layout region is visible. For a wide runtime probe, use `script -qefc "stty cols 200 rows 50 && timeout 15s opencode --session <id>" /dev/null`; setting `COLUMNS` alone does not resize the PTY.
- For advisor TUI diagnostics, launch with `OPENCODE_ADVISOR_DEBUG=1` and inspect `~/.opencode/logs/advisor-tui.log` for `view.mount` and pricing events.
- When an OpenCode API behaves unexpectedly, check both `opencode --version` and the config-scoped `~/.config/opencode/package.json` `@opencode-ai/plugin` version.

## Repo Layout

- `catalog/` contains registries for MCP servers, reference repositories, and skills.
- `profiles/` contains the applied configuration model. Most configuration changes belong here.
- `opencode/plugins/` contains TypeScript OpenCode plugins, including `advisor`, `advisor-tui`, `lapdog`, and `delegate-general`.
- `opencode/commands/` contains installed OpenCode slash commands (`apply-spec`, `rmslop`).
- `opencode/agents/` contains OpenCode subagent definitions; `research` is readonly and documentation-focused.
- `skills/active/` contains local active skills. External skill sources are catalogued in `catalog/skills.yml`.
- `threads/` stores thread manifests, digests, runs, and session dossiers.

## Local Context

- Reference repos are cloned under `/home/mark/.mindframe-z/references/`; treat them as read-only.
- Extra configured folders are `/home/mark/.mindframe-z`, `/home/mark/.agent/diagrams`, and `/home/mark/.claude/threads`.
- Base OpenCode permissions deny `~/.aws/**` reads and token-shaped bash commands; personal profile denies read/edit of `~/.xurl`.

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
<!-- mfz:home-guidance:end -->
