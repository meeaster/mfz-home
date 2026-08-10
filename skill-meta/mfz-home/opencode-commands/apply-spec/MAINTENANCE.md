# Maintenance

## Runtime Dependencies

- `openspec-apply-change` supplies authoritative Apply behavior and context.
- `thermo-nuclear-code-quality-review` supplies pre-implementation quality guidance without an automatic review.
- Native `explore` and `research` agents own local and external fact gathering respectively.

## Change Procedure

1. Read this record before changing `opencode/commands/apply-spec.md`.
2. Keep OpenSpec Apply authoritative and preserve coordinator decision ownership.
3. Reconcile this command whenever Explore or Research changes its routing boundary.
4. Keep Research conditional on a concrete external question and keep the OpenSpec artifact out of its brief.
5. Run all scenarios in `EVALS.md` and record consequential changes in `LOG.md`.

## Validation

1. Run `mfz apply --target all --agent opencode` from the Personal home.
2. Confirm the rendered `apply-spec.md` remains one explicit command with no authoring metadata.
3. Run `mfz doctor`, repository tests, and type checking.
4. Exercise local-only and external-dependency fixtures before changing the routing contract.

## Environment Boundary

This command is specific to OpenCode, OpenSpec, and the Personal Mindframe-Z home. Its authoring record must not enter the rendered command.
