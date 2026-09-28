# Page parts

Build pages from the classes in `assets/doc.css`. `assets/example/` shows every part in use; copy markup from it rather than inventing new structures. Add page-specific CSS only in a small `<style>` block in `doc.html` when a doc genuinely needs something the kit lacks, using the colour variables (`--foreground`, `--muted`, `--border`, `--opt`, `--new`, `--ok`, `--warn`, `--lean` and so on) so dark mode keeps working.

## Shell and pages

- **`doc.html`** links `doc.css` and `doc.js`, loads Inter and Geist Mono, holds the shared SVG definitions (arrowheads and Lucide icons), the rail, and one `<!-- include pages/<id>.html -->` per page. See [pages](pages.md) for the page files themselves.
- **Icons:** add a `<symbol id="i-name">` to the definitions block using Lucide path data (24×24 viewBox, `stroke="currentColor"`, `fill="none"`) and use it as `<svg><use href="#i-name"/></svg>`. A page's `data-page-icon` must name one of these.
- **Rail:** the shell holds the doc's identity, the `<!-- pages-nav -->` and `<!-- page-rails -->` markers that `build` fills, the diagrams view switch, and the theme toggle. Each page's `<nav class="page-rail">` holds:
  - an "On this page" `.rail-group.rail-nav` whose links match the page's section ids; `doc.js` highlights the section in view, and `class="sub"` makes a sub-link such as a decision's cost part
  - `.rail-item` decisions with their status, `.rail-meeting` links, or a `.rail-note`, as the page needs
  - on shared pages, a `.rail-group.cite-filter` with just its label; `doc.js` adds the buttons
- Number sections in order within each page with the `num` span.

## Sections

```html
<section class="section" id="overview-risks">
  <div class="section-head">
    <div class="section-title"><span class="num">07</span><h2>Risks</h2></div>
    <p class="intro">One or two sentences on what this section holds.</p>
  </div>
  ...
</section>
```

Use `.subhead` (an `h3` plus an optional `p`) for parts inside a decision, such as "How the options measure up" and "What each option costs". Give a subhead an id when the rail links to it. Shared pages can skip the section head; the page header says what it is.

## Statuses, badges and tags

| Markup | Use |
| --- | --- |
| `<span class="status open">Open</span>` | Open decision, unasked question, medium risk (amber) |
| `<span class="status leaning">Leaning B</span>` | Leaning, "Current leaning", "Next" meeting, "Answer here" (teal) |
| `<span class="status decided">Decided</span>` | Decided (green) |
| `<span class="status">Later</span>` | Neutral: later, given (a premise the plan or requester fixed), asked, to check, answered, summarised, unknown |
| `<span class="badge">Must</span>` / `<span class="badge outline">Should</span>` | Requirement priority |
| `<span class="tag">D1</span>` | Mono tag for what something blocks |
| `<span class="letter">A</span>` inside `.opt-a` | Option letter in the option's colour; `letter sm` in tables, `letter sm plain` for set-aside options |
| `<span class="numeral">1</span>` | Numbered options for smaller decisions |
| `<a class="page-link" href="#s3-archive"><svg>…</svg>Page · S3 archive</a>` | A link to another page, with an icon. `<span class="page-link none">` for "No brief yet". |

Put `opt-a` to `opt-d` on any container to give its contents that option's colour (`--opt`). Options keep their colour everywhere in a brief: cards, diagrams, table headers, cost bars. Put `design` on an overview's or area page's diagram card and key instead: there are no options, and what the design adds takes the `--new` colour.

## References and their cards

A reference is anything that points at an E, Q, D or R item or a data flow. `doc.js` turns each one into a click-to-open card built from the item's own row or section, so every item is written once, on whichever page defines it.

**Definitions** (the item itself):

| Attribute | On | Card shows |
| --- | --- | --- |
| `id="E2" data-ref="evidence"` | the row or section; kinds: `evidence`, `question`, `decision`, `requirement`, `flow` | kind and ID |
| `data-ref-text` | the element holding the item's main text | body text |
| `data-ref-status` | a `.status` or `.badge` (copied as-is), or a plain cell with an optional label, e.g. `data-ref-status="Found"` on "Sep 25" | header right |
| `data-ref-detail="Label"` | any element; list items become lines | a labelled row |
| `data-ref-value="…"` | alongside `data-ref-detail` when the visible text doesn't read well on its own | overrides that row |
| `data-ref-tags` | a container of `.tag` or `.badge` | footer tags |
| `data-ref-link="Label"` | an `<a href="#…">` inside the definition | footer link to that place ("Open the brief"), unless the reader is already on that page |

