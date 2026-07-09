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
- `pnpm vitest run opencode/plugins/agent-task/logic.test.ts` runs the current focused test file.
- Use `pnpm`, not npm/yarn. Tool versions are managed by profile `mise.toml` files; base sets pnpm 11, personal overrides Node to 26.

## Repo Layout

- `catalog/` contains registries for MCP servers, reference repositories, and skills.
- `profiles/` contains the applied configuration model. Most configuration changes belong here.
- `opencode/plugins/` contains TypeScript OpenCode plugins: `advisor`, `lapdog`, and `agent-task`.
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
- Edit source files in this repo, then run `mfz apply --target all --agent all`
  (plus `mfz skills sync` when skills changed).
- Never edit rendered output (`~/.mindframe-z/configs/` or globally linked
  tool config). If rendered files were already edited, run `mfz sync` to
  promote the edits back.
<!-- mfz:home-guidance:end -->
