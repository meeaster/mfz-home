# Image Brief

Use only the sections that materially constrain the result. The brief is authoritative input to a fresh worker, not a transcript summary.

```markdown
# Image Generation Brief

## Purpose
What the asset communicates, where it appears, and who it serves.

## Page Or Product Context
Only the facts from the surrounding artifact that the image must reflect.

## Input Images
- Image 1: edit target | style reference | compositing source
- Image 2: edit target | style reference | compositing source

## Composition
Canvas shape, framing, placement, scale, counts, direction, relationships, and negative space.

## Visual Language
Medium, tone, geometry, texture, lighting, and level of realism.

## Color Assignment
Exact colors and the role of each color.

## Text
Exact text in quotes, including spelling, capitalization, typography, and placement.

## Required Relationships
Connections, ordering, containment, source-to-output lineage, and responsibility boundaries.

## Invariants
For edits, everything that must remain unchanged.

## Constraints
Objects, effects, styles, text, logos, watermarks, and other additions to exclude.
```

## Input Rules

- Use one unambiguous edit target.
- Label attachments in the same order as repeated `--image` arguments.
- Distinguish style references from content that should appear in the result.
- Attach a rendered page screenshot when source code alone does not communicate the visual theme.
- Use the full-resolution prior output for an edit, never a resized preview.
- Keep at most five images because the built-in tool accepts at most five edit references.

## Specificity

Normalize a detailed user request without adding creative requirements. For a sparse request, add only details that materially support the stated use. Exact counts and geometry improve direction but remain generation constraints, not deterministic guarantees; use code-native graphics when pixel-level precision is required.
