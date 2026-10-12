# session-derived-knowledge

## Intent

Preserve useful knowledge from an AI session as a durable Session Capture (selected knowledge whose future role isn't settled yet) or a Practice (maintained guidance for an understood recurring situation), without flattening it into a summary or promoting speculation into accepted guidance.

Not for: session lookup, summaries, handoffs, thread digests, work-context checkpoints, or transcripts; imposing a storage schema or privacy system; committing or publishing.

Success: the artifact stands without the source session, keeps evidence state, uncertainty, rationale, and human authority, and follows the destination's own rules.

## Scenarios

- **"Capture this formulation for later"**: a Session Capture with what mattered and why, uncertainty kept.
- **"Turn this settled workflow into a Practice"**: written directly, no intermediate capture; applicability and guidance first, then rationale, boundaries, and reconsideration triggers.
- **Promising but unaccepted workflow**: preserved in full but kept at capture authority.
- **Practice requested from one unaccepted assistant suggestion**: surfaces the mismatch and asks.
- **Named prior session not in context**: retrieves exact evidence instead of trusting a lossy digest.
- **Destination with its own privacy, schema, and publication rules**: applies them without copying them into this skill.
- **Guidance that depends on a version-sensitive external tool**: records the canonical source and version, not just a local path; an intentional local path stays when readers share the repository.
- **"Write a handoff"** or "summarize this session": routed elsewhere.

## Decisions

- **Capture and Practice are alternatives, not stages.** Neither has to pass through the other.
- **Model-invoked**, so an explicit preservation request reaches it without the human naming the skill.
- **Shared method here, destination specifics in the destination** (human, 2026-08-05). Capture-specific rules live in the captures store's `AGENTS.md` and Practice-specific rules in the knowledge store's, so the skill stays portable across knowledge systems.
- **Session independence is a floor, not maximum self-containment** (human, 2026-08-05). How much to inline, link, or summarize depends on what's being transferred; a small distilled lesson needs no file-level citation. `artifact-context` owns that reader and reference contract; this skill keeps only the independence floor.
- **Disabled in Personal** while the session-knowledge workflow is reconsidered.

## Sources

None external.
