# Personal Scratchpad

- Persistent cross-project working notes live under `~/.mindframe-z/scratchpad/`.
- When the user asks to create, write, or update a scratchpad note, use that directory unless the user names another location.
- Use a descriptive Markdown filename. Do not overwrite an existing note unless the user explicitly asks; return the exact path after writing.
- Scratchpad content is exploratory working material. Preserve uncertainty and speculation, and do not silently promote it into a decision, commitment, project status, or thread state.
- When the user names an existing scratchpad note, load it before continuing the discussion and keep new material tied to that note's subject.
- Treat the scratchpad as a source for later synthesis, not as a replacement for canonical transcripts, session records, home configuration, or generated wiki pages.

# Personal Mindframe-Z Home

- Authoritative home path: `/home/mark/workspace/repos/mindframe-z-personal-home`.
- Personal profile: `/home/mark/workspace/repos/mindframe-z-personal-home/profiles/personal/profile.yml`.
- Shared base profile: `/home/mark/workspace/repos/mindframe-z-personal-home/profiles/base/profile.yml`.
- This home contains profiles, catalogs, agent instructions, skills, OpenCode assets, and dotfiles/tooling. Durable Personal knowledge, threads, and work units live under `/home/mark/workspace/knowledge/personal-knowledge`.
- When the user explicitly asks to modify their personal Mindframe-Z home or profile, use this repository as the source of truth.
- After changing it, run `mfz apply --target all --agent all`.
- Do not edit rendered output under `~/.mindframe-z/configs/` directly.

# Personal Knowledge

- Durable Personal knowledge lives under `/home/mark/workspace/knowledge/personal-knowledge`.
- For prior AI-session reasoning, decisions, and historical continuity, start with `/home/mark/workspace/knowledge/personal-knowledge/threads/index.md`, then read only the relevant thread digest or session evidence. Threads are retrospective context, not proof of current work state.
- For synthesized personal understanding, preferences, ideas, and open questions, start with `/home/mark/workspace/knowledge/personal-knowledge/.openwiki/wiki/quickstart.md`, then read the relevant Topic, Theme, or Source summary.
- For current project or global continuity, inspect the relevant entry under `/home/mark/workspace/knowledge/personal-knowledge/work-units/`. Treat work units as routing and resumption context rather than operational authority.
- Repositories, specifications, issues, deployments, and other source systems remain authoritative for their own requirements, decisions, implementation, and status. Escalate from Personal knowledge to those systems when current or exact detail matters.
- Use these indexes when a task depends on prior reasoning, recurring preferences, historical decisions, or resumed work. Do not preload every thread or wiki page.
