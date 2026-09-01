---
name: skill-authoring
description: Design, create, revise, review, or evaluate an agent skill or explicit command from intended behavior. User-invoked.
disable-model-invocation: true
argument-hint: "What skill or command are you authoring, reviewing, or evaluating?"
---

# Skill Authoring

**Authoring** turns intended agent behavior into a skill or explicit command that can be understood, evaluated, and maintained.

Before doing authoring work, load the `writing-for-agents` skill and read [`references/openai-skill-creation.md`](references/openai-skill-creation.md). The first owns runtime writing quality; the second provides agent-agnostic planning guidance. When authoring a skill, follow `writing-for-agents`'s pointer to `SKILL-MECHANICS.md` for skill packaging, invocation, and router guidance. When the requested artifact is an OpenCode command, read [`references/opencode-commands.md`](references/opencode-commands.md) for its distinct mechanics.

During ordinary authoring, runtime context consists of this `SKILL.md` and the references whose conditions fire. Read Skill Authoring's own authoring record only when Skill Authoring itself is being reviewed, evaluated, or maintained.

## 1. Orient

Classify the work and its authorized outcome:

- **Create or revise** — implementation is authorized.
- **Review, diagnose, or evaluate** — return findings and recommendations while preserving files unless the user separately requests changes.
- **Design** — produce a proposed package or structure; write files only when the user requests implementation.
- **Maintain** — determine from the request whether the outcome is assessment or implementation.

Inspect the destination's instructions and the existing artifact or package. Resolve exactly one **authoring record** before assessing or changing it:

1. Use a location explicitly selected by the user.
2. Otherwise, when applicable environment guidance declares an authoring record root, derive `<root>/<repository-name>/<artifact-kind>/<artifact-name>`. Use the Git root basename as `repository-name`, `skills` or `opencode-commands` as `artifact-kind`, and the declared skill name or logical slash-command name as `artifact-name`.
3. Otherwise, use `<skill>/meta` for a skill or a destination-owned `meta/` directory beside an unrendered command source package. If a command is only a runtime file and has no safe development package, ask for a record location rather than writing development Markdown into its command-discovery tree.

An external record also contains `TARGET.md` with the repository identity, artifact kind, and source path. Applicable guidance needs to supply only the root; this skill owns the structure beneath it. If local and external records both exist or target identity is ambiguous, surface the conflict instead of merging, moving, or choosing silently.

For an OpenCode command, reject any selected record location that could be rendered or discovered as a command. An explicit location or configured root changes placement, not this runtime boundary.

Read `VISION.md`, `EVALS.md`, `MAINTENANCE.md`, `LOG.md`, and any additional artifact in the resolved record before assessing or changing an existing target.

Use the evidence available in the current environment: the user's brief, existing files, repository documentation, prior interactions, traces, or supplied notes. Treat evidence as input to the process, not text to copy into runtime instructions.

Complete this phase when the requested mode, authorized outcome, destination conventions, available evidence, and existing package state are known.

## 2. Fix The Intent

Define the behavior independently from its current prose:

- the problem and intended outcome;
- users and invocation mode;
- concrete positive, negative, and adjacent examples;
- distinct branches and important variation;
- human authority and approval boundaries;
- portability expectations and declared skill dependencies;
- non-goals and failure conditions.

For a revision, classify the change as narrow tuning or intentional redesign. Reconcile the proposed direction with the authoring record's `VISION.md`; surface a conflict instead of silently changing the contract.

Resolve factual uncertainty through available evidence. Proceed with a stated assumption when it is reversible and leaves the behavioral contract unchanged. Ask the user when an unresolved choice would change invocation, intended behavior, human authority, portability, or another consequential boundary.

Complete this phase when the behavior is specific enough to evaluate without reading the proposed implementation.

## 3. Shape The Runtime Artifact

Design from the behavior before selecting a familiar form. Choose a skill when the model or another skill must discover and load the behavior, or when supporting resources need to travel with it. Choose an OpenCode command when the behavior should run only after explicit human slash invocation and fits a single prompt-template file; this is the OpenCode counterpart of a user-invoked Claude Code skill, not a model-discoverable skill. Decide what belongs in steps, in-artifact reference, disclosed reference, scripts, and harness metadata. Keep machine-, workspace-, and project-specific assumptions out unless the artifact deliberately targets that environment and declares the boundary.

Use the bundled planning guidance to match freedom to fragility and plan reusable scripts, references, assets, or harness metadata. Its examples inform intent; they do not replace the user's behavioral contract.

Use a preliminary structure directly when its fit is clear. Consult examples or external pattern material only after naming a structural uncertainty or at least two plausible forms that need comparison. Patterns are evidence, not a taxonomy.

Complete this phase when every proposed runtime element has a reason to exist and a deliberate place in the information hierarchy.

## 4. Build Or Assess The Package

For an authorized skill implementation, create or update the runtime package:

```text
<skill>/
└── SKILL.md
```

Add `agents/`, `references/`, and `scripts/` only when the skill needs them. Follow destination-specific metadata conventions. Keep ordinary reference filenames lowercase and descriptive, and keep `references/` flat unless grouping provides a real navigation or maintenance boundary.

