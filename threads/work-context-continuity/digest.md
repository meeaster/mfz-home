# Digest — work-context-continuity

## Current State
The continuity system has a settled MVP design centered on a fluid unit of work rather than a session, thread, specification, or repository. A unit may span repositories and external systems, while the MVP permits one active unit per session, no inter-unit relationships, and non-linear activity phases. Current orientation is separated from append-only segment checkpoints, context is loaded progressively, Mindframe-Z threads provide synthesized history rather than live resumption state, and the TUI serves as both a compact status surface and an on-demand context debugger.

Implementation has not been confirmed. The next agreed stage is to formalize the effort as a Mindframe-Z thread, bootstrap its first work-unit record, and prepare an OpenSpec discovery proposal. `batch-grill-me` has been reviewed, vendored, enabled across OpenCode, Claude Code, and Codex, and validated with `mfz doctor`.

## Components
- **Work unit** — the live operational object connecting orientation, phases, checkpoints, repositories, and external systems · MVP model designed, initial record not confirmed
- **Context routing** — progressive disclosure through an ambient reminder, lifecycle-triggered orientation loads, and relevance-based artifact routing · behavior designed, implementation pending
- **Checkpoint history** — append-only segment records kept separate from mutable current orientation · model designed, implementation pending
- **Mindframe-Z continuity** — threads synthesize historical continuity without becoming a prerequisite for work resumption · integration boundary settled, initial thread not confirmed
- **TUI observability** — compact ambient status plus detailed inspection of received context, loaded context, warnings, retrieval failures, and receipts · interface role designed, implementation pending
- **Dogfooding and validation** — this context-management effort becomes the first unit and is exercised through scripted OpenCode CLI sessions · planned
- **Cross-cutting** — authoritative intent and acceptance remain human-controlled; automation may produce only derived checkpoints and receipts without silently changing consequential state

## Direction
Create the Mindframe-Z thread, bootstrap the context-management effort as the first work unit, and file the discovery work in an OpenSpec proposal. Then implement the smallest one-active-unit MVP, dogfood it through scripted OpenCode CLI sessions, and inspect the resulting context loads, failures, warnings, and receipts before expanding the design.

The preserved conflict between the `opencode-hub` thread digest and repository README should be surfaced during formalization rather than silently resolved.

## Open Questions
- Should Mindframe-Z threads refresh after OpenCode compaction, even though resumption must not depend on that refresh?
- Should commits and pull requests load the active work context?
- Should implementation activity be logged as part of the work unit?

## Key Decisions
- Use a fluid unit of work as the central operational object while leaving native artifacts in their existing systems.
- Allow units to range from small to large and span repositories or external systems.
- Limit the MVP to one active unit per session, no relationships between units, and non-linear phase history.
- Treat exploration, design, prototyping, implementation, and validation as activities within one unit, including movement back to earlier activities.
- Keep mutable current orientation separate from append-only segment checkpoints because sessions and compaction intervals are episodes within the work, not the work itself.
- Use progressive disclosure: retain a small reminder on every request; load orientation on attachment, resumption, post-compaction, or explicit reload; and load other artifacts only when relevant.
- Treat Mindframe-Z threads as synthesized historical continuity and work units as live operational continuity.
- Make the TUI an observability and debugging surface, while preserving a compact default presentation through an ambient indicator and on-demand detail.
- Keep authority field-specific: vision and constraints belong to `VISION.md`; accepted design to `ARCHITECTURE.md` and ADRs; behavior to code and tests; change state to Git and checkpoints; rationale to threads and sessions; broader perspective to the Personal wiki; and experiments to prototypes and research.
- Permit automation to write derived checkpoints and receipts, but not to silently alter vision, architecture, acceptance state, commitments, or prototype verdicts.
- Dogfood the system using this context-management effort as its first work unit and inspect scripted OpenCode CLI sessions afterward.
- Formalize the continuity records and discovery proposal before beginning implementation.
- Retain `batch-grill-me` as an explicitly invoked design-interview skill across OpenCode, Claude Code, and Codex.

## Design
```text
                         field-specific authority
                                  |
                                  v
                         +------------------+
                         |   Work Unit      |
                         | current          |
                         | orientation      |
                         +------------------+
                           |       |       |
             every request |       |       | relevant only
                           v       |       v
                    small reminder |  native artifacts
                                   |
             attach / resume / compact / reload
                                   |
                                   v
                         orientation injection

                         +------------------+
                         | append-only      |
                         | segment records  |
                         +------------------+

             historical synthesis          inspection
          +----------------------+     +----------------------+
          | Mindframe-Z threads  |     | TUI context debugger|
          +----------------------+     +----------------------+
                    |
          never required for resumption
```

## Intent
The user wants relief from fragmented, drifting work context and the burden of manually remembering what is authoritative, current, or relevant. The system should preserve continuity around the work itself rather than around whichever session or tool happens to contain it, while preventing automation from quietly rewriting human intent or accepted decisions.

## Vision
The envisioned system supports work units fluid enough to represent either very small or very large efforts, including work crossing repositories and external systems. It supplies just enough context at each moment, preserves inspectable history, and makes failures visible without overwhelming the normal interface. The design remains intentionally provisional: the user expects stronger opinions and further iteration only after implementation and dogfooding provide evidence.

## Perspective
The user favors flexible work boundaries over rigid project or session containers, progressive disclosure over repeatedly injecting complete records, and visible context receipts over opaque automation. They distinguish operational continuity from historical synthesis and want each kind of information to remain under the authority of its native artifact.

The prolonged design phase became tiring and difficult to track. That frustration prompted a shift toward formalizing the existing conclusions and moving into implementation rather than extending abstract design. The user expects practical dogfooding evidence, especially from scripted OpenCode sessions, to drive the next round of opinions and refinements.

## Sources
- Matt Pocock skills repository, `skills/in-progress/batch-grill-me`, commit `ed37663cc5fbef691ddfecd080dff42f7e7e350d` — https://github.com/mattpocock/skills
- `opencode-hub` thread digest and repository README
