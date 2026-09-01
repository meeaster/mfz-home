# Skill Authoring Evaluations

Evaluate behavior, not resemblance to a preferred template. Record the skill revision, model, harness, relevant configuration, observable result, and limitations for each run.

## Shared Assertions

Every scenario confirms that:

- the `writing-for-agents` skill and OpenAI-derived planning guidance are loaded before skill work begins;
- the requested mode and authorized outcome are established;
- files are modified only when implementation is authorized;
- every applicable runtime and authoring record artifact agrees with `SKILL.md`.

## Create From A Sparse Brief

**Prompt:** Ask for a skill with only a goal and rough use case.

**Assertions:** The agent establishes intended behavior and genuine ambiguities before choosing a form; resolves available facts through legwork; asks about unresolved consequential choices while stating reversible assumptions; creates all four meaningful authoring record documents; and avoids inventing unsupported environment assumptions.

## Create From Rich Evidence

**Prompt:** Supply notes, repository material, or prior interactions describing a desired process.

**Assertions:** The agent extracts durable behavior, identifies uncertainty, and keeps incidental evidence out of runtime instructions while preserving useful provenance in the record's `MAINTENANCE.md` or rationale in `LOG.md`.

## Revise An Existing Skill

**Prompt:** Request a behavioral change to a skill with an existing authoring record.

**Assertions:** The agent reads all package artifacts, classifies tuning versus redesign, reconciles the change with `VISION.md`, updates affected evaluations and maintenance guidance, and records a consequential decision in `LOG.md`.

## Preserve A Novel Shape

**Prompt:** Request behavior poorly represented by a phased skill, router, reference skill, or thin orchestrator.

**Assertions:** The agent derives a fitting structure from behavior and does not force one of the known skeletons merely because it is available.

## Apply Bundled Planning Guidance

**Prompt:** Request a new skill or an intentional redesign whose behavior needs concrete examples, a freedom decision, or reusable resources.

**Assertions:** The agent uses `openai-skill-creation.md` for examples, degrees of freedom, and resource planning, keeps Skill Authoring responsible for the lifecycle contract, and does not introduce provider-specific mechanics without a destination requirement.

## Keep A Small Skill Small

**Prompt:** Create a one-line orchestrator or similarly compact skill.

**Assertions:** All four record documents contain useful information without expanding into generic boilerplate; `MAINTENANCE.md` contains only skill-specific upkeep rather than copied or referenced authoring doctrine; `SKILL.md` remains proportionate.

## Default Package-Local Record

**Prompt:** Create a skill in an environment with no explicit record location or configured authoring record root.

**Assertions:** The agent creates `<skill>/meta` with the four standard documents, does not invent an external store, and keeps those documents out of ordinary runtime context.

## Configured External Record

**Prompt:** Create or revise a skill while applicable environment guidance supplies only an authoring record root.

**Assertions:** The agent derives `<root>/<repository-name>/skills/<skill-name>`, writes `TARGET.md` and the four standard documents there, creates no package-local `meta/`, and introduces no dependency on the system that supplied the root.

## External OpenCode Command Record

**Prompt:** Create or revise an OpenCode command while applicable environment guidance supplies an authoring record root.

**Assertions:** The agent derives `<root>/<repository-name>/opencode-commands/<command-name>`, keeps the runtime command single-file, writes `TARGET.md` and the four standard documents only to the external record, and does not expose development files through command discovery.

## Unsafe Command Record Location

**Prompt:** Explicitly select an authoring record location that OpenCode could render or discover as a command.

**Assertions:** The agent rejects the unsafe location and requests a safe alternative; explicit placement does not override the runtime-context boundary.

## Conflicting Records

**Prompt:** Revise an artifact when both its configured external record and a package-local record exist.

**Assertions:** The agent reports the competing records and obtains an authoritative-location decision instead of merging, moving, or updating both silently.

## Choose An OpenCode Command

**Prompt:** Request a compact OpenCode workflow that should run only through an explicit slash command.

**Assertions:** The agent loads `opencode-commands.md`; chooses one command Markdown file rather than a model-discoverable skill package; treats the body as the prompt template and the relative filename as the slash name; sets `subtask: false` unless a fresh context is an explicit behavioral requirement; uses only needed command metadata and substitutions; resolves one safe authoring record; and verifies explicit invocation without applying model-invocation assertions.

## Keep Skill Behavior In A Skill

**Prompt:** Request OpenCode behavior that the model must discover autonomously or that needs packaged supporting resources.

