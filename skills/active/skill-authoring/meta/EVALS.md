# Skill Authoring Evaluations

Evaluate behavior, not resemblance to a preferred template. Record the skill revision, model, harness, relevant configuration, observable result, and limitations for each run.

## Shared Assertions

Every scenario confirms that:

- the bundled Writing Great Skills doctrine and OpenAI-derived planning guidance are read before skill work begins;
- the requested mode and authorized outcome are established;
- files are modified only when implementation is authorized;
- every applicable package artifact agrees with `SKILL.md`.

## Create From A Sparse Brief

**Prompt:** Ask for a skill with only a goal and rough use case.

**Assertions:** The agent establishes intended behavior and genuine ambiguities before choosing a form; resolves available facts through legwork; asks about unresolved consequential choices while stating reversible assumptions; creates all four meaningful `meta/` documents; and avoids inventing unsupported environment assumptions.

## Create From Rich Evidence

**Prompt:** Supply notes, repository material, or prior interactions describing a desired process.

**Assertions:** The agent extracts durable behavior, identifies uncertainty, and keeps incidental evidence out of runtime instructions while preserving useful provenance in `meta/MAINTENANCE.md` or rationale in `meta/LOG.md`.

## Revise An Existing Skill

**Prompt:** Request a behavioral change to a skill with an existing `meta/` package.

**Assertions:** The agent reads all package artifacts, classifies tuning versus redesign, reconciles the change with `VISION.md`, updates affected evaluations and maintenance guidance, and records a consequential decision in `LOG.md`.

## Preserve A Novel Shape

**Prompt:** Request behavior poorly represented by a phased skill, router, reference skill, or thin orchestrator.

**Assertions:** The agent derives a fitting structure from behavior and does not force one of the known skeletons merely because it is available.

## Apply Bundled Planning Guidance

**Prompt:** Request a new skill or an intentional redesign whose behavior needs concrete examples, a freedom decision, or reusable resources.

**Assertions:** The agent uses `openai-skill-creation.md` for examples, degrees of freedom, and resource planning, keeps Skill Authoring responsible for the lifecycle contract, and does not introduce provider-specific mechanics without a destination requirement.

## Keep A Small Skill Small

**Prompt:** Create a one-line orchestrator or similarly compact skill.

**Assertions:** All four `meta/` documents contain useful information without expanding into generic boilerplate; `MAINTENANCE.md` contains only skill-specific upkeep rather than copied or referenced authoring doctrine; `SKILL.md` remains proportionate.

## Preserve Cross-Artifact Behavior

**Prompt:** Review or revise a package whose vision, evaluations, maintenance guidance, or decision log restates behavior also present in `SKILL.md`.

**Assertions:** The agent preserves role-specific statements of intent, observable assertions, upkeep, and rationale even when they overlap with runtime behavior; removes only copied doctrine or prose that does not serve the artifact's role; and does not simplify `VISION.md` merely because `SKILL.md` operationalizes the same behavior.

## Review Without Modification

**Prompt:** Review an existing skill and recommend improvements without making changes.

**Assertions:** The agent reads the complete package, applies the bundled writing doctrine, returns prioritized findings, distinguishes valuable changes from cosmetic preferences, and performs no writes.

## Maintain An Existing Skill

**Prompt:** Update a skill after an upstream dependency or observed behavior changes.

**Assertions:** The agent reads the package history, identifies affected behavior and evaluations, distinguishes tuning from redesign, updates only authorized files, and records consequential rationale in `LOG.md`.

## Invocation Evaluation

**Prompt:** Test a model-invoked skill using realistic positive, negative, and adjacent user prompts without naming or preloading it.

**Assertions:** Trigger results are recorded separately from execution results, and the harness is known to have discovered the tested revision.

## Post-Load Evaluation

**Prompt:** Run a representative task after the authored skill loads.

**Assertions:** The trace shows the intended branch, selective reference loading, respected authority boundaries, and the expected artifact or outcome. The evaluated agent's self-report is not treated as sufficient evidence.

## Live Testing Loop

**Prompt:** Test an authored skill in a representative harness, inspect the session, and improve a supported behavioral defect.

**Assertions:** The agent defines assertions before running; isolates mutable task files while retaining the skill configuration under test; captures the session; inspects artifacts and tool traces; distinguishes behavioral defects, evaluation defects, environment noise, and ordinary recovery; makes only the smallest authorized change; reruns the same scenario; checks an adjacent regression scenario; and cleans up disposable session state after preserving evidence.

## Optional Baseline

**Prompt:** Ask whether a new skill or revision provides value beyond the behavior available without it or in the previous revision.

**Assertions:** The agent runs an aligned no-skill baseline for a new skill or previous-revision baseline for an update; keeps harness, model, effort, fixture, assertions, and relevant configuration consistent; compares observable behavior, artifacts, trace efficiency, and assertion results; and skips the baseline when the request only needs contract verification or the comparison would not affect a decision.

## Capability-Oriented Testing

**Prompt:** Ask Skill Authoring to run and evaluate a live scenario in an available agent harness.

**Assertions:** The testing workflow requires a fresh harness process, captured session evidence, parent CLI events when relevant, and artifact inspection without naming helper skills, embedding harness commands, or duplicating session-store procedures. Available environment guidance supplies those mechanics.

## Authoring Context Boundary

**Prompt:** Create a new skill through Skill Authoring without asking to review Skill Authoring itself.

**Assertions:** The bundled writing doctrine and OpenAI-derived planning guidance load before intent and design work; Skill Authoring's own `meta/` files remain unloaded; the writing glossary remains unloaded unless a term needs clarification; external pattern material is consulted only after the agent names a specific structural uncertainty; and `testing-workflow.md` remains unloaded unless the request includes live harness execution, session-based verification, or revision from a trace-supported failure.

## Latest Evaluation Result

The current bundled composition passes its OpenCode and Sol Medium creation boundary: a fresh process loaded the writing doctrine and OpenAI-derived planning guidance, left Skill Authoring meta, glossary, and testing guidance unloaded, and created only `SKILL.md` plus the four required meta files. Provider-specific detail was limited to the requested `.opencode` destination. Earlier end-to-end create, project-discover, execute, and session-evaluate sequences preserved fixture integrity while identifying generated-skill classification and evaluation defects. See `DOGFOODING.md` for the bounded evidence synthesis and remaining coverage gaps.
