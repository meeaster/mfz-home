---
name: pele
description: Render Mermaid diagram text to SVG with the bundled Pele renderer, offline and without a browser. Use when Mermaid source needs to become an SVG or image file, when checking that Mermaid source parses, or when writing a newer Mermaid type such as usecase, wardley, venn, ishikawa, cynefin, railroad, treeView, swimlane, eventmodeling, or agentflow.
---

# Pele

Pele renders Mermaid 12.1 syntax to SVG with its own layout and visual style. The build in `vendor/pele/` needs only Node 20 or later.

## Render

```sh
node scripts/render.mjs diagram.mmd -o diagram.svg
```

Paths to `scripts/` are relative to this skill's directory. Input comes from a file or stdin; output goes to `-o` or stdout. Run `node scripts/render.mjs --help` for the width, font, and padding options.

A diagram that fails to parse exits with status 1 and prints Pele's error on stderr, including the line and column.

## Output

- Colors are CSS custom properties with fallback values, such as `var(--pele-fg,#1f1f1f)`. Browsers and other CSS-aware viewers show them; converters without CSS variable support draw them wrong. Setting `--pele-bg`, `--pele-fg`, `--pele-muted`, `--pele-line`, `--pele-surface`, `--pele-surface-alt`, `--pele-border`, `--pele-accent`, `--pele-font`, `--pele-radius`, or `--pele-series-1` through `--pele-series-8` on the `<svg>` or an ancestor recolors the diagram.
- Labels are sized from an Arial width table. `--font` sets the font the SVG draws with but not the measurement, so a font much wider or narrower than Arial misfits its boxes.
- The root `<svg>` has the classes `pele` and `pele-<type>`; nodes, edges, and labels carry `pele-node`, `pele-edge`, `pele-label`, and similar classes, with `data-id` set to the source id.

## Diagram types

Each reference holds Mermaid's documentation examples for its type, all verified to render with the vendored build.

| Type | First line | Examples |
|---|---|---|
| Flowchart | `flowchart`, `graph` | [references/flowchart.md](references/flowchart.md) |
| Sequence | `sequenceDiagram` | [references/sequence.md](references/sequence.md) |
| Class | `classDiagram` | [references/class.md](references/class.md) |
| State | `stateDiagram-v2`, `stateDiagram` | [references/state.md](references/state.md) |
| Entity relationship | `erDiagram` | [references/er.md](references/er.md) |
| Gantt | `gantt` | [references/gantt.md](references/gantt.md) |
| Pie | `pie` | [references/pie.md](references/pie.md) |
| Git graph | `gitGraph` | [references/git.md](references/git.md) |
| Mindmap | `mindmap` | [references/mindmap.md](references/mindmap.md) |
| Timeline | `timeline` | [references/timeline.md](references/timeline.md) |
| User journey | `journey` | [references/journey.md](references/journey.md) |
| Quadrant chart | `quadrantChart` | [references/quadrant.md](references/quadrant.md) |
| XY chart | `xychart`, `xychart-beta` | [references/xychart.md](references/xychart.md) |
| Requirement | `requirementDiagram` | [references/requirement.md](references/requirement.md) |
| C4 | `C4Context`, `C4Container`, `C4Component`, `C4Dynamic`, `C4Deployment` | [references/c4.md](references/c4.md) |
| Sankey | `sankey` | [references/sankey.md](references/sankey.md) |
| Block | `block` | [references/block.md](references/block.md) |
| Packet | `packet` | [references/packet.md](references/packet.md) |
| Kanban | `kanban` | [references/kanban.md](references/kanban.md) |
| Architecture | `architecture-beta` | [references/architecture.md](references/architecture.md) |
| Radar | `radar-beta` | [references/radar.md](references/radar.md) |
| Treemap | `treemap-beta` | [references/treemap.md](references/treemap.md) |
| Use case | `usecase-beta` | [references/usecase.md](references/usecase.md) |
| Wardley map | `wardley-beta` | [references/wardley.md](references/wardley.md) |
| Venn | `venn-beta` | [references/venn.md](references/venn.md) |
| Ishikawa | `ishikawa-beta` | [references/ishikawa.md](references/ishikawa.md) |
| Cynefin | `cynefin-beta` | [references/cynefin.md](references/cynefin.md) |
| Railroad | `railroad-beta`, `railroad-ebnf-beta`, `railroad-abnf-beta`, `railroad-peg-beta` | [references/railroad.md](references/railroad.md) |
| Tree view | `treeView-beta` | [references/treeview.md](references/treeview.md) |
| Swimlane | `swimlane-beta` | [references/swimlane.md](references/swimlane.md) |
| Event modeling | `eventmodeling` | [references/eventmodeling.md](references/eventmodeling.md) |
| Agent flow | `agentflow-beta` | [references/agentflow.md](references/agentflow.md) |
| Info | `info` | [references/info.md](references/info.md) |
