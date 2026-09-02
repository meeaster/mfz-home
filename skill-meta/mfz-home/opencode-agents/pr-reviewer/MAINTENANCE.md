# Maintenance

## Runtime dependencies

- `pr-review` owns holistic PR due-diligence behavior and requires `development-principles` and `thermo-nuclear-code-quality-review`.
- `profiles/base/profile.yml` enables the agent and owns its `openai/gpt-5.6-sol` / `high` assignment.
- OpenCode V2 agent permissions must continue to recognize `bash`, `apply_patch`, `edit`, `write`, `todowrite`, `task`, and `delegate_general`.
- Shell access is not a sandbox; the prompt and repository instructions keep command use bounded and read-only.
- The parent owns broad PR, static source, external documentation, current-state, and validation evidence gathering and supplies compact packets plus session locators.

## Change procedure

1. Keep the agent thin: behavior belongs to `pr-review`, while model and variant belong to profile configuration.
2. Preserve direct mutation denies and recursive delegation denies when permissions evolve.
3. Preserve evidence-contract routing against focused `reviewer`; provenance alone never selects this agent.
4. Keep agent inspection limited to focused spot checks and conflict adjudication. Broad enumeration, evidence reconstruction, and dependency research remain parent-owned.
5. Preserve complete missing-evidence request fields and keep their fulfillment, architect consultation, user decisions, merge, publication, fixes, and acceptance with the parent.
6. Run all structural and behavioral scenarios in `EVALS.md` after changing prompt, permission, registration, or profile policy.

## Validation

1. Render an isolated Work profile and compare the agent and skill with source.
2. Confirm resolved Sol/high, unchanged Work `reviewer` Terra/high, mutation denies, Bash availability, and recursive delegation denies.
3. Confirm OpenCode and Mindframe-Z list the native agent and discover the skill.
