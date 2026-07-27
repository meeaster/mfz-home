# Maintenance

## Bundled Guidance

- `references/writing-great-skills.md` and `writing-great-skills-glossary.md` provide the required runtime writing doctrine without cross-skill invocation.
- `references/openai-skill-creation.md` is the required agent-agnostic planning adaptation for examples, freedom, reusable resources, and layered validation.
- `references/testing-workflow.md` owns the harness-neutral live-evidence contract, not CLI commands or session-store mechanics.

Keep each role distinct. Skill Authoring owns behavior, authority, the four-file lifecycle, and evidence. Writing Great Skills owns runtime writing quality. The OpenAI adaptation owns examples, degrees of freedom, reusable-resource planning, and layered validation.

## Upstream Provenance

Writing Great Skills:

- Repository: `https://github.com/mattpocock/skills`
- Subtree: `skills/productivity/writing-great-skills`
- Snapshot: `9603c1cc8118d08bc1b3bf34cf714f62178dea3b`
- Adaptation: removed standalone skill frontmatter, renamed the files for their local reference role, and tightened some glossary definitions without changing their behavioral meaning.

OpenAI Skill Creator:

- Repository: `https://github.com/openai/skills`
- Subtree: `skills/.system/skill-creator`
- Snapshot: `49f948faa9258a0c61caceaf225e179651397431`
- Status: upstream repository deprecated in favor of OpenAI Plugins; no complete successor creator exists there at the surveyed revision.
- Adaptation: retained concrete-example discovery, degrees of freedom, reusable-resource planning, and layered validation; removed Codex-only commands and metadata, initialization scripts, conflicting package rules, duplicated writing doctrine, and the upstream end-to-end lifecycle.

## Guidance Update Procedure

1. Inspect upstream changes since each recorded snapshot.
2. Classify changes by the local role they could affect; do not copy a complete upstream workflow mechanically.
3. Update the bundled adaptation and its recorded boundary together.
4. Review `SKILL.md` and every meta artifact for affected assumptions.
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

Skill Authoring owns that personal behavior, evidence, authority, and lifecycle layer. The bundled adaptations make its required writing and planning guidance available in every supported harness. Advanced Anthropic or Sentry evaluation machinery remains optional source material rather than a dependency of the default loop.

## Portability Review

Before distribution, verify that the package contains no private source material, absolute personal paths, undeclared dependencies, workspace-specific assumptions, or installation commands belonging to the current environment. Deliberately environment-specific skills must state that boundary in `VISION.md` and runtime instructions.

## Evaluation Results

Keep reusable scenarios in `EVALS.md`, current provisional behavioral synthesis in `DOGFOODING.md`, and transient outputs outside the skill package. Summarize only accepted decisions, reversals, and results that establish an important limitation in `LOG.md`.
