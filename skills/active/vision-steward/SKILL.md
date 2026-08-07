---
name: vision-steward
description: Create, revise, reconcile, or review a repository or workspace VISION.md as a human-owned north star. Use when asked to capture durable direction, update vision after an accepted change, check work against vision, or resolve drift between vision and related designs. Do not use for a skill or command authoring record's VISION.md; use skill-authoring.
---

# Vision Steward

Treat `VISION.md` as durable intent, not a description of whatever exists today. Preserve human authority over the direction while making its rationale and boundaries useful to future people and agents.

## 1. Establish The Task

Determine whether the user wants to create, revise, reconcile, or review a vision. Review and assessment do not authorize edits. For creation or revision, confirm the target repository or workspace from explicit context; if more than one target is plausible, ask.

If the target is a skill or command authoring record's `VISION.md`, stop and use `skill-authoring` instead.

**Done when:** the target, requested mode, and edit authority are unambiguous.

## 2. Gather Direction

Read the applicable repository instructions and existing `VISION.md`, then gather only evidence relevant to durable direction. Rank it as follows:

1. Explicit current user direction.
2. Existing accepted vision and decisions.
3. Accepted designs, proposals, and governing documentation.
4. Authoritative source material and repository history.
5. Source-aware knowledge, session records, and other synthesis.
6. Current implementation and inventory.

Lower-ranked evidence may explain or challenge higher-ranked direction, but it does not silently replace it. Treat synthesized knowledge as interpretation with provenance, current implementation as state rather than intent, and agent-generated proposals as proposals.

Ask the user when unresolved evidence would materially change the north star, authority boundaries, commitments, or non-goals. State reversible assumptions when they do not change those boundaries.

**Done when:** accepted direction, supporting evidence, proposals, and unresolved uncertainty are distinguishable.

## 3. Shape The Vision

Write the smallest document that preserves the durable direction. Include the following ideas when they carry real information, without forcing empty sections:

- the north star and the outcome it seeks;
- principles that guide tradeoffs;
- authority, scope, and consequential boundaries;
- explicit non-goals or deferred directions;
- how accepted changes alter the vision;
- pointers to detailed designs or authoritative sources.

Keep implementation plans, active inventory, status reporting, machine-specific paths, and transient tool choices out unless the vision deliberately governs them. Put detailed mechanics in designs, plans, local instructions, or owning systems. Prefer links over copied history.

Write for a future reader who lacks the current conversation. Use direct claims proportional to the evidence; preserve uncertainty instead of polishing it into commitment.

**Done when:** the document can guide a future tradeoff without depending on current inventory or hidden conversation context.

## 4. Reconcile The Surrounding Documents

Check whether the vision change makes tracked guidance, accepted designs, or structural documentation inaccurate. Update those files only when the requested edit scope authorizes it; otherwise identify the exact inconsistency for the user.

Do not rewrite vision to match implementation drift. Surface the drift and determine whether the implementation or the accepted direction should change.

**Done when:** affected documents are coherent or every remaining discrepancy is explicitly reported.

## 5. Hand Off

Show the resulting path and summarize the direction captured, consequential judgment calls, evidence limitations, related files changed, and unresolved questions. Report validation performed. Do not commit or publish unless requested.

**Done when:** the user can review both the vision and the decisions encoded in it.
