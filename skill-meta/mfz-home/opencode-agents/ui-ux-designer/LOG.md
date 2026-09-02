# Log

## 2026-08-18 - Shared Promptless Design Lane

- Moved the agent from the Work home to the Personal home so Work and Personal profiles can inherit the same UI/UX design role.
- Replaced the role-specific prompt with a frontmatter-only definition to preserve the standard OpenCode provider prompt.
- Kept design skills and Sol-to-implementation context transfer in caller prompts because they vary by task.

## 2026-08-18 - Shared UI/UX Skill Routing

- Added the shared `ui-ux-design` skill and a global parent-side dispatch rule so the promptless agent can preserve OpenCode's provider base prompt.
- Restricted direct edit, write, and patch tools while retaining shell access required by the UI/UX skill dependencies.
