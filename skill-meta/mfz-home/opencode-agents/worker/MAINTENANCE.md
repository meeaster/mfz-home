# Maintenance

## Runtime Dependencies

- OpenCode agent loading must continue to treat a frontmatter-only agent file as an empty custom prompt and fall back to the provider system prompt.
- The Personal Mindframe-Z home renders `opencode/agents/worker.md` when `profiles/base/profile.yml` enables `worker`.
- The configured OpenAI provider must expose `openai/gpt-5.6-luna` with the `max` variant.
- Native `task` behavior owns child-session creation, presentation, prompt delivery, and task-level delegation guidance.

## Policy Sources

- `docs/model-selection.md` owns the broader model-family and effort policy.
- `profiles/base/profile.yml` owns the active model and variant.
- The caller's task prompt owns task-specific context, constraints, acceptance criteria, and handoff requirements.
- Workflow artifacts own review cadence and acceptance behavior.

## Change Procedure

1. Read this record and inspect recent worker session evidence before changing the role, model, permissions, or prompt boundary.
2. Treat a custom agent body as a redesign because it replaces OpenCode's provider prompt rather than appending to it.
3. Keep task-level process instructions in callers unless repeated evidence shows durable worker behavior is missing.
4. Run the structural, routing, execution, inheritance, and native-presentation scenarios in `EVALS.md`.
5. Record consequential policy changes, observed effects, and reversals in `LOG.md`.
6. Apply source changes with `mfz apply --target opencode --agent opencode`, then restart OpenCode before live validation.

## Evidence Review

Use aggregate OpenCode session evidence to evaluate task shapes, model selection, failures, resumptions, and parent acceptance. Deduplicate tool calls, child sessions, and resumed task IDs before drawing usage conclusions.