Decisions defined in a brief section list their options from the `.option` cards inside it. Otherwise the footer links to the item: "Go to D2", "Open in Evidence".

**References** (links to a definition):

| Markup | Where |
| --- | --- |
| `<a class="ref ref-e" href="#E2">E2</a>` | Marker chip: diagrams, `.marks` groups in tables, relations. Use `ref-q` for questions, `ref-d` for decisions, `ref-r` for requirements. |
| `<a class="mention" href="#Q2">Q2</a>` | Inside sentences: a dotted-underline link that opens the same card. |

- Decision markers are pills that take their colour from the decision's status: amber open, teal leaning, a check for decided, grey for later. Don't colour them by hand; change the status in the decisions table.
- Without the script, markers still work as plain in-page links and pages follow one another.

## Tables

```html
<div class="table-wrap"><table class="table">
  <thead><tr><th>ID</th><th>…</th></tr></thead>
  <tbody>
    <tr><td class="id">R1</td><td>…</td><td class="soft">…</td></tr>
  </tbody>
</table></div>
```

- **Cell classes:**
  - `id`: mono ID column
  - `soft`: secondary text
  - `q`: the main text of a row, a little heavier
  - `date`: no wrapping
  - `num`: right-aligned mono figures
  - `who`: a `.kind` plus `.name` pair
  - `status-cell`: a status plus a `.note`
- **Inside cells:** `.sub` for a second line, and `.marks` for a group of markers (evidence, questions, decisions).
- **Row classes:** `group` for a group label spanning columns (`colspan`), and `total` for a totals row.
- **Verdicts:** `<span class="verdict yes|partly|no">Short reason.</span>`, in comparison cells or as a Met column.
- **Expandable evidence:** put the finding in `<td class="has-details"><details><summary data-ref-text>…</summary><div class="how">…</div></details></td>`.
  - The `.how` block holds "How we know" and "Gathered from".
  - "Gathered from" is a `.sources` list of `.source` cards, each with a `.k` kind and a `.v` description.
- **Cited on:** an empty `<td data-cited-on></td>` in a shared page's row; `doc.js` fills it with the pages that cite the item.

## The solution card and the decisions table

- **Solution or design card:** an `article.option.design` with `.option-head` (a `.text` with `h3` and `p`, and the view toggle when there's a security view), the view panels or a `.diagram-wrap`, then a `.parts` block holding an `h4` and the parts table.
- **Decisions table:** one `tr` per decision with `id="D1" data-ref="decision"`; see [pages](pages.md) for its columns. The example's overview has a full one.

## Options

- **Full-width option:** an `article.option.opt-a` containing `.option-head` (letter, `.text` with an `h3` and `p`, optional status), `.diagram-wrap.diagram-scroll` with the diagram, and `.assess` with `.good`, `.risk` and `.cites` lists. Add `leaning` to the article to outline the current leaning.
- **Compact options side by side:** wrap articles in `.option-row` and use `.assess.stacked`.
- **Set aside:** `.set-aside` with `letter sm plain`, an `h4` holding the name and a `.mono` date, and a `p` giving the reason.
- **Callout:** `.callout` with an icon, an `h4` and a `p`, for "What would settle it".
- **Cost bars:** a `.cost-bars` list of `.cost-bar.opt-x` rows: letter, `.label`, and `.track` holding `.bar` with `.seg` (shared) and `.seg.diff` (difference) widths in px, `.total`, and an optional `.delta`.
  - Scale every bar with the same px-per-dollar, chosen so the largest total is about 560 px.
  - A $0 option gets no segments, just its total.
  - When part of a cost is unknown, say so in `.delta` with the question ("+ hosting, unknown (Q8)").
  - In a cost table, write "per use" or "unknown" with the question marker rather than guessing a figure.

## Views and markers

- **Architecture and Security tabs:** see [security](security.md) for the `.view-toggle`, `data-view-panel` markup and the rail control that switches every card at once.
- **Several markers on one box:** wrap them in `<span class="pins" style="--x:…;--y:…">`.
- **Comparison cells shared by every option:** merge them with `colspan` when the verdict and reason are identical.

## Meetings

A `.meetings` list of `.meeting` blocks on the Meetings page. Each holds `.date` (a `b` date and a `small` weekday), an empty `.track`, and `.body` with:

- `.title`: an `h3` and a status (`leaning` "Next", or plain "Summarised")
- `.who`
- the agenda or a summary list
- a `.changes` row of `.change` chips, labelled "Changed in this doc"

Mark the upcoming meeting with `meeting next`. Give each meeting an id like `meeting-2026-10-02` so the rail and the decisions table can link to it.
