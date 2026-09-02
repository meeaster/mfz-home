# Maintenance

## Runtime dependencies

- OpenCode must expose `agent-author` as a native subagent and the configured provider must expose `openai/gpt-5.6-sol@medium`.
- `writing-for-agents` owns agent-consumed prose quality; `skill-authoring` owns maintained skill, command, agent, and prompt-package authoring; platform skills own platform mechanics.
- The caller owns intended behavior, destination, accepted constraints, mutation authority, accessible paths, expected outcome, and stop conditions.

## Change procedure

1. Read this record and representative authoring sessions before changing role, model, permissions, or required skill routing.
2. Keep artifact-specific doctrine in the owning skill rather than copying it into the agent prompt.
3. Preserve explicit mutation authority and the boundary between AI-facing behavior, application mechanics, architecture, and independent review.
4. Run affected scenarios in `EVALS.md` and record consequential decisions or reversals in `LOG.md`.

## Validation

1. Run plain `mfz apply` from the Personal home.
2. Confirm the rendered agent resolves to Sol/medium, can edit under authority, and cannot own todos or recursively delegate.
3. Run `mfz doctor` and a fresh native authoring probe before claiming live behavior.

## Environment boundary

The agent is specific to OpenCode and this Mindframe-Z home. Destination repositories and owning workflows may impose stronger authoring, privacy, publication, or validation rules.
