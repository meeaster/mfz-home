# Maintenance

## Dependencies And Sources

- `writing-great-skills` is a separately managed vendored skill and the preferred runtime-writing guidance. Its upstream repository, subtree, commit, and digest are owned by the Mindframe-Z skill catalogue and vendor lock.
- `openai-skills` is a configured read-only reference used selectively for OpenAI's concrete-example, degrees-of-freedom, reusable-resource, scaffolding, validation, and Codex metadata guidance. The source repository is deprecated, so treat it as a pinned source rather than current universal doctrine.
- `openai-plugins` is a configured read-only reference for current OpenAI plugin scaffolding and evaluation behavior. It does not contain a complete successor to the older skill creator.
- `references/testing-workflow.md` is the only bundled runtime reference. It owns the harness-neutral evidence contract, not CLI commands or session-store mechanics.

Do not copy complete upstream creator skills into this package. Keep upstream versions and promotion in their owning catalogue or reference records, then review this package when those dependencies change materially.

## Dependency Update Procedure

1. Inspect the upstream skill or reference diff through its owning Mindframe-Z update workflow.
2. Confirm whether the change affects a role Skill Authoring delegates to that source.
3. Update `SKILL.md` only when the composition boundary or required behavior changes.
4. Review every meta artifact for affected assumptions.
5. Run the scenarios in `EVALS.md`.
6. Record consequential effects, rejected changes, and reversals in `LOG.md`.

## Change Procedure

1. Read `VISION.md`, `EVALS.md`, `MAINTENANCE.md`, `LOG.md`, and `DOGFOODING.md` before editing `SKILL.md`.
2. State the observed problem and desired behavior.
3. Classify the change as narrow tuning or intentional redesign.
4. Update the runtime skill and every affected meta artifact together.
5. Run representative evaluations for the changed branches.
6. Follow `references/testing-workflow.md` for live runs and inspect traces or produced artifacts rather than relying on self-report.
7. Record consequential decisions, observed effects, and reversals in `LOG.md`.

## Dogfooding Procedure

1. Inspect real-use artifacts and traces; admit only unexpected, consequential, repeated, or behavior-changing evidence to `DOGFOODING.md`.
2. Aggregate equivalent runs into coverage rather than appending session entries.
3. Preserve first observations as hypotheses until stronger evidence supports promotion.
4. Promote reusable assertions to `EVALS.md` and accepted changes or reversals to `LOG.md`.
5. Prune resolved detail once its decision and verification are preserved elsewhere; rely on Git for historical recovery.

## Provenance

The package convention and authoring workflow were derived from practical skill-development concerns: preserving intent separately from implementation, distinguishing trigger evaluation from post-load behavior, using traces as evidence, controlling runtime context, and retaining concise maintenance and change rationale.

Skill Authoring owns that personal behavior, evidence, authority, and lifecycle layer. Writing Great Skills owns runtime writing quality. Configured OpenAI sources supply their established planning, scaffolding, validation, and provider-specific guidance when relevant. Advanced Anthropic or Sentry evaluation machinery remains optional source material rather than a dependency of the default loop.

## Portability Review

Before distribution, verify that the package contains no private source material, absolute personal paths, undeclared dependencies, workspace-specific assumptions, or installation commands belonging to the current environment. Deliberately environment-specific skills must state that boundary in `VISION.md` and runtime instructions. Another environment may adapt or replace the declared external guidance while preserving the four-file development contract.

## Evaluation Results

Keep reusable scenarios in `EVALS.md`, current provisional behavioral synthesis in `DOGFOODING.md`, and transient outputs outside the skill package. Summarize only accepted decisions, reversals, and results that establish an important limitation in `LOG.md`.
