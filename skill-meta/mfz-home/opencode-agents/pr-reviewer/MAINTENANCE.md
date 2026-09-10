# Maintenance

## Runtime dependencies

- `pr-review` owns holistic PR due-diligence behavior and requires `development-principles` and `thermo-nuclear-code-quality-review`.
- `profiles/base/profile.yml` enables the agent and owns its `openai/gpt-5.6-sol` / `high` assignment.
- OpenCode V2 migrates legacy `bash` and `task` permissions to `shell` and `subagent`. Edit, write, and patch share the `edit` action. Preserve the outside-root edit deny and task-evidence root edit and external-directory allows; a later legacy `write: deny` would override that exception. `orchestrator-task-evidence` owns the note method, and `../explore/MAINTENANCE.md#v2-permission-evidence` explains placement and ownership limits.
- Shell access is not a sandbox; the prompt and repository instructions keep command use bounded and read-only.
- The parent owns broad PR, static source, external documentation, current-state, and validation evidence gathering and supplies compact packets plus session locators.

## Change procedure

1. Keep the agent thin: behavior belongs to `pr-review`, while model and variant belong to profile configuration.
2. Preserve the assigned-evidence exception, all other direct mutation denies, and recursive delegation denies when permissions evolve.
3. Preserve evidence-contract routing against focused `reviewer`; provenance alone never selects this agent.
4. Keep agent inspection limited to focused spot checks and conflict adjudication. Broad enumeration, evidence reconstruction, and dependency research remain parent-owned.
5. Preserve complete missing-evidence request fields and keep their fulfillment, architect consultation, user decisions, merge, publication, fixes, and acceptance with the parent.
6. Run all structural and behavioral scenarios in `EVALS.md` after changing prompt, permission, registration, or profile policy.

## Validation

1. When rendering is authorized, resolve Personal and compare the rendered agent and skill with source.
2. Confirm resolved Sol/high, unchanged Personal Reviewer model selection, the evidence-root exception with outside-root mutation denies, Bash availability, and recursive delegation denies.
3. Confirm OpenCode and Mindframe-Z list the native agent and discover the skill.
