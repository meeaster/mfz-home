# Skill Patterns

**Source:** Matt Pocock's skills, [github.com/mattpocock/skills](https://github.com/mattpocock/skills), commit `ed37663` (2026-07-21), surveyed 2026-07-25.

The bundled [`writing-great-skills`](../writing-great-skills/DOCTRINE.md) doctrine names the **levers**: **predictability**, the two loads, the **information hierarchy**, **leading words**, and the **failure modes**. This catalogues observed forms those levers can take on the page.

Design behavior before selecting a form. Use the bundled doctrine for the governing principles; consult this catalogue when examples or structural alternatives would help. Compare applicable forms and adopt only what solves an identified problem. A form is evidence, not a requirement, and the catalogue is not an exhaustive taxonomy.

**Bold terms** belong to the doctrine's [`GLOSSARY.md`](../writing-great-skills/GLOSSARY.md) — look them up there.

## Frontmatter forms

- **Leading-word name.** Use a kebab-case name matching the folder and, when it fits, the concept repeated through the body: `tdd`, `prototype`, `wayfinder`. Some compact operational skills use a direct task name instead.
- **Two description shapes, one per invocation axis.** Model-invoked: essence first, then a trigger list, leading word front-loaded — `Test-driven development. Use when the user wants to build features test-first, mentions "red-green-refactor", or wants integration tests.` User-invoked: one human-facing line, triggers stripped, plus `disable-model-invocation: true` in the frontmatter.
- **One trigger per branch.** Synonyms renaming a single **branch** are **duplication** — collapse them, keep only genuinely distinct paths.
- **`argument-hint` when the skill consumes input** — `argument-hint: "What would you like to learn about?"` — so the human sees what to pass.
- **Harness sidecar.** When a target harness has separate metadata, treat it and `SKILL.md` as one invocation unit. Matt Pocock's current skills pair frontmatter with `agents/openai.yaml` and keep implicit-invocation policy aligned across harnesses.

## Opening forms

- **Immediate orientation.** Open with the purpose, boundary, or first operation the agent needs. An essence line is one option: *A prototype is **throwaway code that answers a question**.* Compact skills often begin directly with the work instead.
- **Name the crux.** When one phase carries the whole skill, say so and concentrate effort there: *"**This is the skill.** Everything else is mechanical."* — then *"Spend disproportionate effort here."*
- **Skip-discipline preamble.** For a phased skill, set the default to thorough up front: *"A discipline for hard bugs. Skip phases only when explicitly justified."*

## Body forms

- **Phase with a completion criterion.** Use numbered phases when order and between-step boundaries matter. Close each phase on a checkable bar; make it exhaustive where thin **legwork** would cause failure. A checklist is one rendering, not the requirement.
- **Branch selector.** *"Pick a branch"* → **context pointers** each worded with the condition that fires it: *'"Does this logic feel right?" → LOGIC.md'*. The wording, not the target, decides reach.
- **Environment survey.** Inspect the repository, detect its conventions, and adapt before prescribing commands or files. Setup skills use this form to preserve existing configuration instead of overwriting it.
- **Decision gate.** State which facts the agent may discover, which decisions remain human, and whether work waits for approval. Use when authority changes across the skill.
- **Artifact lifecycle.** Name the artifact's owner, durable location, update behavior, and handoff. Use when the skill creates state that outlives the run.
- **Proof by intentional failure.** Prove the clean case passes, introduce a deliberate violation, prove the guardrail fails, revert it, and prove clean again. Use when merely observing a passing check would not establish that enforcement works.
- **Frontier or map.** Keep a low-resolution index of destination, known work, unresolved fog, and the next frontier; place detail in zoomable artifacts. Use for discovery that cannot be honestly represented as a linear plan.
- **Rounds.** Resolve one dependency layer or question frontier per round, then recompute what is askable. Use for interviews where later questions depend on earlier answers.
- **Glossary and relationships.** Use `**Term** — definition. _Avoid_: near-synonym` plus relationship statements when terminology itself steers behavior. Skip this form for ordinary operational skills.
- **Contrast.** Show an anti-pattern and its correction together when seeing the gap teaches more reliably than another rule. `WRONG / RIGHT` labels are optional.
- **Durable template.** Put structured payloads in `<xml-tag>…</xml-tag>` or a fenced block. Avoid brittle implementation details; include paths when they are themselves interfaces, artifact locations, or repository conventions.
- **Shape diagram.** Use an ASCII diagram when spatial structure carries the idea, not as decoration.

## Composition forms

- **Invoke behavior; link reference.** Name another skill in prose when its behavior or discipline is needed: *"Run the `/grilling` skill."* Link a sibling file directly when progressively disclosing static reference owned by the current skill.
- **Thin orchestrator.** A whole skill can be one line that fires others: `grill-me` is *"Run a `/grilling` session."* Spend a skill name only to give a path its own trigger.
- **Router.** A user-invoked skill that maps the rest — main flow, on-ramps, standalone — so the human remembers one name instead of many (`ask-matt`). Cures **cognitive load**.
- **Shared-reference skill.** A model-invoked skill that is all glossary, invoked by others for the vocabulary (`codebase-design`). One home for reference several skills need.
- **Human-facing companion.** Keep operational agent instructions in `SKILL.md`; when people also need orientation, invocation boundaries, or neighboring choices, put that material in separate human documentation rather than loading it every run.

## Prose forms

- **Repeat the leading word as a token, never as a sentence.** *tight*, *red*, *seam*, *tracer bullet* recur as bare words; each appearance recruits the same prior and accretes a distributed definition. A triad spelled out at three sites is begging to **collapse** into one word.
- **Inline rationale.** A short *"Why bother: …"* after a demanding step keeps the agent bought in without a paragraph of justification.
- **Imperative and terse.** Second person, em-dashes, no hedging. Then hunt **no-ops** sentence by sentence — cut any line the model already obeys by default.

For four common assemblies — phased step-skill, reference-skill, thin orchestrator, and router — see [SKELETONS.md](SKELETONS.md). Start from behavior; use a skeleton only after one of those assemblies fits.
