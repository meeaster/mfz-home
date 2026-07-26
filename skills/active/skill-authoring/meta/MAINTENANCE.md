# Maintenance

## Bundled References

- `references/writing-great-skills/DOCTRINE.md` and `GLOSSARY.md` are the complete maintained doctrine snapshot used on every run.
- `references/skill-patterns/PATTERNS.md` and `SKELETONS.md` are the maintained, non-exhaustive form catalogue consulted only when structural comparison helps.

Keep those meanings in their bundled references. `SKILL.md` should point to them rather than duplicate their doctrine or examples.

## Upstream Provenance

Writing Great Skills:

- Repository: `https://github.com/mattpocock/skills`
- Subtree: `skills/productivity/writing-great-skills`
- Snapshot: `9603c1cc8118d08bc1b3bf34cf714f62178dea3b`
- Local adaptation: upstream `SKILL.md` is stored as `DOCTRINE.md`; the glossary's backlink targets that filename.

Skill Patterns:

- Evidence repository: `https://github.com/mattpocock/skills`
- Surveyed snapshot: `ed37663cc5fbef691ddfecd080dff42f7e7e350d`
- Local status: maintained synthesis rather than an upstream subtree.

## Reference Update Procedure

1. Inspect the upstream changes since the recorded snapshot.
2. Replace the accepted bundled doctrine files with the upstream versions, preserving only the documented filename and backlink adaptations.
3. Resurvey pattern evidence when upstream forms changed materially; revise the catalogue only where the evidence warrants it.
4. Update the recorded snapshots.
5. Review `SKILL.md` and all meta artifacts for assumptions affected by the reference changes.
6. Run the scenarios in `EVALS.md`.
7. Record consequential effects, rejected changes, and reversals in `LOG.md`.

## Change Procedure

1. Read `VISION.md`, `EVALS.md`, `MAINTENANCE.md`, `LOG.md`, and `DOGFOODING.md` before editing `SKILL.md`.
2. State the observed problem and desired behavior.
3. Classify the change as narrow tuning or intentional redesign.
4. Update the runtime skill and every affected meta artifact together.
5. Run representative evaluations for the changed branches.
6. Follow `references/TESTING.md` for live runs and inspect traces or produced artifacts rather than relying on self-report.
7. Record consequential decisions, observed effects, and reversals in `LOG.md`.

## Dogfooding Procedure

1. Inspect real-use artifacts and traces; admit only unexpected, consequential, repeated, or behavior-changing evidence to `DOGFOODING.md`.
2. Aggregate equivalent runs into coverage rather than appending session entries.
3. Preserve first observations as hypotheses until stronger evidence supports promotion.
4. Promote reusable assertions to `EVALS.md` and accepted changes or reversals to `LOG.md`.
5. Prune resolved detail once its decision and verification are preserved elsewhere; rely on Git for historical recovery.

## Provenance

The package convention and authoring workflow were derived from practical skill-development concerns: preserving intent separately from implementation, distinguishing trigger evaluation from post-load behavior, using traces as evidence, controlling runtime context, and retaining concise maintenance and change rationale.

The bundled doctrine remains the runtime source of truth for predictability, invocation loads, information hierarchy, leading words, completion criteria, and pruning. The bundled patterns remain a non-exhaustive catalogue of observed forms.

## Portability Review

Before distribution, verify that the package contains no private source material, absolute personal paths, undeclared local skill dependencies, workspace-specific assumptions, or installation commands belonging to the current environment. Deliberately environment-specific skills must state that boundary in `VISION.md` and runtime instructions.

## Evaluation Results

Keep reusable scenarios in `EVALS.md`, current provisional behavioral synthesis in `DOGFOODING.md`, and transient outputs outside the skill package. Summarize only accepted decisions, reversals, and results that establish an important limitation in `LOG.md`.
