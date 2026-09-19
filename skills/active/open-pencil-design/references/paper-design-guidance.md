# Paper-inspired design guidance

Use this reference when the user asks to apply Paper's design guidance to an OpenPencil task. It is an independently written adaptation of design practices observed in Paper's MCP guide, not the official guide or a copy of its examples. It requires no connection to Paper.

Keep the user's brief and existing design system authoritative. Apply the relevant choices below within the main skill's inspect, build, and repair workflow. For critique-only requests, use them as review criteria without editing.

## Set the mood before selecting colors

When the direction is open, propose 3–5 distinct moods, including an option less predictable for the category. Consider that alternative deliberately and explain the selected direction in terms of the audience and purpose. Paper encourages moving beyond the first instinct; this adaptation keeps the choice reasoned rather than random. A supplied direction already resolves this choice.

Use a coherent physical reference to select colors, then assign each color a job. Identify the canvas background, content surfaces, primary text, supporting text, action emphasis, and any semantic status colors the design needs. Check those colors together in the actual composition; an attractive palette alone does not establish readable text or recognizable controls.

For an open brief, present about 5–6 color values with their roles. Treat this as a briefing aid, not a requirement to add unused colors to a monochrome design. Useful mood families from the guide include maritime, industrial, botanical, nocturnal, editorial, signage, and terminal. For example, maritime suggests fog and navy, industrial suggests concrete and safety markings, and terminal suggests a dark ground with phosphor-like emphasis. Select the actual values for the task instead of treating these families as fixed palettes.

Paper favors pure white for ordinary light-mode product work. Its neutral examples are `#FFFFFF`, `#EEEEEE`, `#CCCCCC`, `#888888`, `#444444`, and `#000000`; they are examples, not a contrast-certified scale. Choose warm off-white when the mood specifically calls for it. Pure black can support a dark, ink-like direction or a strong chromatic accent.

In this requested mode, treat these combinations as prompts to reconsider the palette:

- Warm cream with red, orange, terracotta, or fluorescent accents.
- Dark navy or charcoal with electric purple, lime, or teal.
- Pure white with muted earth tones.
- A warm tinted background with a highly saturated accent.

These are Paper's aesthetic preferences, not accessibility prohibitions. An explicit brand palette takes precedence. Additional accents are useful for status, categories, data, or a playful identity; retain a primary anchor and reduce competing decoration.

Communicate the chosen mood, palette roles, type hierarchy, and composition before major creation. This makes the direction visible to the human without requiring a separate approval for every implementation detail.

## Give the composition a clear first read

Choose what the viewer should notice first and make the surrounding content support it. Use a noticeable difference in scale or weight between the focal element and supporting material. Give the main content enough space that hierarchy survives without decoration.

Use unequal proportions or an offset focal element when they help establish emphasis. Keep functional alignment stable even in an asymmetric composition. Whitespace should communicate grouping and separation; containers should express an actual relationship rather than surround every heading, metric, or paragraph.

Prefer a restrained set of visible treatments. Before adding a border, shadow, gradient, or decorative shape, identify what it contributes to hierarchy, grouping, or the chosen mood. Retain a treatment the brief calls for; remove repeated decoration that makes unrelated elements compete for attention.

For a playful consumer or marketing brief, choose one or two expressive devices, such as sticker-like shapes, offset shadows, hand-drawn accents, or a characterful wordmark. Give them room to work instead of stacking every device together. Reconsider excessive gradients and shadows or a page assembled from interchangeable cards when those treatments have no connection to the brief.

## Make typography and color serve the content

Choose the type hierarchy before polishing individual labels. Distinguish display text, section headings, body content, and supporting metadata as the content requires. Check available fonts in OpenPencil and judge the rendered result at its intended viewing size.

Paper discourages text at 12px or smaller except for justified cases such as dense productivity interfaces or an intentional all-caps treatment. Below 16px, scrutinize contrast rather than relying on muted styling. Treat these as readability heuristics, not a substitute for an accessibility check. If information matters to the main task, give it readable space instead of shrinking it to make the frame fit. Inspect line breaks and line spacing where headings or long labels change the shape of a group.

Reserve strong accents for deliberate emphasis. Verify text against its actual background, including tinted surfaces and images. Muted supporting text must remain legible. Use the existing semantic color system for warnings and status rather than repurposing it as decoration.

The guide does not supply a fixed type or spacing scale. Define the font, weights, sizes, and spacing for the task. Express them using OpenPencil's native properties and units rather than copying Paper's CSS unit conventions.

## Make alternatives differ in structure

If the user requests several directions, give each a distinct composition or hierarchy as well as a different mood. Hold required content and functionality consistent so the alternatives can be compared fairly. Explain the tradeoff each direction makes, such as prominence of imagery versus density of information.

Judge visual impact and task clarity separately. A dramatic result can still bury the primary action; a restrained result can still have a strong identity. Choose based on the user's purpose rather than whichever option has the most decoration.

## Review with explicit findings

Inspect the rendered result after each new section. Use the main skill's visual checks for hierarchy, spacing, typography, contrast, alignment, fit, and repetition. For this requested mode, give each applicable category a short verdict grounded in the rendered image. Name a concrete problem and location when it fails; mark anything that could not be checked as unverified. Fix observed defects before repeating the section's pattern elsewhere.

Repair local causes, then inspect the affected area again. Once at least three similar rows exist, inspect vertical alignment through the icon and trailing-action lanes across differing label lengths. Give those slots consistent widths and prevent unintended shrinkage using supported OpenPencil layout properties. Keep successful parts of the composition intact. Rebuilding the whole design is justified only when the composition itself conflicts with the accepted direction, not because one section needs refinement.
