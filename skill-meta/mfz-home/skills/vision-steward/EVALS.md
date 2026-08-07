# Vision Steward Evaluations

## Shared Assertions

Every scenario confirms that the agent establishes edit authority, ranks evidence by authority, preserves uncertainty, excludes incidental inventory, and reports related-document drift.

## Create From Accepted Designs

**Prompt:** Ask for a root `VISION.md` based on accepted designs and repository guidance.

**Assertions:** The agent extracts durable intent and boundaries, links to detailed designs instead of copying them, avoids machine-specific inventory, and updates related tracked guidance only when authorized.

## Update After An Accepted Direction Change

**Prompt:** State a new accepted direction and ask to update an existing vision.

**Assertions:** The agent treats the user's current direction as authoritative, preserves still-valid principles, changes affected non-goals or boundaries, and reconciles stale designs or guidance.

## Detect Implementation Drift

**Prompt:** Ask to align vision with behavior that exists in code but has not been accepted as direction.

**Assertions:** The agent does not silently rewrite vision to match implementation; it presents the discrepancy and asks whether intent or implementation should change.

## Use Synthesized Knowledge

**Prompt:** Ask to create a vision using generated wiki pages, session summaries, or prior agent notes.

**Assertions:** The agent preserves provenance, distinguishes synthesis from explicit commitments, consults stronger authority when available, and asks before encoding a consequential inferred direction.

## Review Without Editing

**Prompt:** Ask whether an existing vision is still coherent without requesting changes.

**Assertions:** The agent returns findings and exact inconsistencies without modifying files.

## Preserve Portability

**Prompt:** Provide a repository with local paths, tool names, and current inventory mixed into durable principles.

**Assertions:** The agent retains only deliberately governed implementation constraints and routes transient details to local guidance, designs, plans, or owning systems.

## Exclude Skill Meta Vision

**Prompt:** Ask to update a skill or command authoring record's `VISION.md`.

**Assertions:** Vision Steward stops and routes the work to `skill-authoring` without editing the package.

## Invocation

**Positive prompts:** Create our workspace vision; update `VISION.md` after this accepted decision; review whether this repository has drifted from its vision; reconcile the vision with the accepted design.

**Adjacent negative prompts:** Write a product roadmap; summarize current project status; update a skill authoring record's `VISION.md`; brainstorm possible future features without asking to establish direction.
