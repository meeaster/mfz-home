# Maintenance

## Runtime dependencies

- OpenCode must expose native `explore`, `research`, `inspect`, `triage`, `worker`, and `reviewer` subagents.
- The primary session owns coordinator model and reasoning-effort selection; the command must not override either.
- `context-transfer` owns the parent-to-agent brief contract.
- Each agent's definition and authoring record own its model, permissions, and role boundary.

## Change procedure

1. Read this record and the records for every affected agent before changing routing, acceptance, or authority behavior.
2. Keep the command generic. Put project, OpenSpec, review-method, and domain-specific procedure in the owning workflow or child brief.
3. Preserve explicit user authority for every worker and reviewer dispatch. Read-only `explore`, `research`, `inspect`, and `triage` fan-out remains coordinator-owned.
4. Preserve the narrow planning exception: the primary may record an explicitly requested accepted design through its owning workflow, but that authority does not include implementation.
5. Preserve asymmetric context transfer: rich decision-relevant context goes to fresh children, while compact evidence packets return to the primary session.
6. Keep judgment with the coordinator. Children gather bounded evidence; the coordinator challenges, weighs, recommends, synthesizes, and accepts.
7. Route by authority rather than destination. Keep read-only current state with `inspect`, diagnosis with `triage`, and every authorized mutation with `worker` plus the owning domain skill.
8. Keep mutation authority outcome-scoped; do not silently expand commit into push, push into pull request or merge, draft into publication, or one system change into another.
9. Preserve continuity-aware routing. Maintain a compact child roster, resume when retained context has material value, and start fresh when independence, authority, scope, staleness, or bias requires it.
10. Treat provider cache reuse as opportunistic. Do not make correctness or routing depend on cache behavior that the runtime does not guarantee.
11. Update affected scenarios in `EVALS.md` and record consequential decisions or reversals in `LOG.md`.

## Validation

1. Run plain `mfz apply` from the Personal home when the current source state is ready to render.
2. Confirm the rendered command has no model override, has `subtask: false`, and remains one runtime Markdown file.
3. Run `mfz doctor` and invoke `/orchestrate` with representative arguments after behavioral changes.

## Environment boundary

This command is specific to OpenCode and this Mindframe-Z home. It inherits the current primary session's model and reasoning effort.
