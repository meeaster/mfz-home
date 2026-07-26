# Digest — skill-authoring

## Current State
`skill-authoring` is created, registered, enabled, and validated as a single bundled package. It governs ordinary skill creation through bundled authoring doctrine while keeping pattern references optional. Isolated creation and read-only review regressions now avoid premature context loading, and an end-to-end evaluation successfully created and executed `api-contract-change-review` without modifying its fixtures. Testing guidance and a bounded living dogfooding synthesis are in place.

## Components
- **Authoring workflow** — `SKILL.md` drives skill creation using bundled doctrine and selectively loaded supporting material · active and validated
- **Reference bundle** — governing doctrine lives under `references/writing-great-skills/`, with pattern material and testing guidance under `references/` · consolidated from former standalone skills
- **Meta artifacts** — `VISION.md`, `EVALS.md`, `MAINTENANCE.md`, `LOG.md`, and `DOGFOODING.md` capture purpose, evaluation, upkeep, history, and bounded evidence · established
- **Evaluation workflow** — isolated creation, adjacent read-only review, and end-to-end generated-skill execution inspect traces, assertions, artifacts, and fixture integrity · exercised successfully
- **Cross-cutting** — keep dependencies simple, separate assessment from mutation, load only necessary context, and treat nondeterministic agent behavior through repeated evidence rather than rigid templates

## Direction
Resolve the cross-harness coverage gap, determine why `agents/openai.yaml` creation is inconsistent, and investigate the harness-level dependency-install warning so startup noise is included in evaluation evidence. Continue maintaining `meta/DOGFOODING.md` through its promotion and pruning rules rather than accumulating session logs.

## Open Questions
- How should the cross-harness coverage gap be addressed?
- Why is creation of `agents/openai.yaml` inconsistent?

## Key Decisions
- Use the bundled writing doctrine as the governing authoring guidance while treating the pattern catalogue as optional structural evidence, preserving creative latitude.
- Standardize the package around `SKILL.md`, `agents/openai.yaml`, and uppercase meta artifacts under `meta/`.
- Keep the dependency model simple: load `skill-authoring` and expect its bundled dependencies to be available.
- Use the name `skill-authoring`, replacing `skill-workbench`.
- Maintain one bundled package rather than separately registered doctrine and pattern skills.
- Keep review read-only and separate assessment from subsequent mutation.
- Maintain `meta/DOGFOODING.md` as a bounded living synthesis of coverage, observations, patterns, resolved issues, rejected hypotheses, and promotion or pruning decisions.
- Test in isolated workspaces using machine-readable assertions, trace and artifact inspection, minimal authorized revisions, same-scenario reruns, adjacent regressions, and cleanup.

## Design
```text
skill-authoring/
├── SKILL.md
├── agents/
│   └── openai.yaml
├── references/
│   ├── writing-great-skills/   governing doctrine
│   ├── TESTING.md              evaluation guidance
│   └── ...                     optional pattern evidence
└── meta/
    ├── VISION.md
    ├── EVALS.md
    ├── MAINTENANCE.md
    ├── LOG.md
    └── DOGFOODING.md           bounded living synthesis
```

## Intent
Provide a practical way to author and maintain strong skills without forcing every skill into a catalogue-derived template. The package should supply reliable doctrine, evidence, evaluation practices, and maintenance conventions while remaining simple to load and use.

## Vision
The work shifted from a possible collection of standalone skills into one cohesive `skill-authoring` package. The intended destination is a self-improving authoring system whose bundled guidance, live evaluations, and scalable dogfooding record improve skill quality without becoming bloated or overly prescriptive.

## Perspective
The user favors simplicity over elaborate portability or dependency machinery and considers multiple separately registered skills unnecessary when one coherent package can contain the material. Patterns should inform authors rather than constrain creativity. Reviews should diagnose before changes are applied. Because agent behavior is nondeterministic, confidence should come from isolated reruns, adjacent regressions, preserved artifacts, and accumulated dogfooding evidence. That evidence should remain curated and bounded rather than grow as an append-only record.

## Sources
- `/writing-great-skills` — `/writing-great-skills`
- `/skill-patterns` — `/skill-patterns`
