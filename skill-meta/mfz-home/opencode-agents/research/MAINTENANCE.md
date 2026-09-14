# Maintenance

## Runtime Dependencies

- `instructions/AGENTS.md` owns documentation-source selection and local-reference precedence.
- OpenCode must expose `openai/gpt-5.6-luna@high` and the native task mechanism.
- FFF supplies indexed local and reference-repository search.
- Code Mode supplies the filtered catalogue of approved documentation and FFF tools.
- Broad tools and skills support evidence gathering; authority remains constrained by the research prompt rather than a manually maintained capability allowlist.
- Task-relevant skills own their specialist guidance. Research must be able to load them without agent-specific allowlist maintenance.
- Global configuration owns sensitive-path policy. The agent explicitly permits its approved temporary research and evidence roots beneath `/tmp/opencode/`.

## Change Procedure

1. Read this record and inspect recent Research sessions before changing scope, retrieval limits, model, prompt, or permissions.
2. Keep source-selection policy in workspace instructions; the agent prompt should own only specialist behavior and bounded retrieval.
3. Preserve the evidence-only authority boundary while allowing the model to choose suitable local, shell, documentation, web, API, and skill routes.
4. Reconcile caller guidance, especially `/apply-spec`, whenever the Research boundary changes.
5. Run the structural, documentation, disposable-clone, no-external-question, conflict, and caller-routing scenarios in `EVALS.md`.
6. Record consequential decisions, observed effects, and reversals in `LOG.md`.
7. Apply source changes with `mfz apply --target all --agent opencode`, then restart OpenCode before live validation.

## Evidence Review

Track completion rate, duration, model turns, tool calls, repeated searches, retrieval errors, source quality, missing final reports, local-codebase overreach, implementation recommendations, parent reuse, and correction or duplication. Separate current-model evidence from historical configurations.
