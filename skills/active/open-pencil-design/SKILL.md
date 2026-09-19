---
name: open-pencil-design
description: Create, redesign, refine, or visually critique interfaces and compositions in OpenPencil. Use for OpenPencil design direction, canvas authoring, visual iteration, or requests to apply Paper's design guidance in OpenPencil. Routine file inspection, conversion, and export use open-pencil alone.
---

# OpenPencil design

Turn the user's brief into an editable design, then inspect and refine its rendered appearance. For critique-only requests, report findings without editing the document.

When the user asks for "Paper's design guidance," "Paper-inspired design," or Paper's design approach in the current OpenPencil task, read [Paper-inspired design guidance](references/paper-design-guidance.md) before choosing a direction or reviewing the design. That reference is an optional aesthetic treatment of this workflow. Ordinary OpenPencil tasks use the workflow below without loading it.

## Establish the target

Load `open-pencil` for tool operations. Before creating or modifying JSX, read its `references/design-authoring.md`. Use the connected server's schemas for available tools and arguments; the installed server can differ from the skill's version. OpenPencil design JSX creates scene nodes, not browser HTML.

Identify the intended document, page, and selection before mutation. Inspect the relevant hierarchy, frame bounds, existing components, variables, and typography. Use scoped queries and an image of the target rather than dumping the entire document. When multiple documents are open, resolve the target and pass explicit document/page identifiers wherever supported.

Reuse an existing design system unless the request calls for a new direction. Confirm fonts are available and actually render before relying on text measurements. Finish orientation when the target, editable scope, and existing constraints are clear. Ask when ambiguity could change which user work gets edited.

## Choose a direction

For a new composition or substantial redesign, state a compact brief before creating nodes. Cover the intended audience and primary action, content hierarchy, target dimensions, visual direction, color roles, typography, and spacing rhythm. Derive these from supplied material; ask only for missing choices that materially change the result. A local spacing or text correction needs no new brief.

If the user leaves the style open, consider distinct moods and choose one that suits the content. A concrete reference such as print signage, a material, or a physical setting can guide color and type choices. Explain the chosen direction briefly; a list of mood candidates is optional. When variants are requested, vary composition and hierarchy as well as color.

Make hierarchy visible through scale, spacing, weight, and grouping. Give the primary action emphasis and reserve accents for a clear purpose. Use whitespace to separate ideas; add containers when they communicate a relationship. Keep body text readable at the intended viewing size. Decorative treatments should support the chosen direction rather than become defaults across unrelated designs.

## Build in reviewable sections

Create the main composition and one representative content group first, then inspect it before repeating the pattern. Keep each mutation focused enough to diagnose a bad result. Reuse returned node IDs and use targeted updates for stable sections.

- Use supported auto-layout or grid for content relationships. Use explicit positioning for intentional overlays and artwork.
- Distinguish fixed viewport bounds from content-sized frames. Repair wrapping and sizing constraints at the source instead of masking overflow with clipping or smaller text.
- Give repeated rows consistent icon, label, and action lanes. Gap alone does not align columns when content lengths differ.
- Preserve existing variables and component relationships. Use native components and instances when repeated elements should remain linked and editable.
- Keep unrelated content intact. Refine the affected section instead of rebuilding the whole composition to fix a local defect.

Follow OpenPencil's authoring reference for sizing, paints, fonts, and component semantics. Use actual node properties and bounds for exact geometry and color values. Images reveal visual problems but are not a substitute for those values.

## Inspect and repair

After the initial composition and each meaningful section or revision, export an image of the affected frame or use an available rendered capture. Open and inspect the image at a useful scale. A successful export, node count, or semantic description alone does not establish visual quality.

Check the relevant conditions:

| Check | Look for |
| --- | --- |
| Hierarchy | The first read and primary action match the brief; secondary content does not compete with them. |
| Spacing | Related items group clearly; padding and gaps follow an intentional rhythm. |
| Typography | Fonts render correctly, text stays readable, and wrapping preserves meaning. |
| Contrast | Text and controls remain distinguishable against their actual backgrounds. |
| Alignment | Edges, baselines, icons, and trailing actions align where the design calls for it. |
| Fit | Content remains inside its intended bounds without accidental clipping or overlap. |
| Repetition | Equivalent rows, cards, controls, and component instances remain consistent. |

Record concrete defects and fix their causes with narrow edits. Reinspect the affected area after repairs; include surrounding content when a sizing change can move siblings. For responsive layouts, inspect a narrower target and longer representative text. For component or variable-mode edits, check affected instances and geometry as well as paint.

Keep progress updates focused on meaningful findings or direction changes rather than narrating every tool call. If images cannot be inspected, distinguish structural checks from visual review, identify the missing verification, and avoid claiming the design is visually finished.

## Complete the work

Inspect the final composition as a whole and any details too small to judge in the overview. Resolve the defects introduced by this work or report the remaining limitation. For a critique, return prioritized findings tied to visible regions and explain the proposed corrections.

After editing in the running app, select the result and use OpenPencil's viewport tools to make it visible. Save or export to the destination authorized by the user; live canvas edits do not establish that a file was saved. Leave the document open for review unless the user asks to close it.

Summarize what changed, which views or states were visually checked, and where the result is available. Use human-readable document and frame names in the handoff. Mention unresolved defects or unverified states precisely.
