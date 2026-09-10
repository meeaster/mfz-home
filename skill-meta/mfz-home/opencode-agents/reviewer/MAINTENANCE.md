# Maintenance

## Runtime Dependencies

- OpenCode agent loading must continue to treat a frontmatter-only agent file as an empty custom prompt and fall back to the provider system prompt.
- The Personal Mindframe-Z home renders `opencode/agents/reviewer.md` when `profiles/personal/profile.yml` enables `reviewer`.
- The configured provider must support the model and variant selected by the Personal profile.
- Native `task` behavior owns child-session creation, presentation, prompt delivery, and task-level delegation guidance.
- The parent must supply requirements and the review boundary. Changed paths and validation evidence should be included when available, but the reviewer may reconstruct repository evidence with shell inspection.
- Global permissions apply before the reviewer's agent-specific rules. Preserve the outside-root edit deny, task-evidence root edit and external-directory allows, and native/legacy delegation denies. `orchestrator-task-evidence` owns assigned-note production and reuse; `../explore/MAINTENANCE.md#v2-permission-evidence` explains absolute-path matching and shared-root ownership limits.
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
3. Review the resolved tool list whenever OpenCode, a plugin, or an MCP integration adds a file-editing tool. V2 edit, write, and patch share the `edit` action. Avoid a later legacy `write: deny`, which would override the evidence-root exception.
4. Keep workflow-specific review taxonomies and cadence in callers unless repeated evidence establishes durable shared behavior.
5. Run the structural, review, adjacent-routing, inheritance, and native-presentation scenarios in `EVALS.md`.
6. Record consequential policy changes, observed effects, and reversals in `LOG.md`.
7. When activation is authorized, use plain `mfz apply`, inspect the rendered and resolved agent, and validate through a native child in the running V2 server. Agent definitions hot-reload; no restart is required.

## Evidence Review

Use aggregate OpenCode session evidence to evaluate review task shapes, model selection, unsupported findings, parent adjudication, failures, and resumptions. Deduplicate tool calls, child sessions, and resumed task IDs before drawing usage conclusions.
