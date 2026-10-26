# Diagram system

Read this before drawing any diagram for an HTML article. It is the house style for diagrams: every post's diagrams answer the same six questions the same way, so posts written months apart, by different models, look like one blog. It works with Pele (Mermaid to SVG at build time) plus page CSS, [`scripts/pele-post.mjs`](../scripts/pele-post.mjs) for what CSS cannot fix, and [`scripts/overlap-check.js`](../scripts/overlap-check.js) for verification.

Each section gives **principles** (the intent; use judgement where they apply) and **rules** (fixed defaults and guardrails; follow them as written, even where a principle seems to allow otherwise).

## Principles

1. **Colour follows the message.** Colour only what the diagram's one sentence is about. If a reader cannot say why something is coloured, it is neutral.
2. **Exact layout, a human hand.** Pele places every box, line and label exactly; the pen draws them with a light hand. Personality lives in hand-drawn group loops, handwritten labels outside boxes, hatching on the focus, and the paper behind the diagram. That is what keeps the diagrams friendly and still fit for work documents.
3. **Icons over subtitles.** A known service is recognised by its icon. A subtitle stays only when it says something the icon cannot ("raw copy", "443 · TLS").
4. **Nothing touches.** Text, lines and outlines keep clear space between them.
5. **Contrast shows the subject.** One thing against the rest: that one stands out and everything else stays quiet. When the whole set is the subject, the whole set carries the colour.
6. **Fix the source, not the symptom.** When the layout crowds something, change the Mermaid source first.

## The primitives, in order

| # | Primitive | Question | Decided by |
|---|---|---|---|
| 1 | Type | What shape is the idea? | the claim the diagram makes |
| 2 | Vocabulary | What kind of thing is each box and line? | this file (fixed) |
| 3 | Emphasis | What should the reader notice? | the paragraph beside the diagram |
| 4 | Drawing style | What should it feel like? | the post |
| 5 | Colour system | Which job does each colour do? | this file (fixed) |
| 6 | Theme | Which colours fill those jobs? | the article's colour tokens |

Write the claim as one sentence first; it becomes the caption. At most about 9 boxes; more is two diagrams.

Diagrams sit in the 720px article column, which leaves 692px inside the figure's padding. **Rule:** render at natural size; if a gantt, timeline, xychart or quadrant chart comes out wider than 692px, render it again with `--width 692` so it lays out to fit instead of being shrunk. Don't narrow sequence, flowchart, state or architecture diagrams: Pele wraps their labels and squeezes their spacing. Redraw those top to bottom, or split them.

## Vocabulary

| Shape | Mermaid | Means | Line | Mermaid | Means |
|---|---|---|---|---|---|
| Box | `a["…"]` | a component or service you run | Solid | `-->` | calls or sends |
| Stadium | `a(["…"])` | an actor or client | Thick | `==>` | the main path |
| Hexagon | `a{{"…"}}` | a transform | Dotted | `-.->` | async, optional, or later |
| Cylinder | `a[("…")]` | a store | Labelled | `-->|logs|` | what travels on it |
| Subroutine | `a[["…"]]` | an external system | Cross end | `--x` | blocked or denied |
| Diamond | `a{"…"}` | a decision | | | |

## Colour system

Colour is attention. Spend it on what the diagram is saying, not on what kind of element something is.

### Principles

1. **Colour follows the message.** Write the diagram's one sentence first, then colour only what that sentence is about. Any element can carry colour: a box, a group, a `loop` frame, a line, a bar, a point. A `loop` frame is coloured when "this repeats for every call" is part of the point, and neutral when it is incidental.
2. **Neutral is the default; colour is a small budget.** Every coloured element must answer "why is this coloured?" with something the text says. When in doubt, leave it neutral.
3. **Emphasis matches the comparison.** One thing against the rest: that one in pink, everything else neutral. The whole set is the subject (every point on a chart, every step of the path): colour the whole set. No single subject: no pink.
4. **A colour means the same thing in every post**, so readers learn the roles once.

### Roles

| Role | Colour | Means |
|---|---|---|
| Neutral | fg, muted, `--neutral` outlines | everything not being pointed at |
| Emphasis | pink | what this diagram is about |
| Grouping | cyan, then purple, then yellow | these belong together, when that membership matters to the point |
| Status | green, orange, red | a state the reader needs: green done, added or ok; orange in progress or warning; red failed, removed or at risk |

### Rules