**Assertions:** The agent retains a skill package rather than collapsing it into a command, even when a slash invocation would also be convenient, and leaves `opencode-commands.md` unloaded unless a command is genuinely under consideration.

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

## Subagent Prompt Neutrality

**Prompt:** Give a worker an ordinary implementation or review request in an isolated workspace without naming the skill.

**Assertions:** The prompt contains the requested outcome and operational safety boundaries only. It does not prohibit implementation choices, prescribe abstractions, require tests or tools, or state the principles being evaluated. The worker's choices are judged from artifacts, diffs, traces, and verification rather than its explanation.

## Staged Subagent Evaluation

**Prompt:** Have one worker implement a first version, then have a fresh worker continue the same isolated workspace after a normal follow-up requirement.

**Assertions:** The first and second sessions are independently captured; the follow-up request is not a coaching prompt; the combined diff shows whether structure changed when real variation arrived; existing files and user artifacts remain within scope; and the result is compared against the assertions for both stages.

## Complexity And Variation Coverage

**Prompt:** Evaluate the skill with small, medium, and high-complexity requests, including direct work, existing code, persisted state, ambiguous requirements, and feature-rich requests.

**Assertions:** The scenario set measures proportionality across complexity rather than rewarding one preferred implementation size. The agent chooses its own tests, tools, abstractions, and verification. Results record when complexity was justified, deferred, or excessive.

## Subagent Baseline And Causality

**Prompt:** Compare a skill-loaded run with a no-skill or previous-revision run when the question is incremental value.

**Assertions:** The paired runs use the same fixture, request, model, harness, effort, configuration, and observable assertions. Differences are classified as skill effect, model variance, environment noise, evaluation defect, or inconclusive evidence; self-reported skill use is not treated as proof.

## Optional Baseline

**Prompt:** Ask whether a new skill or revision provides value beyond the behavior available without it or in the previous revision.

**Assertions:** The agent runs an aligned no-skill baseline for a new skill or previous-revision baseline for an update; keeps harness, model, effort, fixture, assertions, and relevant configuration consistent; compares observable behavior, artifacts, trace efficiency, and assertion results; and skips the baseline when the request only needs contract verification or the comparison would not affect a decision.

## Capability-Oriented Testing

**Prompt:** Ask Skill Authoring to run and evaluate a live scenario in an available agent harness.

**Assertions:** The testing workflow requires a fresh harness process, captured session evidence, parent CLI events when relevant, and artifact inspection without naming helper skills, embedding harness commands, or duplicating session-store procedures. Available environment guidance supplies those mechanics.

## Authoring Context Boundary

**Prompt:** Create a new skill through Skill Authoring without asking to review Skill Authoring itself.

**Assertions:** The `writing-for-agents` skill and OpenAI-derived planning guidance load before intent and design work; Skill Authoring's own authoring record remains unloaded; `opencode-commands.md` remains unloaded unless the target is or may be an OpenCode command; external pattern material is consulted only after the agent names a specific structural uncertainty; and `testing-workflow.md` remains unloaded unless the request includes live harness execution, session-based verification, or revision from a trace-supported failure.

## Latest Evaluation Result

The previous composition passed its OpenCode and Sol Medium creation boundary: a fresh process loaded `writing-for-agents` and OpenAI-derived planning guidance, left Skill Authoring's record and testing guidance unloaded, and created `SKILL.md` plus the four required package-local record files. Provider-specific detail was limited to the requested `.opencode` destination.

External-root creation and reuse passed on 2026-08-07 in two fresh OpenCode 1.18.14 sessions using Luna High and `--auto`. Creation in an isolated Git repository wrote only `SKILL.md` into the target package and derived the expected external record from the configured root, repository basename, `skills` kind, and declared skill name. A second fresh session received no record path, read `TARGET.md`, `VISION.md`, `EVALS.md`, `MAINTENANCE.md`, and `LOG.md` before editing, then coherently updated the runtime artifact and four affected record files. A non-auto preflight derived the same path but could not write outside the fixture because noninteractive permission prompts were rejected; this was environment noise rather than a routing defect. OpenCode command routing and competing-record handling remain statically specified but not live-tested. Earlier end-to-end create, project-discover, execute, and session-evaluate sequences preserved fixture integrity while identifying generated-skill classification and evaluation defects. See `DOGFOODING.md` for the bounded evidence synthesis and remaining coverage gaps.
