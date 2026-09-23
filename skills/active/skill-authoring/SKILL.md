---
name: skill-authoring
description: Design, create, revise, review, or evaluate an agent skill or explicit command from intended behavior. User-invoked.
disable-model-invocation: true
metadata:
  opencode/autoinvoke: false
argument-hint: "What skill or command are you authoring, reviewing, or evaluating?"
---

# Skill Authoring

Turn intended agent behavior into useful, economical instructions. Runtime content serves the agent; its organization also lets the human inspect what it asks the agent to do. Preserve intent and maintenance knowledge that would be costly to reconstruct.

## Use the authoring guidance

Skill Authoring owns the local authoring process and writing preferences. Writing for Agents supplies supporting guidance on organization, references, and pruning.

- Load `writing-for-agents` and read [planning guidance](references/openai-skill-creation.md) before authoring work.
- Apply the local writing policy below where it differs from Writing for Agents. Keep local preferences here rather than editing a vendored dependency to encode them.
- Follow Writing for Agents' `SKILL-MECHANICS.md` pointer for packaging concepts. Verify version-sensitive mechanics against the destination harness; distinguish automatic discovery from explicit invocation and named workflow access.
- Read [OpenCode command mechanics](references/opencode-commands.md) when a command is the target or a genuine candidate.
- Read Skill Authoring's own record only when assessing or changing Skill Authoring itself, using the same selective-loading rules as for any target.

### OpenCode invocation

