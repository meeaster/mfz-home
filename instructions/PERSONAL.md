# Personal Scratchpad

- Persistent cross-project working notes live under `~/.mindframe-z/scratchpad/`.
- When the user asks to create, write, or update a scratchpad note, use that directory unless the user names another location.
- Use a descriptive Markdown filename. Do not overwrite an existing note unless the user explicitly asks; return the exact path after writing.
- Scratchpad content is exploratory working material. Preserve uncertainty and speculation, and do not silently promote it into a decision, commitment, project status, or thread state.
- When the user names an existing scratchpad note, load it before continuing the discussion and keep new material tied to that note's subject.
- Treat the scratchpad as a source for later synthesis, not as a replacement for canonical transcripts, session records, home configuration, or generated wiki pages.

# Personal Mindframe-Z Home

- Temporary authoritative home path: `/home/mark/code/mindframe-z-personal-home`.
- Personal profile: `/home/mark/code/mindframe-z-personal-home/profiles/personal/profile.yml`.
- Shared base profile: `/home/mark/code/mindframe-z-personal-home/profiles/base/profile.yml`.
- This home contains profiles, catalogs, agent instructions, skills, OpenCode assets, dotfiles/tooling, and thread artifacts.
- When the user explicitly asks to modify their personal Mindframe-Z home or profile, use this repository as the source of truth.
- After changing it, run `mfz apply --target all --agent all`.
- Do not edit rendered output under `~/.mindframe-z/configs/` directly.
- The hardcoded path is temporary until Mindframe-Z provides automatic home discovery.
