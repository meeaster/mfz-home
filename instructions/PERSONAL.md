# Personal Workspace

- Put temporary research, experiments, and other scratch work under `/home/mark/workspace/scratch/` and follow its local instructions. Use a different location when the user names one.

# Wayfinder Planning

- Store Personal Wayfinder maps, decision tickets, and companion evidence packs under `/home/mark/workspace/specs/workspace-specs/wayfinder/<effort>/` by default. Use this local Markdown store instead of GitHub issues, `.scratch/`, or another tracker unless the user names a different location.
- Keep each effort's human-owned `vision.md`, `map.md`, `issues/`, and companion `evidence/` together under its Wayfinder directory, and treat `workspace-specs` as the owning Git repository.

# Personal Mindframe-Z Home

- Authoritative home path: `/home/mark/workspace/repos/mindframe-z-personal-home`.
- Personal profile: `/home/mark/workspace/repos/mindframe-z-personal-home/profiles/personal/profile.yml`.
- Shared base profile: `/home/mark/workspace/repos/mindframe-z-personal-home/profiles/base/profile.yml`.
- This home contains profiles, catalogs, agent instructions, skills, OpenCode assets, and dotfiles/tooling. Durable Personal wiki synthesis, Practices, threads, work units, and Session Capture boundary guidance live under `/home/mark/workspace/knowledge/personal-knowledge`; canonical Session Captures live under `/home/mark/workspace/knowledge/personal-sources/session-captures`.
- When the user explicitly asks to modify their personal Mindframe-Z home or profile, use this repository as the source of truth.
- After changing it, run `mfz apply --target all --agent all`.
- Do not edit rendered output under `~/.mindframe-z/configs/` directly.