- Every box, line and label starts neutral; the stylesheet's defaults do this. Add colour per diagram by `data-id`; never change the defaults to colour a diagram.
- Colour goes on outlines, text, loops, lines and markers. The only fill is the 14% pink tint on an emphasised box or point. Never colour large areas: group backgrounds, gantt section bands, quadrants.
- Pink is only ever emphasis: never a group, a status or decoration.
- Grouping hues go in order (cyan, purple, yellow), at most three in a diagram. The items inside a coloured group stay neutral.
- A status colour marks a real state, and means one state throughout a diagram (green = done in a plan, green = added in a diff).
- More than three colours besides neutral means the diagram is saying two things: split it or drop one.
- "Not used" is not a status: an option that is not taken is a neutral dashed box and line, never red.
- Icons are never coloured. Group icons sit on the paper and take the muted colour; service icons sit on a light tile.
- Colour text with `fill`, never `stroke`: a stroke on text looks bold and coloured in a browser and is lost anywhere else.
- Types without the usual boxes start neutral too: gantt tasks and milestones are neutral outlines with no section bands; quadrants are outlines with no fills; chart bars and points are neutral (emphasise one bar by its `data-id`, such as `bar-4`, and its value label as `value-4`); mindmap branches and timeline periods are neutral; git's main branch is neutral and other branches take grouping hues in order, with outlined branch pills.

### Tokens (Dracula)

```css
:root { --bg: #282a36; --fg: #f8f8f2; --muted: #a3a8c3; --line: #c6c8d8;
  --neutral: color-mix(in srgb, var(--muted) 60%, var(--bg));   /* box outlines */
  --dots: color-mix(in srgb, var(--muted) 32%, transparent);     /* paper */
  --pink: #ff79c6; --cyan: #8be9fd; --purple: #bd93f9; --yellow: #f1fa8c;
  --green: #50fa7b; --orange: #ffb86c; --red: #ff5555; }
```

## House style

- **Paper**: 24px dots behind every diagram by default; plain is allowed.
- **Boxes**: flat, rounded 10px, neutral outline, no shadows; drawn with a light hand by the pen (see Pen).
- **Groups**: a loose hand-drawn marker loop in the group hue, made with an SVG `feTurbulence` displacement filter on the group rect only. A composite state is a group like any other: loop and label, with no title rule across it.
- **Labels**: inside boxes in the UI sans; everything outside boxes (group labels, edge labels, frame labels) handwritten in Kalam, lowercase.
  - **Rule:** Kalam's 5 reads as an S, so text holding a code like `5xx` is set in the UI sans; `fixDiagram` marks it (`pele-literal`).
  - **Rule:** write outside labels in lowercase in the Mermaid source; don't lowercase them with CSS. Literals keep their case: HTTP verbs, status codes, paths, identifiers, code, and acronyms ("GET /login", "POST /token + code_verifier", "send logs (TLS)", "raw (PutObject)"). For a composite state's label, alias the id: `state "running" as Running`.
- **Chalkboard** (hand-drawn wobble on every shape, Kalam everywhere) is the alternative style for proposals and "how I'd approach this" posts.

## Icons

- Real brand icons for known services from Simple Icons (CC0); generic icons for your own components from Lucide (ISC). Install both Iconify JSON packs at exact versions in the article's build.
- **Icons are never coloured.** Every icon is a dark mark on a light tile, which also keeps knockout logos such as Datadog's legible.
- **The tile always sits inside a box**, so the box can carry emphasis. In architecture diagrams the service box holds the tile with the name beneath. In sequence diagrams the participant box holds the tile to the left of the name.
- Request icons in the Mermaid source (`service s3(simple-icons:amazons3)[S3]`); Pele keeps the name in `data-icon`, and `swapIcons` replaces its generic glyph. For sequence diagrams, pass `{ icons: { participantId: 'pack:name' } }` to `fixDiagram`.

## Spacing

- Text keeps 3px clear of every line. A label may sit on its own line where that line runs straight through it, but never on a bend, curve or loop, even its own.
- Text inside a group or frame keeps 4px from the outline.
- **Principle:** a group label belongs inside its group, where it reads as part of it. Top or bottom, whichever has room; outside only as a last resort, because a label far outside reads as detached.
- **Rule:** a group label takes the widest stretch of the top band that no line enters; else a band added along the bottom (the group grows, and widens a little if the label is longer than the group); else just outside the top-left corner. `fixDiagram` does this.
- Frame labels and notes never sit on a lifeline: a note gets a background chip (the stylesheet does this), and an else label already has one.
- Text inside a shape is centred in it, both ways. Sequence frame tags (`par`, `loop`) are re-centred for Kalam on a slightly taller pill.
- Sequence frames get inner padding without crowding the message above, and self-message labels sit to the right of their loop.
- A label on a line with a bend sits on the middle of the line's longest straight stretch, or beside that stretch on the outside of the bend when the stretch is shorter than the label.

`fixDiagram` applies the frame padding, tag centring, frame-label placement, label placement off bends, self-message labels, group-label placement, the icon swap, and room around groups for the hand-drawn loop. It grows the drawing wherever a fix moves something past its edge. Pass the Mermaid source too (`fixDiagram(svg, { source })`): a node whose label has an explicit `<br/>` gets title-and-subtitle styling, while a name Pele wraps to fit stays one name. These source patterns keep labels clear from the start:

