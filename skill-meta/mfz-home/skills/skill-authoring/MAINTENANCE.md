# Maintenance

## Runtime Dependencies

- The separately managed `writing-for-agents` skill provides the required runtime writing doctrine. Load it before skill work; follow its `SKILL-MECHANICS.md` pointer when authoring a skill.
- `references/openai-skill-creation.md` is the required agent-agnostic planning adaptation for examples, freedom, reusable resources, and layered validation.
- `references/opencode-commands.md` owns the conditional OpenCode command format, substitution, and invocation guidance. Refresh it against the OpenCode reference repository when command behavior changes.
- `references/testing-workflow.md` owns the harness-neutral live-evidence contract, not CLI commands or session-store mechanics.

Keep each role distinct. Skill Authoring owns behavior, authority, authoring record resolution, the four-file lifecycle, and evidence. Writing for Agents owns runtime writing quality. The OpenAI adaptation owns examples, degrees of freedom, reusable-resource planning, and layered validation.

## Upstream Provenance

Writing for Agents:

- Repository: `https://github.com/mattpocock/skills`
- Subtree: `skills/productivity/writing-for-agents`
- Snapshot: `0986ebaf5d29e812162702b2633a2942c30200d2`
- Role: separately managed runtime writing guidance. Its `SKILL-MECHANICS.md` supplies skill packaging, invocation, and router guidance when the target is a skill.

OpenAI Skill Creator:

- Repository: `https://github.com/openai/skills`
- Subtree: `skills/.system/skill-creator`
- Snapshot: `49f948faa9258a0c61caceaf225e179651397431`
- Status: upstream repository deprecated in favor of OpenAI Plugins; no complete successor creator exists there at the surveyed revision.
- Adaptation: retained concrete-example discovery, degrees of freedom, reusable-resource planning, and layered validation; removed Codex-only commands and metadata, initialization scripts, conflicting package rules, duplicated writing doctrine, and the upstream end-to-end lifecycle.

Anthropic Skill Creator:

- Repository: `https://github.com/anthropics/skills`
- Subtree: `skills/skill-creator`
- Snapshot: `9d2f1ae187231d8199c64b5b762e1bdf2244733d`
- Adaptation: retained only the optional no-skill or previous-revision baseline concept. The Claude-specific runner, benchmark aggregation, viewer, grading agents, blind comparison, and description optimizer are not part of the default workflow.

OpenCode commands:

- Repository: `https://github.com/anomalyco/opencode`
- Source: command documentation and command/config/session implementations.
- Surveyed: 2026-08-06 local reference snapshot.
- Adaptation: retained the single-file prompt-template model, explicit slash invocation, supported metadata, argument substitution, file and shell interpolation, and skill boundary. Omitted unstable legacy `variant` metadata.

## Guidance Update Procedure

1. Inspect upstream changes since each recorded snapshot.
2. Classify changes by the local role they could affect; do not copy a complete upstream workflow mechanically.
3. Update the vendored `writing-for-agents` dependency and its recorded boundary together.
4. Review `SKILL.md` and every authoring record artifact for affected assumptions.
5. Run the scenarios in `EVALS.md`.
6. Record consequential effects, rejected changes, and reversals in `LOG.md`.

## Change Procedure

1. Read `VISION.md`, `EVALS.md`, `MAINTENANCE.md`, `LOG.md`, and `DOGFOODING.md` before editing `SKILL.md`.
2. State the observed problem and desired behavior.
3. Classify the change as narrow tuning or intentional redesign.
4. Update the runtime artifact and every affected authoring record artifact together.
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

The authoring record convention and workflow were derived from practical skill-development concerns: preserving intent separately from implementation, distinguishing trigger evaluation from post-load behavior, using traces as evidence, controlling runtime context, and retaining concise maintenance and change rationale.

Skill Authoring owns that personal behavior, evidence, authority, and lifecycle layer. The bundled adaptations make its required writing and planning guidance available in every supported harness. Advanced Anthropic or Sentry evaluation machinery remains optional source material rather than a dependency of the default loop.

## Portability Review

Before distribution, verify that the package contains no private source material, absolute personal paths, undeclared dependencies, workspace-specific assumptions, or installation commands belonging to the current environment. Deliberately environment-specific skills must state that boundary in `VISION.md` and runtime instructions.

## Evaluation Results

Keep reusable scenarios in `EVALS.md`, current provisional behavioral synthesis in `DOGFOODING.md`, and transient outputs outside the skill package. Summarize only accepted decisions, reversals, and results that establish an important limitation in `LOG.md`.
