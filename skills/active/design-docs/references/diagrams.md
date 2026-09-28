# Diagrams

Diagrams show the design on the overview and area pages, each option's shape in a brief, and a brief's decision map. They're built from absolutely placed HTML boxes over an SVG layer of connectors, so text wraps and themes like the rest of the page. Every diagram is hand-placed for its content; there is no layout engine.

## Conventions

| Element | Markup | Meaning |
| --- | --- | --- |
| Exists today | `.node` | Grey border; the eye skips past it. |
| Added by the option or design | `.node.new` | Border and icon in the option's colour, or the `--new` blue on a `design` card. |
| Retired by the option | `.node.retired` | Faded and struck through, with no connections. |
| Not designed yet | `.node.sketch` | Dashed outline: a part an option needs whose shape nobody has settled. |
| Waits on a decision | `.node.new.pending`, `.zone.new.pending`, `edge new pending` | Dashed, in the design's colour: drawn as currently leaned towards or assumed, until the decision is made. Put the decision's marker on it. |
| Network or account, existing | `.zone` + `.zone-label` | A labelled box: name in `b`, address range and "exists" in `small`. |
| Network, new | `.zone.new` | Tinted in the option's colour. |
| Connection | `<path class="edge">` / `class="edge new"` | Direction of flow, with an arrowhead. New connections take the option's colour. |
| Connection label | `.edge-label` (`.new` for coloured) | What flows or how: "syslog · VPN", "PrivateLink", "HTTPS". |
| Passes through | `.via` chip on the line | A hop the traffic crosses without stopping: a gateway, VPN, or peering. |
| Evidence | `<a class="ref ref-e">E4</a>` pinned to a corner | How we know this part is true. |
| Not confirmed | `<a class="ref ref-q">Q3</a>` pinned to a corner | An assumption that an open question would confirm. |
| Decision | `<a class="ref ref-d">D2</a>` on the part or line it decides | Coloured by the decision's status. Put one on every dashed part, and on solid parts a settled decision shaped, such as sizing or retention. |
| Designed elsewhere | `<a class="page-link" href="#area-id">Page <svg>…</svg></a>` beside a box | The part has its own area page. |
| Several markers | `<span class="pins">` holding refs | More than one claim about the same box. A marker can also sit inside an `.edge-label` when the claim is about the connection. |

- Every box, zone and non-obvious connection carries an evidence or question marker.
- If nothing supports a part, either find evidence or add an open question.
- Put a short "Reading the diagrams" key (`.diagram-key`) above the first option or design card. On design pages, add `design` to the key and include the "Waits on a decision" (`swatch pending`) and decision marker entries; the example's overview has one.
- On a design page, draw only the design as it stands. Alternatives belong in the brief that weighs them.
- The security view of each option has its own conventions (boundaries, numbered flows, protection labels); see [security](security.md).
- When several environments or accounts are set up identically, draw one and say so in the zone label ("staging and prod, identical"), with a marker for how that's known. Draw them separately only where they differ.

## Coordinates

- Size the diagram with `style="--w:912;--h:280"` and place children with `--x`, `--y`, `--w` and `--h`, in pixels, relative to the diagram.
- A full-width option diagram is 912 wide. Half-width compact cards are 436 wide; add `compact` to the diagram class there.
- The SVG layer uses the same numbers: `<svg class="edges" viewBox="0 0 912 280">`.

A working grid for flow diagrams (left to right):

- **Columns:** sources at x 0 (width 150), the first zone starting near x 220, the main component near x 670 (width 124), and destinations at x 828 (width 84).
- **Rows:** standard boxes are 60 tall, with row tops at y 56 and y 176, so their centres are y 86 and y 206. A box spanning both rows is y 56, height 180, with `tall`.
- **Zones:** start 40 px above the first row they contain (y 16 for row one), leaving room for the two-line label.
  - Inset the first box at least 14 px from the zone's left edge.
  - End zones at least 20 px short of the diagram's right edge, so corner markers stay inside.
  - If a box's corner marker would land on the zone label, move the box right or down rather than the label.
- **Edges:** run from a box's right edge to the next box's left edge at the row centre, e.g. `d="M150 86 H244"`. Arrowheads end exactly on the target's edge. Use `H` and `V` segments for elbows: `M520 174 H560 V78 H600`.
- **Labels:** `.edge-label` is centred on `--x`. Put it 8 px below the line (`--y` = line y + 8), clear of boxes and zone borders.
  - Estimate label width at about 6.5 px per character, and leave that width plus 16 px of line between the boxes it sits between. The monospace second line inside a box runs about 7 px per character and wraps first; keep it short or widen the box.
  - When a label won't fit on a short segment, move it to a longer segment of the same connection.
  - For vertical edges, put the label beside the line, starting 14 px to one side (`transform:none` with a left-aligned `--x`), clear of any chip on the line.
- **Via chips:** sit centred on the line (`--y` = line y − 10). Keep them clear of box edges.
- **Markers:** a marker is about 36 px wide (40 px with its gap); a `.pins` group of n markers is about 40n. For a box's top-right corner, `--y` = box y − 8 and `--x` = box x + width − 16 for one marker, or box x + width + 4 − 40n for a group, so the group ends just past the corner. Then check that x + 40n stays inside the diagram's width and doesn't cross a zone border or label; move the group left along the box's top edge if it does. For a zone, use the zone's corner the same way.
- **Decision markers** are 18 px tall: centre one on a line with `--y` = line y − 9, or put it beside a zone's label. Keep it clear of a box's icon; the top-left corner is often freer than the top-right.

Check a diagram at 100% zoom for:

- text clipped inside boxes
- labels crossing borders
- arrowheads that stop short or overshoot
- markers covering text

Widen boxes or move labels rather than shrinking type.

## Decision map

- **Decisions:** `.node.decision` boxes containing:
  - `.top`: a mono ID and a status
  - `.q`: the question
  - `.foot`: its options or the reason it waits
- **In scope or context:** decisions this brief covers get the dark outline (default). Context decisions get `.context`. Link in-scope ones to their decision sections by making the node an `<a href="#…">` to the section's id.
- **Dependencies:** a plain `.edge` arrow from the earlier decision to the later one. Branch with elbows from a shared vertical at x = source right edge + 40.
- **Blocking questions:** `.node.question` boxes (a `ref-q` marker plus short text), joined to the decision they block by `.edge.link`, which is amber with no arrowhead.
- **Key:** add a `.diagram-key` with swatches for covered, context, dependency and blocking question.

## Arrowheads

Arrowheads come from the markers in the shared SVG definitions. `.edge` uses the grey arrow, and `.edge.new` picks the option's arrow from the enclosing `opt-*` class, or `arrow-new` inside a `design` card. `.edge.plain` and `.edge.link` have none. Keep the definitions block from the template intact. `.edge.pending` adds a dash to any edge.