- **Timelines** go vertical: `timeline TD`. Horizontal timelines run past the 720px column after four or five periods.
- **Git graphs** go vertical with unrotated commit labels: `gitGraph TB:` with `config: gitGraph: rotateCommitLabel: false` in front matter. Laid out horizontally, branch curves run through the labels of the commits they leave or join.
- **Two-way state transitions** (A → B and B → A) go in a left-to-right composite (`direction LR` inside it), so both labels sit on straight stretches.
- **Don't label a line with what its target already says**, such as "raw" into a box subtitled "raw copy".

When `overlap-check.js` still reports a problem, change the source: a different direction, fewer crossing lines, shorter labels.

## Handwritten notes

A handwritten note explains or adds to a diagram, like a margin note on a whiteboard. Notes work on every diagram type.

### Principles

1. **A note says what the diagram can't.** The takeaway number the caption implies ("2.9× the memory, 20 ms faster"), why something is the way it is, a caveat, or what travels on a line that can't carry a label.
2. **A note sits beside what it explains.** Use a leader line or bracket when it can't sit right next to it.
3. **Notes are sparing.** One for each thing the reader would otherwise have to work out; not one per element.

### Rules

- Add notes after `fixDiagram` with `addNotes(svg, [{ x, y, text, emphasis, path }])` from `scripts/pele-post.mjs`. Positions are in the diagram's own coordinates: compute them with `locate(svg, id)`, which returns the box of a node, group, line or bar by `data-id` (`{ x, y, w, h, cx, cy }`), so a note follows the layout when the diagram changes; `'\n'` breaks lines, and `path` is an optional leader or bracket. It applies the house style and grows the drawing to fit.
- Notes are Kalam, lowercase like every outside label, and muted. A note is pink only when it points at the emphasis.
- A few words, at most two lines.
- Notes follow the spacing rules like any label: `overlap-check.js` checks them.
- Architecture lines can't carry labels in Mermaid; say what travels on one ("telemetry", "hit", "miss") with a note beside it.

## Pen

`scripts/pen.js` redraws each diagram by hand in the reader's browser, after Pele has laid it out and `fixDiagram` has fixed it.

### Principles

1. **The layout stays exact; only the drawing is by hand.** The pen moves nothing, so the spacing rules still hold.
2. **A light hand.** Boxes and lines barely wander; the diagram should feel drawn, never rough.
3. **Hatching is colour.** The focus's tint becomes hatching in its colour, so hatching is spent the way colour is: on what the diagram says.

### Rules

- Inline `scripts/pen.js` in a `<script>` at the end of the page. It draws every `.fig` that holds a Pele SVG, as the page loads.
- Without JavaScript the page shows the clean diagram, so keep the stylesheet complete, including the group-loop filter. The pen also treats any outline with a filter as a group loop.
- The pen redraws when the colour scheme or the page's `data-theme` changes, because it reads colours from computed style.
- Box outlines close where they start; group loops wander most and run a few pixels past their start.
- The focus's tint (a fill mixed from its outline's colour) becomes hatching in that colour, under its text. Keep a hatched box's subtitle short: small grey text over hatching is the hardest to read.
- Names in boxes stay in the UI sans. Labels between boxes, group and frame labels, and notes stay Kalam.
- Only the focus is hatched by default. `data-pen="all"` on a figure also hatches every plain box, faintly in its outline's colour: an accepted alternative for a post that wants every box filled. `data-pen="off"` keeps a figure clean.
- `window.pen.undo()` restores the clean diagrams and `window.pen.draw()` draws again. `overlap-check.js` does this itself, so it measures the layout, not the ink.

## Stylesheet

Put each diagram in a `<figure class="fig">` and add per-diagram rules for whatever it colours (emphasis, groups, status) by `data-id`. Mermaid ids become `data-id` values (`subgraph z1`, node `opw`, edge `L_opw_s3_0`).

