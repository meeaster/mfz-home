# Maintenance

## Runtime Dependencies

- `instructions/AGENTS.md` owns documentation-source selection and local-reference precedence.
- OpenCode must expose `openai/gpt-5.6-luna@high` and the native task mechanism.
- FFF supplies indexed local and reference-repository search.
- Code Mode supplies the filtered catalogue of approved documentation and FFF tools.
- Approved direct documentation tools must remain read-only for every permission pattern in `opencode/agents/research.md`.
- `claude-code-docs` owns Claude Code documentation navigation and retrieval.
- Global configuration owns sensitive-path and external-directory policy; do not duplicate those rules in this agent.

## Change Procedure

1. Read this record and inspect recent Research sessions before changing scope, retrieval limits, model, prompt, or permissions.
2. Keep source-selection policy in workspace instructions; the agent prompt should own only specialist behavior and bounded retrieval.
3. Review exact MCP tool IDs when integrations change. Preserve the explicit read-only capability boundary and never grant access to an integration that may expose mutation.
4. Reconcile caller guidance, especially `/apply-spec`, whenever the Research boundary changes.
5. Run the structural, positive, fallback, no-external-question, conflict, and caller-routing scenarios in `EVALS.md`.
6. Record consequential decisions, observed effects, and reversals in `LOG.md`.
7. Apply source changes with `mfz apply --target all --agent opencode`, then restart OpenCode before live validation.

## Evidence Review

Track completion rate, duration, model turns, tool calls, repeated searches, retrieval errors, source quality, missing final reports, local-codebase overreach, implementation recommendations, parent reuse, and correction or duplication. Separate current-model evidence from historical configurations.
