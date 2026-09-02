# Maintenance

## Runtime dependencies

- OpenCode must treat a frontmatter-only agent file as an empty custom prompt and fall back to the provider system prompt.
- The configured provider must expose `openai/gpt-5.6-luna@high`.
- The active environment must provide the read-only CLI, MCP, skill, or API route needed for the target system.
- The caller's brief owns target identity, account and region scope, permitted operations, expected fields, and stop conditions.

## Change procedure

1. Read this record and inspect representative sessions before changing the role, model, permissions, or prompt boundary.
2. Keep system-specific query procedure in the owning skill or caller brief.
3. Preserve the current-state retrieval boundary. Route diagnosis to `triage` and every mutation to an explicitly authorized workflow.
4. Run every affected scenario in `EVALS.md` and record consequential decisions or reversals in `LOG.md`.

## Validation

1. Run plain `mfz apply` from the Personal home when the current source state is ready to render.
2. Confirm the rendered agent has an empty prompt, Luna/high, and the intended permission denies.
3. Run `mfz doctor` and a fresh native child probe before claiming live behavior.

## Safety boundary

Bash and broad integration catalogs may expose mutation commands that agent frontmatter cannot classify individually. Every caller brief must state read-only authority, and behavioral validation must inspect the actual commands or tool calls rather than relying on the agent's summary.