- For OpenCode V2 skills that should not be automatically selected, set `metadata: { opencode/autoinvoke: false }` in `SKILL.md` frontmatter. Do not rely on `disable-model-invocation: true` or description wording to control OpenCode discovery.
- This setting hides the skill from the model's available list while preserving registration and explicit loading by ID, including named access from a workflow. It is not a permission boundary. Keep any human-only invocation rule explicit in the skill's behavior.
- Control interactive visibility separately: keep `slash: true` or its default for a user-facing skill; use `slash: false` only when it should also be absent from command catalogs. Retain other harnesses' invocation metadata when they are targets.
- Verify version-sensitive behavior against the [OpenCode V2 skills guide](https://opencode.ai/v2/docs/skills). These destination mechanics qualify the broader invocation claims in Writing for Agents.

## Establish intent and authority

The user's intended outcome determines both the work and its authority. A suggested implementation detail does not automatically become a requirement.

- For creation or revision, implement within the request. For review, diagnosis, evaluation, or design, return findings or proposals unless changes are also authorized. Clarify ambiguous maintenance requests.
- Inspect the target and destination instructions. Establish the problem, desired outcome, invocation, representative uses, important variation, authority boundaries, and failure conditions.
- Use available evidence before asking questions. State reversible assumptions and ask about unresolved choices that change the behavioral contract.
- Distinguish tuning from redesign. Reconcile consequential changes with human intent and the target's authoring principles.

### Resolve the authoring record

One record preserves the target's authoring intent outside ordinary runtime loading. Resolve its location in this order:

1. Use the user's selected location.
2. Otherwise, if environment guidance declares a record root, derive `<root>/<repository-name>/<artifact-kind>/<artifact-name>`. Use the Git root basename, `skills` or `opencode-commands`, and the declared skill name or logical command name.
3. Otherwise, use `<skill>/meta` or a destination-owned `meta/` beside an unrendered command source package. Ask for a safe location if a command has only a runtime file.

- For external records, verify `TARGET.md` identifies the repository, artifact kind, and source path. Create it when establishing an external record.
- Surface competing local and external records or ambiguous identities for a user decision.
- Keep command records outside rendered command-discovery paths, including when the user selects the location.

### Load by relevance

Load enough context to understand the affected behavior and its rationale. Existing files do not all need to enter the authoring session.

- Start with the target's runtime instructions and its record's `PRINCIPLES.md` and `VISION.md`, when present. Read principles before proposing changes.
- For narrow revisions, read affected scenarios and references. For dependency refreshes, read relevant maintenance guidance and source changes.
- For regressions or unexplained constraints, inspect related evidence and historical rationale. For a full assessment or redesign, review the broader relevant package for coherence and coverage.
- Search headings or relevant terms before reading a large record in full. Expand when a conflict, dependency, or unexplained constraint could affect the decision.
- Treat missing optional records as acceptable. Authoring records guide changes to the skill, not ordinary execution of the target skill.

## Write for the agent and human inspection

Every runtime passage should help the agent interpret or execute the task. Human readability makes those instructions easier to inspect and maintain; it does not justify explanatory filler.

- Group related guidance under focused topic headings. Choose the form that makes the instructions easiest to understand and inspect: short prose for context and rationale, bullets for independently applicable rules, tables for comparisons or repeated relationships, and numbered lists for order or dependencies. Combine forms where useful rather than forcing one throughout.
- Omit an introduction when the heading and bullets are sufficient. Avoid repeating the same meaning in prose and bullets.
- Make each bullet express an independently understandable action, constraint, exception, or check. Keep qualifications beside the rule they change.
- Treat prose as behavior-bearing context too. Make explicit requirements easy to locate in bullets without pretending that only bullets influence the agent.
- Use clear wording to distinguish requirements, defaults, and discretionary choices. Add labels only when they resolve ambiguity.
- Preserve concrete meaning when shortening text. Use familiar terms when their meaning is clear; keep explicit criteria when a compressed keyword would hide them.
- Use numbered steps when order matters. Give genuine steps observable completion conditions where needed; topic sections do not each require a step or repeated completion statement.
- Keep tables, examples, and code blocks when they communicate the relevant relationship or execution detail better than prose and bullets. Examples should not silently become mandatory output templates.
- Prefer direct descriptions of desired behavior. Use explicit prohibitions when they communicate a necessary boundary clearly.
- Treat claims about prompting mechanisms, such as effects of negation, keywords, or hidden later steps, as model-dependent hypotheses unless supported by relevant evidence.

## Shape the artifact to its purpose

Choose the form and degree of prescription from the behavior being authored. Structure and additional resources should earn their place through a useful effect.

- Use a skill for model discovery, reusable cross-skill guidance, or packaged resources. Use an OpenCode command for a slash-invoked workflow that fits one prompt-template file; set `subtask: false` unless fresh context is intentional.
- Write the smallest effective instructions. Preserve deliberate user preferences and necessary context; question general advice that the configured model already follows.
- Match constraints to the cost of variance. Leave judgment open where several approaches are valid; prescribe methods when the accepted task needs repeatability or a particular boundary.
- Add scripts, references, assets, or harness metadata only when execution needs them. Put branch-specific detail behind explicit reading conditions.
- Keep ordinary reference filenames lowercase and descriptive. Keep directories flat unless grouping provides a real boundary. Consult patterns only to resolve a named structural uncertainty.
- Keep portable behavior free of undeclared machine assumptions. Declare the boundary of deliberately environment-specific artifacts.
- For assessment, return evidence-backed findings without repairs. For implementation, update the runtime artifact and affected record content; a change does not require touching every file.

## Preserve the next author's context

Records preserve accepted intent and consequential authoring choices. Each file has a distinct job, and routine edit history can remain in Git.

- Require `PRINCIPLES.md` for every skill record, including small skills. Create it for a new skill or when next revising an existing skill that lacks it; migrate only the target. In a read-only assessment, report the gap without creating it. Explicit-command records may use this form but are not required to.
- Keep `VISION.md` for purpose, intended outcomes, and scope boundaries.
- Keep `PRINCIPLES.md` for concise, target-specific authoring priorities, tradeoffs, and their rationale. Extract accepted direction rather than inventing requirements. Move principles out of vision instead of duplicating them; keep procedures in runtime instructions.
- Treat principles as human-owned. Reconcile them when the user accepts a changed direction rather than treating earlier principles as immutable.
- Keep `EVALS.md` for concrete scenarios and observable expectations that distinguish success from plausible failure. Consolidate overlapping cases. Keep run results, session IDs, hashes, activation reports, and revision history out of this file.
- Keep principles in the resolved record, outside runtime discovery and ordinary skill loading. Beyond required principles and external identity, omit record documents that add no distinct value.
- Create `MAINTENANCE.md` only when an outside source materially influences the skill and upkeep needs that relationship explained. Record the source, adopted revision when applicable, intentional adaptations, and refresh considerations.
- Keep generic procedures with their owning authoring guidance and readily discoverable configuration with the environment.
- Preserve still-relevant rationale beside its concern. Create a separate decision record only for substantial reasoning future authors are likely to revisit. Do not require `LOG.md`, a replacement decision file, or an entry for every edit.
- Consult existing history when relevant and obtain authority before deleting or consolidating it. An authorized cleanup does not require another archive.
- Give additional evidence files a concrete purpose and reading condition. Keep substantial traces outside routine authoring context; retain restatement only when it adds a distinct decision, testable assertion, or maintenance fact.

## Check the change

Structural correctness, human inspectability, and model behavior are separate questions. Evidence for one does not establish the others.

- Check the target's principles and surface unresolved conflicts with the requested direction. Apply relevance, duplication, and default-behavior pruning with the local writing policy above.
- Compare a structural rewrite with the source by meaning, preserving scope, exceptions, authority, and discretion. Identify intentional behavior changes separately from presentation changes.
- Inspect whether each section's purpose and individual requirements are easy to locate. Treat improved human readability as a preference or human judgment, not something model scores alone establish.
- Check structure, links, and coherence for changed branches. For records, retain passages that help a future author decide or verify something.
- Evaluate invocation and execution separately when applicable: realistic positive and adjacent prompts for model discovery, explicit invocation and argument handling for commands, and observable outcomes after loading.
- When the task requires live execution, session-based verification, or revision from an observed failure, read [testing workflow](references/testing-workflow.md). Static review and writing scenarios do not require live runs.
- Report observed results with artifact or trace locators, the revision, model, harness, relevant configuration, and limitations. Verify self-reported success against available evidence and identify untested behavior.
- Create a separate durable results report only for an authorized concrete reuse need, not as a routine authoring record or substitute log.

## Complete the requested work

The handoff makes the result and remaining uncertainty visible. Environment guidance owns activation procedures.

- For implementation, report changed files, behavioral rationale, checks, unresolved uncertainty, and any activation or promotion still needed. For assessment, prioritize findings and distinguish recommendations from accepted changes.
- When commits are authorized, commit runtime changes and record changes in their owning repositories. Report both commit identifiers when both changed. Do not leave an accepted change half-committed or modify an accurate record merely to create a companion commit.
- Finish when the requested outcome is met, relevant behavior has evidence or an explicit untested status, and the record preserves what the next author needs without unrelated history.
