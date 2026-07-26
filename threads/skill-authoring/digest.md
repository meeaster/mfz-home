# Digest — skill-authoring

## Current State
`skill-authoring` is created, registered, enabled, and exercised as a single bundled package. It governs skill creation and maintenance through bundled authoring doctrine while keeping pattern references optional and selectively loaded. The reference bundle is now flat and descriptively named. Creation and read-only assessment tests validated context boundaries and fixture integrity, including an end-to-end generated skill that returned `DO NOT PROCEED` without mutation. Evaluation still has bounded defects and evidence gaps to address, and the final thread refresh remains unconfirmed after timing out.

## Components
- **Authoring workflow** — `SKILL.md` routes creation, revision, assessment, evaluation, packaging, and maintenance behavior · active and dogfooded
- **Reference bundle** — flattened writing doctrine, glossary, patterns, skeletons, and testing workflow under `references/` · consolidated and selectively loaded
- **Meta artifacts** — `VISION.md`, `EVALS.md`, `MAINTENANCE.md`, `LOG.md`, and `DOGFOODING.md` capture purpose, evaluation, upkeep, history, and bounded evidence · established, with maintenance text needing refresh
- **Evaluation workflow** — isolated creation and non-mutative execution inspect traces, artifacts, assertions, and fixture hashes · successful core paths demonstrated, with classification and coverage defects outstanding
- **Cross-cutting** — keep dependencies simple, separate assessment from mutation, load only necessary context, preserve evidence near claims, and use repeated evidence rather than rigid templates to handle nondeterministic behavior

## Direction
Correct the runtime classification defect, make retry fixtures decisive, add direct non-execution coverage, and refresh stale maintenance text. Strengthen evaluation evidence with fixture hashes, parent CLI events, and machine-readable results. Confirm whether the timed-out thread refresh completed, then continue curating `meta/DOGFOODING.md` through its promotion and pruning rules rather than accumulating session logs.

## Open Questions
- Should evaluation fixtures require stronger distinguishing evidence when multiple severity or outcome levels are acceptable?
- Should the package add a reusable structural validator or baseline system beyond machine-readable results?
- How much of Anthropic's iterative evaluation loop and Sentry's regression machinery should be adopted without making the package operationally heavy?
- Did the thread refresh complete after the local timeout?

## Key Decisions
- Use behavior-first design and bundled writing doctrine as the governing guidance while treating pattern references as optional structural evidence, preserving creative latitude.
- Standardize the package around `SKILL.md`, `agents/openai.yaml`, lowercase reference files, and uppercase artifacts under `meta/`.
- Keep the dependency model simple: load `skill-authoring` and expect its required bundled material to be available.
- Use the name `skill-authoring`, replacing `skill-workbench`.
- Maintain one bundled package rather than separately registered doctrine and pattern skills; treat that bundling rationale as local to this package, not a general dependency pattern.
- Keep review read-only and explicitly route assessment separately from implementation.
- Maintain `meta/DOGFOODING.md` as a bounded synthesis of coverage, observations, hypotheses, promotion decisions, and pruning decisions.
- Use flattened, descriptive reference names and remove frontmatter from adapted references.
- Preserve evidence-first prose in claim, concrete evidence, then interpretation order; restrict AI-writing audits to prose-level pattern removal.
- Limit evaluation expansion to fixture hashes, parent CLI-event capture, decisive fixtures, and machine-readable results.

## Design
```text
skill-authoring/
├── SKILL.md
├── agents/
│   └── openai.yaml
├── references/
│   ├── writing-great-skills.md
│   ├── writing-great-skills-glossary.md
│   ├── matt-pocock-skill-patterns.md
│   ├── matt-pocock-skill-skeletons.md
│   └── testing-workflow.md
└── meta/
    ├── VISION.md
    ├── EVALS.md
    ├── MAINTENANCE.md
    ├── LOG.md
    └── DOGFOODING.md
```

## Intent
Provide a practical way to design, create, revise, evaluate, package, and maintain strong skills without forcing every skill into a catalogue-derived template. The package should combine reliable doctrine, selective supporting material, evaluation practices, and maintenance conventions while remaining simple to load and use.

## Vision
The work shifted from a possible collection of standalone skills into one cohesive `skill-authoring` package, then toward a flatter and simpler internal structure. The intended destination is a self-improving authoring system whose bundled guidance, live evaluations, and bounded dogfooding record improve skill quality. External systems should supply proven ideas, while the user's own concerns and source material provide the package's distinctive flavor without reinventing those systems or adopting their operational weight wholesale.

## Perspective
The user favors simplicity over elaborate portability or dependency machinery and considers multiple separately registered skills unnecessary when one coherent package can contain the material. Patterns should inform authors rather than constrain creativity, references should remain flat and selectively loaded, and reviews should diagnose before changes are applied. Evidence should stay close to claims, while prose audits should remove AI-writing patterns without turning working evidence into polished product documentation. Confidence should come from isolated reruns, preserved artifacts, fixture integrity, and accumulated dogfooding evidence rather than self-reported success. Recurring concerns include triggering accuracy, overloaded references, leaked development context, source drift, harness reload behavior, missing parent-process evidence, and whether evaluation definitions remain portable. The user wants to layer this personal doctrine onto useful external approaches rather than reproduce them.

## Sources
- Humanizer — https://github.com/blader/humanizer
- Pull request — https://github.com/meeaster/mfz-home/pull/1
- Pull request comment — https://github.com/meeaster/mfz-home/pull/1#issuecomment-5084323893
- Pull request comment — https://github.com/meeaster/mfz-home/pull/1#issuecomment-5084326666
- Vision and design workflow learnings — `/home/mark/workspace/scratch/2026-07-25-vision-design-workflow-learnings.md`
- OpenAI skills — https://github.com/openai/skills
- OpenAI plugins — https://github.com/openai/plugins/tree/main/plugins
