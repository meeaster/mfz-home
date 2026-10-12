# open-pencil-design

## Intent

A design process for OpenPencil that carries over the habits the human liked in Paper's MCP guidance: set a deliberate visual direction, build in visible increments, critique the rendered result, and repair locally. Covers new compositions, redesigns, focused refinements, and critique-only requests.

Not for: routine inspection, conversion, or export, which the official `open-pencil` skill handles alone; code implementation.

Success: an editable design whose rendered appearance was actually inspected and refined, with the user's brand, unrelated work, and save state respected. Works without Paper.

## Scenarios

- **"Create an editorial landing page in OpenPencil"**: loads this workflow and `open-pencil`, settles a brief before building.
- **"Polish spacing in the selected settings panel"**: inspects that region and makes focused changes without a new mood exercise.
- **"Critique this frame without changing anything"**: inspects a rendered image and returns findings, no mutation or viewport change.
- **"Export this .fig to SVG"** or "implement a React form": doesn't start this workflow.
- **"Use Paper's design guidance"** in an OpenPencil task, including while Paper is offline: loads `references/paper-design-guidance.md`; ordinary polish requests don't.
- **Paper-inspired direction on an open brief**: considers 3–5 moods and explains the choice; a monochrome brand or supplied design system is preserved, not padded with accent colors.
- **Repeated rows where a longer label shifts the trailing action**: fixes lanes and verifies the rendered result.
- **Export succeeds but the agent can't view the image**: reports the missing visual review instead of claiming completion.
- **Small late defect**: repairs that region and rechecks neighbors rather than rebuilding everything.
- **Live edit with no output path**: leaves the edited frame visible and reports save state; doesn't invent a path or close the document.

## Decisions

- **Paper's MCP guide is the inspiration; community Paper skills are excluded** (human, 2026-09-18).
- **Original wording only.** Paper's terms give no open-content license for its guide, so later maintenance must not drift into verbatim or close paraphrase; Paper's tool names, parser rules, and branding requirements stay out.
- **The more prescriptive Paper guidance lives in an optional reference** (human, 2026-09-18), loaded when the human asks for Paper's design guidance, so ordinary requests keep the lighter workflow.
- **Design process here, tool syntax in the official `open-pencil` skill**, so upstream tool changes don't require forking.
- **Deliberate local adaptations of Paper's advice**: reasoned mood choice instead of random selection, explicit brand systems override aesthetic preferences, no unused colors added to hit a count, OpenPencil's native sizing instead of CSS units. Paper's typography numbers are heuristics, not accessibility guarantees.
- **Documents stay open for review; save or export only to a requested destination**, even though the upstream tool guide lists closing as a routine step.

## Sources

| Source | Revision | Local use |
|---|---|---|
| Paper Desktop MCP `get_guide`, topic `paper-mcp-instructions` | server `0.5.11`, read 2026-09-18 | Ideas only (direction-setting, hierarchy, incremental groups, rendered review, local repair). A later live read confirmed the 12px/16px typography heuristics, 3–5 moods, 5–6 palette values, and the alignment check after three similar rows. Reinspect it before attributing any new number to Paper ([terms](https://paper.design/legal/tos)) |
| Official `open-pencil` skill and its `references/design-authoring.md` | `v0.15.1`, commit `6cf1748e` | Tool mechanics; runtime tool discovery wins when the live server lags. On upgrade, compare layout semantics, visual export, document targeting, and component behavior |
