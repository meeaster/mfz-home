# Maintenance

## Runtime Dependencies

- `profiles/base/profile.yml` owns shared activation and the `openai/gpt-5.6-luna` / `high` assignment.
- `instructions/AGENTS.md` owns inherited awareness and data minimization before read-only API calls.
- `/orchestrate` owns trigger classification, `inspect` evidence gathering, fresh dispatch, pause and override behavior, operator handoff, and coordinator acceptance.
- The caller's proposed-operation packet owns operation-specific target, scope, selectors, dependencies, containment, rollback, evidence, authority, and unresolved assumptions.
- OpenCode permission resolution must inherit ordinary inspection and integration capabilities, allow Bash, and deny file mutation, todo ownership, native subagent delegation, and `delegate_general`. The active profile currently has no Executor route; stop validation if a known aggregate execution surface appears unexpectedly.

## Change Procedure

1. Preserve the secondary-challenge boundary: the agent identifies collateral-impact paths and material evidence gaps without proving success, unrelated redesign, mutation, or authorization.
2. Keep broad current-state packet assembly in `inspect`, while allowing the reviewer to verify consequential claims through clearly read-only operations.
3. Keep output statuses advisory and compact. Any wording that turns `no material concern found` into approval is a behavioral regression.
4. Keep investigation proportional to credible reach. Continue while credible-path inspection could materially change the status or required containment, then stop; broad actions may require broad inspection, while narrow actions do not justify unrelated inventory or architecture analysis.
5. Update affected scenarios here and in the orchestrate record, then record consequential decisions or reversals in `LOG.md`.

## Validation

Run plain `mfz apply` and `mfz doctor`; inspect the rendered shared instructions, agent, and resolved active profile; confirm Luna/high, no agent-specific step limit, Bash and ordinary inherited integration access, and final denies for file mutation, todo ownership, subagent delegation, and `delegate_general`; compare the rendered shared instructions, command, and agent with their sources; run focused static assertions for read-only API data minimization and qualitative completion; run `git diff --check`; and evaluate the static scenarios in `EVALS.md`. Confirm that no known aggregate execution surface such as Executor appears. A live model scenario or cloud mutation requires separate explicit authority.
