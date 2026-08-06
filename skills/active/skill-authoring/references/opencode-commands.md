# OpenCode Commands

Use an OpenCode command for behavior that should run only when a human explicitly enters a slash command and that fits in one prompt-template file. This occupies the same invocation niche as a Claude Code skill with `disable-model-invocation: true`, but the formats are not interchangeable: an OpenCode command is not a `SKILL.md` package and is not loaded through the skill tool.

## Runtime Shape

- Put one Markdown file under project `.opencode/commands/` or global `~/.config/opencode/commands/`. The relative path without `.md` becomes the command name; for example, `commands/review/code.md` becomes `/review/code`.
- Write the prompt template in the Markdown body.
- Use YAML frontmatter for command metadata: `description`, `agent`, `model`, and `subtask`.
- Set `subtask: false` by default so the command runs in the main session context. Use `subtask: true` only when the command intentionally needs a fresh, isolated context.
- Keep supporting resources or model-discoverable behavior in a skill. A command can refer to files, but it does not package a resource tree like a skill.

Follow a destination's source convention when it wraps `COMMAND.md` with non-runtime development metadata. The rendered OpenCode command remains one Markdown file.

## Template Inputs

- `$ARGUMENTS` inserts the complete argument string.
- `$1`, `$2`, and later positional placeholders insert individual arguments. The highest numbered placeholder receives the remaining arguments.
- When the template contains no argument placeholders, OpenCode appends supplied arguments to it.
- `` !`command` `` injects shell output into the prompt.
- `@path` adds a file reference.

Use `agent` when the command should select a named agent and `model` only when it must override normal model selection. An omitted `subtask` can still create a subtask when the selected agent is a subagent, so write `subtask: false` explicitly unless isolation is part of the intended behavior.

## Verification

Verify the command through its actual slash name with representative arguments. Confirm substitutions, file references, shell injection, selected agent or model, and whether execution remained in the main session or opened the intended fresh context. Also confirm that ordinary prose does not invoke the command and that a same-named explicit command intentionally overrides any built-in command.
