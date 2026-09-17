---
name: diagram-quality
description: Use when creating, revising, or visually reviewing a diagram with containers, labels, and connectors. Apply layout rules before drawing and inspect rendered geometry afterward, including text containment, spacing, label ownership, connector attachment, and balance between equivalent relationships.
---

# Diagram quality

Make diagram relationships readable and geometrically coherent. Use this alongside the chosen diagram-generation or visual-design workflow; it also works on an existing diagram. For review-only requests, report findings rather than editing.

## Plan the geometry

Establish what each container and connector means before arranging it. Identify peer containers, independent branches, directed steps, and return paths. Preserve those relationships when reflowing or simplifying the diagram. A tidy layout that implies a false sequence is incorrect.

Choose a consistent padding and spacing system at the intended display size. Reserve space for the longest peer label, container headings, connector labels, arrowheads, and return paths before placing nodes. Lay out equivalent connections together rather than routing each independently.

Done when the content fits the planned reading size and comparable relationships have a common layout treatment.

## Apply the layout rules

### Containers and text

- Keep content inside its owning container with visible breathing room on every side. Text that barely fits still needs padding.
- Use consistent insets for comparable containers. Account for titles, badges, and nested groups explicitly; center text within the available content area, not across space reserved for a heading.
- Fix overflow by shortening text without losing meaning, wrapping at sensible boundaries, or enlarging the container. When a peer needs more room, adjust the peer layout coherently. Reposition affected connectors and labels afterward.
- Judge text at its actual display size. For narrow screens, reflow or split the diagram before shrinking it into unreadability. Keep the same relationship meanings in each layout.

### External labels and clearance

- Place each label so a reader can identify its connector or group without tracing several candidates. Leave clear space from unrelated containers, labels, arrowheads, and paths.
- A label may sit beside its connector or interrupt its own line with a background break. Keep the line traceable on both sides and its direction clear. Neither the label nor its background may intrude into an unrelated container.
- Keep intentional grouping or overlap distinguishable from collision. Route connectors around unrelated content; a line hidden behind a box can falsely imply that the box is an endpoint.

### Connectors and balance

- Attach to the edge that best expresses the relationship. Keep arrowheads visible at the boundary, clear of text and corners. Check the rendered marker, not just the path endpoint.
- Give distinct incoming connections separated attachment points. Balance their offsets around the target when their meanings are equivalent; align peer sources with that arrangement.
- Use matching bend positions, bend treatment, and approach distances for equivalent sibling routes where space permits. Avoid short reversals and extra elbows that make one route look accidental.
- An intentional shared branch bus should read as branching. Separate routes should remain independently traceable. Make crossings distinguishable from junctions.
- Preserve asymmetry that communicates a real difference. Symmetry must not invent equivalence or change a relationship to make the picture neater.

When used with `diagram-design`, these geometry rules allow intentional inline labels and shared branch buses. Use its style and output conventions where compatible with the accepted task.

Done when content, labels, and connectors fit together without accidental collisions or misleading relationships.

## Inspect the rendered result

Render the actual output and inspect images of every changed view at its intended sizes. For responsive HTML, exercise the view controls and confirm the selected state before capturing. Use a full-diagram image to check completeness and a native-size viewport or crop to judge text and local spacing. A scaled-down full-page image can hide defects; a viewport capture can omit them below the fold.

Check the layout rules against the image, then trace each changed relationship from source through label to destination. Compare equivalent routes side by side. On revisions, inspect the changed area and any views affected by shared styles or geometry; reuse valid evidence for unaffected work.

When containment or clearance is uncertain, measure rendered bounds with the actual fonts loaded. Compare text and container bounds in the same coordinate system, including transforms and intended padding. In SVG, text bounds alone do not establish stroke, marker, or clipping visibility. Measurements support image inspection; they do not establish semantic ownership or appropriate symmetry.

Fix observed defects within the authorized scope and inspect the affected rendering again. If rendering is unavailable, state which checks remain unverified. An accessibility, syntax, or file-safety check does not prove geometric correctness.

Done when the affected views satisfy the rules or the remaining issues are explicitly reported. State what was rendered, inspected, and measured, with evidence paths when available; keep validation claims within that coverage.
