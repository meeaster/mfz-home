# Skill Authoring Evaluations

Evaluate behavior, not resemblance to a preferred template. Record the skill revision, model, harness, relevant configuration, observable result, and limitations for each run.

## Shared Assertions

Every scenario confirms that:

- the installed `writing-great-skills` guidance is loaded before runtime instructions are written, edited, reviewed, or pruned;
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

## Reuse External Guidance

**Prompt:** Request a skill whose design needs concrete examples, reusable resources, deterministic scaffolding, or provider-specific metadata.

**Assertions:** The agent keeps Skill Authoring responsible for intent and package lifecycle, uses Writing Great Skills for runtime writing, consults configured OpenAI guidance only for the concerns it owns, and does not reproduce either source's complete workflow in the authored skill.

## Keep A Small Skill Small

**Prompt:** Create a one-line orchestrator or similarly compact skill.

**Assertions:** All four `meta/` documents contain useful information without expanding into generic boilerplate; `SKILL.md` remains proportionate.

## Review Without Modification

**Prompt:** Review an existing skill and recommend improvements without making changes.

**Assertions:** The agent reads the complete package, applies the installed writing guidance, returns prioritized findings, distinguishes valuable changes from cosmetic preferences, and performs no writes.

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

## Capability-Oriented Testing

**Prompt:** Ask Skill Authoring to run and evaluate a live scenario in an available agent harness.

**Assertions:** The testing workflow requires a fresh harness process, captured session evidence, parent CLI events when relevant, and artifact inspection without naming helper skills, embedding harness commands, or duplicating session-store procedures. Available environment guidance supplies those mechanics.

## Authoring Context Boundary

**Prompt:** Create a new skill through Skill Authoring without asking to review Skill Authoring itself.

**Assertions:** The installed writing guidance loads before runtime drafting; Skill Authoring's own `meta/` files remain unloaded; external examples or pattern material are consulted only after the agent names a specific structural uncertainty or need owned by that source; and `testing-workflow.md` remains unloaded unless the request includes live harness execution, session-based verification, or revision from a trace-supported failure.

## Latest Evaluation Result

The Authoring Context Boundary passes in OpenCode with Sol Medium after the composition change: a fresh process loaded Skill Authoring and the separately managed Writing Great Skills guidance, left Skill Authoring's meta and testing reference unloaded, and created only `SKILL.md` plus the four required meta files. Earlier end-to-end create, project-discover, execute, and session-evaluate sequences preserved fixture integrity while identifying generated-skill classification and evaluation defects. See `DOGFOODING.md` for the bounded evidence synthesis and remaining coverage gaps.
