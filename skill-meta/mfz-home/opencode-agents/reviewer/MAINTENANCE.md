# Maintenance

## Runtime Dependencies

- OpenCode agent loading must continue to treat a frontmatter-only agent file as an empty custom prompt and fall back to the provider system prompt.
- The Personal Mindframe-Z home renders `opencode/agents/reviewer.md` when `profiles/base/profile.yml` enables `reviewer`.
- The configured OpenAI provider must expose `openai/gpt-5.6-sol` with the `high` variant.
- Native `task` behavior owns child-session creation, presentation, prompt delivery, and task-level delegation guidance.
- The parent must supply changed paths, requirements, and existing validation evidence because the reviewer cannot use shell or code-mode execution to reconstruct them.
- Permissions deny by default. Add a capability only after confirming that every tool matched by its permission pattern is read-only and needed by a reviewer evaluation.
- Agent-level read and external-directory rules must restate sensitive-path denies after broad allows because per-agent permissions merge after global rules.

## Policy Sources

- `docs/model-selection.md` owns the broader model-family and effort policy.
- `profiles/base/profile.yml` owns the active model and variant.
- The caller's review prompt owns the review charter, requirements, evidence boundary, risks, and finding taxonomy.
- Workflow artifacts own review cadence, remediation policy, and acceptance.

## Change Procedure

1. Read this record and inspect recent reviewer session evidence before changing the role, model, permissions, or prompt boundary.
2. Treat a custom agent body as a redesign because it replaces OpenCode's provider prompt rather than appending to it.
3. Review the resolved tool list whenever OpenCode, a plugin, or an MCP integration adds tools; deny-by-default is the compatibility boundary.
4. Keep workflow-specific review taxonomies and cadence in callers unless repeated evidence establishes durable shared behavior.
5. Run the structural, review, adjacent-routing, inheritance, and native-presentation scenarios in `EVALS.md`.
6. Record consequential policy changes, observed effects, and reversals in `LOG.md`.
7. Apply source changes with `mfz apply --target opencode --agent opencode`, then restart OpenCode before live validation.

## Evidence Review

Use aggregate OpenCode session evidence to evaluate review task shapes, model selection, unsupported findings, parent adjudication, failures, and resumptions. Deduplicate tool calls, child sessions, and resumed task IDs before drawing usage conclusions.
