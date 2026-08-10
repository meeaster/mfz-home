# Maintenance

## Runtime Dependencies

- OpenCode must expose the native `worker` subagent; its authoring record owns model, prompt, permission, and role policy.
- Native `task` behavior owns fresh child-session creation, prompt delivery, and web presentation.
- The command depends on the current session containing an accepted design with enough context to build a self-contained execution brief.

## Change Procedure

1. Read this record before changing `opencode/commands/implement-design.md`.
2. Preserve the distinction between consequential unresolved behavior and ordinary implementation choices.
3. Keep the command ephemeral and separate from OpenSpec authoring and Apply workflows.
4. Keep task-specific behavior in the execution brief rather than the worker agent definition.
5. Update affected scenarios in `EVALS.md` and record consequential decisions in `LOG.md`.

## Validation

1. Run `mfz apply --target opencode --agent opencode` from the Personal home.
2. Confirm the rendered `implement-design.md` remains one explicit command with no development metadata.
3. Run `mfz doctor` and inspect the rendered command.
4. Exercise accepted-design, ambiguity, dirty-workspace, and single-delegation scenarios in an isolated repository before changing the command's behavioral boundary.

## Environment Boundary

This command is specific to OpenCode and the Personal Mindframe-Z home. Its authoring record is development context and must not enter the rendered command.
