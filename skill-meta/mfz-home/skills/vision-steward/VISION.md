# Vision

## Problem

Vision documents often decay into current-state summaries, aspirational prose, or implementation plans. Generated knowledge and existing code can be mistaken for accepted intent, while the reasoning and boundaries needed for future decisions remain implicit.

## Intended Behavior

Vision Steward creates and maintains repository or workspace `VISION.md` files as human-owned north stars. It gathers direction from evidence in authority order, distinguishes accepted intent from proposals and implementation state, and preserves consequential ambiguity for human judgment.

The skill favors concise, durable direction over a mandatory template. It keeps inventory and mechanics in the documents that own them, checks related guidance for drift, and never changes accepted vision merely because implementation differs.

## Portability

The workflow has no required tool, workspace layout, private knowledge source, or machine path. It can use source-aware knowledge and session evidence when available, but those inputs remain subordinate to explicit and accepted direction.

## Success

A successful vision document helps a future person or agent make tradeoffs, locate deeper authority, and recognize consequential boundaries without reconstructing the conversation that produced it.

## Non-Goals

- Maintaining skill or command authoring record `VISION.md` files, which belong to `skill-authoring`.
- Turning current implementation or generated synthesis into accepted direction.
- Producing roadmaps, status reports, inventories, or implementation plans.
- Requiring one section template for every vision document.
- Committing, publishing, or approving direction on the user's behalf.
