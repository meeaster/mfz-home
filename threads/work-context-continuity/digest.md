# Digest — work-context-continuity

## Current State
The work-unit continuity MVP is implemented, integrated with OpenCode, and active in the `validate` phase. The work unit is now operational authority; the `work-context-continuity` Mindframe-Z thread is historical synthesis rather than live resumption state. Archiving remains deliberate rather than automatic.

The engine owns storage, schemas, bindings, validation, and CLI behavior. Rendered OpenCode server and TUI adapters live in the personal home and fail open. Context is progressively delivered through request reminders, lifecycle-boundary orientation, and on-demand artifacts. Authored context, orientation, and immutable checkpoints are Markdown; the CLI scaffolds, explains, validates, binds, and records telemetry rather than generating prose.

Dogfooding covered unbound and attached sessions, orientation receipts, HTTP-triggered compaction, scope drift, reverse phase changes, detach, post-compaction continuity, concurrent attachment, and TUI inspection. Validation reported OpenSpec `22/22`, engine suites of `448` fast and `131` integration tests, `153` personal-home tests plus typecheck, and a healthy `mfz doctor`.

A malformed checkpoint without its required `id` caused the first post-compaction delivery to fail; fallback delivery restored orientation, but the assistant did not visibly reread the context map or status. This leaves checkpoint semantics and post-compaction agent behavior as areas for continued validation.

## Components
- **Work unit** — the operational object connecting context maps, orientation, checkpoints, repositories, external systems, and session bindings · implemented and active in `validate`
- **Context routing** — request reminders, lifecycle-boundary orientation, and relevance-based artifact loading · implemented and dogfooded
- **Checkpoint history** — immutable, directly authored Markdown records reserved for meaningful boundaries · implemented, with semantic validation still under evaluation
- **OpenCode integration** — fail-open server and TUI adapters over engine-owned storage, validation, bindings, and CLI behavior · implemented and tested
- **Delegation** — parent prompts name the work unit for children to load as supplemental context without inheriting the parent binding · behavior settled and exercised
- **Mindframe-Z continuity** — threads retain synthesized history while work units hold live operational continuity · boundary settled; automatic refresh remains unresolved
- **TUI observability** — compact inspection of configured versus effective context and delivery receipts · implemented, with sustained-use usefulness still unproven
- **Cross-cutting** — live truth remains in its authoritative files, prose is authored directly, automation provides guidance and validation, and adapters fail open rather than blocking work

## Direction
Resume from `/home/mark/.mindframe-z/work/v1/units/work-context-continuity/` and continue dogfooding the active unit in `validate`. Use sustained operation and additional compaction cycles to evaluate checkpoint retention, semantic checkpoint validation, visible post-compaction context use, TUI usefulness, and whether Mindframe-Z thread refresh should be automated. Archive only through an intentional lifecycle decision.

## Open Questions
- What checkpoint-retention policy should apply?
- Does the TUI remain useful during sustained everyday use?
- How much semantic checkpoint validation should the CLI enforce?
- Should Mindframe-Z thread refresh be automated?

## Key Decisions
- Use a work unit as the central operational object, separate from OpenCode sessions, Mindframe-Z threads, repositories, and OpenSpec changes.
- Support cross-repository units, one active unit per source-qualified session, and non-linear phase history; exclude inter-unit relationships and automatic thread refresh from the MVP.
- Keep live truth in project files, continuity in threads, broader principles in wiki material, and experimental evidence in prototypes.
- Make the work unit operational authority after formalization and treat the corresponding Mindframe-Z thread as historical and stale for live operation.
- Use progressive disclosure: retain a small request reminder, deliver orientation at lifecycle boundaries, and route additional artifacts only when needed.
- Keep storage, schemas, bindings, validation, and CLI behavior in the engine while personal-home OpenCode adapters fail open.
- Make the TUI an observability and debugging surface for configured versus effective context and receipts, not a full context dump.
- Author AI-written Markdown directly; use the CLI for scaffolding, instructions, structural and invariant validation, bindings, and telemetry.
- Reserve immutable checkpoints for meaningful boundaries rather than routine progress or duplicated test summaries.
- Delegate context explicitly: the parent names the work unit in the child prompt, the child loads it as supplemental context, and the child remains unbound unless separately attached.
- Treat a work unit as background context rather than a substitute for a complete delegated task brief.
- Use stage, review, promote, then enable for Mindframe-Z activation because enabling requires a reviewed lock.
- Keep the active unit in `validate`; do not archive it automatically.

## Design
```text
                       authoritative project files
                                  |
                                  v
                    +---------------------------+
                    | Work Unit                 |
                    | context map + orientation |
                    | immutable checkpoints     |
                    +---------------------------+
                         ^                 |
                         |                 |
              engine storage,             | one active unit per
              schemas, bindings,          | source-qualified session
              validation, CLI             v
                                   +------------------+
                                   | OpenCode adapter |
                                   |    fail open     |
                                   +------------------+
                                     |      |      |
                         every request      |      | inspection
                                     v      |      v
                              small reminder|  TUI + receipts
                                            |
                         attach / resume / compaction / reload
                                            |
                                            v
                                  orientation delivery

             parent prompt names unit
                        |
                        v
             child loads supplemental context
             without inheriting the binding

       +----------------------+       +----------------------+
       | Mindframe-Z threads  |       | native artifacts     |
       | historical synthesis|       | loaded when relevant |
       +----------------------+       +----------------------+
              not operational authority
```

## Intent
The user wants continuity across reused sessions, compactions, delegation, threads, wiki material, prototypes, and durable Markdown without loading every source into every session. Context should follow the work itself, preserve authority boundaries, and provide enough orientation to resume safely without replacing a detailed task brief.

## Vision
The system should support fluid work units ranging from small efforts to cross-repository work, progressively disclose relevant context, preserve inspectable checkpoints and receipts, and make delivery failures visible without overwhelming the normal interface. The design has shifted from an abstract proposal to an operational MVP whose next refinements should come from sustained dogfooding rather than further speculative design.

## Perspective
The user prefers human-readable guidance by default and `--json` for automation. They favor direct Markdown authorship over prose-heavy mutation commands, with the CLI limited to guidance, scaffolding, validation, bindings, and telemetry.

The user rejects automatic delegation inheritance: the parent should identify the work unit explicitly, while still providing a complete task brief. Testing a child without that guidance reinforced this view because the child remained unbound and reconstructed context through costly archaeology.

The prolonged design phase caused burnout and prompted a deliberate move into implementation. Checkpoints should mark meaningful boundaries rather than routine progress, and practical evidence from compaction, delegation, restart behavior, and sustained TUI use should drive subsequent decisions.

## Sources
- Matt Pocock skills repository, including `ask-matt` and `batch-grill-me` at commit `ed37663cc5fbef691ddfecd080dff42f7e7e350d` — https://github.com/mattpocock/skills.git
- Mindframe-Z references index — `/home/mark/.mindframe-z/references.md`
