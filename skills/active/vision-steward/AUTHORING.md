# vision-steward

## Intent

Create and maintain repository or workspace `VISION.md` files as human-owned north stars: durable direction, rationale, and boundaries that help later people and agents make tradeoffs, gathered from evidence in order of authority.

Not for: roadmaps, status reports, inventories, or implementation plans; turning current code or generated synthesis into accepted direction; approving direction for the human.

Success: a future reader can make a tradeoff, find deeper authority, and see consequential boundaries without reconstructing the conversation that produced the vision.

## Scenarios

- **Create a root `VISION.md` from accepted designs**: extracts durable intent, links to designs instead of copying them, no machine-specific inventory.
- **Update after an accepted direction change**: the human's current direction wins; still-valid principles stay; stale designs and guidance are reconciled when authorized.
- **"Align the vision with what the code does"**: doesn't silently rewrite; presents the gap and asks whether intent or implementation should change.
- **Vision from wiki pages, session summaries, or agent notes**: keeps provenance, separates synthesis from commitments, asks before encoding an inferred direction.
- **"Is this vision still coherent?"**: findings only.
- **Local paths and tool inventory mixed into principles**: keeps only deliberately governed constraints and moves the rest to the documents that own them.
- **Roadmap or brainstorm requests**: not this skill.

## Decisions

- **Implementation never overrides accepted vision.** Drift goes back to the human as a choice.
- **No mandatory section template.** Visions differ in shape; a fixed template pushes them toward filler.
- **Portable**: no required tool, layout, private knowledge source, or path; knowledge and session evidence are optional inputs that rank below explicit direction.

## Sources

None external.
