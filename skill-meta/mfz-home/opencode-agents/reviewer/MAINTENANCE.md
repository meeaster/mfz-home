# Maintenance

## Runtime Dependencies

- OpenCode agent loading must continue to treat a frontmatter-only agent file as an empty custom prompt and fall back to the provider system prompt.
- The Personal Mindframe-Z home renders `opencode/agents/reviewer.md` when `profiles/personal/profile.yml` enables `reviewer`.
- The configured provider must support the model and variant selected by the Personal profile.
- Native `task` behavior owns child-session creation, presentation, prompt delivery, and task-level delegation guidance.
- The parent must supply requirements and the review boundary. Changed paths and validation evidence should be included when available, but the reviewer may reconstruct repository evidence with shell inspection.
- Global permissions apply before the reviewer's agent-specific rules. Keep `apply_patch`, `edit`, and `write` denied while allowing ordinary inspection capabilities.
- Shell permissions are not a sandbox: reviewer prompts and repository instructions must keep shell use read-only because shell commands can still mutate files.

## Policy Sources

- `docs/model-selection.md` owns the broader model-family and effort policy.
- `profiles/personal/profile.yml` owns the active Personal model and variant.
- The caller's review prompt owns the review charter, requirements, evidence boundary, risks, and finding taxonomy.
- The frontmatter description requires `thermo-nuclear-code-quality-review` for code review; `/orchestrate` supplies the known-work charter and evidence standard for structural proposals. Keep that routing distinct from unfamiliar-PR intent reconstruction, and preserve the empty agent body.
- Workflow artifacts own review cadence, remediation policy, and acceptance.

## Change Procedure

1. Read this record and inspect recent reviewer session evidence before changing the role, model, permissions, or prompt boundary.
2. Treat a custom agent body as a redesign because it replaces OpenCode's provider prompt rather than appending to it.
3. Review the resolved tool list whenever OpenCode, a plugin, or an MCP integration adds a file-editing tool; add an explicit deny when it is not covered by `apply_patch`, `edit`, or `write`.
4. Keep workflow-specific review taxonomies and cadence in callers unless repeated evidence establishes durable shared behavior.
5. Run the structural, review, adjacent-routing, inheritance, and native-presentation scenarios in `EVALS.md`.
6. Record consequential policy changes, observed effects, and reversals in `LOG.md`.
7. Apply source changes with `mfz apply --target opencode --agent opencode`, then restart OpenCode before live validation.

## Evidence Review

Use aggregate OpenCode session evidence to evaluate review task shapes, model selection, unsupported findings, parent adjudication, failures, and resumptions. Deduplicate tool calls, child sessions, and resumed task IDs before drawing usage conclusions.
