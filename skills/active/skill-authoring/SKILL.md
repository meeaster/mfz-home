---
name: skill-authoring
description: Design, create, revise, review, or evaluate an agent skill as a behavior-driven package. User-invoked.
disable-model-invocation: true
argument-hint: "What skill are you authoring, reviewing, or evaluating?"
---

# Skill Authoring

**Authoring** turns intended agent behavior into a skill package that can be understood, evaluated, and maintained.

Before doing skill work, read [`references/writing-great-skills.md`](references/writing-great-skills.md) and [`references/openai-skill-creation.md`](references/openai-skill-creation.md). Treat the first as the runtime writing doctrine and the second as agent-agnostic planning guidance. Follow the doctrine's `writing-great-skills-glossary.md` pointer only when a term needs its full meaning.

During ordinary authoring, runtime context consists of this `SKILL.md` and the references whose conditions fire. Read Skill Authoring's own `meta/` documents only when Skill Authoring itself is the skill being reviewed, evaluated, or maintained.

## 1. Orient

Classify the work and its authorized outcome:

- **Create or revise** — implementation is authorized.
- **Review, diagnose, or evaluate** — return findings and recommendations while preserving files unless the user separately requests changes.
- **Design** — produce a proposed package or structure; write files only when the user requests implementation.
- **Maintain** — determine from the request whether the outcome is assessment or implementation.

Inspect the destination's instructions and the existing package when one exists. Read `meta/VISION.md`, `meta/EVALS.md`, `meta/MAINTENANCE.md`, `meta/LOG.md`, and any additional meta artifact owned by that package before assessing or changing an existing skill.

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

For a revision, classify the change as narrow tuning or intentional redesign. Reconcile the proposed direction with `meta/VISION.md`; surface a conflict instead of silently changing the contract.

Resolve factual uncertainty through available evidence. Proceed with a stated assumption when it is reversible and leaves the behavioral contract unchanged. Ask the user when an unresolved choice would change invocation, intended behavior, human authority, portability, or another consequential boundary.

Complete this phase when the behavior is specific enough to evaluate without reading the proposed implementation.

## 3. Shape The Runtime Skill

Design from the behavior before selecting a familiar form. Decide what belongs in steps, in-skill reference, disclosed reference, scripts, and harness metadata. Keep machine-, workspace-, and project-specific assumptions out unless the skill deliberately targets that environment and declares the boundary.

Use the bundled planning guidance to match freedom to fragility and plan reusable scripts, references, assets, or harness metadata. Its examples inform intent; they do not replace the user's behavioral contract.

Use a preliminary structure directly when its fit is clear. Consult examples or external pattern material only after naming a structural uncertainty or at least two plausible forms that need comparison. Patterns are evidence, not a taxonomy.

Complete this phase when every proposed runtime element has a reason to exist and a deliberate place in the information hierarchy.

## 4. Build Or Assess The Package

For authorized implementation, create or update this package:

```text
<skill>/
├── SKILL.md
└── meta/
    ├── VISION.md
    ├── EVALS.md
    ├── MAINTENANCE.md
    └── LOG.md
```

Add `agents/`, `references/`, and `scripts/` only when the skill needs them. Follow destination-specific metadata conventions. Keep ordinary reference filenames lowercase and descriptive, and keep `references/` flat unless grouping provides a real navigation or maintenance boundary.

Every skill gets all four `meta/` documents. Make each one meaningful and proportional: a one-line orchestrator may need only a short paragraph per file, while a consequential workflow may need substantial detail. Keep `meta/` outside ordinary runtime context.

- `VISION.md` owns intended behavior, boundaries, and success.
- `EVALS.md` owns reusable scenarios and observable assertions, including invocation and post-load behavior where applicable.
- `MAINTENANCE.md` owns skill-specific dependencies, provenance, refresh procedures, verification, and environment assumptions. Keep it specific to the authored skill; do not copy or reference this authoring process or its bundled writing doctrine.
- `LOG.md` owns selected behavioral decisions, observed effects, and reversals rather than ordinary textual history.

These artifacts are distinct projections of one behavioral contract. They may deliberately restate behavior from `SKILL.md` or one another in the form their role requires; that is coherence, not duplication. Prune copied doctrine and repeated explanatory prose, not role-specific statements of intent, observable assertions, upkeep, or rationale.

For assessment, inspect the same package for coherence and return proposed changes without modifying files. Treat missing or contradictory artifacts as findings rather than silently creating them.

Complete this phase when the implemented package is coherent or the assessment accounts for every relevant package artifact.

## 5. Prune, Test, And Evaluate

Apply the bundled writing doctrine's pruning tests sentence by sentence to runtime instructions and references. For meta artifacts, remove material that does not serve the artifact's role while preserving role-specific restatements of the behavioral contract. Remove no-ops, stale material, accidental runtime context, weak pointers, and unjustified forms. Sharpen completion criteria where a step could finish prematurely.

Evaluate two surfaces separately when they apply:

- **Invocation:** realistic prompts select a model-invoked skill without naming or preloading it.
- **Execution:** after loading, the skill follows its intended branches, opens only relevant references, respects authority boundaries, and produces the expected observable behavior.

Record the model, harness, configuration, skill revision, and limitations of observed results. Prefer traces and artifacts over the evaluated agent's self-report.

When the user asks to execute a live harness scenario, verify runtime behavior from a session, or revise from a trace-supported failure, follow [`references/testing-workflow.md`](references/testing-workflow.md). Static package validation and writing evaluation scenarios use the instructions in this file without loading that reference. For a live run, test in an isolated workspace, inspect the captured session, classify the evidence, and rerun the same scenario after the smallest authorized change. State the capability needed and let available environment guidance supply harness execution and session-inspection mechanics. Keep assessment non-mutating when implementation is not authorized.

Complete this phase when every applicable scenario has a result or an explicit untested status and every remaining sentence is behaviorally justified.

## 6. Hand Off

For implementation, present the created or changed files, behavioral rationale, validation performed, unresolved uncertainty, and any installation or promotion work still requiring approval.

For assessment, present prioritized findings, recommendations, expected value, and uncertainty. Keep recommendations separate from approved changes.

Keep environment-specific activation procedures in the owning environment rather than the portable skill package.

Complete authoring when another maintainer can understand what the skill should do, why it has its current shape, how to test it, and how to change it safely.