Every maintained skill or OpenCode command gets an authoring record with all four documents below. Make each one meaningful and proportional: a one-line orchestrator may need only a short paragraph per file, while a consequential workflow may need substantial detail. Keep the record outside ordinary runtime context and in the single location resolved during orientation.

- `VISION.md` owns intended behavior, boundaries, and success.
- `EVALS.md` owns reusable scenarios and observable assertions, including invocation and post-load behavior where applicable.
- `MAINTENANCE.md` owns skill-specific dependencies, provenance, refresh procedures, verification, and environment assumptions. Keep it specific to the authored skill; do not copy or reference this authoring process or its bundled writing doctrine.
- `LOG.md` owns selected behavioral decisions, observed effects, and reversals rather than ordinary textual history.

An external record's `TARGET.md` identifies the target but does not replace repository inspection. Package-local records do not need it because their target is implicit.

These artifacts are distinct projections of one behavioral contract. They may deliberately restate behavior from `SKILL.md` or one another in the form their role requires; that is coherence, not duplication. Prune copied doctrine and repeated explanatory prose, not role-specific statements of intent, observable assertions, upkeep, or rationale.

For an authorized OpenCode command implementation, create or update one runtime `.md` file in the destination's command directory. Its body is the prompt template and its filename or relative path becomes the slash-command name. Set `subtask: false` unless the command deliberately needs a fresh context separate from the main session. Keep behavior that needs model discovery, supporting files, or reusable cross-skill reference in a skill instead. Keep its authoring record outside the rendered command and do not turn development metadata into command runtime context.

For assessment, inspect the runtime artifact and resolved authoring record for coherence, then return proposed changes without modifying files. Treat missing or contradictory material as findings rather than silently creating it.

Complete this phase when the implementation is coherent or the assessment accounts for every relevant runtime and development artifact.

## 5. Prune, Test, And Evaluate

Apply `writing-for-agents`'s pruning tests sentence by sentence to runtime instructions and references. For authoring record artifacts, remove material that does not serve the artifact's role while preserving role-specific restatements of the behavioral contract. Remove no-ops, stale material, accidental runtime context, weak pointers, and unjustified forms. Sharpen completion criteria where a step could finish prematurely.

Evaluate two surfaces separately when they apply:

- **Invocation:** realistic prompts select a model-invoked skill without naming or preloading it.
- **Explicit invocation:** a user invokes a user-invoked skill or command by name, arguments expand as intended, and ordinary prompts do not invoke it accidentally.
- **Execution:** the invoked artifact follows its intended branches, opens only relevant references, respects authority boundaries, and produces the expected observable behavior.

Record the model, harness, configuration, artifact revision, and limitations of observed results. Prefer traces and artifacts over the evaluated agent's self-report.

When the user asks to execute a live harness scenario, verify runtime behavior from a session, or revise from a trace-supported failure, follow [`references/testing-workflow.md`](references/testing-workflow.md). Static package validation and writing evaluation scenarios use the instructions in this file without loading that reference. For a live run, test in an isolated workspace, inspect the captured session, classify the evidence, and rerun the same scenario after the smallest authorized change. State the capability needed and let available environment guidance supply harness execution and session-inspection mechanics. Keep assessment non-mutating when implementation is not authorized.

Complete this phase when every applicable scenario has a result or an explicit untested status and every remaining sentence is behaviorally justified.

### Evaluate With Subagents

Use subagents when independent implementation work, fresh context, or a staged change will produce stronger evidence than one continuous run.

- Prompt the task as a normal user would. State the requested outcome, relevant context, and only operational guardrails such as an isolated workspace, no credentials, and no real external side effects.
- Do not name the skill, prescribe its principles, prohibit specific implementation choices, or require particular tests, tools, abstractions, or verification commands when those choices are part of the behavior under evaluation.
- Keep the fixture, harness, model, effort, skill revision, and assertions aligned when comparing runs. Change one evaluation variable at a time.
- Use a fresh subagent for an independent run. For a staged scenario, let the first subagent establish the starting implementation, then give a second subagent an ordinary follow-up request in the same isolated workspace. Inspect the combined diff and each session rather than treating the second agent's summary as proof.
- Vary task complexity and requirement shape. Include small direct changes, ambiguous or feature-rich requests, existing code, persisted data, and follow-up requirements that create real variation.
- Let the agent choose whether tests, type checks, benchmarks, schemas, abstractions, or other verification are warranted. Judge the resulting evidence, not compliance with a test script embedded in the prompt.
- Inspect artifacts, diffs, command traces, and preserved files. Record what the agent did, what it avoided, and whether the behavior matches the scenario's observable assertions.
- Treat self-reported skill use as a claim, not evidence. Confirm loading from the trace when invocation behavior matters, and confirm execution from artifacts and commands.
- Classify findings as skill benefit, skill harm, model variance, evaluation defect, environment noise, or inconclusive evidence. Revise the skill only for a supported steering defect, then rerun the same scenario and an adjacent regression scenario.

## 6. Hand Off

For implementation, present the created or changed files, behavioral rationale, validation performed, unresolved uncertainty, and any installation or promotion work still requiring approval.

For assessment, present prioritized findings, recommendations, expected value, and uncertainty. Keep recommendations separate from approved changes.

Keep environment-specific activation procedures in the owning environment rather than the portable skill package.

Complete authoring when another maintainer can understand what the artifact should do, why it has its current shape, how to test it, and how to change it safely.