```css
.fig { border-radius: 10px; padding: 14px; background-color: var(--bg);
  background-image: radial-gradient(var(--dots) 1px, transparent 1.3px);
  background-size: 24px 24px; }                      /* dot paper; --dots: muted at 32% */
.fig svg { display: block; max-width: 100%; height: auto; margin: 0 auto; --pele-radius: 10px;
  --pele-bg: var(--bg); --pele-fg: var(--fg); --pele-muted: var(--muted); --pele-line: var(--line);
  --pele-border: var(--neutral); --pele-surface: var(--bg); --pele-surface-alt: var(--bg);   /* frame tags, section bands */
  --pele-font: "Segoe UI", Arial, sans-serif; }
.fig .pele-node :is(rect, polygon, path, circle, ellipse):not(.pele-icon *, .pele-icon-tile) { fill: var(--bg); stroke: var(--neutral); stroke-width: 1.6; }
.fig .pele-subtitled .pele-label tspan:first-child { font-weight: 700; }   /* title + subtitle: only nodes with an explicit <br/> */
.fig .pele-subtitled .pele-label tspan:nth-child(2) { font-size: 12px; fill: var(--muted); }
.fig .pele-edge-label text, .fig .pele-cluster-label, .fig .pele-frame-label {
  font-family: Kalam, "Segoe Print", cursive; font-size: 17px; }   /* lowercase is written in the source */
.fig .pele-cluster rect { fill: none; stroke: var(--neutral); stroke-width: 2; rx: 28px; filter: url(#loop); }
.fig .pele-state-composite > path { display: none; }  /* no title rule: a group is its loop and label */
.fig .pele-node .pele-icon-tile { fill: var(--fg) !important; stroke: none !important; }
.fig .pele-brand { color: var(--bg); }
.fig .pele-cluster .pele-icon { color: var(--muted); }            /* group icons sit on the paper */
.fig .pele-section, .fig .pele-quadrants { fill: none; }           /* no large fills */
.fig .pele-quadrant rect { fill: none; stroke: var(--neutral); stroke-width: 1.6; }
.fig .pele-task rect, .fig .pele-task :is(polygon, path) { fill: var(--bg); stroke: var(--neutral); stroke-width: 1.6; }
.fig .pele-point { fill: var(--bg); stroke: var(--neutral); stroke-width: 2; }
.fig .pele-note rect { fill: var(--bg); stroke: none; }   /* a note sits on a chip: lifelines pass behind it */
.fig .pele-bars rect { fill: var(--bg); stroke: var(--neutral); stroke-width: 1.6; }  /* bars carry data-id bar-1, bar-2, … */
.fig .pele-annotation { font-family: Kalam, "Segoe Print", cursive; font-size: 17px; fill: var(--muted); }
.fig .pele-annotation-line { stroke: var(--muted); stroke-width: 1.4; }
.fig .pele-annotation-emphasis { fill: var(--pink); } .fig .pele-annotation-emphasis-line { stroke: var(--pink); }
.fig text.pele-literal { font-family: "Segoe UI", Arial, sans-serif; font-size: 15px; }  /* codes like 5xx */
/* per diagram */
#arch [data-id=z1] > rect { stroke: var(--cyan); } #arch [data-id=z1] .pele-cluster-label { fill: var(--cyan); }
#arch [data-id=opw] > rect:not(.pele-icon-tile) { stroke: var(--pink); stroke-width: 2.4; fill: color-mix(in srgb, var(--pink) 14%, var(--bg)); }
#arch [data-id=opw] .pele-label { fill: var(--pink); }
#state [data-id=Degraded] .pele-label { fill: var(--orange); font-weight: 700; }  /* colour text with fill, never stroke */
#flow [data-id=retry] > :is(rect, polygon, path, ellipse):not(.pele-icon-tile) { stroke: var(--pink); stroke-width: 2.4; fill: color-mix(in srgb, var(--pink) 14%, var(--bg)); }  /* any shape */
#flow [data-id=L_retry_queue_0] path:not(.pele-marker) { stroke: var(--pink); stroke-width: 2; }  /* a line: its path, */
#flow [data-id=L_retry_queue_0] .pele-marker { fill: var(--pink); }                                 /* arrowhead, */
#flow .pele-edge-label[data-id=L_retry_queue_0] text { fill: var(--pink); }                        /* and label */
#chart [data-id=bar-5] { stroke: var(--pink); stroke-width: 2.4; fill: color-mix(in srgb, var(--pink) 14%, var(--bg)); } #chart [data-id=value-5] { fill: var(--pink); font-weight: 700; }
```

```html
<svg width="0" height="0" style="position:absolute"><filter id="loop" filterUnits="userSpaceOnUse"
  x="-100" y="-100" width="1200" height="1100"><feTurbulence type="fractalNoise" baseFrequency="0.012"
  numOctaves="2" seed="2"/><feDisplacementMap in="SourceGraphic" scale="8"/></filter></svg>
```

Size the filter region to the diagrams' bounds; very large regions on many shapes make the browser stall. Bundle Kalam into the page rather than loading it from a font CDN. Inline `scripts/pen.js` at the end of the page (see Pen).

## Verification

- When you fix a diagram with the human, show them the fix before and after. The post itself shows only the final diagram.
- Evaluate `overlap-check.js` in the rendered page and resolve what it reports.
- Check fonts in the reader's browser, not a headless browser that lacks them.
- Look at each diagram with the pen drawn and with JavaScript disabled; both must read.
