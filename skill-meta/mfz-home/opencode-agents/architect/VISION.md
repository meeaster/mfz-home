# Vision

## Problem

Architecture work requires substantial evidence and sustained synthesis. Gathering that evidence beneath the architect would hide reusable findings from the primary session and add delegation, permission, and session-transport complexity without reducing the architect's synthesis cost. Delegating the entire design conversation would also separate the user from the agent making consequential tradeoffs.

## Intended behavior

`architect` is a read-only Sol/medium consultant for bounded, evidence-informed architecture. The primary session owns all `explore`, `research`, and `inspect` evidence gathering, supplies relevant compact packets and session locators, retains user dialogue, challenges the result, and owns every final decision. The architect synthesizes that evidence, identifies conflicts and gaps, develops credible alternatives, recommends one against the caller's priorities, and returns a proposal-ready design packet.

When material evidence is absent, the architect returns one bounded evidence request or a batch. Every request names the direct question, architectural significance, preferred root-owned gatherer, scope and locators, accepted constraints, hypotheses, freshness, expected packet, and whether work can proceed provisionally. A batch marks dependencies and parallel safety so the primary can run genuinely independent units concurrently and serialize dependent units; it does not manufacture units or duplicate investigation. The architect does not create nested children or use OpenCode CLI or API session retrieval. Detailed evidence remains in gatherer sessions; the architect receives compact packets and stable source and session locators.

The agent presents two or three options when real alternatives exist, including the strongest case and material tradeoffs for each. It explains why its recommendation wins and what would reverse it. When only one design is viable, it rejects apparent alternatives with evidence rather than manufacturing choices.

The result identifies affected responsibilities, boundaries, interfaces, invariants, state or migration implications, testing surfaces, assumptions, unresolved decisions, evidence locators, implementation units, and continuity metadata. It does not edit files, implement, mutate external state, or accept its own design.

## Success

The primary session can collaborate with the user, retain a compact shared evidence model, and reuse root-owned gatherer sessions while a resumable specialist carries architecture synthesis. Accepted designs are detailed enough to discuss, persist in OpenSpec when justified, or hand to bounded workers without transcript replay.

## Non-goals

- Owning product decisions or user dialogue.
- Replacing `explore` for simple repository discovery.
- Owning or nesting architecture evidence gatherers, or retrieving their sessions directly.
- Producing UI/UX design owned by `ui-ux-designer`.
- Building a prototype owned by `prototype`.
- Implementing or independently reviewing completed work.

This topology is evolutionary. Reconsider nested architect delegation only after repeated live cases show material architecture delay or primary-context bloat that outweighs shared evidence ownership and the simpler permission and session model.
