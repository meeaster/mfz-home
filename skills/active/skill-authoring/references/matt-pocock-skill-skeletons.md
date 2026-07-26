# Skeletons

Four common assemblies of the forms in [`matt-pocock-skill-patterns.md`](matt-pocock-skill-patterns.md). They are examples, not a complete taxonomy. Derive the structure from intended behavior first; use one only when its shape fits, then prune.

## Phased step-skill

For ordered work that closes each phase on a checkable bar (`diagnosing-bugs`, `setup-ts-deep-modules`). Choose invocation independently from the body shape.

```markdown
---
name: <leading-word>
description: <Essence.> Use when the user <trigger>, mentions "<phrase>", or <trigger>.
---

# <Title>

<Immediate orientation: essence, boundary, or first operation.>
<Skip-discipline preamble: the default is thorough; deviate only with reason.>

## Phase 1 — <name>

**This is the skill.** <Why this phase carries the rest.>

<The work.>

### Completion criterion — <one checkable line>

- [ ] <exhaustive, checkable bar>
- [ ] <…>

If you catch yourself <the rush>, stop — <the failure this phase prevents>.

## Phase 2 — <name>

<The work, ending on its own bar.>

Do not proceed until <criterion>.
```

## Reference-skill (all glossary)

For a shared vocabulary other skills lean on (`codebase-design`, `domain-modeling`). No steps — a flat peer-set. Make it model-invoked only when agents or other skills must discover it.

```markdown
---
name: <leading-word>
description: Shared vocabulary for <domain>. Use when the user wants to <task>, or when another skill needs the <domain> vocabulary.
---

# <Title>

<One line: what this vocabulary is for, and the instruction to use it exactly.>

## Glossary

Use these terms exactly — don't substitute <near-synonyms>.

**<Term>** — <definition>. _Avoid_: <synonym>, <synonym>.

**<Term>** — <definition>. _Avoid_: <synonym>.

## Principles

- **<Named principle>.** <One or two sentences.>
- **<The deletion test.>** <A checkable thought-experiment.>

## Relationships

- A **<Term>** has exactly one **<Term>**.
- A **<Term>** sits at a **<Term>**.
```

## Thin orchestrator

A whole skill that is one line firing others (`grill-me`, `grill-with-docs`, `implement`). User-invoked: it exists to give a composed path its own trigger.

```markdown
---
name: <leading-word>
description: <One human-facing line — what running this gets you.>
disable-model-invocation: true
---

Run a `/<other-skill>` session, using the `/<other-skill>` skill.
```

## Router

A user-invoked map over your other user-invoked skills, so the human remembers one name (`ask-matt`). It can only *name* them — it cannot fire a user-invoked skill.

```markdown
---
name: <leading-word>
description: Ask which skill or flow fits your situation. A router over the <set> skills.
disable-model-invocation: true
---

# <Title>

You don't remember every skill, so ask.

## The main flow: <start> → <end>

1. **`/<skill>`** — <when to start here>.
2. **Branch — <question>?**
   - **Yes** → **`/<skill>`** → **`/<skill>`**.
   - **No** → **`/<skill>`**.

## On-ramps

- **<Starting situation>** → **`/<skill>`**. <What it produces and where it merges.>

## Standalone

- **`/<skill>`** — <off the main flow entirely>.
```

## Other observed assemblies

Do not force these into the four skeletons above:

- **Branching artifact skill** — select a branch from the user's question, load only its reference, create or update a durable artifact, and define the handoff.
- **Environment-adapting setup skill** — inspect local conventions, preserve existing configuration, apply the smallest change, then prove the guardrail bites through intentional failure.
- **Frontier skill** — maintain a destination and low-resolution map, resolve the next uncertain frontier, and put detail in linked artifacts.
- **Round-based interview** — ask every currently answerable question, incorporate the answers, recompute dependencies, and begin another round.
- **Artifact loop** — re-read a shared artifact before every write, append or revise without losing human edits, and stop on an explicit review boundary.

New behavior may need a new assembly. The catalogue supplies comparison points, not permission.
